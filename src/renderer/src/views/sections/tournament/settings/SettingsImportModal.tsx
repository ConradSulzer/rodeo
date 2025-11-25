import { useEffect, useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Modal } from '@renderer/components/Modal'
import { toast } from 'sonner'
import {
  parseTournamentTemplate,
  type TournamentTemplateData
} from '@core/templates/tournamentSettingsTemplate'

const normalizeName = (value: string) => value.trim()

type ImportSelection = {
  metrics: boolean
  categories: boolean
  divisions: boolean
}

const defaultSelection: ImportSelection = {
  metrics: true,
  categories: true,
  divisions: true
}

type ImportSummary = {
  created: Record<keyof ImportSelection, number>
  skipped: Record<keyof ImportSelection, number>
  errors: string[]
}

const emptySummary: ImportSummary = {
  created: { metrics: 0, categories: 0, divisions: 0 },
  skipped: { metrics: 0, categories: 0, divisions: 0 },
  errors: []
}

export function SettingsImportModal({
  open,
  file,
  onClose
}: {
  open: boolean
  file: File | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [data, setData] = useState<TournamentTemplateData | null>(null)
  const [selection, setSelection] = useState<ImportSelection>(defaultSelection)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  useEffect(() => {
    if (!open || !file) {
      setData(null)
      setSelection(defaultSelection)
      setSummary(null)
      return
    }
    let cancelled = false
    const load = async () => {
      setParsing(true)
      setParseError(null)
      try {
        const text = await file.text()
        if (cancelled) return
        const parsed = parseTournamentTemplate(text)
        setData(parsed)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to parse settings template', error)
        setData(null)
        setParseError(error instanceof Error ? error.message : 'Unable to parse template')
      } finally {
        if (!cancelled) setParsing(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, file])

  const counts = useMemo(() => {
    if (!data) return { metrics: 0, categories: 0, divisions: 0 }
    return {
      metrics: data.metrics.length,
      categories: data.categories.length,
      divisions: data.divisions.length
    }
  }, [data])

  const handleToggle = (key: keyof ImportSelection) => {
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleImport = async () => {
    if (!data) return
    setLoading(true)
    setSummary(null)
    try {
      const result = await importTemplateData(data, selection)
      setSummary(result)
      if (!result.errors.length) {
        toast.success('Tournament settings imported')
        onClose()
      } else {
        toast.error('Imported with warnings')
      }
    } catch (error) {
      console.error('Failed to import settings', error)
      toast.error('Unable to import settings')
    } finally {
      setLoading(false)
    }
  }

  const disabled = parsing || loading || !data

  return (
    <Modal open={open} onClose={loading ? () => {} : onClose} title="Import Tournament Settings">
      {parseError ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {parseError}
        </div>
      ) : data ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selection.metrics}
                onChange={() => handleToggle('metrics')}
                disabled={loading}
              />
              Import {counts.metrics} metric{counts.metrics === 1 ? '' : 's'}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selection.categories}
                onChange={() => handleToggle('categories')}
                disabled={loading}
              />
              Import {counts.categories} categor{counts.categories === 1 ? 'y' : 'ies'}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selection.divisions}
                onChange={() => handleToggle('divisions')}
                disabled={loading}
              />
              Import {counts.divisions} division{counts.divisions === 1 ? '' : 's'}
            </label>
          </div>
          {summary ? (
            <div className="rounded-md border ro-border-muted p-3 text-xs">
              <p className="font-semibold uppercase tracking-wide">Summary</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(['metrics', 'categories', 'divisions'] as Array<keyof ImportSelection>).map(
                  (key) => (
                    <li key={key}>
                      {key}: {summary.created[key]} created, {summary.skipped[key]} skipped
                    </li>
                  )
                )}
                {summary.errors.map((error, index) => (
                  <li key={index} className="text-red-300">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline-muted"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="positive"
              onClick={handleImport}
              disabled={
                disabled || (!selection.metrics && !selection.categories && !selection.divisions)
              }
            >
              {loading ? 'Importing...' : 'Import Settings'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm ro-text-muted">
          {parsing ? 'Parsing template...' : 'Select a template to begin.'}
        </div>
      )}
    </Modal>
  )
}

async function importTemplateData(
  data: TournamentTemplateData,
  selection: ImportSelection
): Promise<ImportSummary> {
  const summary: ImportSummary = JSON.parse(JSON.stringify(emptySummary))

  const existingMetrics = await window.api.metrics.list()
  const metricNameToId = new Map(
    existingMetrics.map((metric) => [normalizeName(metric.label), metric.id])
  )

  const existingCategories = await window.api.categories.list()
  const categoryNameToId = new Map(
    existingCategories.map((category) => [normalizeName(category.name), category.id])
  )

  const existingDivisions = await window.api.divisions.list()
  const divisionNameToId = new Map(
    existingDivisions.map((division) => [normalizeName(division.name), division.id])
  )

  if (selection.metrics) {
    for (const row of data.metrics) {
      const name = normalizeName(row.name)
      if (!name || metricNameToId.has(name)) {
        summary.skipped.metrics += 1
        continue
      }
      if (!row.unit) {
        summary.errors.push(`Metric "${row.name}" skipped: missing unit`)
        summary.skipped.metrics += 1
        continue
      }
      const id = await window.api.metrics.create({ label: name, unit: row.unit })
      metricNameToId.set(name, id)
      summary.created.metrics += 1
    }
  } else {
    summary.skipped.metrics += data.metrics.length
  }

  if (selection.categories) {
    for (const row of data.categories) {
      const name = normalizeName(row.name)
      if (!name || categoryNameToId.has(name)) {
        summary.skipped.categories += 1
        continue
      }
      const missingMetrics = row.metrics
        .map((metricName) => normalizeName(metricName))
        .filter((metricName) => !metricNameToId.has(metricName))
      if (missingMetrics.length) {
        summary.errors.push(
          `Category "${row.name}" skipped: missing metrics ${missingMetrics.join(', ')}`
        )
        summary.skipped.categories += 1
        continue
      }
      const id = await window.api.categories.create({
        name,
        direction: row.direction
      })
      categoryNameToId.set(name, id)
      for (const metricName of row.metrics) {
        const normalized = normalizeName(metricName)
        const metricId = metricNameToId.get(normalized)
        if (metricId) {
          await window.api.categories.addMetric(id, metricId)
        }
      }
      summary.created.categories += 1
    }
  } else {
    summary.skipped.categories += data.categories.length
  }

  if (selection.divisions) {
    for (const row of data.divisions) {
      const name = normalizeName(row.name)
      if (!name || divisionNameToId.has(name)) {
        summary.skipped.divisions += 1
        continue
      }
      const missingCategories = row.categories
        .map((categoryName) => normalizeName(categoryName))
        .filter((categoryName) => !categoryNameToId.has(categoryName))
      if (missingCategories.length) {
        summary.errors.push(
          `Division "${row.name}" skipped: missing categories ${missingCategories.join(', ')}`
        )
        summary.skipped.divisions += 1
        continue
      }
      const id = await window.api.divisions.create({ name })
      divisionNameToId.set(name, id)
      for (let index = 0; index < row.categories.length; index += 1) {
        const normalized = normalizeName(row.categories[index])
        const categoryId = categoryNameToId.get(normalized)
        if (categoryId) {
          await window.api.divisions.addCategory(id, categoryId, 1, index)
        }
      }
      summary.created.divisions += 1
    }
  } else {
    summary.skipped.divisions += data.divisions.length
  }

  return summary
}
