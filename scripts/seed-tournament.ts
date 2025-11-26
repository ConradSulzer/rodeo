import fs from 'node:fs'
import path from 'node:path'

import { openDb, type AppDatabase } from '../src/core/db/db'
import { updateTournamentMetadata } from '../src/core/tournaments/tournaments'
import { createPlayer, type NewPlayer } from '../src/core/players/players'
import { createMetric, type NewMetric } from '../src/core/tournaments/metrics'
import {
  createCategory,
  addMetricToCategory,
  type NewCategory
} from '../src/core/tournaments/categories'
import {
  createDivision,
  addCategoryToDivision,
  addPlayerToDivision
} from '../src/core/tournaments/divisions'

type CliOptions = {
  targetPath: string
  force: boolean
}

type MetricSeed = NewMetric & { key: string }
type CategorySeed = NewCategory & { key: string; metrics: string[] }
type DivisionCategorySeed = { category: string; depth?: number; order?: number }
type DivisionSeed = {
  name: string
  order?: number
  categories: DivisionCategorySeed[]
  players: string[]
}

const DEFAULT_FILENAME = 'demo-tournament.rodeo'

function parseArgs(argv: string[]): CliOptions {
  let target: string | undefined
  let force = false

  for (const arg of argv) {
    if (arg === '--force' || arg === '-f') {
      force = true
      continue
    }

    if (!target) {
      target = arg
      continue
    }

    console.warn(`Ignoring unexpected argument: ${arg}`)
  }

  const targetPath = path.resolve(process.cwd(), target ?? path.join('tmp', DEFAULT_FILENAME))

  return { targetPath, force }
}

function ensureWritableTarget(targetPath: string, force: boolean) {
  const dir = path.dirname(targetPath)
  fs.mkdirSync(dir, { recursive: true })

  if (fs.existsSync(targetPath)) {
    if (!force) {
      console.error(`File already exists at ${targetPath}. Pass --force to overwrite.`)
      process.exit(1)
    }
    fs.rmSync(targetPath)
  }
}

