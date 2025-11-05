import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Card, CardContent } from '../components/ui/card'

export function MainView() {
  const location = useLocation()

  return (
    <div className="flex w-full flex-1 gap-4 p-3">
      <Sidebar />
      <Card className="flex flex-1">
        <CardContent className="flex flex-1 flex-col gap-0">
          <Outlet key={location.pathname} />
        </CardContent>
      </Card>
    </div>
  )
}
