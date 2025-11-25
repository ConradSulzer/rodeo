import { useState, type JSX } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import logo from '../assets/rodeo_logo.png'
import { usePreferences } from '../context/preferences'
import { Modal } from '../components/Modal'
import { useQueryClient } from '@tanstack/react-query'

export function HomeView(): JSX.Element {
  const navigate = useNavigate()
  const { recents, addRecent } = usePreferences()
  const [showRecents, setShowRecents] = useState(false)
  const queryClient = useQueryClient()

  const handleCreate = async () => {
    try {
      const filePath = await window.api.tournaments.createDialog()
      if (!filePath) return

      const success = await window.api.tournaments.open(filePath)
      if (!success) return

      addRecent(filePath)
      queryClient.clear()
      toast.success('Tournament created')
      navigate('/app/tournament', { replace: true })
    } catch (error) {
      console.error('Failed to create tournament', error)
      toast.error('Failed to create tournament')
    }
  }

  const handleOpen = async () => {
    try {
      const filePath = await window.api.tournaments.openDialog()
      if (!filePath) return

      const success = await window.api.tournaments.open(filePath)
      if (!success) return

      addRecent(filePath)
      queryClient.clear()
      toast.success('Tournament opened')
      navigate('/app/tournament', { replace: true })
    } catch (error) {
      console.error('Failed to open tournament', error)
      toast.error('Failed to open tournament')
    }
  }

  const handleOpenRecent = async (filePath: string) => {
    if (!filePath) return

    try {
      const success = await window.api.tournaments.open(filePath)
      if (!success) return

      addRecent(filePath)
      queryClient.clear()
      toast.success('Tournament opened')
      navigate('/app/tournament', { replace: true })
      setShowRecents(false)
    } catch (error) {
      console.error('Failed to open recent tournament', error)
      toast.error('Failed to open tournament')
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
            onClick={() => setShowRecents(true)}
          >
            Open Recent
          </Button>
        </CardContent>
      </Card>
      <Modal
        open={showRecents}
        onClose={() => setShowRecents(false)}
        title="Choose Recent:"
        contentClassName="max-w-fit"
      >
        {recents.length ? (
          <div className="flex flex-col gap-3">
            {recents.map((filePath) => (
              <Button
                key={filePath}
                variant="ghost"
                className="justify-start text-left font-mono text-xs normal-case tracking-normal"
                onClick={() => handleOpenRecent(filePath)}
              >
                {filePath}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm ro-text-muted">No recent tournaments yet.</p>
        )}
        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowRecents(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
