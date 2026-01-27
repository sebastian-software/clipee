import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from '../extractor.js'

describe('htmlToMarkdown', () => {
  it('should convert simple HTML to markdown', () => {
    const html = `
      <html>
        <head><title>Test Article</title></head>
        <body>
          <article>
            <h1>Test Article</h1>
            <p>This is a test paragraph with some content.</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('Test Article')
    expect(result.markdown).toContain('test paragraph')
    expect(result.title).toBe('Test Article')
  })

  it('should handle code blocks with language', () => {
    const html = `
      <html>
        <head><title>Code Example</title></head>
        <body>
          <article>
            <h1>Code Example</h1>
            <pre class="language-typescript">const x: number = 1;</pre>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('```typescript')
    expect(result.markdown).toContain('const x: number = 1;')
  })

  it('should remove HTML comments', () => {
    const html = `
      <html>
        <head><title>Comments Test</title></head>
        <body>
          <article>
            <h1>Comments Test</h1>
            <!-- This is a comment -->
            <p>Visible content</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).not.toContain('This is a comment')
    expect(result.markdown).toContain('Visible content')
  })

  it('should return the URL in result', () => {
    const html = `
      <html>
        <head><title>URL Test</title></head>
        <body>
          <article><h1>URL Test</h1><p>Content</p></article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com/article')
    expect(result.url).toBe('https://example.com/article')
  })
})
