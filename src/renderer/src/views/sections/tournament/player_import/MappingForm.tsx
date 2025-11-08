import { Field } from '@renderer/components/ui/field'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import type { MappingFormProps, PlayerFieldKey } from './types'
import { PLAYER_FIELD_KEYS, REQUIRED_FIELDS, selectClass, DEFAULT_TRUTHY_VALUE } from './types'

const FIELD_LABELS: Record<PlayerFieldKey, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  cellPhone: 'Cell Phone',
  emergencyContact: 'Emergency Contact'
}

export function MappingForm({
  columns,
  fieldMapping,
  onFieldChange,
  divisions,
  divisionMappings,
  onDivisionMappingChange,
  loadingDivisions
}: MappingFormProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-md border ro-border-muted p-4">
        <div className="mb-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">Player Fields</p>
          <p className="text-xs ro-text-muted">
            Match each player attribute to the correct column.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PLAYER_FIELD_KEYS.map((field) => {
            const required = REQUIRED_FIELDS.includes(field)
            return (
              <Field
                key={field}
                label={<Label>{FIELD_LABELS[field]}</Label>}
                description={required ? 'Required' : 'Optional'}
              >
                <select
                  className={selectClass}
                  value={fieldMapping[field]}
                  onChange={(event) => onFieldChange(field, event.target.value)}
                >
                  <option value="">{required ? 'Select column' : 'Not mapped'}</option>
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </Field>
            )
          })}
        </div>
      </div>
      <div className="rounded-md border ro-border-muted p-4">
        <div className="mb-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">Division Eligibility</p>
          <p className="text-xs ro-text-muted">
            Choose the column and value that marks a player eligible.
          </p>
        </div>
        {loadingDivisions ? (
          <p className="text-xs ro-text-muted">Loading divisions...</p>
        ) : divisions.length ? (
          <div className="flex flex-col gap-3">
            {divisions.map((division) => {
              const mapping = divisionMappings[division.id] ?? {
                column: undefined,
                truthyValue: DEFAULT_TRUTHY_VALUE
              }
              return (
                <div key={division.id} className="grid gap-3 md:grid-cols-2">
                  <Field label={<Label>{division.name}</Label>}>
                    <select
                      className={selectClass}
                      value={mapping.column ?? ''}
                      onChange={(event) =>
                        onDivisionMappingChange(division.id, {
                          column: event.target.value || undefined
                        })
                      }
                    >
                      <option value="">Not mapped</option>
                      {columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={<Label>Truthy Value</Label>} description="Case-insensitive">
                    <Input
                      value={mapping.truthyValue}
                      onChange={(event) =>
                        onDivisionMappingChange(division.id, {
                          truthyValue: event.target.value
                        })
                      }
                      placeholder="e.g. YES"
                      disabled={!mapping.column}
                    />
                  </Field>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs ro-text-muted">No divisions available yet.</p>
        )}
      </div>
    </div>
  )
}
