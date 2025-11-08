import Papa, { type UnparseConfig } from 'papaparse'

export type CsvRecord = Record<string, string>

export type ParsedCsvRow = {
  rowNumber: number
  data: CsvRecord
}

export type ParsedCsvFile = {
  headers: string[]
  rows: ParsedCsvRow[]
  totalRows: number
}

export type ParseCsvOptions = {
  headerRowIndex?: number
}

const DEFAULT_HEADER = 'Column'

const isMeaningfulRow = (row: string[] | undefined): row is string[] => {
  if (!row) return false
  return row.some((value) => {
    if (value === undefined || value === null) return false
    if (typeof value === 'string') {
      return value.trim().length > 0
    }
    return String(value).trim().length > 0
  })
}

const normalizeCell = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

const buildHeaders = (raw: string[]): string[] => {
  const seen = new Map<string, number>()
  return raw.map((value, index) => {
    const base = normalizeCell(value) || `${DEFAULT_HEADER} ${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    if (count === 0) return base
    return `${base} (${count + 1})`
  })
}

export async function parseCsvFile(
  file: File,
  options: ParseCsvOptions = {}
): Promise<ParsedCsvFile> {
  const headerRowIndex = options.headerRowIndex ?? 0

  return new Promise<ParsedCsvFile>((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (results) => {
        const rowsWithNumbers = (results.data as Array<string[] | undefined>).map((row, index) => ({
          rowNumber: index + 1,
          values: row
        }))

        const meaningfulRows = rowsWithNumbers.filter(({ values }) => isMeaningfulRow(values))

        if (!meaningfulRows.length) {
          reject(new Error('The CSV file does not contain any rows.'))
          return
        }

        if (headerRowIndex < 0 || headerRowIndex >= meaningfulRows.length) {
          reject(new Error('Unable to locate the header row in the CSV file.'))
          return
        }

        const headerEntry = meaningfulRows[headerRowIndex]
        if (!headerEntry?.values) {
          reject(new Error('CSV header row is empty.'))
          return
        }

        const headers = buildHeaders(headerEntry.values)
        const dataRows = meaningfulRows.filter((_row, index) => index !== headerRowIndex)

        const rows: ParsedCsvRow[] = dataRows.map(({ values = [], rowNumber }) => {
          const data: CsvRecord = {}
          headers.forEach((header, columnIndex) => {
            data[header] = normalizeCell(values[columnIndex])
          })
          return { rowNumber, data }
        })

        resolve({
          headers,
          rows,
          totalRows: rows.length
        })
      },
      error: (error) => reject(error)
    })
  })
}

export function getCsvPreviewRows(parsed: ParsedCsvFile | null, limit = 5): ParsedCsvRow[] {
  if (!parsed) return []
  return parsed.rows.slice(0, limit)
}

export function toCsvString(rows: Record<string, unknown>[], config?: UnparseConfig): string {
  return Papa.unparse(rows, config)
}

export function toCsvBlob(rows: Record<string, unknown>[], config?: UnparseConfig): Blob {
  const csv = toCsvString(rows, config)
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
}
