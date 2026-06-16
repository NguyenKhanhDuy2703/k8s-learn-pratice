/**
 * NodeGroupNode.jsx
 * Khung K8s Node — chứa các Pod bên trong.
 */
import { memo } from 'react';

function NodeGroupNode({ data }) {
  const { node, color = '#334155' } = data;
  const isReady   = node.status === 'Ready';
  const isPending = node.status === 'Pending';

  const borderColor = isPending ? '#6b7280' : isReady ? '#22c55e' : '#ef4444';
  const statusBg    = isPending ? '#374151' : isReady ? '#14532d' : '#7f1d1d';
  const statusTxt   = isPending ? '#d1d5db' : isReady ? '#86efac' : '#fca5a5';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `1.5px solid ${borderColor}66`,
        borderRadius: 10,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: `1px solid ${borderColor}33`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16 }}>🖥️</span>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>

        {/* Status badge */}
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: statusBg, color: statusTxt, fontWeight: 700, flexShrink: 0 }}>
          {node.status}
        </span>

        {/* Capacity */}
        {node.capacity?.cpu && (
          <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>
            CPU {node.capacity.cpu} · {node.capacity.memory}
          </span>
        )}
      </div>

      {/* Pods area — children render inside here via React Flow parentId */}
      <div style={{ flex: 1, padding: '8px 8px 4px', position: 'relative' }} />
    </div>
  );
}

export default memo(NodeGroupNode);
