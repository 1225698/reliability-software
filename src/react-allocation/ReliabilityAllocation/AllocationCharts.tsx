
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useAllocation } from './state';

interface AllocationChartsProps { mode: 'system' | 'unit'; }

export const AllocationCharts: React.FC<AllocationChartsProps> = ({ mode }) => {
  const { systemResults, unitResults, treeData } = useAllocation();
  const pieRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    if (mode === 'system' && pieRef.current) {
      const chart = echarts.getInstanceByDom(pieRef.current) || echarts.init(pieRef.current);
      chart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}<br/>故障率占比: {d}%' },
        title: { text: '系统级故障率占比', left: 'center', top: 5, textStyle: { fontSize: 12 } },
        series: [{
          type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: true,
          data: systemResults.map(s => ({ name: s.name, value: s.allocatedFailureRate || 0 })),
          label: { formatter: '{b}\n{d}%' }
        }]
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(pieRef.current);
      return () => {
        try {
          ro.disconnect();
          if (pieRef.current) {
            const inst = echarts.getInstanceByDom(pieRef.current);
            if (inst) inst.dispose();
          }
        } catch (e) { void e; }
      };
    }
  }, [systemResults, mode]);

  useEffect(() => {
    if (mode === 'unit' && barRef.current && unitResults.length > 0) {
      const chart = echarts.getInstanceByDom(barRef.current) || echarts.init(barRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        title: { text: '单元分配 MTBF', left: 'center', top: 5, textStyle: { fontSize: 12 } },
        xAxis: { type: 'category', data: unitResults.map(u => u.name), axisLabel: { rotate: 25 } },
        yAxis: { type: 'value', name: 'MTBF(h)' },
        series: [{ type: 'bar', data: unitResults.map(u => Number(u.allocatedMTBF.toFixed(2))), itemStyle: { color: '#4a90e2' } }]
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(barRef.current);
      return () => {
        try {
          ro.disconnect();
          if (barRef.current) {
            const inst = echarts.getInstanceByDom(barRef.current);
            if (inst) inst.dispose();
          }
        } catch (e) { void e; }
      };
    }
  }, [unitResults, mode]);

  useEffect(() => {
    if (treeRef.current) {
      const chart = echarts.getInstanceByDom(treeRef.current) || echarts.init(treeRef.current);
      // 根据容器宽度动态计算label宽度和字体，避免溢出并禁止横向滚动
      const container = treeRef.current.parentElement as HTMLElement | null;
      let maxLabelLen = 0;
      const traverse = (node: any) => {
        if (!node) return;
        if (!node.children || node.children.length === 0) {
          maxLabelLen = Math.max(maxLabelLen, String(node.name || '').length);
        } else {
          node.children.forEach(traverse);
        }
      };
      traverse(treeData);
      const containerWidth = container ? container.clientWidth : 900;
      // 给label分配最多为容器宽度的一半，最小80px
      const labelWidth = Math.min(Math.max(80, 16 * maxLabelLen), Math.floor(containerWidth * 0.5));
      // 字体根据容器与最长名长度自适应，保持在12-16之间
      const fontSize = Math.max(12, Math.min(16, Math.floor(containerWidth / Math.max(1, maxLabelLen * 2))));
      // 计算左右边距：右侧至少要能容纳labelWidth和额外间距，左侧留给主干线和节点
      const rightPadding = Math.max(40, labelWidth + 60);
      const leftPadding = Math.max(40, Math.floor(containerWidth * 0.06));

      chart.setOption({
        title: { text: '可靠性分配层级', left: 'center', top: 8, textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'item', formatter: (info: any) => info.name.replace(/\n/g, '<br/>') },
        series: [{
          type: 'tree',
          data: [treeData],
          top: 36,
          left: leftPadding,
          bottom: 20,
          right: rightPadding,
          symbolSize: 10,
          edgeShape: 'polyline',
          edgeForkPosition: '8%',
          initialTreeDepth: 99,
          lineStyle: { curveness: 0, width: 1.5, color: '#bfc7d2' },
          label: {
            fontSize,
            position: 'right',
            distance: 4,
            overflow: 'break',
            width: labelWidth,
            show: true,
            align: 'left',
            verticalAlign: 'middle',
            formatter: (params: any) => {
              if (!params.children || params.children.length === 0) return params.name.split('\n')[0];
              return '';
            }
          },
          expandAndCollapse: false,
          animationDuration: 300, animationDurationUpdate: 300,
          orient: 'LR'
        }]
      });
      setTimeout(() => { chart.resize(); }, 100);
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(treeRef.current);
      return () => {
        try {
          ro.disconnect();
          if (treeRef.current) {
            const inst = echarts.getInstanceByDom(treeRef.current);
            if (inst) inst.dispose();
          }
        } catch (e) { void e; }
      };
    }
  }, [treeData, mode]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '1rem' }}>
      {mode === 'system' && <div ref={pieRef} key={'pie-' + systemResults.map(s=>s.id).join(',')} style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6 }} />}
      {mode === 'unit' && (
        unitResults.length === 0
          ? <div style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 }}>暂无单元分配数据，请先添加单元</div>
          : <div ref={barRef} key={'bar-' + unitResults.map(u=>u.id).join(',')} style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6 }} />
      )}
      {/* 树图容器：禁止横向滚动，宽度100%自适应，内容需通过label自适应缩放显示 */}
      <div style={{ width: '100%', background: '#fff', border: '1px solid #eee', borderRadius: 6, position: 'relative', height: 340, margin: '0 auto', overflowX: 'hidden' }}>
        <div ref={treeRef} key={'tree-' + systemResults.map(s=>s.id).join(',') + '-' + unitResults.map(u=>u.id).join(',')} style={{ width: '100%', height: 320 }}>
          {mode === 'unit' && unitResults.length === 0 && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#666' }}>
              请选择一个系统以查看单元分配层级。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
