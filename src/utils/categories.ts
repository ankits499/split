export interface Category {
  id: string
  label: string
  emoji: string
  color: string
}

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', emoji: '🍔', color: '#b8532c' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒', color: '#2f6f4e' },
  { id: 'transport', label: 'Transport', emoji: '🚗', color: '#2b6cb0' },
  { id: 'rent', label: 'Rent', emoji: '🏠', color: '#7c3aed' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#be185d' },
  { id: 'household', label: 'Household', emoji: '🧹', color: '#b8860b' },
  { id: 'travel', label: 'Travel', emoji: '✈️', color: '#0f766e' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#d97706' },
  { id: 'medical', label: 'Medical', emoji: '💊', color: '#dc2626' },
  { id: 'fitness', label: 'Fitness', emoji: '💪', color: '#059669' },
  { id: 'other', label: 'Other', emoji: '🧾', color: '#4b5563' },
]

export function categoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
