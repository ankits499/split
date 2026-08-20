const PALETTE = ['#2f6f4e', '#b8532c', '#2b6cb0', '#7c3aed', '#b8860b', '#0f766e', '#be185d', '#4b5563']

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

const SIZES = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-sm', lg: 'h-16 w-16 text-xl' }

export function Avatar({ name, size = 'md' }: { name: string; size?: keyof typeof SIZES }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZES[size]}`}
      style={{ backgroundColor: colorForName(name) }}
    >
      {initial}
    </span>
  )
}
