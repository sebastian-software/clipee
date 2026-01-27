import { describe, it, expect } from 'vitest'
import { normalizeUrl, isSameOrigin } from '../crawler.js'

describe('normalizeUrl', () => {
  it('should normalize a simple URL', () => {
    expect(normalizeUrl('https://example.com/page')).toBe('https://example.com/page')
  })

  it('should remove trailing slash', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page')
  })

  it('should keep root path slash', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/')
  })

  it('should remove hash fragments', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe(
      'https://example.com/page'
    )
  })

  it('should preserve query parameters', () => {
    expect(normalizeUrl('https://example.com/page?foo=bar')).toBe(
      'https://example.com/page?foo=bar'
    )
  })

  it('should return null for invalid URLs', () => {
    expect(normalizeUrl('not-a-url')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(normalizeUrl('')).toBeNull()
  })

  it('should handle URLs with port', () => {
    expect(normalizeUrl('https://example.com:8080/page/')).toBe(
      'https://example.com:8080/page'
    )
  })

  it('should handle complex paths', () => {
    expect(normalizeUrl('https://example.com/a/b/c/')).toBe(
      'https://example.com/a/b/c'
    )
  })
})

describe('isSameOrigin', () => {
  it('should return true for same origin', () => {
    expect(isSameOrigin('https://example.com/page', 'https://example.com')).toBe(true)
  })

  it('should return false for different host', () => {
    expect(isSameOrigin('https://other.com/page', 'https://example.com')).toBe(false)
  })

  it('should return false for different protocol', () => {
    expect(isSameOrigin('http://example.com/page', 'https://example.com')).toBe(false)
  })

  it('should return false for different port', () => {
    expect(isSameOrigin('https://example.com:8080/page', 'https://example.com')).toBe(
      false
    )
  })

  it('should return true for same origin with different paths', () => {
    expect(isSameOrigin('https://example.com/a/b/c', 'https://example.com')).toBe(true)
  })

  it('should return false for subdomain', () => {
    expect(isSameOrigin('https://sub.example.com/page', 'https://example.com')).toBe(
      false
    )
  })

  it('should return false for invalid URL', () => {
    expect(isSameOrigin('not-a-url', 'https://example.com')).toBe(false)
  })
})