function seedPlayers(db: AppDatabase) {
  const players: Array<NewPlayer & { key: string }> = [
    {
      key: 'capt_aiden',
      firstName: 'Aiden',
      lastName: 'Thibodeaux',
      displayName: 'Aiden Thibodeaux',
      email: 'aiden.thibodeaux@example.com',
      cellPhone: '555-2101',
      emergencyContact: '555-3121'
    },
    {
      key: 'bella_boudreaux',
      firstName: 'Bella',
      lastName: 'Boudreaux',
      displayName: 'Bella Boudreaux',
      email: 'bella.boudreaux@example.com',
      cellPhone: '555-2102',
      emergencyContact: '555-3122'
    },
    {
      key: 'cajun_cam',
      firstName: 'Cameron',
      lastName: 'LeJeune',
      displayName: 'Cameron LeJeune',
      email: 'cam.lejeune@example.com',
      cellPhone: '555-2103',
      emergencyContact: '555-3123'
    },
    {
      key: 'dockside_dev',
      firstName: 'Devon',
      lastName: 'Breaux',
      displayName: 'Devon Breaux',
      email: 'devon.breaux@example.com',
      cellPhone: '555-2104',
      emergencyContact: '555-3124'
    },
    {
      key: 'marsh_em',
      firstName: 'Emerson',
      lastName: 'Landry',
      displayName: 'Emerson Landry',
      email: 'emerson.landry@example.com',
      cellPhone: '555-2105',
      emergencyContact: '555-3125'
    },
    {
      key: 'flats_fiona',
      firstName: 'Fiona',
      lastName: 'Duplessis',
      displayName: 'Fiona Duplessis',
      email: 'fiona.duplessis@example.com',
      cellPhone: '555-2106',
      emergencyContact: '555-3126'
    },
    {
      key: 'redfish_rex',
      firstName: 'Rex',
      lastName: 'Fontenot',
      displayName: 'Rex Fontenot',
      email: 'rex.fontenot@example.com',
      cellPhone: '555-2107',
      emergencyContact: '555-3127'
    },
    {
      key: 'bayou_bri',
      firstName: 'Brielle',
      lastName: 'Guidry',
      displayName: 'Brielle Guidry',
      email: 'bri.guidry@example.com',
      cellPhone: '555-2108',
      emergencyContact: '555-3128'
    },
    {
      key: 'pier_paul',
      firstName: 'Paul',
      lastName: 'Arceneaux',
      displayName: 'Paul Arceneaux',
      email: 'paul.arceneaux@example.com',
      cellPhone: '555-2109',
      emergencyContact: '555-3129'
    },
    {
      key: 'kayak_kai',
      firstName: 'Kai',
      lastName: 'Savoie',
      displayName: 'Kai Savoie',
      email: 'kai.savoie@example.com',
      cellPhone: '555-2110',
      emergencyContact: '555-3130'
    },
    {
      key: 'topwater_tess',
      firstName: 'Tessa',
      lastName: 'Gros',
      displayName: 'Tessa Gros',
      email: 'tessa.gros@example.com',
      cellPhone: '555-2111',
      emergencyContact: '555-3131'
    },
    {
      key: 'drum_dom',
      firstName: 'Dominic',
      lastName: 'Babin',
      displayName: 'Dominic Babin',
      email: 'dom.babin@example.com',
      cellPhone: '555-2112',
      emergencyContact: '555-3132'
    },
    {
      key: 'speck_sarah',
      firstName: 'Sarah',
      lastName: 'Dugas',
      displayName: 'Sarah Dugas',
      email: 'sarah.dugas@example.com',
      cellPhone: '555-2113',
      emergencyContact: '555-3133'
    },
    {
      key: 'pushpole_pete',
      firstName: 'Peter',
      lastName: 'Robichaux',
      displayName: 'Peter Robichaux',
      email: 'pete.robichaux@example.com',
      cellPhone: '555-2114',
      emergencyContact: '555-3134'
    },
    {
      key: 'island_ivy',
      firstName: 'Ivy',
      lastName: 'Gauthier',
      displayName: 'Ivy Gauthier',
      email: 'ivy.gauthier@example.com',
      cellPhone: '555-2115',
      emergencyContact: '555-3135'
    },
    {
      key: 'tidal_tom',
      firstName: 'Tom',
      lastName: 'Richard',
      displayName: 'Tom Richard',
      email: 'tom.richard@example.com',
      cellPhone: '555-2116',
      emergencyContact: '555-3136'
    },
    {
      key: 'marina_may',
      firstName: 'May',
      lastName: 'LeBlanc',
      displayName: 'May LeBlanc',
      email: 'may.leblanc@example.com',
      cellPhone: '555-2117',
      emergencyContact: '555-3137'
    },
    {
      key: 'charter_chase',
      firstName: 'Chase',
      lastName: 'Broussard',
      displayName: 'Chase Broussard',
      email: 'chase.broussard@example.com',
      cellPhone: '555-2118',
      emergencyContact: '555-3138'
    },
    {
      key: 'backlake_bex',
      firstName: 'Beatrix',
      lastName: 'Hebert',
      displayName: 'Beatrix Hebert',
      email: 'bex.hebert@example.com',
      cellPhone: '555-2119',
      emergencyContact: '555-3139'
    },
    {
      key: 'reel_rafa',
      firstName: 'Rafael',
      lastName: 'Dupre',
      displayName: 'Rafael Dupre',
      email: 'rafa.dupre@example.com',
      cellPhone: '555-2120',
      emergencyContact: '555-3140'
    }
  ]

  const playerIds = new Map<string, string>()
  for (const player of players) {
    const { key, ...data } = player
    playerIds.set(key, createPlayer(db, data))
  }

  return playerIds
}

function seedMetrics(db: AppDatabase) {
  const metrics: MetricSeed[] = [
    { key: 'redfish', label: 'Redfish', unit: 'lbs' },
    { key: 'trout', label: 'Trout', unit: 'lbs' },
    { key: 'flounder', label: 'Flounder', unit: 'lbs' },
    { key: 'leopard', label: 'Leopard', unit: 'spots' },
    { key: 'black_drum', label: 'Black Drum', unit: 'lbs' }
  ]

  const metricIds = new Map<string, string>()
  for (const metric of metrics) {
    const { key, ...data } = metric
    metricIds.set(key, createMetric(db, data))
  }

  return metricIds
}

