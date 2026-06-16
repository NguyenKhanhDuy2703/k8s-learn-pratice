/**
 * StatusBar.jsx — Header bar với stats + WS indicator.
 */
export default function StatusBar({ nodes, pods, services, wsStatus, loading, error }) {
  const wsColor = { connected: '#22c55e', connecting: '#f59e0b', disconnected: '#ef4444' }[wsStatus] || '#6b7280';
  const wsLabel = { connected: '● Live', connecting: '◌ Connecting', disconnected: '○ Offline' }[wsStatus] || '○';

  const running  = pods.filter(p => p.status === 'Running').length;
  const failing  = pods.filter(p => ['Failed','CrashLoopBackOff'].includes(p.status) || p.restartCount > 5).length;

  return (
    <div style={{
      height: 48, background: '#080d17',
      borderBottom: '1px solid #1e293b',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 20, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>☸</span>
        <span style={{ fontWeight: 800, fontSize: 14, color: '#818cf8', letterSpacing: 0.5 }}>
          K8s Visualizer
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: '#1e293b' }} />

      {/* Stats */}
      {!loading && !error && (
        <>
          <Stat icon="🖥️" label="Nodes"    count={nodes.length}    />
          <Stat icon="🐳" label="Running"  count={running}          color="#4ade80" />
          {failing > 0 && <Stat icon="⚠️" label="Failing"  count={failing}   color="#f87171" />}
          <Stat icon="🔗" label="Services" count={services.length} />
        </>
      )}

      {loading && <span style={{ fontSize: 12, color: '#64748b' }}>Loading cluster data…</span>}
      {error   && <span style={{ fontSize: 12, color: '#f87171' }} title={error}>⚠ Cannot connect to cluster</span>}

      <div style={{ flex: 1 }} />

      {/* WS status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#0f172a', border: '1px solid #1e293b',
        borderRadius: 6, padding: '4px 10px',
      }}>
        <span style={{ fontSize: 11, color: wsColor, fontWeight: 700 }}>{wsLabel}</span>
        <span style={{ fontSize: 11, color: '#475569' }}>WebSocket</span>
      </div>
    </div>
  );
}

function Stat({ icon, label, count, color = '#94a3b8' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
      <span style={{ fontSize: 11, color: '#475569' }}>{label}</span>
    </div>
  );
}
