import { FiLogOut } from 'react-icons/fi'
import { NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import logo from '../assets/rodeo_logo.png'
import { usePreferences } from '../context/preferences'
import { DarkModeToggle } from './DarkModeToggle'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

type NavItem = {
  label: string
  path: string
}

const MANAGE_ITEMS: NavItem[] = [
  { label: 'Tournament', path: 'tournament' },
  { label: 'Players', path: 'players' },
  { label: 'Scoreables', path: 'scoreables' },
  { label: 'Categories', path: 'categories' },
  { label: 'Divisions', path: 'divisions' }
]

const RUN_EVENT_ITEMS: NavItem[] = [
  { label: 'Scoring', path: 'scoring' },
  { label: 'Results', path: 'results' },
  { label: 'Leaderboard', path: 'leaderboard' },
  { label: 'Events', path: 'events' }
]

export function Sidebar() {
  const navigate = useNavigate()
  const { theme, setTheme } = usePreferences()

  const handleExit = async () => {
    try {
      const success = await window.api.tournaments.close()
      if (success) {
        toast.success('Tournament closed')
        navigate('/')
      } else {
        toast.error('Failed to close tournament')
      }
    } catch (error) {
      console.error('Failed to close tournament', error)
      toast.error('Failed to close tournament')
    }
  }

  return (
    <Card className="flex h-full w-72 flex-col overflow-hidden">
      <CardHeader className="items-center">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="Rodeo logo" className="h-20 w-auto" />
          <CardTitle>
            <div className="font-press-play text-lg uppercase tracking-[0.5em]">Rodeo</div>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6 overflow-auto">
        <SidebarGroup label="Manage" items={MANAGE_ITEMS} />
        <SidebarGroup label="Event" items={RUN_EVENT_ITEMS} />
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between gap-3">
        <DarkModeToggle
          isDark={theme === 'dark'}
          toggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />
        <Button
          type="button"
          variant="outline-muted"
          size="sm"
          className="flex items-center justify-center gap-2 tracking-[0.25em]"
          onClick={handleExit}
        >
          <FiLogOut className="text-sm" />
          Exit
        </Button>
      </CardFooter>
    </Card>
  )
}

type SidebarGroupProps = {
  label: string
  items: NavItem[]
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
