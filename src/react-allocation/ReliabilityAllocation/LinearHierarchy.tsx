import React from 'react';

interface LinearHierarchyProps {
  nodes: { name: string }[];
  title?: string;
}

// 横向线性分配层级组件，节点圆点-名称-连线紧凑排列
export const LinearHierarchy: React.FC<LinearHierarchyProps> = ({ nodes, title }) => {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: 24, width: '100%', boxSizing: 'border-box' }}>
      {title && <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 16, marginBottom: 16 }}>{title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {nodes.map((node, idx) => (
          <div key={node.name + idx} style={{ display: 'flex', alignItems: 'center', minHeight: 32 }}>
            {/* 左侧圆点 */}
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #bfc7d2', background: '#fff', display: 'inline-block', marginRight: 8 }} />
            {/* 名称 */}
            <span style={{ fontSize: 15, fontWeight: 500, color: '#444', whiteSpace: 'nowrap', marginRight: 8 }}>{node.name}</span>
            {/* 右侧连线，最后一个节点不画线 */}
            {idx !== nodes.length - 1 && (
              <span style={{ flex: 1, height: 2, background: '#dbe3ed', borderRadius: 1 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
