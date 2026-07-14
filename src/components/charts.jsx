import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, Legend, ComposedChart,
} from 'recharts'
import { useUIStore, useI18n } from '../store/uiStore'
import { GROUP_META } from '../utils/categories'
import { formatMoney, formatCompact } from '../utils/currency'

export function useChartTheme() {
  const theme = useUIStore((s) => s.theme)
  const dark = theme === 'dark'
  return {
    dark,
    surface: dark ? '#1a1a19' : '#fcfcfb',
    grid: dark ? '#2c2c2a' : '#e1e0d9',
    axis: dark ? '#383835' : '#c3c2b7',
    muted: '#898781',
    ink: dark ? '#ffffff' : '#0b0b0b',
    inkSecondary: dark ? '#c3c2b7' : '#52514e',
    groupColor: (g) => (dark ? GROUP_META[g].colorDark : GROUP_META[g].color),
    // De-emphasis hue for "budget" reference bars.
    ghost: dark ? '#3a3a38' : '#e7e6e1',
  }
}

function ChartTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-black/10 bg-surface-light px-3 py-2 text-xs shadow-card dark:border-white/10 dark:bg-surface-dark dark:shadow-card-dark">
      {label !== undefined && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-neutral-500 dark:text-neutral-400">{p.name}</span>
          <span className="ms-auto ps-3 font-semibold tabular-nums">{money(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/** Doughnut of actual spending across the three groups, with center total. */
export function SpendingDoughnut({ stats, currency, locale }) {
  const { t } = useI18n()
  const ct = useChartTheme()
  const money = (v) => formatMoney(v, currency, locale)

  const data = ['needs', 'wants', 'savings']
    .map((g) => ({ key: g, name: t(`group.${g}`), value: stats.groups[g].spent, fill: ct.groupColor(g) }))
    .filter((d) => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={1.5}
              strokeWidth={2}
              stroke={ct.surface}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip money={money} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] text-neutral-400">{t('common.total')}</p>
          <p className="text-lg font-bold tracking-tight">{money(total)}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.fill }} />
            <span className="text-neutral-600 dark:text-neutral-300">{d.name}</span>
            <span className="ms-auto font-semibold tabular-nums">{money(d.value)}</span>
            <span className="w-11 text-end text-xs tabular-nums text-neutral-400">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Grouped bars: budget (ghost reference) vs actual (group hue). */
export function BudgetVsActualChart({ stats, currency, locale }) {
  const { t } = useI18n()
  const ct = useChartTheme()
  const money = (v) => formatMoney(v, currency, locale)

  const data = ['needs', 'wants', 'savings'].map((g) => ({
    key: g,
    name: t(`group.${g}`),
    budget: Math.round(stats.groups[g].budget * 100) / 100,
    actual: stats.groups[g].spent,
    color: ct.groupColor(g),
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke={ct.grid} strokeWidth={1} />
        <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: ct.axis }} tick={{ fill: ct.muted, fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: ct.muted, fontSize: 11 }}
          tickFormatter={(v) => formatCompact(v, locale)}
          width={44}
        />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: ct.dark ? 'rgba(255,255,255,0.04)' : 'rgba(11,11,11,0.04)' }} />
        <Legend
          formatter={(value) => <span style={{ color: ct.inkSecondary, fontSize: 12 }}>{value}</span>}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="budget" name={t('reports.budget')} fill={ct.ghost} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="actual" name={t('reports.actual')} radius={[4, 4, 0, 0]} maxBarSize={24}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Monthly totals per group over the last N months — 2px lines, ringed dots. */
export function TrendChart({ series, currency, locale }) {
  const { t } = useI18n()
  const ct = useChartTheme()
  const money = (v) => formatMoney(v, currency, locale)

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={ct.grid} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ct.axis }} tick={{ fill: ct.muted, fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: ct.muted, fontSize: 11 }}
          tickFormatter={(v) => formatCompact(v, locale)}
          width={44}
        />
        <Tooltip content={<ChartTooltip money={money} />} />
        <Legend
          formatter={(value) => <span style={{ color: ct.inkSecondary, fontSize: 12 }}>{value}</span>}
          iconType="circle"
          iconSize={8}
        />
        {['needs', 'wants', 'savings'].map((g) => (
          <Line
            key={g}
            type="monotone"
            dataKey={g}
            name={t(`group.${g}`)}
            stroke={ct.groupColor(g)}
            strokeWidth={2}
            strokeLinecap="round"
            dot={{ r: 4, fill: ct.groupColor(g), stroke: ct.surface, strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: ct.surface, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Monthly savings bars against the monthly target line. */
export function SavingsProgressChart({ series, currency, locale }) {
  const { t } = useI18n()
  const ct = useChartTheme()
  const money = (v) => formatMoney(v, currency, locale)
  const color = ct.groupColor('savings')

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={ct.grid} strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: ct.axis }} tick={{ fill: ct.muted, fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: ct.muted, fontSize: 11 }}
          tickFormatter={(v) => formatCompact(v, locale)}
          width={44}
        />
        <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: ct.dark ? 'rgba(255,255,255,0.04)' : 'rgba(11,11,11,0.04)' }} />
        <Legend
          formatter={(value) => <span style={{ color: ct.inkSecondary, fontSize: 12 }}>{value}</span>}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="saved" name={t('common.saved')} fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Line
          type="monotone"
          dataKey="target"
          name={t('dash.target')}
          stroke={ct.muted}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/** Top-5 expense categories as an HTML bar list (direct labels, no axis). */
export function TopCategoriesList({ items, currency, locale }) {
  const { t } = useI18n()
  const ct = useChartTheme()
  const money = (v) => formatMoney(v, currency, locale)
  const max = Math.max(...items.map((i) => i.amount), 1)

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={`${item.group}:${item.subcategory}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{t(`cat.${item.subcategory}`)}</span>
            <span className="shrink-0 font-semibold tabular-nums">{money(item.amount)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.amount / max) * 100}%`, background: ct.groupColor(item.group) }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
