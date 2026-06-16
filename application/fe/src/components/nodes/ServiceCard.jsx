/**
 * ServiceCard.jsx
 * Source handle RIGHT — edges go LEFT→RIGHT to PodCards (ArgoCD-style).
 */
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const TYPE_STYLE = {
  ClusterIP:    { icon: '🔵', badge: '#1e3a5f', badgeTxt: '#93c5fd', border: '#3b82f6' },
  NodePort:     { icon: '🟡', badge: '#3f2a00', badgeTxt: '#fcd34d', border: '#f59e0b' },
  LoadBalancer: { icon: '🌐', badge: '#0a2e36', badgeTxt: '#67e8f9', border: '#06b6d4' },
  ExternalName: { icon: '🔗', badge: '#2e1065', badgeTxt: '#c4b5fd', border: '#7c3aed' },
};

function ServiceCard({ data }) {
  const { service: svc } = data;
  const ts       = TYPE_STYLE[svc.type] || TYPE_STYLE.ClusterIP;
  const portsStr = svc.ports?.map(p => p.port).join(', ') || '';

  const shortName =
    svc.name.length > 22 ? svc.name.slice(0, 10) + '…' + svc.name.slice(-10) : svc.name;

  return (
    <>
      <div
        title={`${svc.namespace}/${svc.name}\nType: ${svc.type}\nClusterIP: ${svc.clusterIP}\nPorts: ${portsStr}`}
        style={{
          width: '100%',
          height: '100%',
          border: `1.5px solid ${ts.border}`,
          borderRadius: 10,
          background: '#0f172a',
          padding: '9px 13px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          boxShadow: `0 0 18px ${ts.border}44`,
        }}
      >
        {/* Icon + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{ts.icon}</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#f1f5f9',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              flex: 1,
            }}
          >
            {shortName}
          </span>
        </div>

        {/* Type badge + port */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: 10,
              padding: '2px 9px',
              borderRadius: 99,
              background: ts.badge,
              color: ts.badgeTxt,
              fontWeight: 700,
            }}
          >
            {svc.type}
          </span>
          {portsStr && (
            <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
              :{portsStr}
            </span>
          )}
        </div>

        {/* ClusterIP */}
        <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>
          {svc.clusterIP}
        </div>
      </div>

      {/* → Edge exits RIGHT toward pods */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: ts.border, width: 9, height: 9, border: 'none', right: -5 }}
      />
    </>
  );
}

export default memo(ServiceCard);
