/**
 * PodSidebar.jsx — Chi tiết Pod khi click.
 */

const STATUS_COLOR = {
  Running:  '#4ade80',
  Pending:  '#fbbf24',
  Failed:   '#f87171',
  Unknown:  '#a78bfa',
};

export default function PodSidebar({ pod, onClose }) {
  if (!pod) return null;
  const statusColor = STATUS_COLOR[pod.status] || '#94a3b8';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, right: 0,
        width: 340,
        height: '100vh',
        background: '#0f172a',
        borderLeft: '1px solid #1e293b',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#0a0f1e',
        }}
      >
        <span style={{ fontSize: 20 }}>🐳</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', wordBreak: 'break-all' }}>
            {pod.name}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{pod.namespace}</div>
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

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Status card */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: statusColor }}>{pod.status}</div>
            {pod.restartCount > 0 && (
              <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 2 }}>
                ↺ {pod.restartCount} restart{pod.restartCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Info fields */}
        <Section title="Scheduling">
          <Field label="Node" value={pod.nodeName || '(unscheduled)'} mono />
          <Field label="Namespace" value={pod.namespace} />
        </Section>

        {/* Labels */}
        <Section title="Labels">
          {Object.keys(pod.labels || {}).length === 0 ? (
            <span style={{ fontSize: 12, color: '#475569' }}>No labels</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(pod.labels).map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    fontSize: 11,
                    background: '#1e3a5f',
                    border: '1px solid #3b82f655',
                    borderRadius: 5,
                    padding: '3px 8px',
                    color: '#93c5fd',
                    fontFamily: 'monospace',
                  }}
                >
                  <span style={{ color: '#64748b' }}>{k}=</span>{v}
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontWeight: 700 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 12, color: '#cbd5e1',
        fontFamily: mono ? 'monospace' : 'inherit',
        textAlign: 'right', wordBreak: 'break-all',
      }}>
        {String(value ?? '—')}
      </span>
    </div>
  );
}
