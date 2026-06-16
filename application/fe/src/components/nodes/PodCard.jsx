/**
 * PodCard.jsx
 * Target handle LEFT — receives smoothstep edges coming from ServiceCard (LR layout).
 */
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const STATUS_MAP = {
  Running:          { bg: '#052e16', border: '#16a34a', dot: '#4ade80', text: '#86efac' },
  Pending:          { bg: '#1c1917', border: '#78716c', dot: '#a8a29e', text: '#d6d3d1' },
  Succeeded:        { bg: '#0c1a2e', border: '#3b82f6', dot: '#60a5fa', text: '#93c5fd' },
  Failed:           { bg: '#2d0a0a', border: '#dc2626', dot: '#f87171', text: '#fca5a5' },
  Unknown:          { bg: '#1e1b2e', border: '#7c3aed', dot: '#a78bfa', text: '#c4b5fd' },
  CrashLoopBackOff: { bg: '#2d0a0a', border: '#dc2626', dot: '#f87171', text: '#fca5a5' },
};

function PodCard({ data }) {
  const { pod, onClick } = data;
  const c       = STATUS_MAP[pod.status] || STATUS_MAP.Unknown;
  const isCrash = pod.status === 'Failed' || pod.restartCount > 5;

  const shortName =
    pod.name.length > 24 ? pod.name.slice(0, 11) + '…' + pod.name.slice(-11) : pod.name;

  return (
    <>
      {/* ← Edge arrives from LEFT (from ServiceCard) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: c.border, width: 8, height: 8, border: 'none', left: -5 }}
      />

      <div
        onClick={() => onClick?.(pod)}
        title={`${pod.namespace}/${pod.name}\nStatus: ${pod.status}\nRestarts: ${pod.restartCount}`}
        style={{
          width: '100%',
          height: '100%',
          border: `1.5px solid ${c.border}`,
          borderRadius: 8,
          background: c.bg,
          padding: '8px 11px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          transition: 'filter 0.15s',
          boxShadow: isCrash ? `0 0 10px ${c.border}88` : 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.3)')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
      >
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>🐳</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#f1f5f9',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              fontFamily: 'monospace',
            }}
          >
            {shortName}
          </span>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: c.dot,
                flexShrink: 0,
                boxShadow: pod.status === 'Running' ? `0 0 6px ${c.dot}` : 'none',
              }}
            />
            <span style={{ fontSize: 10, color: c.text, fontWeight: 600 }}>
              {pod.status}
            </span>
          </div>
          {pod.restartCount > 0 && (
            <span
              style={{
                fontSize: 10,
                background: pod.restartCount > 5 ? '#7f1d1d' : '#431407',
                color:      pod.restartCount > 5 ? '#fca5a5' : '#fdba74',
                borderRadius: 4,
                padding: '1px 6px',
                fontWeight: 700,
              }}
            >
              ↺{pod.restartCount}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default memo(PodCard);
