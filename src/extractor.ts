import { chromium, type Page } from 'playwright'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

turndownService.use(gfm)

turndownService.addRule('fenceAllPreformattedText', {
  filter: ['pre'],
  replacement: function (_content, node) {
    const lang = getLanguageFromElement(node as Element)
    const code = [...node.childNodes].map((c) => c.textContent).join('')
    return `\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`
  },
})

turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: function (content) {
    return '~' + content + '~'
  },
})

function getLanguageFromElement(node: Element): string {
  const patterns = [/(highlight-source-|language-|lang-)([a-z]+)/i]

  for (const pattern of patterns) {
    // Check node itself
    const match = node.className?.match?.(pattern) || node.outerHTML.match(pattern)
    if (match) return match[2]

    // Check parent (pre elements in articles always have parents)
    if (/* istanbul ignore next */ node.parentElement) {
      const parentMatch =
        node.parentElement.className?.match?.(pattern) ||
        node.parentElement.outerHTML.split('>')[0].match(pattern)
      if (parentMatch) return parentMatch[2]
    }
  }

  return ''
}

export interface ExtractOptions {
  headless?: boolean
}

export interface ExtractResult {
  title: string
  markdown: string
  url: string
}

/* v8 ignore start */
export async function extract(url: string, options: ExtractOptions = {}): Promise<string> {
  const result = await extractWithMetadata(url, options)
  return result.markdown
}

export async function extractWithMetadata(
  url: string,
  options: ExtractOptions = {}
): Promise<ExtractResult> {
  const browser = await chromium.launch({ headless: options.headless ?? true })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded' })

    const html = await page.content()
    const finalUrl = page.url()

    const result = htmlToMarkdown(html, finalUrl)
    return result
  } finally {
    await browser.close()
  }
}

export async function extractFromPage(page: Page): Promise<ExtractResult> {
  const html = await page.content()
  const url = page.url()
  return htmlToMarkdown(html, url)
}
/* v8 ignore stop */

export function htmlToMarkdown(html: string, url: string): ExtractResult {
  const dom = new JSDOM(html, { url })

  const article = new Readability(dom.window.document, {
    keepClasses: true,
    charThreshold: 100,
  }).parse()

  if (!article?.content) {
    throw new Error(`Failed to extract content from ${url}`)
  }

  // Clean up content
  let content = article.content.replace(/<!--.*?-->/gs, '')
  const title = /* istanbul ignore next */ article.title ?? ''

  // Ensure h1 title
  if (title.length > 0) {
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/
    const match = content.match(h2Regex)

    if (match?.[0].includes(title)) {
      content = content.replace('<h2', '<h1').replace('</h2', '</h1')
    } else {
      content = `<h1>${title}</h1>\n${content}`
    }
  }

  // Convert to markdown
  let markdown = turndownService.turndown(content)

  // Clean up empty anchor links
  markdown = markdown.replace(/\[\]\(#[^)]*\)/g, '')

  return { title, markdown, url }
}
