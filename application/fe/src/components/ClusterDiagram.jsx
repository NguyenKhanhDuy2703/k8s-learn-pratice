/**
 * ClusterDiagram.jsx — ArgoCD-style Left-Right layout (Dagre-powered)
 *
 * Node hierarchy:
 *   ServiceCard  →(smoothstep edge)→  PodCard  (inside WorkerGroup)
 *
 * WorkerGroup is a visual container (no handles).
 * Edges always render above all nodes via zIndex: 9999 + elevateEdgesOnSelect.
 */

import { useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import NsGroup     from './nodes/NsGroup';
import WorkerGroup from './nodes/WorkerGroup';
import ServiceCard from './nodes/ServiceCard';
import PodCard     from './nodes/PodCard';
import PodSidebar  from './PodSidebar';

const NODE_TYPES = {
  nsGroup:     NsGroup,
  workerGroup: WorkerGroup,
  serviceCard: ServiceCard,
  podCard:     PodCard,
};

export default function ClusterDiagram({ nodes: rawNodes, edges }) {
  const [selectedPod, setSelectedPod] = useState(null);

  const nodes = useMemo(
    () =>
      rawNodes.map(n =>
        n.type === 'podCard'
          ? { ...n, data: { ...n.data, onClick: setSelectedPod } }
          : n
      ),
    [rawNodes]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          connectOnClick={false}
          nodesConnectable={false}
          edgesUpdatable={false}
          nodesDraggable={true}
          elevateEdgesOnSelect={true}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'smoothstep', zIndex: 9999 }}
          style={{ background: '#060b14', width: '100%', height: '100%' }}
        >
          <Background color="#0d1525" gap={32} size={1} />
          <Controls
            style={{
              background: '#0f172a',
              borderColor: '#1e293b',
              color: '#64748b',
            }}
          />
          <MiniMap
            style={{ background: '#060b14', borderColor: '#1e293b' }}
            maskColor="rgba(6,11,20,0.75)"
            nodeColor={n => {
              if (n.type === 'nsGroup')     return 'transparent';
              if (n.type === 'workerGroup') return '#0f172a';
              if (n.type === 'podCard')     return '#16a34a';
              if (n.type === 'serviceCard') return '#3b82f6';
              return '#334155';
            }}
          />
        </ReactFlow>
      </ReactFlowProvider>

      <PodSidebar pod={selectedPod} onClose={() => setSelectedPod(null)} />
    </div>
  );
}