function seedCategories(db: AppDatabase, metricIds: Map<string, string>) {
  const categories: CategorySeed[] = [
    {
      key: 'cajun_slam',
      name: 'Cajun Slam',
      direction: 'desc',
       mode: 'aggregate',
       showMetricsCount: false,
      rules: [],
      metrics: ['redfish', 'trout', 'flounder']
    },
    {
      key: 'stud_red',
      name: 'Stud Red',
      direction: 'desc',
       mode: 'aggregate',
       showMetricsCount: false,
      rules: [],
      metrics: ['redfish']
    },
    {
      key: 'mule_trout',
      name: 'Mule Trout',
      direction: 'desc',
       mode: 'aggregate',
       showMetricsCount: false,
      rules: [],
      metrics: ['trout']
    },
    {
      key: 'saddle_flounder',
      name: 'Saddle Flounder',
      direction: 'desc',
       mode: 'aggregate',
       showMetricsCount: false,
      rules: [],
      metrics: ['flounder']
    },
    {
      key: 'leopard_red',
      name: 'Leopard Red',
      direction: 'desc',
       mode: 'aggregate',
       showMetricsCount: false,
      rules: [],
      metrics: ['leopard']
    }
  ]

  const categoryIds = new Map<string, string>()
  for (const category of categories) {
    const { key, metrics: metricKeys, ...data } = category
    const categoryId = createCategory(db, data)
    categoryIds.set(key, categoryId)

    for (const metricKey of metricKeys) {
      const metricId = metricIds.get(metricKey)
      if (!metricId) continue
      addMetricToCategory(db, categoryId, metricId)
    }
  }

  return categoryIds
}

function seedDivisions(
  db: AppDatabase,
  categoryIds: Map<string, string>,
  playerIds: Map<string, string>
) {
  const divisions: DivisionSeed[] = [
    {
      name: 'Main',
      order: 1,
      categories: [
        { category: 'cajun_slam', depth: 7, order: 1 },
        { category: 'stud_red', depth: 5, order: 2 },
        { category: 'mule_trout', depth: 5, order: 2 },
        { category: 'saddle_flounder', depth: 5, order: 2 },
        { category: 'leopard_red', depth: 5, order: 2 }
      ],
      players: [
        'capt_aiden',
        'bella_boudreaux',
        'cajun_cam',
        'dockside_dev',
        'marsh_em',
        'flats_fiona',
        'redfish_rex',
        'bayou_bri'
      ]
    },
    {
      name: 'Seniors',
      order: 2,
      categories: [{ category: 'cajun_slam', depth: 7, order: 1 }],
      players: [
        'cajun_cam',
        'dockside_dev',
        'marsh_em',
        'pier_paul',
        'kayak_kai',
        'drum_dom',
        'pushpole_pete'
      ]
    },
    {
      name: 'Ladies',
      order: 3,
      categories: [{ category: 'cajun_slam', depth: 7, order: 1 }],
      players: [
        'bella_boudreaux',
        'flats_fiona',
        'bayou_bri',
        'topwater_tess',
        'speck_sarah',
        'island_ivy',
        'marina_may',
        'backlake_bex'
      ]
    }
  ]

  for (const division of divisions) {
    const divisionId = createDivision(db, {
      name: division.name,
      order: division.order
    })

    for (const categoryLink of division.categories) {
      const categoryId = categoryIds.get(categoryLink.category)
      if (!categoryId) continue
      addCategoryToDivision(db, divisionId, categoryId, categoryLink.depth, categoryLink.order)
    }

    for (const playerKey of division.players) {
      const playerId = playerIds.get(playerKey)
      if (!playerId) continue
      addPlayerToDivision(db, divisionId, playerId)
    }
  }
}

function updateMetadata(db: AppDatabase) {
  const today = new Date()
  const eventDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  updateTournamentMetadata(db, {
    name: 'Demo Rodeo Classic',
    eventDate
  })
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  ensureWritableTarget(options.targetPath, options.force)

  console.log(`Seeding tournament at ${options.targetPath}`)

  const { db, close } = openDb(options.targetPath)

  try {
    updateMetadata(db)
    const metricIds = seedMetrics(db)
    const categoryIds = seedCategories(db, metricIds)
    const playerIds = seedPlayers(db)
    seedDivisions(db, categoryIds, playerIds)
  } finally {
    close()
  }

  console.log('Seed complete. You can open the tournament from the app.')
}

main()
