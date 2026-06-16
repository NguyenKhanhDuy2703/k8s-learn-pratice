/**
 * ServiceNode.jsx
 * Service card — source của các edges tới Pod.
 */
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const TYPE_STYLE = {
  ClusterIP:    { icon: '🔵', badge: '#1e3a5f', badgeTxt: '#93c5fd', border: '#3b82f6' },
  NodePort:     { icon: '🟡', badge: '#3f2a00', badgeTxt: '#fcd34d', border: '#f59e0b' },
  LoadBalancer: { icon: '🌐', badge: '#0a2e36', badgeTxt: '#67e8f9', border: '#06b6d4' },
  ExternalName: { icon: '🔗', badge: '#2e1065', badgeTxt: '#c4b5fd', border: '#7c3aed' },
};

function ServiceNode({ data }) {
  const { service: svc, color = '#6366f1' } = data;
  const ts = TYPE_STYLE[svc.type] || TYPE_STYLE.ClusterIP;

  const shortName = svc.name.length > 22
    ? svc.name.slice(0, 10) + '…' + svc.name.slice(-10)
    : svc.name;

  const portsStr = svc.ports?.map(p => p.port).join(', ') || '';

  return (
    <>
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `1.5px solid ${ts.border}`,
          borderRadius: 9,
          background: '#0f172a',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: `0 0 12px ${ts.border}33`,
        }}
        title={`${svc.namespace}/${svc.name}\nType: ${svc.type}\nClusterIP: ${svc.clusterIP}\nPorts: ${portsStr}`}
      >
        {/* Row 1: icon + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>{ts.icon}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
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

        {/* Row 2: type badge + port */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 99,
              background: ts.badge,
              color: ts.badgeTxt,
              fontWeight: 700,
            }}
          >
            {svc.type}
          </span>
          {portsStr && (
            <span style={{ fontSize: 10, color: '#64748b' }}>:{portsStr}</span>
          )}
        </div>

        {/* ClusterIP */}
        <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>
          {svc.clusterIP}
        </div>
      </div>

      {/* Source handle: mũi tên đi ra phía phải → Pod */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: ts.border, width: 8, height: 8, border: 'none' }}
      />
    </>
  );
}

export default memo(ServiceNode);
