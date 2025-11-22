import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { buildTournamentTemplate } from '@core/templates/tournamentSettingsTemplate'
import type {
  TemplateCategoryRow,
  TemplateDivisionRow,
  TemplateMetricRow
} from '@core/templates/tournamentSettingsTemplate'
import { toast } from 'sonner'
import { buildCsvExportFilename } from '@core/utils/csv'

const sanitizeName = (value: string) => value.trim()

export function SettingsExportButton() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const [metrics, categories, divisions, metadata] = await Promise.all([
        window.api.metrics.list(),
        window.api.categories.listViews(),
        window.api.divisions.list(),
        window.api.tournaments.getMetadata()
      ])

      const categoryMap = new Map(categories.map((category) => [category.id, category]))

      const metricRows: TemplateMetricRow[] = metrics.map((metric) => ({
        name: sanitizeName(metric.label),
        unit: metric.unit,
        description: ''
      }))

      const categoryRows: TemplateCategoryRow[] = categories.map((category) => ({
        name: sanitizeName(category.name),
        direction: category.direction === 'asc' ? 'asc' : 'desc',
        description: '',
        metrics: category.metrics.map((metric) => sanitizeName(metric.label))
      }))

      const divisionRows: TemplateDivisionRow[] = []
      for (const division of divisions) {
        const links = await window.api.divisions.listCategories(division.id)
        const sorted = [...links].sort((a, b) => {
          const orderA = a.order ?? 0
          const orderB = b.order ?? 0
          if (orderA !== orderB) return orderA - orderB
          return a.categoryId.localeCompare(b.categoryId)
        })
        divisionRows.push({
          name: sanitizeName(division.name),
          description: '',
          categories: sorted
            .map((link) => sanitizeName(categoryMap.get(link.categoryId)?.name ?? ''))
            .filter(Boolean)
        })
      }

      const csv = buildTournamentTemplate({
        metrics: metricRows,
        categories: categoryRows,
        divisions: divisionRows
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = buildCsvExportFilename(metadata.name, 'settings')
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Exported tournament settings')
    } catch (error) {
      console.error('Failed to export settings', error)
      toast.error('Unable to export tournament settings')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      {exporting ? 'Exporting...' : 'Export Settings'}
    </Button>
  )
}
