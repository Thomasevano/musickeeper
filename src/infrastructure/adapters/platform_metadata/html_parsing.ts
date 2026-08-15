/**
 * Shared HTML parsing utilities for platform metadata extraction.
 * Every platform fetcher that scrapes og: tags uses these.
 */

const HTML_ENTITY_MAP: [RegExp, string][] = [
  [/&amp;/g, '&'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&quot;/g, '"'],
  [/&#39;/g, "'"],
  [/&#x27;/g, "'"],
  [/&#x2F;/g, '/'],
  [/&apos;/g, "'"],
  [/&nbsp;/g, ' '],
]

export function decodeHtmlEntities(value: string): string {
  let result = value
  for (const [pattern, replacement] of HTML_ENTITY_MAP) {
    result = result.replace(pattern, replacement)
  }
  return result
}

export function getMetaContent(html: string, property: string): string | undefined {
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i'
  )
  const match = html.match(regex)
  const value = match ? match[1] || match[2] : undefined
  return value ? decodeHtmlEntities(value) : undefined
}
