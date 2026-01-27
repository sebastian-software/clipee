# Clipee

<div align="center">

**Web Content → Markdown, right from your terminal**

[![CI](https://github.com/sebastian-software/clipee/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastian-software/clipee/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/clipee.svg)](https://www.npmjs.com/package/clipee)
[![npm downloads](https://img.shields.io/npm/dm/clipee.svg)](https://www.npmjs.com/package/clipee)
[![License](https://img.shields.io/npm/l/clipee.svg)](https://github.com/sebastian-software/clipee/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D22-green.svg)](https://nodejs.org/)

</div>

---

## What is Clipee?

Clipee extracts readable content from web pages and converts it to clean Markdown. It uses a real browser (Playwright) to handle JavaScript-rendered content, and can crawl entire sites with parallel processing.

**Key Features:**

- **Real Browser** — Uses Playwright to handle SPAs and dynamic content
- **Smart Extraction** — Mozilla Readability finds the main content
- **Parallel Crawling** — Multiple browser tabs for fast site-wide extraction
- **Same-Domain Crawling** — Automatically stays on the same domain
- **Simple CLI** — Just `clipee <url>`

## Installation

```bash
pnpm add -g clipee

# Install browser (first time only)
npx playwright install chromium
```

## Usage

### Clip a single page

```bash
# Output to stdout
clipee https://example.com/article

# Save to file
clipee https://example.com/article -o article.md
```

### Crawl an entire site

```bash
# Crawl all pages on the same domain
clipee https://docs.example.com --crawl

# With more parallel tabs
clipee https://docs.example.com --crawl -n 5

# Custom output file
clipee https://docs.example.com --crawl -o docs.jsonl
```

## CLI Reference

```
clipee <url> [options]

Arguments:
  url                     URL to clip

Options:
  -o, --output <file>     Output file (default: stdout for single, output.jsonl for crawl)
  -c, --crawl             Crawl mode: follow all links on same domain
  -n, --concurrency <n>   Number of parallel browser tabs (default: 3)
  --no-headless           Show browser window (useful for debugging)
  -V, --version           Show version
  -h, --help              Show help
```

## Output Formats

**Single page** → Markdown to stdout (or file with `-o`)

**Crawl mode** → JSONL file with one entry per page:

```json
{
  "title": "Page Title",
  "markdown": "# Content...",
  "url": "https://...",
  "crawledAt": "2024-01-15T..."
}
```

## Programmatic API

```typescript
import { extract, crawl } from 'clipee'

// Single page
const markdown = await extract('https://example.com/article')

// With metadata
import { extractWithMetadata } from 'clipee'
const { title, markdown, url } = await extractWithMetadata('https://example.com')

// Crawl
await crawl('https://docs.example.com', {
  output: 'docs.jsonl',
  concurrency: 5,
  headless: true,
})
```

## Development

```bash
git clone https://github.com/sebastian-software/clipee.git
cd clipee
pnpm install
pnpm build
pnpm test

# Test locally
node dist/cli.js https://example.com
```

## Built With

- [Playwright](https://playwright.dev/) — Browser automation
- [Mozilla Readability](https://github.com/mozilla/readability) — Content extraction
- [Turndown](https://github.com/mixmark-io/turndown) — HTML to Markdown

## Acknowledgments

Inspired by [philschmid/clipper](https://github.com/philschmid/clipper).

## License

[Apache-2.0](./LICENSE) © [Sebastian Software GmbH](https://sebastian-software.de)

---

<div align="center">

**[Report Bug](https://github.com/sebastian-software/clipee/issues)** · **[Request Feature](https://github.com/sebastian-software/clipee/issues)**

</div>
