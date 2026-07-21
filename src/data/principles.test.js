import { describe, it, expect } from 'vitest'
import {
  PRINCIPLES,
  principleBySlug,
  slugForPrincipleId,
  principleById,
} from './principles'

// The slug table is the authored source for the deep-link route; these guard the
// resolvers useHashRoute leans on and the table's internal consistency.

describe('principle slug table', () => {
  it('gives all 18 principles a non-empty, kebab-case, unique slug', () => {
    expect(PRINCIPLES).toHaveLength(18)
    const slugs = PRINCIPLES.map((p) => p.slug)
    for (const slug of slugs) {
      expect(slug, `principle slug "${slug}"`).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
    }
    expect(new Set(slugs).size, 'slugs are unique').toBe(18)
  })

  it('gives every principle a classic or extended category', () => {
    for (const p of PRINCIPLES) {
      expect(['classic', 'extended']).toContain(p.category)
    }
  })
})

describe('principleBySlug', () => {
  it('resolves an authored slug to its record', () => {
    expect(principleBySlug('follow-through')).toMatchObject({ id: 5, category: 'classic' })
    expect(principleBySlug('shared-vocabulary')).toMatchObject({ id: 18, category: 'extended' })
  })

  it('accepts a bare numeric id as a silent alias', () => {
    expect(principleBySlug('5')).toMatchObject({ id: 5, slug: 'follow-through' })
    expect(principleBySlug('18')).toMatchObject({ id: 18 })
  })

  it('returns null for an unknown slug, an out-of-range id, or empty input', () => {
    expect(principleBySlug('not-a-principle')).toBeNull()
    expect(principleBySlug('0')).toBeNull()
    expect(principleBySlug('19')).toBeNull()
    expect(principleBySlug('')).toBeNull()
    expect(principleBySlug(undefined)).toBeNull()
  })

  it('does not mistake a numeric-looking slug fragment for an id', () => {
    // A real slug is never a bare number, so the id branch never shadows one.
    expect(principleBySlug('arc')).toMatchObject({ id: 7 })
    expect(principleBySlug('5x')).toBeNull()
  })
})

describe('slugForPrincipleId / principleById', () => {
  it('round-trips id -> slug -> record for every principle', () => {
    for (const p of PRINCIPLES) {
      expect(slugForPrincipleId(p.id)).toBe(p.slug)
      expect(principleBySlug(p.slug)).toBe(principleById(p.id))
    }
  })

  it('returns null for an out-of-range id', () => {
    expect(slugForPrincipleId(0)).toBeNull()
    expect(slugForPrincipleId(99)).toBeNull()
    expect(principleById(99)).toBeNull()
  })
})
