import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useAllocation } from './state';

export const AllocationCharts: React.FC = () => {
  const { systemResults, unitResults, treeData } = useAllocation();
  const pieRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pieRef.current) {
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
    }
  }, [systemResults]);

  useEffect(() => {
    if (barRef.current) {
      const chart = echarts.getInstanceByDom(barRef.current) || echarts.init(barRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        title: { text: '单元分配 MTBF', left: 'center', top: 5, textStyle: { fontSize: 12 } },
        xAxis: { type: 'category', data: unitResults.map(u => u.name), axisLabel: { rotate: 30 } },
        yAxis: { type: 'value', name: 'MTBF(h)' },
        series: [{ type: 'bar', data: unitResults.map(u => Number(u.allocatedMTBF.toFixed(2))), itemStyle: { color: '#4a90e2' } }]
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(barRef.current);
    }
  }, [unitResults]);

  useEffect(() => {
    if (treeRef.current) {
      const chart = echarts.getInstanceByDom(treeRef.current) || echarts.init(treeRef.current);
      chart.setOption({
        title: { text: '可靠性分配层级', left: 'center', top: 5, textStyle: { fontSize: 12 } },
        tooltip: { trigger: 'item', formatter: (info: any) => info.name.replace(/\n/g, '<br/>') },
        series: [{
          type: 'tree', data: [treeData], top: 30, left: 10, bottom: 10, right: 10,
          symbolSize: 10, edgeShape: 'polyline', edgeForkPosition: '63%', initialTreeDepth: 2,
          label: { fontSize: 10, formatter: (p: any) => p.name.split('\n')[0] },
          expandAndCollapse: true, animationDuration: 300, animationDurationUpdate: 300
        }]
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(treeRef.current);
    }
  }, [treeData]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1rem' }}>
      <div ref={pieRef} style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6 }} />
      <div ref={barRef} style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6 }} />
      <div ref={treeRef} style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6 }} />
    </div>
  );
};
