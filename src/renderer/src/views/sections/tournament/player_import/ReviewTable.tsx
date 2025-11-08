import { FiX } from 'react-icons/fi'
import type { ReviewTableProps } from './types'

export function ReviewTable({ rows, rowErrorsCount, onRemoveRow }: ReviewTableProps) {
  return (
    <div className="rounded-md border ro-border-muted">
      <div className="flex items-center justify-between border-b ro-border-muted px-4 py-2 text-sm font-semibold">
        <span>
          Review {rows.length} player{rows.length === 1 ? '' : 's'}
        </span>
        <span className="text-xs ro-text-muted">
          {rowErrorsCount
            ? `${rowErrorsCount} row${rowErrorsCount === 1 ? '' : 's'} skipped from the CSV`
            : 'Remove rows that should not be imported.'}
        </span>
      </div>
      <div className="max-h-[50vh] overflow-auto">
        {rows.length ? (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-black/40 backdrop-blur">
              <tr>
                <th className="border-b border-black/30 px-3 py-2 font-semibold uppercase tracking-wide">
                  Row
                </th>
                <th className="border-b border-black/30 px-3 py-2 font-semibold uppercase tracking-wide">
                  Player
                </th>
                <th className="border-b border-black/30 px-3 py-2 font-semibold uppercase tracking-wide">
                  Email
                </th>
                <th className="border-b border-black/30 px-3 py-2 font-semibold uppercase tracking-wide">
                  Cell
                </th>
                <th className="border-b border-black/30 px-3 py-2 font-semibold uppercase tracking-wide">
                  Emergency
                </th>
                <th className="border-b border-black/30 px-3 py-2 font-semibold uppercase tracking-wide">
                  Divisions
                </th>
                <th className="border-b border-black/30 px-3 py-2 text-right font-semibold uppercase tracking-wide">
                  Remove
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rowNumber} className="odd:bg-black/20 even:bg-transparent">
                  <td className="border-b border-black/20 px-3 py-2">#{row.rowNumber}</td>
                  <td className="border-b border-black/20 px-3 py-2">
                    <div className="font-semibold">{row.player.displayName}</div>
                    <div className="text-[10px] uppercase tracking-wide ro-text-muted">
                      {row.player.firstName} {row.player.lastName}
                    </div>
                  </td>
                  <td className="border-b border-black/20 px-3 py-2">{row.player.email}</td>
                  <td className="border-b border-black/20 px-3 py-2">
                    {row.player.cellPhone || <span className="ro-text-muted">—</span>}
                  </td>
                  <td className="border-b border-black/20 px-3 py-2">
                    {row.player.emergencyContact || <span className="ro-text-muted">—</span>}
                  </td>
                  <td className="border-b border-black/20 px-3 py-2">
                    {row.divisionNames.length ? row.divisionNames.join(', ') : '—'}
                  </td>
                  <td className="border-b border-black/20 px-3 py-2 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center text-red-400 hover:text-red-200"
                      onClick={() => onRemoveRow(row.rowNumber)}
                      aria-label={`Remove row ${row.rowNumber}`}
                    >
                      <FiX />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-sm ro-text-muted">All rows have been removed.</div>
        )}
      </div>
    </div>
  )
}
