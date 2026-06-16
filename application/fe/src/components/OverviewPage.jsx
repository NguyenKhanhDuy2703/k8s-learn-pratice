/**
 * OverviewPage.jsx
 *
 * Trang "All" — card grid theo namespace.
 * Click badge ⚠ → mở WarningPanel bên phải.
 * Click card header → chuyển sang tab namespace đó.
 * Click pod trong WarningPanel → mở PodSidebar.
 */

import { useState } from 'react';
import { analyzeWarnings } from '../utils/warnings';
import WarningPanel from './WarningPanel';
import PodSidebar   from './PodSidebar';

// ─── Màu namespace ────────────────────────────────────────────────────────────
const NS_COLORS = [
  '#6366f1','#22c55e','#f59e0b','#06b6d4',
  '#ec4899','#a78bfa','#34d399','#fb923c',
  '#38bdf8','#f472b6',
];
const _cache = {};
let _idx = 0;
function nsColor(ns) {
  if (!_cache[ns]) _cache[ns] = NS_COLORS[_idx++ % NS_COLORS.length];
  return _cache[ns];
}

// ─── Status dot ───────────────────────────────────────────────────────────────
const DOT = {
  Running:  { color: '#4ade80', glow: true  },
  Pending:  { color: '#fbbf24', glow: false },
  Failed:   { color: '#f87171', glow: false },
  Succeeded:{ color: '#60a5fa', glow: false },
  Unknown:  { color: '#94a3b8', glow: false },
};
function dot(pod) {
  if (pod.restartCount >= 20) return { color: '#f87171', glow: false };
  if (pod.restartCount >= 5)  return { color: '#fbbf24', glow: false };
  return DOT[pod.status] || DOT.Unknown;
}

// ─── Group pods → apps ────────────────────────────────────────────────────────
function groupByApp(pods) {
  const map = {};
  pods.forEach(pod => {
    const key =
      pod.labels?.['app'] ||
      pod.labels?.['app.kubernetes.io/name'] ||
      pod.labels?.['k8s-app'] ||
      pod.name.replace(/-[a-z0-9]{7,10}(-[a-z0-9]{4,6})?$/, '');
    if (!map[key]) map[key] = { name: key, pods: [] };
    map[key].pods.push(pod);
  });
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OverviewPage({ pods, services, onSelectNamespace }) {
  const [warningCtx, setWarningCtx] = useState(null); // { ns, warnings }
  const [selectedPod, setSelectedPod] = useState(null);

  const namespaces = [...new Set(pods.map(p => p.namespace))].sort();

  // Tổng cảnh báo toàn cluster cho header
  const allWarnings = analyzeWarnings(pods);

  function openWarnings(ns, e) {
    e.stopPropagation(); // không trigger card click
    const nsPods = ns === '__all__' ? pods : pods.filter(p => p.namespace === ns);
    setWarningCtx({ ns: ns === '__all__' ? null : ns, warnings: analyzeWarnings(nsPods) });
  }

  if (namespaces.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
        No pods found in cluster
      </div>
    );
  }

  return (
    <>
      <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
              Cluster Overview
            </h1>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              {namespaces.length} namespaces · {pods.length} pods
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Global warning button */}
          {allWarnings.length > 0 && (
            <button
              onClick={e => openWarnings('__all__', e)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#1a0a0a', border: '1px solid #dc262655',
                borderRadius: 8, padding: '7px 14px',
                color: '#f87171', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#2d1010'}
              onMouseLeave={e => e.currentTarget.style.background = '#1a0a0a'}
            >
              <span>⚠️</span>
              <span>{allWarnings.filter(w => w.severity === 'critical').length} critical</span>
              <span style={{ color: '#475569' }}>·</span>
              <span style={{ color: '#fbbf24' }}>{allWarnings.filter(w => w.severity === 'warning').length} warnings</span>
              <span style={{ color: '#334155', marginLeft: 2 }}>— View all</span>
            </button>
          )}
        </div>

        {/* ── Card grid ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}>
          {namespaces.map(ns => (
            <NsCard
              key={ns}
              ns={ns}
              pods={pods.filter(p => p.namespace === ns)}
              services={services.filter(s => s.namespace === ns)}
              color={nsColor(ns)}
              onClickCard={() => onSelectNamespace(ns)}
              onClickWarning={e => openWarnings(ns, e)}
            />
          ))}
        </div>
      </div>

      {/* ── Warning panel ─────────────────────────────────────────────── */}
      {warningCtx && (
        <WarningPanel
          warnings={warningCtx.warnings}
          namespace={warningCtx.ns}
          onClose={() => setWarningCtx(null)}
          onSelectPod={pod => {
            setWarningCtx(null);
            setSelectedPod(pod);
          }}
        />
      )}

      {/* ── Pod detail sidebar ────────────────────────────────────────── */}
      <PodSidebar pod={selectedPod} onClose={() => setSelectedPod(null)} />
    </>
  );
}

