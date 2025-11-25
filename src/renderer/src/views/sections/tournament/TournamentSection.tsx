import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { DateInput } from '@renderer/components/ui/date_input'
import { Label } from '@renderer/components/ui/label'
import { Field } from '@renderer/components/ui/field'
import { ManageSectionShell } from '@renderer/components/ManageSectionShell'
import { PlayerImportButton } from './player_import/PlayerImportButton'
import { SettingsImportButton } from './settings/SettingsImportButton'
import { SettingsExportButton } from './settings/SettingsExportButton'
import { ResultsExportButton } from './results/ResultsExportButton'

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
    <ManageSectionShell
      title={form.name || 'Untitled Tournament'}
      description="Configure core details for this tournament."
    >
      <div className="flex flex-col gap-6 pb-10 overflow-y-auto">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Field label={<Label htmlFor="tournament-date">Event Date</Label>}>
                <DateInput
                  id="tournament-date"
                  value={form.eventDate}
                  onChange={handleChange('eventDate')}
                  placeholder="Select date"
                />
              </Field>
              <div className="flex justify-end">
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm ro-text-dim">Import players from a CSV file.</p>
              <PlayerImportButton />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm ro-text-dim">Export players to a CSV file.</p>
              <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>
                Export Players
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-md border ro-border-light ro-bg-dim p-6">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.25em]">
              Template Settings
            </h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm ro-text-dim">
                Import metrics, categories, and divisions from a template.
              </p>
              <SettingsImportButton />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm ro-text-dim">Export the current tournament structure.</p>
              <SettingsExportButton />
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-md border ro-border-light ro-bg-dim p-6">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.25em]">
              Results Export
            </h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm ro-text-dim">Download a CSV of player results.</p>
              <ResultsExportButton />
            </div>
          </div>
        </div>
      </div>
    </ManageSectionShell>
  )
}
