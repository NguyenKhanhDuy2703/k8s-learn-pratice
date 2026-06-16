/**
 * buildGraph.js
 *
 * Hai hàm export:
 *
 * buildGraphForNamespace(ns, k8sNodes, pods, services)
 *   -> render diagram cho 1 namespace cụ thể
 *   -> Layout: Services (trái) ──→ K8s Node group (phải, chứa Pods)
 *
 * buildOverviewGraph(k8sNodes, pods, services)
 *   -> render tất cả namespace trên 1 canvas (tab "All")
 *   -> Mỗi namespace là 1 khung bọc ngoài, xếp dọc
 */

// ─── Constants ───────────────────────────────────────────────────────────────
const SVC_X        = 60;
const SVC_WIDTH    = 210;
const SVC_HEIGHT   = 92;
const SVC_GAP      = 14;

const NODE_X       = 340;   // cột K8s Node (relative to namespace wrapper)
const NODE_WIDTH   = 560;
const NODE_PAD     = 14;
const NODE_HEADER  = 50;

const POD_W        = 152;
const POD_H        = 70;
const PODS_PER_ROW = 3;
const POD_COL_GAP  = 10;
const POD_ROW_GAP  = 10;

const NS_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#06b6d4',
  '#ec4899','#a78bfa','#34d399','#fb923c',
  '#38bdf8','#f472b6',
];

// Map namespace -> màu cố định (tránh đổi màu khi re-render)
const _nsColorCache = {};
let _nsColorIdx = 0;
function getNsColor(ns) {
  if (!_nsColorCache[ns]) {
    _nsColorCache[ns] = NS_COLORS[_nsColorIdx++ % NS_COLORS.length];
  }
  return _nsColorCache[ns];
}

/** Tất cả key-value trong selector phải xuất hiện trong labels */
function selectorMatch(selector, labels) {
  if (!selector || !labels) return false;
  return Object.entries(selector).every(([k, v]) => labels[k] === v);
}

/** Chiều cao K8s Node group dựa vào số pod */
function nodeGroupH(podCount) {
  const rows = Math.ceil(podCount / PODS_PER_ROW) || 1;
  return NODE_HEADER + NODE_PAD + rows * (POD_H + POD_ROW_GAP);
}

// ─── Build cho 1 namespace ───────────────────────────────────────────────────
/**
 * @param {string}   ns
 * @param {object[]} k8sNodes  - tất cả K8s nodes của cluster
 * @param {object[]} pods      - đã lọc theo ns
 * @param {object[]} services  - đã lọc theo ns
 */
