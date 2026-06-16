/**
 * WorkerGroup.jsx — K8s Worker Node wrapper
 * Decorative container for pod cards.
 * Semi-transparent background so edges passing over/under remain visible.
 * pointerEvents: none on container div — only the header re-enables it.
 */
import { memo } from 'react';

function WorkerGroup({ data }) {
  const { node, color = '#334155', isUnscheduled = false } = data;

  const isReady   = node.status === 'Ready';
  const isPending = node.status === 'Pending';

  const statusColor = isPending ? '#6b7280' : isReady ? '#22c55e' : '#ef4444';
  const statusBg    = isPending ? '#37415199' : isReady ? '#14532d99' : '#7f1d1d99';
  const statusTxt   = isPending ? '#d1d5db'   : isReady ? '#86efac'   : '#fca5a5';

  const shortName =
    node.name.length > 24
      ? node.name.slice(0, 11) + '…' + node.name.slice(-11)
      : node.name;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `1.5px solid ${statusColor}55`,
        borderRadius: 12,
        // Very transparent — edges on top remain visible
        background: 'rgba(15, 23, 42, 0.55)',
        boxSizing: 'border-box',
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      {/* Header — re-enable pointer events for tooltips/interaction */}
      <div
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 34,
          borderRadius: '10px 10px 0 0',
          background: `${statusColor}18`,
          borderBottom: `1px solid ${statusColor}33`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 7,
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 12, flexShrink: 0 }}>
          {isUnscheduled ? '⏳' : '🖥️'}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#e2e8f0',
            fontFamily: 'monospace',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={node.name}
        >
          {shortName}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 99,
            background: statusBg,
            color: statusTxt,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {node.status}
        </span>
        {node.capacity?.cpu && (
          <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>
            {node.capacity.cpu} CPU
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(WorkerGroup);
