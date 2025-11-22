import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Modal } from '@renderer/components/Modal'
import { toast } from 'sonner'
import { buildCsvExportFilename } from '@core/utils/csv'
import { useResultsData } from '@renderer/hooks/useResultsData'
import { useDivisionCatalog } from '@renderer/queries/divisions'
import { usePlayerAssignmentsQuery } from '@renderer/queries/players'
import { buildResultsCsv } from '@renderer/utils/reports/resultsCsv'

export function ResultsExportButton() {
  const [open, setOpen] = useState(false)
  const [includeUnscored, setIncludeUnscored] = useState(true)
  const [exporting, setExporting] = useState(false)
  const { metrics, rows } = useResultsData()
  const { list: divisionList = [] } = useDivisionCatalog()
  const { data: playerAssignments = [] } = usePlayerAssignmentsQuery()

  const handleExport = async () => {
    setExporting(true)
    try {
      const metadata = await window.api.tournaments.getMetadata()
      const csv = buildResultsCsv({
        metrics,
        playerAssignments,
        rows,
        divisions: divisionList,
        includeUnscored
      })
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = buildCsvExportFilename(metadata.name, 'results')
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Exported results')
      setOpen(false)
    } catch (error) {
      console.error('Failed to export results', error)
      toast.error('Unable to export results')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Export Results
      </Button>
      <Modal open={open} onClose={() => (exporting ? null : setOpen(false))} title="Export Results">
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeUnscored}
              onChange={(event) => setIncludeUnscored(event.target.checked)}
              disabled={exporting}
            />
            Include players without scores
          </label>
          <p className="text-xs ro-text-muted">
            CSV columns: player name, email, one column per metric, and one column per division.
            Score columns show recorded values; division columns show TRUE/FALSE for membership.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline-muted"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="positive"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
