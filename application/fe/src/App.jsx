/**
 * App.jsx
 *
 * Layout:
 *   ┌─ StatusBar ──────────────────────────────────────┐
 *   ├─ NsTabBar: [All][default][kube-system]…[Terminal]┤
 *   └─ Content area ───────────────────────────────────┘
 *
 * Mỗi namespace tab có diagram riêng (chỉ pods/services của ns đó).
 * Tab "All" hiển thị overview tất cả namespace.
 * Tab "Terminal" → kubectl terminal.
 */

import { useState, useMemo } from 'react';
import { useClusterData }       from './hooks/useClusterData';
import { buildGraphForNamespace } from './utils/buildGraph';
import StatusBar      from './components/StatusBar';
import NsTabBar       from './components/NsTabBar';
import ClusterDiagram from './components/ClusterDiagram';
import OverviewPage   from './components/OverviewPage';
import Terminal       from './components/Terminal';

export default function App() {
  const { nodes: k8sNodes, pods, services, loading, error, wsStatus } = useClusterData();
  const [activeTab, setActiveTab] = useState('__all__');

  // Danh sách namespace unique, sorted
  const namespaces = useMemo(() => (
    [...new Set([
      ...pods.map(p => p.namespace),
      ...services.map(s => s.namespace),
    ])].sort()
  ), [pods, services]);

  // Nếu activeTab không còn tồn tại (namespace bị xoá) -> về All
  const safeTab = (activeTab === '__all__' || activeTab === '__terminal__' || namespaces.includes(activeTab))
    ? activeTab
    : '__all__';

  // Build graph chỉ khi đang ở tab namespace cụ thể
  const { nodes: graphNodes, edges: graphEdges } = useMemo(() => {
    if (loading || error || safeTab === '__all__' || safeTab === '__terminal__') {
      return { nodes: [], edges: [] };
    }
    return buildGraphForNamespace(safeTab, k8sNodes, pods, services);
  }, [safeTab, k8sNodes, pods, services, loading, error]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#060b14' }}>

      <StatusBar
        nodes={k8sNodes}
        pods={pods}
        services={services}
        wsStatus={wsStatus}
        loading={loading}
        error={error}
      />

      <NsTabBar
        namespaces={namespaces}
        pods={pods}
        activeTab={safeTab}
        onChange={setActiveTab}
      />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {loading && <LoadingScreen />}
        {!loading && error && <ErrorScreen error={error} />}

        {/* Overview — tất cả namespace dạng card */}
        {!loading && !error && safeTab === '__all__' && (
          <OverviewPage
            pods={pods}
            services={services}
            onSelectNamespace={setActiveTab}
          />
        )}

        {/* Diagram — 1 namespace cụ thể */}
        {!loading && !error && safeTab !== '__all__' && safeTab !== '__terminal__' && (
          <ClusterDiagram
            key={safeTab}
            nodes={graphNodes}
            edges={graphEdges}
          />
        )}

        {/* Terminal */}
        {safeTab === '__terminal__' && (
          <div style={{ width: '100%', height: '100%' }}>
            <Terminal />
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={centerStyle}>
      <div style={{ textAlign: 'center', color: '#475569' }}>
        <div style={{ fontSize: 52, marginBottom: 16, animation: 'spin 2s linear infinite' }}>☸</div>
        <div style={{ fontSize: 14, color: '#64748b' }}>Connecting to cluster…</div>
      </div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div style={centerStyle}>
      <div style={{
        background: '#0f172a',
        border: '1px solid #ef444440',
        borderRadius: 14,
        padding: '36px 40px',
        maxWidth: 480,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginBottom: 10 }}>
          Cannot connect to cluster
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
          {error}
        </div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
          Make sure:<br />
          • Backend running on <code style={{ color: '#818cf8' }}>localhost:3001</code><br />
          • <code style={{ color: '#818cf8' }}>~/.kube/config</code> points to a running cluster
        </div>
      </div>
    </div>
  );
}

const centerStyle = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#060b14',
};
