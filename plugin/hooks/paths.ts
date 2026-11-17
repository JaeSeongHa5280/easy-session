// 노트: paths.md#installedFrom
export function installedFrom(root: string): { configDir: string; marketplace: string } | null {
  const m = /^(.*)\/plugins\/cache\/([^/]+)\/[^/]+\/[^/]+\/?$/.exec(root.replace(/\\/g, '/'))
  return m ? { configDir: m[1]!, marketplace: m[2]! } : null
}

// 노트: paths.md#installedFrom
export function syncedFrom(root: string): { configDir: string; marketplace: 'synced' } | null {
  const m = /^(.*)\/plugins\/synced\//.exec(`${root.replace(/\\/g, '/').replace(/\/$/, '')}/`)
  return m ? { configDir: m[1]!, marketplace: 'synced' } : null
}

// 노트: paths.md#installedFrom
export function pluginDataId(plugin: string, marketplace: string): string {
  return `${plugin}@${marketplace}`.replace(/[^A-Za-z0-9_-]/g, '-')
}
