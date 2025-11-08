import type { Division } from '@core/tournaments/divisions'
import type { PlayerFormData } from '@core/players/playerFormSchema'

export const PLAYER_FIELD_KEYS = [
  'firstName',
  'lastName',
  'email',
  'cellPhone',
  'emergencyContact'
] as const

export type PlayerFieldKey = (typeof PLAYER_FIELD_KEYS)[number]
export type PlayerFieldMapping = Record<PlayerFieldKey, string>

export type DivisionMapping = {
  column?: string
  truthyValue: string
}

export type PreparedImportRow = {
  rowNumber: number
  player: PlayerFormData
  divisionIds: string[]
  divisionNames: string[]
}

export const REQUIRED_FIELDS: ReadonlyArray<PlayerFieldKey> = ['firstName', 'lastName', 'email']
export const DEFAULT_TRUTHY_VALUE = 'yes'
export const DUPLICATE_PREVIEW_LIMIT = 5

export const selectClass =
  'h-10 w-full rounded-md border ro-border bg-transparent px-3 text-sm ro-text-main focus:outline-none focus:ring-0'

export const createEmptyFieldMapping = (): PlayerFieldMapping => ({
  firstName: '',
  lastName: '',
  email: '',
  cellPhone: '',
  emergencyContact: ''
})

export type DivisionMappingsMap = Record<string, DivisionMapping>

export type MappingFormProps = {
  columns: string[]
  fieldMapping: PlayerFieldMapping
  onFieldChange: (field: PlayerFieldKey, column: string) => void
  divisions: Division[]
  divisionMappings: DivisionMappingsMap
  onDivisionMappingChange: (divisionId: string, patch: Partial<DivisionMapping>) => void
  loadingDivisions: boolean
}

export type ReviewTableProps = {
  rows: PreparedImportRow[]
  rowErrorsCount: number
  onRemoveRow: (rowNumber: number) => void
}

export type DuplicateNoticeProps = {
  notices: string[]
  preview: string[]
  extraCount: number
}

export type NoticePanelProps = {
  successCount: number
  duplicates: DuplicateNoticeProps
  errors: {
    details: string[]
    extraCount: number
  }
}
