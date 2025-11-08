import type { NoticePanelProps } from './types'

const DUPLICATE_PREVIEW_LIMIT = 50

export function NoticePanel({ successCount, duplicates, errors }: NoticePanelProps) {
  const displayNames = duplicates.notices.slice(0, DUPLICATE_PREVIEW_LIMIT)
  const extraDupes = Math.max(0, duplicates.notices.length - displayNames.length)

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-xs text-green-100">
        <p className="font-semibold uppercase tracking-wide text-green-200">
          Importing {successCount} new player{successCount === 1 ? '' : 's'}
        </p>
        <p className="text-[11px] text-green-200">
          These rows passed validation and will be added when you confirm.
        </p>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
        <p className="font-semibold uppercase tracking-wide text-amber-200">
          Excluded {duplicates.notices.length} duplicate player
          {duplicates.notices.length === 1 ? '' : 's'} (already on the roster)
        </p>
        {duplicates.notices.length ? (
          <p className="mt-2 text-[11px] text-amber-100">
            {displayNames.join(', ')}
            {extraDupes > 0 ? `, +${extraDupes} more` : ''}
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-amber-200">No duplicates detected.</p>
        )}
      </div>

      <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-100">
        <p className="font-semibold uppercase tracking-wide">Skipped Rows</p>
        {errors.details.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.details.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
            {errors.extraCount > 0 ? (
              <li>Plus {errors.extraCount} more. Review the CSV to resolve remaining issues.</li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-2 text-[11px] text-red-200">0 errors found.</p>
        )}
      </div>
    </div>
  )
}
