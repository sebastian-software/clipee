import { chromium, type Page } from 'playwright'
import { appendFileSync, existsSync, unlinkSync } from 'node:fs'
import { extractFromPage, type ExtractResult } from './extractor.js'

export interface CrawlOptions {
  output: string
  concurrency: number
  headless: boolean
}

export interface CrawlResult extends ExtractResult {
  crawledAt: string
}

export async function crawl(startUrl: string, options: CrawlOptions): Promise<void> {
  const { output, concurrency, headless } = options
  const startOrigin = new URL(startUrl).origin

  const visited = new Set<string>()
  const normalized = normalizeUrl(startUrl)
  if (!normalized) {
    throw new Error(`Invalid URL: ${startUrl}`)
  }
  const queue: string[] = [normalized]
  let activeWorkers = 0
  let totalProcessed = 0

  // Clear output file
  if (existsSync(output)) {
    unlinkSync(output)
  }

  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  console.error(`Starting crawl from ${startUrl}`)
  console.error(`Concurrency: ${concurrency} tabs`)

  // Create worker pool
  const workers: Page[] = await Promise.all(
    Array(concurrency)
      .fill(null)
      .map(() => context.newPage())
  )

  const freeWorkers: Page[] = [...workers]
  const pendingWork: Array<() => void> = []

  function getWorker(): Promise<Page> {
    const free = freeWorkers.pop()
    if (free) return Promise.resolve(free)

    return new Promise((resolve) => {
      pendingWork.push(() => resolve(freeWorkers.pop()!))
    })
  }

  function releaseWorker(page: Page) {
    freeWorkers.push(page)
    const next = pendingWork.shift()
    if (next) next()
  }

  async function processUrl(url: string): Promise<void> {
    if (visited.has(url)) return
    visited.add(url)

    const page = await getWorker()
    activeWorkers++

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })

      if (!response?.ok()) {
        console.error(`[${response?.status()}] ${url}`)
        return
      }

      // Extract content
      const result = await extractFromPage(page)
      totalProcessed++

      const crawlResult: CrawlResult = {
        ...result,
        crawledAt: new Date().toISOString(),
      }

      // Append to output
      appendFileSync(output, JSON.stringify(crawlResult) + '\n')
      console.error(`[${totalProcessed}] ${result.title || url}`)

      // Find new links on same domain
      const links = await page.$$eval('a[href]', (els) =>
        els.map((a) => (a as HTMLAnchorElement).href)
      )

      for (const link of links) {
        const normalized = normalizeUrl(link)
        if (normalized && !visited.has(normalized) && isSameOrigin(normalized, startOrigin)) {
          queue.push(normalized)
        }
      }
    } catch (err) {
      console.error(`[ERROR] ${url}: ${(err as Error).message}`)
    } finally {
      activeWorkers--
      releaseWorker(page)
    }
  }

  // Main crawl loop
  const inFlight: Promise<void>[] = []

  while (queue.length > 0 || activeWorkers > 0) {
    // Start new work if queue has items and workers available
    while (queue.length > 0 && freeWorkers.length > 0) {
      const url = queue.shift()!
      if (!visited.has(url)) {
        inFlight.push(processUrl(url))
      }
    }

    // Wait a bit before checking again
    if (queue.length === 0 && activeWorkers > 0) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  // Wait for all work to complete
  await Promise.all(inFlight)

  await context.close()
  await browser.close()

  console.error(`\nDone! Crawled ${totalProcessed} pages → ${output}`)
}

export function normalizeUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // Remove hash and trailing slash
    u.hash = ''
    let path = u.pathname
    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1)
    }
    u.pathname = path
    return u.toString()
  } catch {
    return null
  }
}

export function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin
  } catch {
    return false
  }
}
