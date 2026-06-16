/**
 * buildGraph.js — ArgoCD-style Left-Right layout powered by Dagre
 *
 * Column order (left → right):
 *   [Service]  →  [WorkerNode group (contains Pods)]
 *
 * Dagre handles all X/Y calculations with rankdir: 'LR'.
 * Services are standalone nodes; WorkerNode groups use React Flow parentId
 * so pods sit visually inside the worker box.
 *
 * Edge routing: smoothstep (soft curves, no hard corners).
 */

import dagre from 'dagre';

// ─── Node dimensions fed to Dagre ────────────────────────────────────────────
const SVC_W   = 200;
const SVC_H   = 95;

const KN_W    = 240;   // WorkerNode group — width (pods inside are narrower)
// KN_H is computed dynamically based on pod count

const POD_W   = 210;
const POD_H   = 74;
const POD_V_GAP = 10;

const KN_HEADER_H  = 36;
const KN_PAD_V     = 12;
const KN_PAD_H     = 15;

// Dagre spacing
const RANK_SEP   = 150;   // horizontal gap between columns
const NODE_SEP   = 50;    // vertical gap between nodes in same column

// Namespace block gap (overview stacking)
const NS_BLOCK_GAP = 60;

// ─── Colors ───────────────────────────────────────────────────────────────────
const NS_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#06b6d4',
  '#ec4899','#a78bfa','#34d399','#fb923c',
  '#38bdf8','#f472b6',
];
const _colorCache = {};
let _colorIdx = 0;
export function getNsColor(ns) {
  if (!_colorCache[ns]) _colorCache[ns] = NS_COLORS[_colorIdx++ % NS_COLORS.length];
  return _colorCache[ns];
}

function selectorMatch(selector, labels) {
  if (!selector || !labels) return false;
  return Object.entries(selector).every(([k, v]) => labels[k] === v);
}

/** Compute WorkerNode group height from pod count */
function knHeight(podCount) {
  const n = podCount || 1;
  return KN_HEADER_H + KN_PAD_V + n * POD_H + (n - 1) * POD_V_GAP + KN_PAD_V;
}

// ─── Build one namespace block ────────────────────────────────────────────────
/**
 * Builds nodes + edges for one namespace using Dagre LR layout.
 * All resulting node positions are absolute (no parentId on WorkerGroup
 * for dagre calculation — parentId is added after positions are resolved).
 *
 * @param {number} offsetX  — shift entire block by this X (for overview stacking)
 * @param {number} offsetY  — shift entire block by this Y
 * @returns { nodes, edges, blockWidth, blockHeight }
 */
