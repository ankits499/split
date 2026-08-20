import { categoryById } from '../utils/categories'

const SIZES = { sm: 'h-7 w-7 text-sm', md: 'h-9 w-9 text-base', lg: 'h-16 w-16 text-2xl' }

export function CategoryIcon({ category, size = 'md' }: { category: string; size?: keyof typeof SIZES }) {
  const cat = categoryById(category)
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${SIZES[size]}`}
      style={{ backgroundColor: `${cat.color}26` }}
      aria-hidden
      title={cat.label}
    >
      {cat.emoji}
    </span>
  )
}
