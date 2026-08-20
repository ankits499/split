import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

export function DonutChart({
  segments,
  size = 128,
  thickness = 16,
  centerValue,
  centerLabel,
}: {
  segments: { value: number; color: string }[]
  size?: number
  thickness?: number
  centerValue: string
  centerLabel: string
}) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  const outerRadius = size / 2
  const innerRadius = outerRadius - thickness

  const data = total <= 0 ? [{ value: 1, color: 'var(--color-line)' }] : segments.filter((s) => s.value > 0)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono-nums font-bold text-[var(--color-ink)]"
          style={{ fontSize: 15 }}
        >
          {centerValue}
        </span>
        <span className="mt-0.5 text-[var(--color-ink-muted)]" style={{ fontSize: 9.5 }}>
          {centerLabel}
        </span>
      </div>
    </div>
  )
}
