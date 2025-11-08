import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { DateInput } from '@renderer/components/ui/date_input'
import { Label } from '@renderer/components/ui/label'
import { Field } from '@renderer/components/ui/field'
import { PlayerImportButton } from './player_import/PlayerImportButton'

type FormState = {
  name: string
  eventDate: string
}

const defaultForm: FormState = {
  name: '',
  eventDate: ''
}

export function TournamentSection() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [initial, setInitial] = useState<FormState>(defaultForm)

  useEffect(() => {
    let active = true

    window.api.tournaments
      .getMetadata()
      .then((data) => {
        if (!active) return
        const eventDate = data.eventDate ?? ''
        const next = { name: data.name, eventDate }
        setForm(next)
        setInitial(next)
      })
      .catch((error) => {
        console.error('Failed to load tournament metadata', error)
        toast.error('Failed to load tournament details')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const isDirty = useMemo(
    () => form.name !== initial.name || form.eventDate !== initial.eventDate,
    [form, initial]
  )

  const handleChange = (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isDirty || saving) return

    setSaving(true)
    try {
      const updated = await window.api.tournaments.updateMetadata({
        name: form.name,
        eventDate: form.eventDate || null
      })

      const next = {
        name: updated.name,
        eventDate: updated.eventDate ?? ''
      }

      setForm(next)
      setInitial(next)
      toast.success('Tournament details updated')
    } catch (error) {
      console.error('Failed to update tournament metadata', error)
      toast.error('Failed to update tournament details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="flex flex-1 flex-col gap-6">
        <header>
          <h2 className="font-mono text-[16px] font-semibold uppercase tracking-[2px]">
            {form.name || 'Untitled Tournament'}
          </h2>
          <p className="mt-2 text-sm ro-text-dim">Configure core details for this tournament.</p>
        </header>
        <form
          onSubmit={handleSubmit}
          className="relative flex max-w-xl flex-col gap-5 rounded-md border ro-border-light ro-bg-dim p-6"
        >
          <fieldset className="flex flex-col gap-5" disabled={loading || saving}>
            <Field label={<Label htmlFor="tournament-name">Name</Label>}>
              <Input
                id="tournament-name"
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Untitled Tournament"
              />
            </Field>
            <div className="flex justify-between">
              <Field label={<Label htmlFor="tournament-date">Event Date</Label>}>
                <DateInput
                  id="tournament-date"
                  value={form.eventDate}
                  onChange={handleChange('eventDate')}
                  placeholder="Select date"
                />
              </Field>
              <div className="flex justify-end mt-7">
                <Button type="submit" size="sm" variant="positive" disabled={!isDirty || saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </fieldset>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md ro-bg-main-60 text-sm ro-text-muted">
              Loading...
            </div>
          )}
        </form>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-md border ro-border-light ro-bg-dim p-6">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.25em]">
              Player Import/Export
            </h3>
            <div className="flex justify-between items-center align-middle">
              <p className="text-sm ro-text-dim">Import players from a CSV file.</p>
              <PlayerImportButton />
            </div>
            <div className="flex justify-between items-center align-middle">
              <p className="text-sm ro-text-dim">Export players to a CSV file.</p>
              <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>
                Export Players
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-md border ro-border-light ro-bg-dim p-6">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.25em]">
              Tournament Import/Export
            </h3>
            <div className="flex justify-between items-center align-middle">
              <p className="text-sm ro-text-dim">
                Import tournament settings like scoreables, categories and divisions.
              </p>
              <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>
                Import Settings
              </Button>
            </div>
            <div className="flex justify-between items-center align-middle">
              <p className="text-sm ro-text-dim">Export this tournament's settings.</p>
              <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>
                Export Settings
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
