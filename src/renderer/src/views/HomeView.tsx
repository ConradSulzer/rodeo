import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import logo from '../assets/rodeo_logo.png'
import { usePreferences } from '../context/preferences'

export function HomeView(): JSX.Element {
  const navigate = useNavigate()
  const { recents, addRecent } = usePreferences()

  const handleCreate = async () => {
    try {
      const filePath = await window.api.tournaments.createDialog()
      if (!filePath) return

      const success = await window.api.tournaments.open(filePath)
      if (!success) return

      addRecent(filePath)
      navigate('/app/tournament', { replace: true })
    } catch (error) {
      console.error('Failed to create tournament', error)
    }
  }

  const handleOpen = async () => {
    try {
      const filePath = await window.api.tournaments.openDialog()
      if (!filePath) return

      const success = await window.api.tournaments.open(filePath)
      if (!success) return

      addRecent(filePath)
      navigate('/app/tournament', { replace: true })
    } catch (error) {
      console.error('Failed to open tournament', error)
    }
  }

  const handleOpenRecent = async () => {
    if (!recents.length) return
    const filePath = recents[0]

    try {
      const success = await window.api.tournaments.open(filePath)
      if (!success) return

      addRecent(filePath)
      navigate('/app/tournament', { replace: true })
    } catch (error) {
      console.error('Failed to open recent tournament', error)
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col justify-center items-center gap-16 text-center">
      <div className="flex flex-col items-center justify-center gap-6 test-center">
        <img src={logo} alt="Rodeo logo" className="h-40 w-auto" />
        <h1 className="font-press-play font-bold text-4xl uppercase tracking-[0.5em]">Rodeo</h1>
      </div>
      <Card>
        <CardContent className="items-stretch gap-6">
          <Button className="w-full" size="lg" onClick={handleCreate}>
            Create Tournament
          </Button>
          <Button className="w-full" size="lg" variant="outline" onClick={handleOpen}>
            Open Tournament
          </Button>
          <Button
            className="w-full"
            size="lg"
            variant="outline"
            disabled={!recents.length}
            onClick={handleOpenRecent}
          >
            Open Recent
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
