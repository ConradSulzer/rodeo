import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Division } from '@core/tournaments/divisions'
import {
  buildPlayerDisplayName,
  playerFormSchema,
  type PlayerFormInput,
  type PlayerFormData
} from '@core/players/playerFormSchema'
import type { Player } from '@core/players/players'
import type { ParsedCsvFile } from '@core/utils/csv'
import { parseCsvFile } from '@core/utils/csv'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/ui/button'
import { MappingForm } from './MappingForm'
import { ReviewTable } from './ReviewTable'
import { NoticePanel } from './NoticePanel'
import {
  createEmptyFieldMapping,
  DEFAULT_TRUTHY_VALUE,
  DUPLICATE_PREVIEW_LIMIT,
  PlayerFieldKey,
  PlayerFieldMapping,
  DivisionMapping,
  PreparedImportRow,
  REQUIRED_FIELDS
} from './types'

type ImportStep = 'mapping' | 'notices' | 'preview'

type PlayerImportModalProps = {
  open: boolean
  file: File | null
  onClose: () => void
  onComplete?: (success: boolean) => void
}

const suggestFieldMapping = (headers: string[]): PlayerFieldMapping => {
  const taken = new Set<number>()
  const findHeader = (keywords: string[]): string => {
    const normalizedHeaders = headers.map((header) => header.toLowerCase())
    const index = normalizedHeaders.findIndex((header, idx) => {
      if (taken.has(idx)) return false
      return keywords.some((keyword) => header.includes(keyword))
    })
    if (index === -1) return ''
    taken.add(index)
    return headers[index]
  }

  return {
    firstName: findHeader(['first', 'given', 'fname']),
    lastName: findHeader(['last', 'family', 'surname', 'lname']),
    email: findHeader(['email', 'e-mail']),
    cellPhone: findHeader(['cell', 'mobile', 'phone']),
    emergencyContact: findHeader(['emergency', 'ice'])
  }
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const buildDivisionMappings = (
  divisions: Division[],
  headers: string[]
): Record<string, DivisionMapping> => {
  const normalizedHeaders = headers.map((header) => normalize(header))
  return divisions.reduce<Record<string, DivisionMapping>>((acc, division) => {
    const matchIndex = normalizedHeaders.findIndex((header) =>
      header.includes(normalize(division.name))
    )
    acc[division.id] = {
      column: matchIndex >= 0 ? headers[matchIndex] : undefined,
      truthyValue: DEFAULT_TRUTHY_VALUE
    }
    return acc
  }, {})
}

const getCellValue = (row: ParsedCsvFile['rows'][number], column?: string) => {
  if (!column) return ''
  return row.data[column] ?? ''
}

const normalizeTruthiness = (value: string) => value.trim().toLowerCase()

type PlayerIdentity = {
  firstName: string
  lastName: string
  email: string
}

const buildPlayerKey = ({ firstName, lastName, email }: PlayerIdentity) =>
  [email, firstName, lastName].map((part) => part.trim().toLowerCase()).join('|')

export function PlayerImportModal({ open, file, onClose, onComplete }: PlayerImportModalProps) {
  const [csvFile, setCsvFile] = useState<{ fileName: string; parsed: ParsedCsvFile } | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [fieldMapping, setFieldMapping] = useState<PlayerFieldMapping>(createEmptyFieldMapping)
  const [divisionMappings, setDivisionMappings] = useState<Record<string, DivisionMapping>>({})
  const [rowErrors, setRowErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loadingDivisions, setLoadingDivisions] = useState(false)
  const [existingPlayers, setExistingPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [step, setStep] = useState<ImportStep>('mapping')
  const [reviewRows, setReviewRows] = useState<PreparedImportRow[]>([])
  const [duplicateNotices, setDuplicateNotices] = useState<string[]>([])

  const resetReviewProgress = useCallback(() => {
    setReviewRows([])
    setStep('mapping')
    setDuplicateNotices([])
  }, [])

  const resetState = useCallback(() => {
    setCsvFile(null)
    setParsing(false)
    setParseError(null)
    setFieldMapping(createEmptyFieldMapping())
    setDivisionMappings({})
    setRowErrors([])
    setImporting(false)
    resetReviewProgress()
  }, [resetReviewProgress])

  const closeAndReset = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingDivisions(true)
    window.api.divisions
      .list()
      .then((list) => {
        if (cancelled) return
        setDivisions(list)
      })
      .catch((error) => {
        console.error('Failed to load divisions for import', error)
        toast.error('Unable to load divisions')
      })
      .finally(() => {
        if (!cancelled) setLoadingDivisions(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingPlayers(true)
    window.api.players
      .list()
      .then((list) => {
        if (cancelled) return
        setExistingPlayers(list)
      })
      .catch((error) => {
        console.error('Failed to load players for import', error)
        toast.error('Unable to load players')
      })
      .finally(() => {
        if (!cancelled) setLoadingPlayers(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  useEffect(() => {
    if (!csvFile || !divisions.length) return
    setDivisionMappings((prev) => {
      const next = { ...prev }
      let changed = false
      for (const division of divisions) {
        if (next[division.id]) continue
        const built = buildDivisionMappings([division], csvFile.parsed.headers)[division.id]
        next[division.id] = built
        changed = true
      }
      return changed ? next : prev
    })
  }, [csvFile, divisions])

  const headers = csvFile?.parsed.headers ?? []
  const totalRows = csvFile?.parsed.totalRows ?? 0
  const divisionNameLookup = useMemo(() => {
    const map = new Map<string, string>()
    divisions.forEach((division) => map.set(division.id, division.name))
    return map
  }, [divisions])
  const existingPlayerKeys = useMemo(() => {
    const keys = new Set<string>()
    existingPlayers.forEach((player) => keys.add(buildPlayerKey(player)))
    return keys
  }, [existingPlayers])

  const duplicatePreview = duplicateNotices.slice(0, DUPLICATE_PREVIEW_LIMIT)
  const duplicateExtraCount = Math.max(0, duplicateNotices.length - duplicatePreview.length)
  const hasRequiredMappings = REQUIRED_FIELDS.every((field) => Boolean(fieldMapping[field]))

  const canReview =
    step === 'mapping' &&
    Boolean(csvFile) &&
    hasRequiredMappings &&
    totalRows > 0 &&
    !parsing &&
    !loadingPlayers
  const canConfirm = step === 'preview' && reviewRows.length > 0 && !importing

  useEffect(() => {
    if (!open) return
    if (!file) {
      setCsvFile(null)
      setFieldMapping(createEmptyFieldMapping())
      setDivisionMappings({})
      setRowErrors([])
      setDuplicateNotices([])
      setStep('mapping')
      return
    }

    let cancelled = false
    const parse = async () => {
      setParsing(true)
      setParseError(null)
      setRowErrors([])
      setDuplicateNotices([])
      resetReviewProgress()
      try {
        const parsed = await parseCsvFile(file)
        if (cancelled) return
        setCsvFile({ fileName: file.name, parsed })
        setFieldMapping(suggestFieldMapping(parsed.headers))
        setStep('mapping')
      } catch (error) {
        if (cancelled) return
        console.error('Failed to parse CSV', error)
        setParseError(error instanceof Error ? error.message : 'Unable to parse CSV file.')
        setCsvFile(null)
      } finally {
        if (!cancelled) setParsing(false)
      }
    }

    parse()
    return () => {
      cancelled = true
    }
  }, [file, open, resetReviewProgress])

  const updateFieldMapping = (field: PlayerFieldKey, column: string) => {
    resetReviewProgress()
    setFieldMapping((prev) => ({ ...prev, [field]: column }))
  }

  const updateDivisionMapping = (divisionId: string, patch: Partial<DivisionMapping>) => {
    resetReviewProgress()
    setDivisionMappings((prev) => {
      const current = prev[divisionId] ?? { column: undefined, truthyValue: DEFAULT_TRUTHY_VALUE }
      return {
        ...prev,
        [divisionId]: {
          ...current,
          ...patch
        }
      }
    })
  }

  const handlePrepareReview = () => {
    if (!csvFile) return

    const errors: string[] = []
    const prepared: PreparedImportRow[] = []
    const seenKeys = new Set(existingPlayerKeys)
    const duplicates: string[] = []

    for (const row of csvFile.parsed.rows) {
      const firstName = getCellValue(row, fieldMapping.firstName).trim()
      const lastName = getCellValue(row, fieldMapping.lastName).trim()
      const email = getCellValue(row, fieldMapping.email).trim()
      const cellPhone = getCellValue(row, fieldMapping.cellPhone)
      const emergencyContact = getCellValue(row, fieldMapping.emergencyContact)

      if (!firstName || !lastName || !email) {
        errors.push(`Row ${row.rowNumber}: Missing required player details.`)
        continue
      }

      const formInput: PlayerFormInput = {
        firstName,
        lastName,
        displayName: buildPlayerDisplayName(firstName, lastName),
        email,
        cellPhone,
        emergencyContact
      }

      const parsedInput = playerFormSchema.safeParse(formInput)
      if (!parsedInput.success) {
        errors.push(
          `Row ${row.rowNumber}: ${parsedInput.error.issues[0]?.message ?? 'Invalid data'}.`
        )
        continue
      }

      const payload: PlayerFormData = parsedInput.data
      const key = buildPlayerKey(payload)
      if (seenKeys.has(key)) {
        duplicates.push(payload.displayName)
        continue
      }
      seenKeys.add(key)

      const divisionAssignments = divisions
        .filter((division) => {
          const mapping = divisionMappings[division.id]
          if (!mapping?.column || !mapping.truthyValue.trim()) return false
          const value = getCellValue(row, mapping.column)
          return value && normalizeTruthiness(value) === normalizeTruthiness(mapping.truthyValue)
        })
        .map((division) => division.id)

      const divisionNames = divisionAssignments.map(
        (divisionId) => divisionNameLookup.get(divisionId) ?? divisionId
      )

      prepared.push({
        rowNumber: row.rowNumber,
        player: payload,
        divisionIds: divisionAssignments,
        divisionNames
      })
    }

    setDuplicateNotices(duplicates)
    if (!prepared.length) {
      setReviewRows([])
      setRowErrors(errors)
      if (errors.length) {
        toast.error('No valid players found. Resolve the issues below and try again.')
      } else if (duplicates.length) {
        toast.info('All rows were duplicates. No new players to import.')
      }
      return
    }

    setReviewRows(prepared)
    setRowErrors(errors)
    if (errors.length || duplicates.length) {
      setStep('notices')
    } else {
      setStep('preview')
    }
  }

  const handleConfirmImport = async () => {
    if (!reviewRows.length) return
    setImporting(true)
    const errors: string[] = []
    let created = 0

    for (const row of reviewRows) {
      const payload = row.player
      try {
        const playerId = await window.api.players.create({
          firstName: payload.firstName,
          lastName: payload.lastName,
          displayName: payload.displayName,
          email: payload.email,
          cellPhone: payload.cellPhone,
          emergencyContact: payload.emergencyContact
        })

        if (row.divisionIds.length) {
          await Promise.all(
            row.divisionIds.map((divisionId) =>
              window.api.divisions.addPlayer(divisionId, playerId)
            )
          )
        }

        created += 1
      } catch (error) {
        console.error(`Failed to import player from row ${row.rowNumber}`, error)
        errors.push(`Row ${row.rowNumber}: Unable to save player.`)
      }
    }

    if (created) {
      const noun = created === 1 ? 'player' : 'players'
      toast.success(`Imported ${created} ${noun}.`)
    }

    if (errors.length) {
      setRowErrors(errors)
      toast.error(`${errors.length} row${errors.length > 1 ? 's' : ''} could not be imported.`)
      setImporting(false)
      return
    }

    onComplete?.(errors.length === 0)
    closeAndReset()
    setImporting(false)
  }

  const handleRemoveRow = (rowNumber: number) => {
    setReviewRows((prev) => prev.filter((row) => row.rowNumber !== rowNumber))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step === 'mapping') {
      handlePrepareReview()
    } else if (step === 'notices') {
      setStep('preview')
    } else {
      await handleConfirmImport()
    }
  }

  const renderedRowErrors = rowErrors.slice(0, 6)
  const extraErrorCount = Math.max(0, rowErrors.length - renderedRowErrors.length)
  const hasNotices = rowErrors.length > 0 || duplicateNotices.length > 0

  const renderStepContent = () => {
    if (parsing) {
      return (
        <div className="rounded-md border border-dashed ro-border-muted p-6 text-center text-sm ro-text-muted">
          Parsing CSV...
        </div>
      )
    }

    if (parseError) {
      return (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {parseError}
        </div>
      )
    }

    if (!file) {
      return (
        <div className="rounded-md border ro-border-muted p-6 text-center text-sm ro-text-muted">
          Select a CSV file to begin the import.
        </div>
      )
    }

    if (!csvFile) {
      return (
        <div className="rounded-md border ro-border-muted p-6 text-center text-sm ro-text-muted">
          Preparing file details...
        </div>
      )
    }

    const summary = (
      <div className="rounded-md border ro-border-muted p-4">
        <p className="text-sm font-semibold">{csvFile.fileName}</p>
        <p className="text-xs ro-text-muted">
          Rows detected: {totalRows}. Players with missing required fields will be skipped.
        </p>
      </div>
    )

    if (step === 'mapping') {
      return (
        <>
          {summary}
          <MappingForm
            columns={headers}
            fieldMapping={fieldMapping}
            onFieldChange={updateFieldMapping}
            divisions={divisions}
            divisionMappings={divisionMappings}
            onDivisionMappingChange={updateDivisionMapping}
            loadingDivisions={loadingDivisions}
          />
        </>
      )
    }

    if (step === 'notices') {
      return (
        <>
          {summary}
          <NoticePanel
            successCount={reviewRows.length}
            duplicates={{
              notices: duplicateNotices,
              preview: duplicatePreview,
              extraCount: duplicateExtraCount
            }}
            errors={{
              details: renderedRowErrors,
              extraCount: extraErrorCount
            }}
          />
        </>
      )
    }

    return (
      <>
        {summary}
        <ReviewTable
          rows={reviewRows}
          rowErrorsCount={rowErrors.length}
          onRemoveRow={handleRemoveRow}
        />
      </>
    )
  }

  return (
    <Modal
      open={open}
      onClose={importing ? () => {} : closeAndReset}
      title="Import Players"
      contentClassName="w-full max-w-5xl"
      bodyClassName="flex h-full flex-col"
    >
      <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex-1 space-y-6 overflow-y-auto pr-1">{renderStepContent()}</div>

        <div className="flex flex-wrap justify-end gap-3 ro-border-muted pt-4">
          <Button
            type="button"
            variant="outline-muted"
            size="sm"
            onClick={closeAndReset}
            disabled={importing}
          >
            Cancel
          </Button>
          {step === 'mapping' ? (
            <Button type="submit" size="sm" variant="outline" disabled={!canReview}>
              Continue
            </Button>
          ) : step === 'notices' ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline-muted"
                onClick={() => setStep('mapping')}
                disabled={importing}
              >
                Back
              </Button>
              <Button type="submit" size="sm" variant="outline" disabled={importing}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline-muted"
                onClick={() => setStep(hasNotices ? 'notices' : 'mapping')}
                disabled={importing}
              >
                Back
              </Button>
              <Button type="submit" size="sm" variant="positive" disabled={!canConfirm}>
                {importing ? 'Importing...' : `Confirm Import (${reviewRows.length})`}
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}