// ─── Namespace card ───────────────────────────────────────────────────────────
function NsCard({ ns, pods, services, color, onClickCard, onClickWarning }) {
  const apps      = groupByApp(pods);
  const running   = pods.filter(p => p.status === 'Running').length;
  const warnings  = analyzeWarnings(pods);
  const criticals = warnings.filter(w => w.severity === 'critical').length;
  const warns     = warnings.filter(w => w.severity === 'warning').length;
  const hasIssues = warnings.length > 0;

  return (
    <div
      style={{
        background: '#0a1020',
        border: `1.5px solid ${color}33`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor  = `${color}88`;
        e.currentTarget.style.boxShadow    = `0 4px 20px ${color}18`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${color}33`;
        e.currentTarget.style.boxShadow   = 'none';
      }}
    >
      {/* Card header */}
      <div
        onClick={onClickCard}
        style={{
          background: `${color}14`,
          borderBottom: `1px solid ${color}22`,
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14 }}>📦</span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ns}
        </span>

        {/* Stats */}
        <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, flexShrink: 0 }}>
          {running} running
        </span>

        {/* Warning badge — clickable */}
        {hasIssues && (
          <button
            onClick={onClickWarning}
            title={`${criticals} critical, ${warns} warning — click to view`}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: criticals > 0 ? '#450a0a' : '#3f2a00',
              border: `1px solid ${criticals > 0 ? '#dc2626' : '#d97706'}55`,
              borderRadius: 99,
              padding: '2px 8px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10 }}>⚠</span>
            {criticals > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#f87171' }}>{criticals}</span>
            )}
            {warns > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginLeft: criticals > 0 ? 3 : 0 }}>{warns}</span>
            )}
          </button>
        )}

        <span style={{ fontSize: 11, color: `${color}66` }}>→</span>
      </div>

      {/* App rows */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {apps.map(app => (
          <AppRow key={app.name} app={app} />
        ))}

        {/* Services */}
        {services.length > 0 && (
          <div style={{
            marginTop: 4, paddingTop: 8,
            borderTop: '1px solid #1e293b',
            display: 'flex', gap: 5, flexWrap: 'wrap',
          }}>
            {services.map(svc => (
              <span
                key={svc.name}
                title={`${svc.type} · port ${svc.ports?.[0]?.port || '-'} · ${svc.clusterIP}`}
                style={{
                  fontSize: 10,
                  background: '#0f172a', border: '1px solid #1e293b',
                  borderRadius: 4, padding: '2px 7px',
                  color: '#475569', fontFamily: 'monospace',
                }}
              >
                🔗 {svc.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App row ──────────────────────────────────────────────────────────────────
function AppRow({ app }) {
  const total   = app.pods.length;
  const running = app.pods.filter(p => p.status === 'Running').length;
  const hasErr  = app.pods.some(p => p.status === 'Failed' || p.restartCount >= 5);
  const ratio   = running === total
    ? '#4ade80'
    : hasErr ? '#f87171' : '#fbbf24';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 8px', borderRadius: 6,
      background: '#060b14',
    }}>
      <span style={{
        flex: 1, fontSize: 12, color: '#94a3b8',
        fontFamily: 'monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {app.name}
      </span>

      {/* Pod dots */}
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
        {app.pods.slice(0, 8).map((pod, i) => {
          const d = dot(pod);
          return (
            <span key={i}
              title={`${pod.name}\nStatus: ${pod.status}\nRestarts: ${pod.restartCount}`}
              style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: d.color,
                boxShadow: d.glow ? `0 0 5px ${d.color}` : 'none',
                cursor: 'default',
              }}
            />
          );
        })}
        {app.pods.length > 8 && (
          <span style={{ fontSize: 10, color: '#475569' }}>+{app.pods.length - 8}</span>
        )}
      </div>

      {/* running/total */}
      <span style={{ fontSize: 11, fontWeight: 700, color: ratio, flexShrink: 0, minWidth: 28, textAlign: 'right' }}>
        {running}/{total}
      </span>
    </div>
  );
}
