import { L } from './i18n'

export function installedFrom(root: string): { configDir: string; marketplace: string } | null {
  const m = /^(.*)\/plugins\/cache\/([^/]+)\/[^/]+\/[^/]+\/?$/.exec(root.replace(/\\/g, '/'))
  return m ? { configDir: m[1]!, marketplace: m[2]! } : null
}

export function syncedFrom(root: string): { configDir: string; marketplace: 'synced' } | null {
  const m = /^(.*)\/plugins\/synced\//.exec(`${root.replace(/\\/g, '/').replace(/\/$/, '')}/`)
  return m ? { configDir: m[1]!, marketplace: 'synced' } : null
}

export function pluginDataId(plugin: string, marketplace: string): string {
  return `${plugin}@${marketplace}`.replace(/[^A-Za-z0-9_-]/g, '-')
}

export function versionGt(a: string | null | undefined, b: string | null | undefined): boolean {
  const nums = (v: string | null | undefined) => /^(\d+)\.(\d+)\.(\d+)/.exec(v ?? '')?.slice(1).map(Number) ?? null
  const x = nums(a)
  const y = nums(b)
  if (!x || !y) return false
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! > y[i]!
  return false
}

export function marketVersionOf(json: unknown, plugin = 'easy-session'): string | null {
  const list = (json as { plugins?: unknown } | null)?.plugins
  const p = Array.isArray(list) ? (list as { name?: unknown; version?: unknown }[]).find(x => x?.name === plugin) : undefined
  return typeof p?.version === 'string' ? p.version : null
}

export function isFolderMarket(known: unknown, marketplace: string): boolean {
  const entry = (known as Record<string, { source?: { source?: unknown } } | undefined> | null)?.[marketplace]
  return entry?.source?.source === 'directory'
}

export function isMarketName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)
}

export const CHANGE_ITEM_MAX = 100

export function changelogItems(md: string, version: string, maxItems = 20, maxChars = CHANGE_ITEM_MAX): { head: string; items: string[] }[] | null {
  const lines = md.split(/\r?\n/)
  const start = lines.findIndex(l => l.startsWith(`## [${version}]`))
  if (start < 0) return null
  const groups: { head: string; items: string[] }[] = []
  let count = 0
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break
    if (line.startsWith('### ')) {
      groups.push({ head: line.slice(4).trim(), items: [] })
      continue
    }
    if (!line.startsWith('- ') || count >= maxItems) continue
    const text = line.slice(2)
    const bold = /^\*\*(.+?)\*\*/.exec(text)
    const lead = bold ? bold[1]! : text.split(/ — |\.\s/)[0]!
    const plain = lead
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\*\*|`/g, '')
      .replace(/\*([^*]+)\*/g, '$1')
      .trim()
      .replace(/\.$/, '')
    if (!plain) continue
    const chars = [...plain]
    if (groups.length === 0) groups.push({ head: '', items: [] })
    groups[groups.length - 1]!.items.push(chars.length > maxChars ? `${chars.slice(0, maxChars - 1).join('')}…` : plain)
    count++
  }
  return groups.filter(g => g.items.length > 0)
}

export function changelogVersionsBetween(md: string, from: string | null, to: string | null): string[] {
  if (!to) return []
  const all = [...md.matchAll(/^## \[(\d+\.\d+\.\d+[^\]]*)\]/gm)].map(m => m[1]!)
  const picked = from === null ? all.filter(v => v === to) : all.filter(v => versionGt(v, from) && !versionGt(v, to))
  return [...new Set(picked)].sort((a, b) => (versionGt(a, b) ? -1 : versionGt(b, a) ? 1 : 0))
}

export function changeRange(own: string | null, market: string | null, seen: unknown, updatedTo: string | null | undefined): { from: string | null; to: string | null } {
  if (own && market && versionGt(market, own)) return { from: own, to: market }
  if (updatedTo) return { from: typeof seen === 'string' && versionGt(updatedTo, seen) ? seen : null, to: updatedTo }
  return { from: null, to: own }
}

export function updateAskText(marketplace: string): string {
  return L(
    `이 플러그인 업데이트해줘: easy-session (claude plugin marketplace update ${marketplace} 후 claude plugin update easy-session@${marketplace})`,
    `Update this plugin: easy-session (claude plugin marketplace update ${marketplace}, then claude plugin update easy-session@${marketplace})`,
  )
}
