# Modernisierungsplan: clipee

## Übersicht

Clipee ist ein Node.js CLI-Tool zum Extrahieren von Web-Inhalten und Konvertieren zu Markdown. Das Paket wurde seit ~3 Jahren nicht mehr gewartet und benötigt eine umfassende Modernisierung.

**Ziel:** Identische Infrastruktur wie `ardo` verwenden.

**Aktueller Stand → Ziel:**
| Aspekt | Aktuell | Ziel (wie ardo) |
|--------|---------|-----------------|
| Name | `@philschmid/clipper` | `clipee` |
| Node.js | Keine Einschränkung | `>=22.0.0` |
| Package Manager | npm/pnpm gemischt | `pnpm@10.x` |
| Module | CommonJS | ESM |
| Build | `tsc` | `tsup` |
| Tests | Keine | `vitest` |
| Linting | Keine | `eslint` (Flat Config) |
| Formatting | Keine | `prettier` |
| Git Hooks | Keine | `husky` + `lint-staged` |
| CI/CD | Keine | GitHub Actions |
| Releases | Manuell | `release-please` |

---

## Phase 1: Projekt-Setup

### 1.1 Package.json neu strukturieren

```json
{
  "name": "clipee",
  "version": "0.1.0",
  "description": "CLI tool to clip web content and convert to markdown",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "bin": {
    "clipee": "./dist/cli.js"
  },
  "files": ["dist"],
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "test": "vitest --run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "prepare": "husky"
  },
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@10.x",
  "author": "Sebastian Software GmbH",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/sebastian-software/clipee.git"
  },
  "homepage": "https://github.com/sebastian-software/clipee",
  "bugs": {
    "url": "https://github.com/sebastian-software/clipee/issues"
  },
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/sebastian-software"
  },
  "lint-staged": {
    "*.{ts,js,json,md,yml,yaml}": "prettier --write"
  }
}
```

### 1.2 Dateien entfernen

- [ ] `package-lock.json` löschen
- [ ] `src/index.d.ts` löschen (wird von tsup generiert)

### 1.3 Neue Konfigurationsdateien erstellen

**tsconfig.json** (wie ardo, ohne React):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**tsup.config.ts** (wie create-ardo für CLI):

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts', // Library exports
    cli: 'src/cli.ts', // CLI entry point
  },
  format: ['esm'],
  target: 'node22',
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

**eslint.config.js** (wie ardo, ohne React):

```javascript
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.es2022,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.js', '**/*.config.ts'],
  }
)
```

**vitest.config.ts** (wie ardo):

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

**.prettierrc** (identisch zu ardo):

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**.prettierignore** (angepasst):

```
node_modules/
dist/
pnpm-lock.yaml
CHANGELOG.md
```

**.gitignore** (wie ardo, angepasst):

```
# Dependencies
node_modules

# Build outputs
dist

# IDE
.idea
.vscode
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test
coverage

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Cache
.cache

# Crawlee storage
storage
```

---

## Phase 2: Husky & Git Hooks

### 2.1 Husky einrichten

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

**.husky/pre-commit:**

```
pnpm lint-staged
```

---

## Phase 3: GitHub Actions

### 3.1 CI Workflow

**.github/workflows/ci.yml:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test (Node.js ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: ['22', '24']

    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Check formatting
        run: pnpm format:check

      - name: Build
        run: pnpm build

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test
```

### 3.2 Release Please

**.github/workflows/release-please.yml:**

```yaml
name: Release Please

on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          token: ${{ secrets.RELEASE_PLEASE_TOKEN }}
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

**release-please-config.json:**

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "changelog-sections": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "perf", "section": "Performance" },
    { "type": "refactor", "section": "Code Refactoring" },
    { "type": "docs", "section": "Documentation" },
    { "type": "ci", "section": "CI/CD" },
    { "type": "test", "section": "Tests" },
    { "type": "chore", "section": "Miscellaneous", "hidden": true }
  ],
  "packages": {
    ".": {
      "release-type": "node",
      "package-name": "clipee",
      "changelog-path": "CHANGELOG.md"
    }
  }
}
```

**.release-please-manifest.json:**

```json
{
  ".": "0.1.0"
}
```

### 3.3 Publish Workflow

**.github/workflows/publish.yml:**

```yaml
name: Publish

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      dry-run:
        description: 'Dry run (skip actual publish)'
        required: false
        default: true
        type: boolean

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Publish
        if: github.event_name == 'release' || (github.event_name == 'workflow_dispatch' && !inputs.dry-run)
        run: pnpm publish --access public --no-git-checks --provenance

      - name: Dry run
        if: github.event_name == 'workflow_dispatch' && inputs.dry-run
        run: pnpm publish --dry-run
