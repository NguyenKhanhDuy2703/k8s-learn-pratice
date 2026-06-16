/**
 * ClusterDiagram.jsx
 *
 * React Flow canvas — dùng chung cho tab namespace lẫn tab "All".
 * Nhận nodes/edges đã được build sẵn từ bên ngoài.
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

import NodeGroupNode   from './nodes/NodeGroupNode';
import PodNode         from './nodes/PodNode';
import ServiceNode     from './nodes/ServiceNode';
import NamespaceGroup  from './nodes/NamespaceGroup';
import PodSidebar      from './PodSidebar';

const NODE_TYPES = {
  namespaceGroup: NamespaceGroup,
  nodeGroup:      NodeGroupNode,
  podNode:        PodNode,
  serviceNode:    ServiceNode,
};

export default function ClusterDiagram({ nodes: rawNodes, edges }) {
  const [selectedPod, setSelectedPod] = useState(null);

  // Inject onClick vào podNode data
  const nodes = useMemo(
    () => rawNodes.map(n =>
      n.type === 'podNode'
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
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          style={{ background: '#060b14', width: '100%', height: '100%' }}
        >
          <Background color="#0d1525" gap={28} size={1} />
          <Controls
            style={{ background: '#0f172a', borderColor: '#1e293b', color: '#64748b' }}
          />
          <MiniMap
            style={{ background: '#060b14', borderColor: '#1e293b' }}
            maskColor="rgba(6,11,20,0.75)"
            nodeColor={n => {
              if (n.type === 'namespaceGroup') return 'transparent';
              if (n.type === 'nodeGroup')      return '#1e293b';
              if (n.type === 'podNode')        return '#16a34a';
              if (n.type === 'serviceNode')    return '#3b82f6';
              return '#334155';
            }}
          />
        </ReactFlow>
      </ReactFlowProvider>

      <PodSidebar pod={selectedPod} onClose={() => setSelectedPod(null)} />
    </div>
  );
}
