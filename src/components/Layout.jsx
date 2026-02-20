import { NavLink } from 'react-router-dom'
import { Tag, History, Settings, Sun, Moon } from 'lucide-react'

const navItems = [
  { to: '/generate', icon: Tag, label: 'Generate Labels' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout({ children, darkMode, setDarkMode }) {
  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <img
            src="/palm-logo.jpg"
            alt="Palm Kartofler"
            className="w-full object-contain"
            style={{ maxHeight: '56px' }}
          />
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center mt-1">
            Label Generator
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Theme Toggle */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                       text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700
                       hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-150"
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Dark Mode
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-h-0">
        {children}
      </main>
    </div>
  )
}