```

---

## Phase 4: Code-Refactoring

### 4.1 Dateistruktur ändern

**Aktuell:**

```
src/
├── index.ts      # CLI + Exports gemischt
├── clipper.ts
├── crawler.ts
├── utils.ts
└── index.d.ts    # Manuell
```

**Neu:**

```
src/
├── cli.ts        # CLI Entry Point (commander)
├── index.ts      # Library Exports
├── clipper.ts    # Kernlogik
├── crawler.ts    # Crawling
├── utils.ts      # Utilities
└── __tests__/
    ├── clipper.test.ts
    └── utils.test.ts
```

### 4.2 ESM-Migration

Änderungen in allen Dateien:

- `import * as fs from 'fs'` → `import { readFileSync, writeFileSync } from 'node:fs'`
- `import * as path from 'path'` → `import { join, dirname } from 'node:path'`
- Relative Imports mit `.js` Extension: `import { foo } from './utils.js'`

### 4.3 Code-Fixes

**cli.ts (aus index.ts extrahiert):**

- Version aus package.json lesen statt hardcoded
- Beschreibung aktualisieren
- Bessere Fehlerbehandlung

**clipper.ts:**

- `@ts-ignore` durch proper Types ersetzen
- `any` Types eliminieren
- Konstanten für Magic Numbers

**crawler.ts (komplett neu mit Playwright + minimatch):**

```typescript
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
) {
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
```

**utils.ts:**

- Type-Inkonsistenzen beheben
- Async File I/O (optional)

---

## Phase 5: Dependencies

### 5.1 Aktualisierte Dependencies

```json
{
  "dependencies": {
    "@mozilla/readability": "^0.5.0",
    "commander": "^13.0.0",
    "jsdom": "^26.0.0",
    "minimatch": "^10.0.0",
    "playwright": "^1.50.0",
    "turndown": "^7.2.0",
    "turndown-plugin-gfm": "^1.0.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.0",
    "@types/jsdom": "^21.1.7",
    "@types/node": "^22.10.0",
    "@types/turndown": "^5.0.5",
    "eslint": "^9.39.0",
    "globals": "^17.0.0",
    "husky": "^9.1.0",
    "lint-staged": "^16.0.0",
    "prettier": "^3.8.0",
    "tsup": "^8.5.0",
    "typescript": "^5.9.0",
    "typescript-eslint": "^8.54.0",
    "vitest": "^4.0.0"
  }
}
```

### 5.2 Entfernen

- `crawlee` (~50MB, ersetzt durch reines Playwright + minimatch)
- `linkedom` (ungenutzt)
- `ts-node` (ersetzt durch tsup watch)
- `@commander-js/extra-typings` (nicht mehr nötig)

---

## Phase 6: Tests

### 6.1 Unit Tests

**src/**tests**/clipper.test.ts:**

````typescript
import { describe, it, expect } from 'vitest'
import { extract_from_html } from '../clipper.js'

describe('clipper', () => {
  it('should convert simple HTML to markdown', async () => {
    const html = '<html><body><article><h1>Title</h1><p>Content</p></article></body></html>'
    const result = await extract_from_html(html)
    expect(result).toContain('# Title')
    expect(result).toContain('Content')
  })

  it('should handle code blocks', async () => {
    const html =
      '<html><body><article><pre class="language-js">const x = 1</pre></article></body></html>'
    const result = await extract_from_html(html)
    expect(result).toContain('```js')
  })
})
````

**src/**tests**/utils.test.ts:**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { writeMarkdownToJsonlines } from '../utils.js'

describe('utils', () => {
  it('should format JSONL correctly', () => {
    // Test implementation
  })
})
```

---

## Umsetzungsreihenfolge

1. **Infrastruktur** (ohne Code-Änderungen)
   - [ ] package.json neu strukturieren
   - [ ] Alte Lock-Files und index.d.ts löschen
   - [ ] Config-Dateien erstellen (tsconfig, tsup, eslint, prettier, vitest)
   - [ ] .gitignore aktualisieren
   - [ ] Husky einrichten
   - [ ] GitHub Workflows erstellen

2. **Code-Migration**
   - [ ] CLI in eigene Datei extrahieren
   - [ ] ESM-Syntax überall
   - [ ] linkedom entfernen
   - [ ] Types verbessern

3. **Dependencies**
   - [ ] pnpm install mit neuen Versionen
   - [ ] Breaking Changes prüfen (turndown 7.x, jsdom 26.x)

4. **Tests**
   - [ ] Basis-Tests für clipper.ts
   - [ ] Tests für utils.ts

5. **Cleanup**
   - [ ] README.md aktualisieren
   - [ ] Beispiele testen
   - [ ] Erstes Release vorbereiten

---

## Entscheidungen

| Frage      | Entscheidung                                   |
| ---------- | ---------------------------------------------- |
| Paketname  | `clipee`                                       |
| Repository | `sebastian-software/clipee`                    |
| Node.js    | `>=22.0.0`                                     |
| crawlee    | Entfernt, ersetzt durch Playwright + minimatch |
