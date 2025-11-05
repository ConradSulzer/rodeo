import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Card, CardContent } from '../components/ui/card'

export function MainView() {
  const location = useLocation()

  return (
    <div className="flex w-full flex-1 gap-4 p-3 min-h-0">
      <Sidebar />
      <Card className="flex flex-1 overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-0 overflow-hidden min-h-0">
          <Outlet key={location.pathname} />
        </CardContent>
      </Card>
    </div>
  )
}