export function buildGraphForNamespace(ns, k8sNodes, allPods, allServices) {
  const pods     = allPods.filter(p => p.namespace === ns);
  const services = allServices.filter(s => s.namespace === ns);
  const color    = getNsColor(ns);

  const flowNodes = [];
  const flowEdges = [];

  // Nodes có pod trong namespace này
  const activeNodes = k8sNodes.filter(kn => pods.some(p => p.nodeName === kn.name));
  const unscheduled = pods.filter(p => !p.nodeName);

  // ── Tính layout ─────────────────────────────────────────────────────────
  // Tổng chiều cao cột services
  const svcColH = services.length * (SVC_HEIGHT + SVC_GAP);

  // Tổng chiều cao cột nodes
  let nodeColH = 0;
  activeNodes.forEach(kn => {
    nodeColH += nodeGroupH(pods.filter(p => p.nodeName === kn.name).length) + 14;
  });
  if (unscheduled.length > 0) {
    nodeColH += nodeGroupH(unscheduled.length) + 14;
  }

  const startY = 40;

  // ── Services ──────────────────────────────────────────────────────────────
  services.forEach((svc, i) => {
    const svcId = `svc-${ns}-${svc.name}`;
    flowNodes.push({
      id: svcId,
      type: 'serviceNode',
      position: { x: SVC_X, y: startY + i * (SVC_HEIGHT + SVC_GAP) },
      data: { service: svc, color },
      style: { width: SVC_WIDTH, height: SVC_HEIGHT },
    });
  });

  // ── K8s Node groups + Pods ────────────────────────────────────────────────
  let nodeY = startY;

  activeNodes.forEach(kn => {
    const knPods = pods.filter(p => p.nodeName === kn.name);
    const grpH   = nodeGroupH(knPods.length);
    const knId   = `kn-${ns}-${kn.name}`;

    flowNodes.push({
      id: knId,
      type: 'nodeGroup',
      position: { x: NODE_X, y: nodeY },
      data: { node: kn, color },
      style: { width: NODE_WIDTH, height: grpH },
    });

    knPods.forEach((pod, idx) => {
      const col   = idx % PODS_PER_ROW;
      const row   = Math.floor(idx / PODS_PER_ROW);
      const podId = `pod-${ns}-${pod.name}`;

      flowNodes.push({
        id: podId,
        type: 'podNode',
        parentId: knId,
        extent: 'parent',
        position: {
          x: NODE_PAD + col * (POD_W + POD_COL_GAP),
          y: NODE_HEADER + row * (POD_H + POD_ROW_GAP),
        },
        data: { pod },
        style: { width: POD_W, height: POD_H },
      });
    });

    nodeY += grpH + 14;
  });

  // Unscheduled (Pending)
  if (unscheduled.length > 0) {
    const grpH      = nodeGroupH(unscheduled.length);
    const pendingId = `kn-${ns}-unscheduled`;

    flowNodes.push({
      id: pendingId,
      type: 'nodeGroup',
      position: { x: NODE_X, y: nodeY },
      data: { node: { name: 'unscheduled', status: 'Pending', capacity: {} }, color: '#6b7280' },
      style: { width: NODE_WIDTH, height: grpH },
    });

    unscheduled.forEach((pod, idx) => {
      const col = idx % PODS_PER_ROW;
      const row = Math.floor(idx / PODS_PER_ROW);

      flowNodes.push({
        id: `pod-${ns}-${pod.name}`,
        type: 'podNode',
        parentId: pendingId,
        extent: 'parent',
        position: {
          x: NODE_PAD + col * (POD_W + POD_COL_GAP),
          y: NODE_HEADER + row * (POD_H + POD_ROW_GAP),
        },
        data: { pod },
        style: { width: POD_W, height: POD_H },
      });
    });
  }

  // ── Edges: Service → Pod ──────────────────────────────────────────────────
  services.forEach(svc => {
    pods.forEach(pod => {
      if (selectorMatch(svc.selector, pod.labels)) {
        flowEdges.push({
          id: `e-${ns}-${svc.name}-${pod.name}`,
          source: `svc-${ns}-${svc.name}`,
          target: `pod-${ns}-${pod.name}`,
          animated: true,
          type: 'smoothstep',
          style: { stroke: color, strokeWidth: 1.5, opacity: 0.85 },
          markerEnd: { type: 'arrowclosed', color, width: 14, height: 14 },
          label: svc.ports?.[0]?.port ? `:${svc.ports[0].port}` : '',
          labelStyle: { fontSize: 10, fill: color, fontWeight: 700 },
          labelBgStyle: { fill: '#060b14', fillOpacity: 0.9, borderRadius: 3 },
        });
      }
    });
  });

  return { nodes: flowNodes, edges: flowEdges };
}

// ─── Overview: tất cả namespaces trên 1 canvas ───────────────────────────────
export function buildOverviewGraph(k8sNodes, pods, services) {
  const namespaces = [...new Set([
    ...pods.map(p => p.namespace),
    ...services.map(s => s.namespace),
  ])].sort();

  const allNodes = [];
  const allEdges = [];
  let currentY = 40;

  namespaces.forEach(ns => {
    const color    = getNsColor(ns);
    const nsPods   = pods.filter(p => p.namespace === ns);
    const nsSvcs   = services.filter(s => s.namespace === ns);

    const { nodes: nsNodes, edges: nsEdges } =
      buildGraphForNamespace(ns, k8sNodes, pods, services);

    // Tính bounding box để wrap trong namespace group
    let maxY = 0;
    nsNodes.forEach(n => {
      if (!n.parentId) {
        const bottom = n.position.y + (n.style?.height || 100);
        if (bottom > maxY) maxY = bottom;
      }
    });

    const wrapperH  = maxY + 50;
    const wrapperW  = NODE_X + NODE_WIDTH + 60;
    const wrapperId = `ns-wrap-${ns}`;

    // Namespace wrapper
    allNodes.push({
      id: wrapperId,
      type: 'namespaceGroup',
      position: { x: 20, y: currentY },
      data: { namespace: ns, color, podCount: nsPods.length, svcCount: nsSvcs.length },
      style: { width: wrapperW, height: wrapperH, zIndex: -1 },
    });

    // Offset tất cả nodes của namespace vào trong wrapper
    nsNodes.forEach(n => {
      if (!n.parentId) {
        allNodes.push({
          ...n,
          parentId: wrapperId,
          extent: 'parent',
          position: { x: n.position.x, y: n.position.y },
          style: { ...n.style, zIndex: (n.style?.zIndex || 0) + 5 },
        });
      } else {
        allNodes.push(n); // pod/group đã có parentId -> giữ nguyên
      }
    });

    allEdges.push(...nsEdges);
    currentY += wrapperH + 50;
  });

  return { nodes: allNodes, edges: allEdges };
}
