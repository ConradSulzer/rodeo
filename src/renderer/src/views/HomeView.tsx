import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import logo from '../assets/rodeo_logo.png'

export function HomeView(): JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <img src={logo} alt="Rodeo logo" className="h-40 w-auto" />
      <h1 className="font-press-play font-bold text-4xl uppercase tracking-[0.5em]">Rodeo</h1>
      <Card>
        <CardContent className="items-stretch gap-6">
          <Button className="w-full" size="lg" onClick={() => navigate('/app')}>
            Create Tournament
          </Button>
          <Button className="w-full" size="lg" variant="outline" onClick={() => navigate('/app')}>
            Open Tournament
          </Button>
          <Button className="w-full" size="lg" variant="outline" onClick={() => navigate('/app')}>
            Open Recent
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
