import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { SpendingBucket } from '../utils/spending'
import { formatCurrency } from '../utils/money'

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: SpendingBucket }[] }) {
  if (!active || !payload?.length) return null
  const { label, total } = payload[0].payload
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs shadow-[var(--shadow-card)]">
      <p className="text-[var(--color-ink-muted)]">{label}</p>
      <p className="font-mono-nums font-semibold text-[var(--color-ink)]">{formatCurrency(total)}</p>
    </div>
  )
}

export function SpendingChart({ buckets }: { buckets: SpendingBucket[] }) {
  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: 'var(--color-ink-muted)' }}
            minTickGap={12}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-line)', opacity: 0.3 }} />
          <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {buckets.map((b, i) => (
              <Cell key={i} fill={b.total > 0 ? 'var(--color-ledger)' : 'var(--color-line)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
