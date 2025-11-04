import { NavLink, Outlet } from 'react-router-dom'
import { FiLogOut } from 'react-icons/fi'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import logo from '../assets/rodeo_logo.png'
import { DarkModeToggle } from '../components/DarkModeToggle'
import { usePreferences } from '../context/preferences'

const MANAGE_ITEMS = [
  { label: 'Tournament', path: 'tournament' },
  { label: 'Players', path: 'players' },
  { label: 'Scoreables', path: 'scoreables' },
  { label: 'Categories', path: 'categories' },
  { label: 'Divisions', path: 'divisions' }
]

const RUN_EVENT_ITEMS = [
  { label: 'Scoring', path: 'scoring' },
  { label: 'Results', path: 'results' },
  { label: 'Leaderboard', path: 'leaderboard' }
]

export function MainView() {
  const { theme, setTheme } = usePreferences()

  return (
    <div className="flex w-full flex-1 gap-6 p-6">
      <Card className="flex h-full w-72 flex-col">
        <CardHeader className="items-center">
          <div className="flex flex-col items-center gap-4">
            <img src={logo} alt="Rodeo logo" className="h-20 w-auto" />
            <CardTitle className="font-press-play text-base uppercase tracking-[0.6em]">
              Rodeo
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-6">
          <SidebarGroup label="Manage" items={MANAGE_ITEMS} />
          <SidebarGroup label="Run Event" items={RUN_EVENT_ITEMS} />
        </CardContent>
        <CardFooter className="mt-auto flex flex-col gap-3">
          <DarkModeToggle
            isDark={theme === 'dark'}
            toggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-md border ro-border px-3 py-2 text-xs font-mono uppercase tracking-[0.25em] ro-text-muted transition-colors hover:ro-bg-muted hover:ro-text-main"
          >
            <FiLogOut className="text-sm" />
            Exit
          </button>
        </CardFooter>
      </Card>

      <Card className="flex flex-1">
        <CardContent className="flex flex-1 flex-col gap-0">
          <Outlet />
        </CardContent>
      </Card>
    </div>
  )
}

type SidebarGroupProps = {
  label: string
  items: Array<{ label: string; path: string }>
}

function SidebarGroup({ label, items }: SidebarGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="px-3 text-[10px] font-mono uppercase tracking-[0.3em] ro-text-muted">
        {label}
      </h3>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                'rounded-md px-3 py-2 text-left font-mono text-xs uppercase tracking-[0.25em] transition-colors',
                isActive
                  ? 'ro-bg-muted ro-text-main'
                  : 'ro-text-muted hover:ro-bg-muted hover:ro-text-main'
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
