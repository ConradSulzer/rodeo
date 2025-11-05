import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { DateInput } from '../../components/ui/date-input'
import { Label } from '../../components/ui/label'
import { Field } from '../../components/ui/field'

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
    <section className="flex flex-1 flex-col gap-6">
      <header>
        <h2 className="font-mono text-[16px] font-semibold uppercase tracking-[2px]">
          {form.name || 'Untitled Tournament'}
        </h2>
        <p className="mt-2 text-sm ro-text-dim">Configure core details for this tournament.</p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="relative flex max-w-xl flex-col gap-5 rounded-2xl border ro-border-light ro-bg-dim p-6"
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
          <Field label={<Label htmlFor="tournament-date">Event Date</Label>}>
            <DateInput
              id="tournament-date"
              value={form.eventDate}
              onChange={handleChange('eventDate')}
              placeholder="Select date"
            />
          </Field>
        </fieldset>
        <div className="mt-4 flex justify-end gap-3">
          <Button type="submit" size="sm" variant="positive" disabled={!isDirty || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl ro-bg-main-60 text-sm ro-text-muted">
            Loading...
          </div>
        )}
      </form>
    </section>
  )
}
