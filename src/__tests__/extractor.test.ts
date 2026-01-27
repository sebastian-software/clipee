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

  it('should handle code blocks with language-* class', () => {
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

  it('should handle code blocks with highlight-source-* class', () => {
    const html = `
      <html>
        <head><title>Code Example</title></head>
        <body>
          <article>
            <h1>Code Example</h1>
            <pre class="highlight-source-python">print("hello")</pre>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('```python')
    expect(result.markdown).toContain('print("hello")')
  })

  it('should handle code blocks with lang-* class', () => {
    const html = `
      <html>
        <head><title>Code Example</title></head>
        <body>
          <article>
            <h1>Code Example</h1>
            <pre class="lang-rust">fn main() {}</pre>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('```rust')
    expect(result.markdown).toContain('fn main() {}')
  })

  it('should handle code blocks with language class on parent', () => {
    const html = `
      <html>
        <head><title>Code Example</title></head>
        <body>
          <article>
            <h1>Code Example</h1>
            <div class="language-go"><pre>package main</pre></div>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('```go')
    expect(result.markdown).toContain('package main')
  })

  it('should detect language from parent outerHTML data attribute', () => {
    // Tests the fallback to outerHTML matching when className doesn't have the language
    const html = `
      <html>
        <head><title>Code Example</title></head>
        <body>
          <article>
            <h1>Code Example</h1>
            <div data-lang-swift="true"><pre>let x = 1</pre></div>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('```swift')
    expect(result.markdown).toContain('let x = 1')
  })

  it('should handle code blocks without language', () => {
    const html = `
      <html>
        <head><title>Code Example</title></head>
        <body>
          <article>
            <h1>Code Example</h1>
            <pre>plain code</pre>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('```\nplain code\n```')
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

  it('should handle strikethrough text with del tag', () => {
    const html = `
      <html>
        <head><title>Strikethrough Test</title></head>
        <body>
          <article>
            <h1>Strikethrough Test</h1>
            <p>This is <del>deleted</del> text.</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('~deleted~')
  })

  it('should handle strikethrough text with s tag', () => {
    const html = `
      <html>
        <head><title>Strikethrough Test</title></head>
        <body>
          <article>
            <h1>Strikethrough Test</h1>
            <p>This is <s>struck</s> text.</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('~struck~')
  })

  it('should add h1 title if not present', () => {
    const html = `
      <html>
        <head><title>My Title</title></head>
        <body>
          <article>
            <p>Just a paragraph without heading.</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('# My Title')
    expect(result.title).toBe('My Title')
  })

  it('should convert h2 to h1 when it contains the title', () => {
    // Note: Readability removes h2 if it exactly matches title,
    // so we test with h2 that contains the title but isn't identical
    const html = `
      <html>
        <head><title>Guide</title></head>
        <body>
          <article>
            <h2>The Complete Guide</h2>
            <p>Content here with enough text to pass the threshold.</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('# The Complete Guide')
    expect(result.markdown).not.toContain('## The Complete Guide')
    expect(result.title).toBe('Guide')
  })

  it('should prepend h1 when h2 does not match title', () => {
    const html = `
      <html>
        <head><title>Page Title</title></head>
        <body>
          <article>
            <h2>Different Section</h2>
            <p>Content here.</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('# Page Title')
    expect(result.markdown).toContain('## Different Section')
  })

  it('should remove empty anchor links', () => {
    const html = `
      <html>
        <head><title>Anchors Test</title></head>
        <body>
          <article>
            <h1>Anchors Test</h1>
            <h2 id="section">Section<a href="#section"></a></h2>
            <p>Content</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).not.toMatch(/\[\]\(#[^)]*\)/)
  })

  it('should handle tables with GFM', () => {
    const html = `
      <html>
        <head><title>Table Test</title></head>
        <body>
          <article>
            <h1>Table Test</h1>
            <table>
              <thead><tr><th>Name</th><th>Value</th></tr></thead>
              <tbody><tr><td>Foo</td><td>Bar</td></tr></tbody>
            </table>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('| Name | Value |')
    expect(result.markdown).toContain('| Foo | Bar |')
  })

  it('should handle links', () => {
    const html = `
      <html>
        <head><title>Links Test</title></head>
        <body>
          <article>
            <h1>Links Test</h1>
            <p>Visit <a href="https://example.org">Example</a> for more.</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('[Example](https://example.org/)')
  })

  it('should handle lists', () => {
    const html = `
      <html>
        <head><title>Lists Test</title></head>
        <body>
          <article>
            <h1>Lists Test</h1>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.markdown).toContain('-   Item 1')
    expect(result.markdown).toContain('-   Item 2')
  })

  it('should throw error when content extraction fails', () => {
    const html = `
      <html>
        <head><title>Empty</title></head>
        <body></body>
      </html>
    `
    expect(() => htmlToMarkdown(html, 'https://example.com')).toThrow(
      'Failed to extract content'
    )
  })

  it('should handle empty title', () => {
    const html = `
      <html>
        <head><title></title></head>
        <body>
          <article>
            <h1>Heading</h1>
            <p>Some meaningful content that needs to be extracted properly.</p>
          </article>
        </body>
      </html>
    `
    const result = htmlToMarkdown(html, 'https://example.com')
    expect(result.title).toBe('')
    expect(result.markdown).toContain('Heading')
  })
})
