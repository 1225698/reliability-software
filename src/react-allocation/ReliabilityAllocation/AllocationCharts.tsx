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
    }
  }, [systemResults, mode]);

  useEffect(() => {
    if (mode === 'unit' && barRef.current) {
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
    }
  }, [unitResults, mode]);

  // 已移除单元分配柱状图

  useEffect(() => {
    if (treeRef.current) {
      const chart = echarts.getInstanceByDom(treeRef.current) || echarts.init(treeRef.current);
      chart.setOption({
        title: { text: '可靠性分配层级', left: 'center', top: 5, textStyle: { fontSize: 12 } },
        tooltip: { trigger: 'item', formatter: (info: any) => info.name.replace(/\n/g, '<br/>') },
        series: [{
          type: 'tree', data: [treeData], top: 30, left: '2%', bottom: 10, right: '2%',
          symbolSize: 8, edgeShape: 'polyline', edgeForkPosition: '8%', initialTreeDepth: 2,
          label: { fontSize: 11, formatter: (p: any) => p.name.split('\n')[0], position: 'right', distance: 6 },
          expandAndCollapse: true, animationDuration: 300, animationDurationUpdate: 300,
          orient: 'LR'
        }]
      });
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(treeRef.current);
    }
  }, [treeData, mode]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: '1rem' }}>
      {mode === 'system' && <div ref={pieRef} style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6 }} />}
      {mode === 'unit' && <div ref={barRef} style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6 }} />}
      <div ref={treeRef} style={{ height: 300, background: '#fff', border: '1px solid #eee', borderRadius: 6, position:'relative' }}>
        {mode === 'unit' && unitResults.length === 0 && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#666' }}>
            请选择一个系统以查看单元分配层级。
          </div>
        )}
      </div>
    </div>
  );
};
