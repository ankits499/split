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
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {total <= 0 ? (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={thickness} />
        ) : (
          segments
            .filter((s) => s.value > 0)
            .map((s, i) => {
              const len = (s.value / total) * c
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              )
              offset += len
              return el
            })
        )}
      </g>
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        style={{ fill: 'var(--color-ink)', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
      >
        {centerValue}
      </text>
      <text x="50%" y="63%" textAnchor="middle" style={{ fill: 'var(--color-ink-muted)', fontSize: 9.5 }}>
        {centerLabel}
      </text>
    </svg>
  )
}
