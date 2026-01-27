import { describe, it, expect } from 'vitest'
import { extract_from_html } from '../clipper.js'

describe('extract_from_html', () => {
  it('should convert simple HTML to markdown', async () => {
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
    const result = await extract_from_html(html)
    expect(result).toContain('Test Article')
    expect(result).toContain('test paragraph')
  })

  it('should handle code blocks with language', async () => {
    const html = `
      <html>
        <head><title>Code Example</title></head>
        <body>
          <article>
            <h1>Code Example</h1>
            <pre class="language-js">const x = 1;</pre>
          </article>
        </body>
      </html>
    `
    const result = await extract_from_html(html)
    expect(result).toContain('```js')
    expect(result).toContain('const x = 1;')
  })

  it('should remove HTML comments', async () => {
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
    const result = await extract_from_html(html)
    expect(result).not.toContain('This is a comment')
    expect(result).toContain('Visible content')
  })
})
