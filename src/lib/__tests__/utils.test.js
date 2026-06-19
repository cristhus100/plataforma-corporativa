import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('handles conditional classes (falsy values are filtered)', () => {
    expect(cn('base', false && 'hidden', null, undefined)).toBe('base')
  })

  it('resolves Tailwind conflicts via twMerge', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
  })

  it('handles multiple conflicting classes', () => {
    expect(cn('text-red-500', 'text-blue-700')).toBe('text-blue-700')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })

  it('handles object syntax', () => {
    expect(cn({ 'px-4': true, 'hidden': false })).toBe('px-4')
  })
})
