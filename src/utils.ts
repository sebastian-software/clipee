import { readFileSync, writeFileSync } from 'node:fs'

export function readHtmlFileFromPath(path: string): string {
  return readFileSync(path, 'utf-8')
}

export function writeMarkdownToFile(
  markdown: string | Array<{ markdown: string; file?: string }>,
  output: string
): void {
  if (Array.isArray(markdown)) {
    markdown.forEach((md, i) => {
      const outputFileName = output.replace(/\.[^/.]+$/, '') + `_${i}.md`
      writeFileSync(outputFileName, md.markdown)
    })
  } else {
    const outputFileName = output.replace(/\.[^/.]+$/, '') + '.md'
    writeFileSync(outputFileName, markdown)
  }
}

export function writeMarkdownToJsonlines(
  markdown: Array<{ markdown: string; file?: string }>,
  output: string
): string {
  const outputFileName = output.endsWith('.jsonl')
    ? output
    : output.replace(/\.[^/.]+$/, '') + '.jsonl'

  writeFileSync(outputFileName, markdown.map((d) => JSON.stringify(d)).join('\n'))

  return outputFileName
}
