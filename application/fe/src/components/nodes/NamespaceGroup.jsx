/**
 * NamespaceGroup.jsx
 * Khung ngoài cùng bọc toàn bộ resources của 1 namespace.
 */
import { memo } from 'react';

function NamespaceGroup({ data }) {
  const { namespace, color } = data;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `1.5px solid ${color}44`,
        borderRadius: 14,
        background: `${color}08`,
        position: 'relative',
      }}
    >
      {/* Namespace badge */}
      <div
        style={{
          position: 'absolute',
          top: -1,
          left: 16,
          background: color,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 12px',
          borderRadius: '0 0 8px 8px',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          boxShadow: `0 2px 8px ${color}55`,
        }}
      >
        ns: {namespace}
      </div>
    </div>
  );
}

export default memo(NamespaceGroup);
