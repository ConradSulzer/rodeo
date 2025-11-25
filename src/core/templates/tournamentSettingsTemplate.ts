import Papa from 'papaparse'

export type TemplateMetricRow = {
  name: string
  unit: string
  description?: string
}

export type TemplateCategoryRow = {
  name: string
  direction: 'asc' | 'desc'
  description?: string
  metrics: string[]
}

export type TemplateDivisionRow = {
  name: string
  description?: string
  categories: string[]
}

export type TournamentTemplateData = {
  metrics: TemplateMetricRow[]
  categories: TemplateCategoryRow[]
  divisions: TemplateDivisionRow[]
}

const SECTION_HEADERS = {
  metrics: '# Metrics',
  categories: '# Categories',
  divisions: '# Divisions'
} as const

function parseTable<T>(lines: string[], expectedColumns: string[]): T[] {
  if (!lines.length) return []
  const csv = lines.join('\n')
  const result = Papa.parse<T>(csv, {
    header: true,
    skipEmptyLines: true
  })
  if (result.errors.length) {
    throw new Error(result.errors[0].message)
  }
  return result.data.map((row) => {
    const normalized: Record<string, string> = {}
    for (const column of expectedColumns) {
      normalized[column] = (row as Record<string, string | undefined>)[column]?.trim() ?? ''
    }
    return normalized as unknown as T
  })
}

function extractSection(
  textLines: string[],
  headerLabel: string
): { rows: string[]; nextIndex: number } {
  let index = textLines.findIndex((line) => line.trim().toLowerCase() === headerLabel.toLowerCase())
  if (index === -1) {
    return { rows: [], nextIndex: textLines.length }
  }
  index += 1 // move past header
  while (index < textLines.length && !textLines[index].trim()) {
    index += 1
  }
  if (index >= textLines.length) {
    return { rows: [], nextIndex: textLines.length }
  }
  const headerLine = textLines[index]
  const rows: string[] = [headerLine]
  index += 1
  while (index < textLines.length) {
    const line = textLines[index]
    if (!line.trim()) break
    if (line.trim().startsWith('# ')) break
    rows.push(line)
    index += 1
  }
  return { rows, nextIndex: index }
}

export function parseTournamentTemplate(csvText: string): TournamentTemplateData {
  const lines = csvText.split(/\r?\n/)

  const metricSection = extractSection(lines, SECTION_HEADERS.metrics)
  const metrics = parseTable<TemplateMetricRow>(metricSection.rows, [
    'name',
    'unit',
    'description'
  ]).filter((row) => row.name)

  const categorySection = extractSection(
    lines.slice(metricSection.nextIndex),
    SECTION_HEADERS.categories
  )
  const categoriesRaw = parseTable<{
    name: string
    direction: string
    description?: string
    metrics?: string
  }>(categorySection.rows, ['name', 'direction', 'description', 'metrics'])
  const categories: TemplateCategoryRow[] = categoriesRaw
    .filter((row) => row.name)
    .map((row) => ({
      name: row.name,
      direction: row.direction === 'asc' ? 'asc' : 'desc',
      description: row.description,
      metrics: row.metrics
        ? row.metrics
            .split(';')
            .map((value) => value.trim())
            .filter(Boolean)
        : []
    }))

  const divisionSection = extractSection(
    lines.slice(metricSection.nextIndex + categorySection.nextIndex),
    SECTION_HEADERS.divisions
  )
  const divisionsRaw = parseTable<{ name: string; description?: string; categories?: string }>(
    divisionSection.rows,
    ['name', 'description', 'categories']
  )
  const divisions: TemplateDivisionRow[] = divisionsRaw
    .filter((row) => row.name)
    .map((row) => ({
      name: row.name,
      description: row.description,
      categories: row.categories
        ? row.categories
            .split(';')
            .map((value) => value.trim())
            .filter(Boolean)
        : []
    }))

  return { metrics, categories, divisions }
}

function buildSection(
  header: string,
  columns: string[],
  rows: Array<Record<string, string>>
): string {
  const table: string[] = [header, columns.join(',')]
  for (const row of rows) {
    const line = columns
      .map((column) => {
        const value = row[column] ?? ''
        if (value.includes(',') || value.includes(';')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
      .join(',')
    table.push(line)
  }
  table.push('')
  return table.join('\n')
}

export function buildTournamentTemplate(data: TournamentTemplateData): string {
  const metricRows = data.metrics.map((row) => ({
    name: row.name,
    unit: row.unit,
    description: row.description ?? ''
  }))
  const categoryRows = data.categories.map((row) => ({
    name: row.name,
    direction: row.direction,
    description: row.description ?? '',
    metrics: row.metrics.join('; ')
  }))
  const divisionRows = data.divisions.map((row) => ({
    name: row.name,
    description: row.description ?? '',
    categories: row.categories.join('; ')
  }))

  return [
    buildSection(SECTION_HEADERS.metrics, ['name', 'unit', 'description'], metricRows),
    buildSection(
      SECTION_HEADERS.categories,
      ['name', 'direction', 'description', 'metrics'],
      categoryRows
    ),
    buildSection(SECTION_HEADERS.divisions, ['name', 'description', 'categories'], divisionRows)
  ]
    .join('\n')
    .trim()
}
