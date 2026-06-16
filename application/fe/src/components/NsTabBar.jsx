/**
 * NsTabBar.jsx
 *
 * Thanh tab namespace:
 *   [All] [default] [kube-system] [argocd] [monitoring] … [⌨ Terminal]
 *
 * Mỗi tab namespace hiển thị:
 *   - Tên namespace
 *   - Số pod (badge xanh)
 *   - Badge đỏ nếu có pod lỗi
 */

const NS_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#06b6d4',
  '#ec4899','#a78bfa','#34d399','#fb923c',
  '#38bdf8','#f472b6',
];

const _cache = {};
let _idx = 0;
function color(ns) {
  if (!_cache[ns]) _cache[ns] = NS_COLORS[_idx++ % NS_COLORS.length];
  return _cache[ns];
}

export default function NsTabBar({ namespaces, pods, activeTab, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: '#080d17',
        borderBottom: '1px solid #1e293b',
        overflowX: 'auto',
        flexShrink: 0,
        // hide scrollbar but still scrollable
        scrollbarWidth: 'none',
      }}
    >
      {/* ── "All" tab ──────────────────────────────────────────── */}
      <Tab
        label="All"
        icon="☸"
        active={activeTab === '__all__'}
        onClick={() => onChange('__all__')}
        accentColor="#818cf8"
        count={pods.length}
        errorCount={0}
      />

      <div style={{ width: 1, background: '#1e293b', margin: '8px 0', flexShrink: 0 }} />

      {/* ── Namespace tabs ──────────────────────────────────────── */}
      {namespaces.map(ns => {
        const nsPods    = pods.filter(p => p.namespace === ns);
        const errCount  = nsPods.filter(p =>
          p.status === 'Failed' || p.restartCount > 5
        ).length;
        const c = color(ns);

        return (
          <Tab
            key={ns}
            label={ns}
            icon="📦"
            active={activeTab === ns}
            onClick={() => onChange(ns)}
            accentColor={c}
            count={nsPods.length}
            errorCount={errCount}
          />
        );
      })}

      <div style={{ flex: 1 }} />

      <div style={{ width: 1, background: '#1e293b', margin: '8px 0', flexShrink: 0 }} />

      {/* ── Terminal tab ────────────────────────────────────────── */}
      <Tab
        label="Terminal"
        icon="⌨"
        active={activeTab === '__terminal__'}
        onClick={() => onChange('__terminal__')}
        accentColor="#64748b"
        count={null}
        errorCount={0}
      />
    </div>
  );
}

function Tab({ label, icon, active, onClick, accentColor, count, errorCount }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 16px',
        height: 40,
        background: active ? `${accentColor}18` : 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${accentColor}` : '2px solid transparent',
        color: active ? '#f1f5f9' : '#64748b',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#94a3b8'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#64748b'; }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span>{label}</span>

      {/* Pod count badge */}
      {count !== null && count > 0 && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 99,
            background: active ? accentColor : '#1e293b',
            color: active ? '#fff' : '#94a3b8',
            lineHeight: '16px',
          }}
        >
          {count}
        </span>
      )}

      {/* Error badge */}
      {errorCount > 0 && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 99,
            background: '#7f1d1d',
            color: '#fca5a5',
            lineHeight: '16px',
          }}
        >
          ⚠{errorCount}
        </span>
      )}
    </button>
  );
}