function buildNsBlock(ns, k8sNodes, allPods, allServices, offsetX = 40, offsetY = 40) {
  const pods     = allPods.filter(p => p.namespace === ns);
  const services = allServices.filter(s => s.namespace === ns);
  const color    = getNsColor(ns);

  // ── Group pods by worker node ──────────────────────────────────────────────
  const activeKnodes = k8sNodes.filter(kn => pods.some(p => p.nodeName === kn.name));
  const unscheduled  = pods.filter(p => !p.nodeName);

  const knGroups = [
    ...activeKnodes.map(kn => ({
      kn,
      pods: pods.filter(p => p.nodeName === kn.name),
      isUnscheduled: false,
    })),
    ...(unscheduled.length > 0
      ? [{ kn: { name: 'unscheduled', status: 'Pending', capacity: {} }, pods: unscheduled, isUnscheduled: true }]
      : []),
  ];

  // ── Build Dagre graph ──────────────────────────────────────────────────────
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',      // Left → Right
    ranksep: RANK_SEP,  // gap between rank columns
    nodesep: NODE_SEP,  // gap between nodes in same rank
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add service nodes to Dagre (rank 0 — leftmost)
  services.forEach(svc => {
    g.setNode(`svc-${ns}-${svc.name}`, { width: SVC_W, height: SVC_H });
  });

  // Add worker-node groups to Dagre (rank 1 — right of services)
  knGroups.forEach(({ kn, pods: knPods }) => {
    const h = knHeight(knPods.length);
    g.setNode(`kn-${ns}-${kn.name}`, { width: KN_W, height: h });
  });

  // Add edges Service → WorkerNode (for dagre routing only)
  services.forEach(svc => {
    knGroups.forEach(({ kn, pods: knPods }) => {
      const hasMatch = knPods.some(pod => selectorMatch(svc.selector, pod.labels));
      if (hasMatch) {
        g.setEdge(`svc-${ns}-${svc.name}`, `kn-${ns}-${kn.name}`);
      }
    });
  });

  // Run Dagre layout
  dagre.layout(g);

  // ── Extract positions from Dagre ───────────────────────────────────────────
  // Dagre gives center-based coords; React Flow uses top-left.
  const flowNodes = [];
  const flowEdges = [];

  // Compute bounding box of all dagre nodes to shift by offsetX/offsetY
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  g.nodes().forEach(id => {
    const n = g.node(id);
    minX = Math.min(minX, n.x - n.width / 2);
    minY = Math.min(minY, n.y - n.height / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    maxY = Math.max(maxY, n.y + n.height / 2);
  });
  const blockWidth  = maxX - minX;
  const blockHeight = maxY - minY;

  const shiftX = offsetX - minX;
  const shiftY = offsetY - minY;

  // ── Service nodes (absolute, no parentId) ─────────────────────────────────
  services.forEach(svc => {
    const id  = `svc-${ns}-${svc.name}`;
    const dn  = g.node(id);
    flowNodes.push({
      id,
      type: 'serviceCard',
      position: {
        x: dn.x - dn.width / 2  + shiftX,
        y: dn.y - dn.height / 2 + shiftY,
      },
      data: { service: svc, color },
      style: { width: SVC_W, height: SVC_H, zIndex: 20 },
    });
  });

  // ── WorkerNode groups + pod cards ─────────────────────────────────────────
  knGroups.forEach(({ kn, pods: knPods, isUnscheduled }) => {
    const knColor  = isUnscheduled ? '#6b7280' : color;
    const knId     = `kn-${ns}-${kn.name}`;
    const dn       = g.node(knId);
    const knAbsX   = dn.x - dn.width  / 2 + shiftX;
    const knAbsY   = dn.y - dn.height / 2 + shiftY;

    flowNodes.push({
      id: knId,
      type: 'workerGroup',
      position: { x: knAbsX, y: knAbsY },
      data: { node: kn, color: knColor, isUnscheduled },
      style: { width: KN_W, height: dn.height, zIndex: -5 },
    });

    // Pods — stacked vertically INSIDE WorkerNode (relative positions)
    knPods.forEach((pod, idx) => {
      const podId = `pod-${ns}-${pod.name}`;
      flowNodes.push({
        id: podId,
        type: 'podCard',
        parentId: knId,
        extent: 'parent',
        position: {
          x: KN_PAD_H,
          y: KN_HEADER_H + KN_PAD_V + idx * (POD_H + POD_V_GAP),
        },
        data: { pod },
        style: { width: POD_W, height: POD_H, zIndex: 10 },
      });
    });
  });

  // ── Real edges: Service → matched Pods (animated smoothstep) ──────────────
  services.forEach(svc => {
    const svcId = `svc-${ns}-${svc.name}`;
    pods.forEach(pod => {
      if (selectorMatch(svc.selector, pod.labels)) {
        flowEdges.push({
          id: `e-${ns}-${svc.name}-${pod.name}`,
          source: svcId,
          target: `pod-${ns}-${pod.name}`,
          animated: true,
          type: 'smoothstep',
          zIndex: 9999,
          style: { stroke: color, strokeWidth: 2, opacity: 1 },
          markerEnd: { type: 'arrowclosed', color, width: 14, height: 14 },
          label: svc.ports?.[0]?.port ? `:${svc.ports[0].port}` : '',
          labelStyle: { fontSize: 10, fill: color, fontWeight: 700 },
          labelBgStyle: { fill: '#060b14', fillOpacity: 0.95, borderRadius: 3 },
        });
      }
    });
  });

  return { nodes: flowNodes, edges: flowEdges, blockWidth, blockHeight };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Single namespace tab */
export function buildGraphForNamespace(ns, k8sNodes, allPods, allServices) {
  const { nodes, edges } = buildNsBlock(ns, k8sNodes, allPods, allServices, 40, 40);
  return { nodes, edges };
}

/** All namespaces — stacked vertically, each with its own Dagre layout */
export function buildOverviewGraph(k8sNodes, pods, services) {
  const namespaces = [
    ...new Set([...pods.map(p => p.namespace), ...services.map(s => s.namespace)]),
  ].sort();

  const allNodes = [];
  const allEdges = [];
  let currentY = 40;

  namespaces.forEach(ns => {
    const { nodes, edges, blockHeight } = buildNsBlock(
      ns, k8sNodes, pods, services, 40, currentY
    );
    allNodes.push(...nodes);
    allEdges.push(...edges);
    currentY += blockHeight + NS_BLOCK_GAP;
  });

  return { nodes: allNodes, edges: allEdges };
}
