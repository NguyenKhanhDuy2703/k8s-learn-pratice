/**
 * WarningPanel.jsx
 *
 * Slide-in panel bên phải khi click badge cảnh báo.
 * Hiển thị danh sách pod có vấn đề với severity + reason + detail.
 */

import { SEVERITY } from '../utils/warnings';

export default function WarningPanel({ warnings, namespace, onClose, onSelectPod }) {
  if (!warnings) return null;

  const criticals = warnings.filter(w => w.severity === 'critical');
  const warnItems = warnings.filter(w => w.severity === 'warning');
  const infoItems = warnings.filter(w => w.severity === 'info');

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 2999,
          backdropFilter: 'blur(1px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0,
          width: 420,
          height: '100vh',
          background: '#080d17',
          borderLeft: '1px solid #1e293b',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.7)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          background: '#0a1020',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
              Warnings
            </div>
            <div style={{ fontSize: 11, color: '#475569' }}>
              {namespace ? `namespace: ${namespace}` : 'All namespaces'} · {warnings.length} issue{warnings.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Summary pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {criticals.length > 0 && (
              <Pill count={criticals.length} severity="critical" />
            )}
            {warnItems.length > 0 && (
              <Pill count={warnItems.length} severity="warning" />
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#1e293b', border: 'none', borderRadius: 6,
              color: '#94a3b8', width: 28, height: 28, cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {warnings.length === 0 && (
            <div style={{ textAlign: 'center', color: '#475569', marginTop: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div>No issues detected</div>
            </div>
          )}

          {[...criticals, ...warnItems, ...infoItems].map((w, i) => (
            <WarningCard
              key={i}
              warning={w}
              onClick={() => onSelectPod?.(w.pod)}
            />
          ))}
        </div>

        {/* Footer tip */}
        {warnings.length > 0 && (
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid #1e293b',
            fontSize: 11,
            color: '#334155',
            flexShrink: 0,
          }}>
            Click a card to see pod details · Go to namespace tab for diagram view
          </div>
        )}
      </div>
    </>
  );
}

function WarningCard({ warning, onClick }) {
  const { pod, severity, reason, detail } = warning;
  const sev = SEVERITY[severity];

  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${sev.border}55`,
        borderLeft: `3px solid ${sev.border}`,
        borderRadius: 8,
        background: sev.bg,
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = sev.border}
      onMouseLeave={e => {
        e.currentTarget.style.borderLeftColor = sev.border;
        e.currentTarget.style.borderTopColor    = `${sev.border}55`;
        e.currentTarget.style.borderRightColor  = `${sev.border}55`;
        e.currentTarget.style.borderBottomColor = `${sev.border}55`;
      }}
    >
      {/* Row 1: icon + reason + namespace badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{sev.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: sev.color, flex: 1 }}>
          {reason}
        </span>
        <span style={{
          fontSize: 10, padding: '1px 7px', borderRadius: 99,
          background: '#0f172a', color: '#475569', fontWeight: 600,
          border: '1px solid #1e293b',
        }}>
          {pod.namespace}
        </span>
      </div>

      {/* Row 2: pod name */}
      <div style={{
        fontSize: 11, fontFamily: 'monospace',
        color: '#94a3b8',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        🐳 {pod.name}
      </div>

      {/* Row 3: detail */}
      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
        {detail}
      </div>

      {/* Row 4: restart count nếu có */}
      {pod.restartCount > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            background: '#431407', color: '#fb923c',
            borderRadius: 4, padding: '1px 7px',
          }}>
            ↺ {pod.restartCount} restarts
          </span>
          {pod.nodeName && (
            <span style={{
              fontSize: 10, color: '#475569',
              background: '#0f172a', borderRadius: 4, padding: '1px 7px',
              border: '1px solid #1e293b',
            }}>
              📍 {pod.nodeName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({ count, severity }) {
  const sev = SEVERITY[severity];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 99,
      background: sev.bg, color: sev.color,
      border: `1px solid ${sev.border}66`,
    }}>
      {sev.icon} {count}
    </span>
  );
}
