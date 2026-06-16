/**
 * NsGroup.jsx — Namespace wrapper
 * Purely decorative — no handles, no solid background that hides edges.
 * Uses pointer-events: none so clicks pass through to children.
 */
import { memo } from 'react';

function NsGroup({ data }) {
  const { namespace, color = '#6366f1', podCount = 0, svcCount = 0 } = data;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `2px solid ${color}44`,
        borderRadius: 16,
        // Transparent background — edges won't be hidden under this
        background: `${color}08`,
        boxSizing: 'border-box',
        position: 'relative',
        // Let pointer events fall through to child nodes
        pointerEvents: 'none',
      }}
    >
      {/* Namespace label badge — re-enable pointer events so tooltip shows */}
      <div
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          top: 0,
          left: 18,
          transform: 'translateY(-50%)',
          background: color,
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          padding: '3px 14px 3px 10px',
          borderRadius: 99,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
          boxShadow: `0 2px 12px ${color}55`,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 13 }}>📦</span>
        <span style={{ fontFamily: 'monospace' }}>{namespace}</span>
        <span
          style={{
            opacity: 0.8,
            fontWeight: 400,
            fontSize: 10,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 99,
            padding: '1px 7px',
          }}
        >
          {podCount}p · {svcCount}s
        </span>
      </div>
    </div>
  );
}

export default memo(NsGroup);
