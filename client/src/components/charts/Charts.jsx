import ChartCard from './ChartCard.jsx';
import { fmtGNF, fmtNum, fmtDate } from '../../lib/format.js';
import { useStore } from '../../store/useStore.js';

const BRAND = '#0284c7';
const GREEN = '#16a34a';
const ROSE = '#e11d48';
const AMBER = '#f59e0b';
const SLATE = '#64748b';
const VIOLET = '#7c3aed';

export function RevenueProfitLine({ series }) {
  const option = {
    grid: { left: 60, right: 20, top: 30, bottom: 40 },
    legend: { top: 0, right: 0 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const date = fmtDate(params[0].axisValue);
        return (
          `<b>${date}</b><br/>` +
          params.map((p) => `${p.marker} ${p.seriesName}: ${fmtGNF(p.value)}`).join('<br/>')
        );
      },
    },
    xAxis: {
      type: 'category',
      data: series.map((s) => s.date),
      axisLabel: { formatter: (v) => v.slice(5) },
    },
    yAxis: { type: 'value', axisLabel: { formatter: (v) => fmtNum(v / 1e6) + 'M' } },
    series: [
      { name: 'Revenue', type: 'line', smooth: true, color: BRAND, data: series.map((s) => s.revenue) },
      { name: 'Cost', type: 'line', smooth: true, color: AMBER, data: series.map((s) => s.cost) },
      { name: 'Profit', type: 'line', smooth: true, color: GREEN, areaStyle: { opacity: 0.15 }, data: series.map((s) => s.profit) },
    ],
  };
  return <ChartCard title="Daily revenue, cost & profit" option={option} height={300} />;
}

export function ProfitByTruckBar({ data }) {
  const { setFilter } = useStore.getState();
  const option = {
    grid: { left: 80, right: 20, top: 20, bottom: 40 },
    tooltip: { trigger: 'axis', formatter: (p) => `${p[0].name}<br/>Profit: ${fmtGNF(p[0].value)}` },
    xAxis: { type: 'value', axisLabel: { formatter: (v) => fmtNum(v / 1e6) + 'M' } },
    yAxis: { type: 'category', data: data.map((d) => d.name) },
    series: [
      {
        name: 'Profit',
        type: 'bar',
        data: data.map((d) => ({
          value: d.value,
          itemStyle: { color: d.value >= 0 ? GREEN : ROSE },
        })),
        label: { show: true, position: 'right', formatter: (p) => fmtNum(p.value / 1e6) + 'M' },
      },
    ],
  };
  const onEvents = {
    click: (e) => setFilter('truck', e.name === useStore.getState().filters.truck ? '' : e.name),
  };
  return <ChartCard title="Profit by truck (click to filter)" option={option} onEvents={onEvents} height={260} />;
}

export function CostMixPie({ data }) {
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.name}<br/>${fmtGNF(p.value)} (${p.percent}%)`,
    },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        name: 'Cost mix',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}\n{d}%' },
        data: data.map((d, i) => ({
          ...d,
          itemStyle: { color: [BRAND, AMBER, SLATE, VIOLET][i % 4] },
        })),
      },
    ],
  };
  return <ChartCard title="Cost mix" option={option} height={280} />;
}

export function TripsByRegionBar({ data }) {
  const { setFilter } = useStore.getState();
  const option = {
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    tooltip: { trigger: 'axis', formatter: (p) => `${p[0].name}<br/>Trips: ${p[0].value}` },
    xAxis: { type: 'category', data: data.map((d) => d.name) },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Trips',
        type: 'bar',
        data: data.map((d) => d.value),
        itemStyle: { color: BRAND, borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top' },
      },
    ],
  };
  const onEvents = {
    click: (e) => setFilter('region', e.name === useStore.getState().filters.region ? '' : e.name),
  };
  return <ChartCard title="Trips by region (click to filter)" option={option} onEvents={onEvents} height={260} />;
}

export function TopDestinationsBar({ data, onRowClick }) {
  const option = {
    grid: { left: 110, right: 20, top: 20, bottom: 30 },
    tooltip: { trigger: 'axis', formatter: (p) => `${p[0].name}<br/>Profit: ${fmtGNF(p[0].value)}` },
    xAxis: { type: 'value', axisLabel: { formatter: (v) => fmtNum(v / 1e6) + 'M' } },
    yAxis: { type: 'category', data: data.map((d) => d.name) },
    series: [
      {
        name: 'Profit',
        type: 'bar',
        data: data.map((d) => d.value),
        itemStyle: { color: GREEN, borderRadius: [0, 6, 6, 0] },
      },
    ],
  };
  return (
    <ChartCard
      title="Top 10 destinations by profit"
      option={option}
      onEvents={{ click: (e) => onRowClick?.(e.name) }}
      height={300}
    />
  );
}
