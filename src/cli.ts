#!/usr/bin/env node
/* v8 ignore start */

import { program } from 'commander'
import { readFileSync } from 'node:fs'
import { extract } from './extractor.js'
import { crawl } from './crawler.js'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

program
  .name('clipee')
  .version(pkg.version)
  .description(pkg.description)
  .argument('<url>', 'URL to clip')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .option('-c, --crawl', 'Follow links on same domain')
  .option('-n, --concurrency <number>', 'Parallel browser tabs', '3')
  .option('--no-headless', 'Show browser window')
  .action(async (url: string, options) => {
    const concurrency = parseInt(options.concurrency, 10)

    if (options.crawl) {
      await crawl(url, {
        output: options.output || 'output.jsonl',
        concurrency,
        headless: options.headless,
      })
    } else {
      const markdown = await extract(url, { headless: options.headless })

      if (options.output) {
        const { writeFileSync } = await import('node:fs')
        writeFileSync(options.output, markdown)
        console.error(`Written to ${options.output}`)
      } else {
        console.log(markdown)
      }
    }
  })

program.parse()
