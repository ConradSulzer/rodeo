import type { JSX } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import logo from '../assets/rodeo_logo.png'

export function HomeView(): JSX.Element {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <img src={logo} alt="Rodeo logo" className="h-32 w-auto" />
      <h1 className="font-display text-lg uppercase tracking-[0.5em] text-[var(--rodeo-yellow)]">
        Rodeo
      </h1>
      <Card>
        <CardContent className="items-stretch">
          <Button className="w-full" size="lg">
            Create Tournament
          </Button>
          <Button className="w-full" size="lg" variant="ghost">
            Open Tournament
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
