#!/usr/bin/env node

import { program } from 'commander'
import { readFileSync, readdirSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { extract_from_html, extract_from_url } from './clipper.js'
import { writeMarkdownToFile, writeMarkdownToJsonlines } from './utils.js'
import { crawl } from './crawler.js'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))

program.name('clipee').version(pkg.version).description(pkg.description)

program
  .command('clip')
  .description('Converts HTML to markdown')
  .option(
    '-i, --input <value>',
    'Path to HTML or directory file to clip, e.g. test/ or test/index.html'
  )
  .option('-o, --output <value>', 'Path to output file', 'output.md')
  .option('-u, --url <value>', 'URL to clip')
  .option(
    '-f, --format <value>',
    'format how you want to store the output, can be `md` or `json`',
    'md'
  )
  .action(async (options) => {
    let res: string | Array<{ markdown: string; file: string }>

    if (options.url) {
      res = await extract_from_url(options.url)
    } else if (options.input) {
      const inputPath = options.input
      const isDirectory = lstatSync(inputPath).isDirectory()

      if (isDirectory) {
        const htmlFiles = readdirSync(inputPath)
          .filter((file) => file.endsWith('.html'))
          .map((file) => join(inputPath, file))

        res = []
        for (const file of htmlFiles) {
          const html = readFileSync(file, 'utf-8')
          const md = await extract_from_html(html)
          res.push({ markdown: md, file })
        }
      } else {
        const html = readFileSync(inputPath, 'utf-8')
        res = await extract_from_html(html)
      }
    } else {
      console.error('Error: Please specify either a URL (-u) or a file path (-i)')
      process.exit(1)
    }

    if (options.format === 'json') {
      const data = Array.isArray(res) ? res : [{ markdown: res }]
      writeMarkdownToJsonlines(data, options.output)
    } else {
      writeMarkdownToFile(res, options.output)
    }

    console.log(`Output written to ${options.output}`)
  })

program
  .command('crawl')
  .description('Crawls website, converts HTML to markdown and saves result in jsonl file')
  .option('-u, --url <value>', 'Start url to crawl')
  .option('-g, --globs <value>', 'Glob patterns to match URLs against (comma-separated)')
  .option('-o, --output <value>', 'Path to output file', 'dataset.jsonl')
  .action(async (options) => {
    if (!options.url) {
      console.error('Error: Please specify a URL (-u)')
      process.exit(1)
    }

    const globs = options.globs?.split(',').map((g: string) => g.trim()) || []
    await crawl(options.url, options.output, globs)
  })

program.parse()
