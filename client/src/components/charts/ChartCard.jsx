import ReactECharts from 'echarts-for-react';

export default function ChartCard({ title, option, onEvents, height = 280 }) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <ReactECharts
        option={option}
        onEvents={onEvents}
        style={{ height, width: '100%' }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
