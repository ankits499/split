import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/groups', label: 'Groups', icon: '👥' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 z-10 flex border-t border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
              isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
            }`
          }
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
