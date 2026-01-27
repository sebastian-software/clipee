import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { JSDOM } from 'jsdom'

const READABILITY_CHAR_THRESHOLD = 100

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

turndownService.use(gfm)

function getLanguageFromElement(node: Element): string {
  const getFirstTag = (el: Element) => el.outerHTML.split('>').shift()! + '>'

  // Check for highlight-source-* or language-* classes
  const match = node.outerHTML.match(/(highlight-source-|language-)[a-z]+/)
  if (match) return match[0].split('-').pop() || ''

  // Check parent element
  if (node.parentElement) {
    const parentMatch = getFirstTag(node.parentElement).match(/(highlight-source-|language-)[a-z]+/)
    if (parentMatch) return parentMatch[0].split('-').pop() || ''
  }

  // Check inner elements
  const getInnerTag = (el: Element) => el.innerHTML.split('>').shift()! + '>'
  const innerMatch = getInnerTag(node).match(/(highlight-source-|language-)[a-z]+/)
  if (innerMatch) return innerMatch[0].split('-').pop() || ''

  return ''
}

turndownService.addRule('fenceAllPreformattedText', {
  filter: ['pre'],
  replacement: function (content, node) {
    const ext = getLanguageFromElement(node as Element)
    const code = [...node.childNodes].map((c) => c.textContent).join('')
    return `\n\`\`\`${ext}\n${code}\n\`\`\`\n\n`
  },
})

turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: function (content) {
    return '~' + content + '~'
  },
})

function extract_from_dom(dom: JSDOM): string {
  const article = new Readability(dom.window.document, {
    keepClasses: true,
    charThreshold: READABILITY_CHAR_THRESHOLD,
  }).parse()

  if (!article) {
    throw new Error('Failed to parse article')
  }

  // Remove HTML comments
  let content = article.content.replace(/<!--.*?-->/gs, '')

  // Try to add proper h1 if title exists
  if (article.title.length > 0) {
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/
    const match = content.match(h2Regex)

    if (match?.[0].includes(article.title)) {
      // Replace first h2 with h1
      content = content.replace('<h2', '<h1').replace('</h2', '</h1')
    } else {
      // Add title as h1
      content = `<h1>${article.title}</h1>\n${content}`
    }
  }

  // Convert to markdown
  let result = turndownService.turndown(content)

  // Remove empty header references like [](#some-id)
  result = result.replace(/\[\]\(#[^)]*\)/g, '')

  return result
}

export async function extract_from_url(url: string): Promise<string> {
  const dom = await JSDOM.fromURL(url)
  return extract_from_dom(dom)
}

export async function extract_from_html(html: string): Promise<string> {
  const dom = new JSDOM(html)
  return extract_from_dom(dom)
}
