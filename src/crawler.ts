import { chromium } from 'playwright'
import { minimatch } from 'minimatch'
import { writeFileSync } from 'node:fs'
import { extract_from_html } from './clipper.js'

interface CrawlResult {
  title: string
  url: string
  markdown: string
  html: string
  crawlDate: string
}

export async function crawl(
  startUrl: string,
  output: string,
  globs: string[] = [],
  headless = true
): Promise<void> {
  const browser = await chromium.launch({ headless })
  const visited = new Set<string>()
  const queue = [startUrl]
  const results: CrawlResult[] = []

  console.log(`Starting crawl from ${startUrl}`)

  while (queue.length > 0) {
    const url = queue.shift()!
    if (visited.has(url)) continue
    visited.add(url)

    const page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' })

      if (!response?.ok()) {
        console.error(`Got ${response?.status()} for ${url}`)
        continue
      }

      const title = await page.title()
      console.log(`Crawled: ${title} (${url})`)

      const html = await page.content()
      const markdown = await extract_from_html(html)

      results.push({
        title,
        url,
        markdown,
        html,
        crawlDate: new Date().toISOString(),
      })

      // Extract and filter links
      const links = await page.$$eval('a[href]', (els) =>
        els.map((a) => (a as HTMLAnchorElement).href)
      )

      for (const link of links) {
        if (!visited.has(link) && globs.some((g) => minimatch(link, g))) {
          queue.push(link)
        }
      }
    } catch (err) {
      console.error(`Error crawling ${url}:`, err)
    } finally {
      await page.close()
    }
  }

  await browser.close()

  // Write results as JSONL
  writeFileSync(output, results.map((r) => JSON.stringify(r)).join('\n'))
  console.log(`Saved ${results.length} pages to ${output}`)
}
