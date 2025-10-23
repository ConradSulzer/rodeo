import { describe, test, expect } from 'vitest'
import { getOrCreatePlayerItems } from './results'
import type { Results } from '../types/Tournament'

test('getOrCreatePlayerItems creates and returns a stable map', () => {
  const results: Results = new Map()
  const a = getOrCreatePlayerItems(results, 'P1')
  expect(a).toBeDefined()
  // same instance returned on second call
  const b = getOrCreatePlayerItems(results, 'P1')
  expect(b).toBe(a)
})
