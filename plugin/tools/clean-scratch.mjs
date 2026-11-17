#!/usr/bin/env node
// easy-session 세션 정리(0.1.6) — 보관된 세션이 남긴 스크래치 폴더 목록을 낸다(읽기만, 아무것도 안 지움).
// 쓰임: node clean-scratch.mjs <앱 세션 메타 폴더> [md 뿌리 ...]  → 표준 출력에 JSON 한 줄
//   { items: [{ path, title, bytes, days }], bytes, keepLive, keepRef, keepNoMeta }
// 스크래치 자리 = <임시 폴더>/claude/<작업 폴더 이름>/<대화 기록 id>/ — 폴더 이름이 앱 메타 cliSessionId 와 같다.
// 고르는 것: 앱 메타가 보관(isArchived)이고, md 뿌리 아래 md 가 그 id 를 글로 가리키지 않고, 빈 폴더가 아닌 것. 노트 docs/notes/register.md#sessionClean
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [metaDir, ...mdRoots] = process.argv.slice(2)
if (!metaDir) {
  process.stderr.write('쓰임: node clean-scratch.mjs <앱 세션 메타 폴더> [md 뿌리 ...]\n')
  process.exit(2)
}
const now = Date.now()
const DAY = 86_400_000

/** 앱 메타 — 대화 기록 id → 제목 · 보관 */
const byCli = new Map()
for (const f of readdirSync(metaDir)) {
  if (!f.startsWith('local_') || !f.endsWith('.json')) continue
  try {
    const m = JSON.parse(readFileSync(join(metaDir, f), 'utf8'))
    if (typeof m.cliSessionId === 'string') byCli.set(m.cliSessionId, { title: String(m.title ?? ''), isArchived: m.isArchived === true })
  } catch {
    // 반쯤 쓴 메타는 건너뛴다 — 그 폴더는 「메타 없음」으로 남아 안 옮긴다
  }
}

function sizeOf(dir) {
  let bytes = 0
  let newest = 0
  const walk = d => {
    let ents
    try {
      ents = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of ents) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else {
        try {
          const s = statSync(p)
          bytes += s.size
          if (s.mtimeMs > newest) newest = s.mtimeMs
        } catch {
          // 읽는 사이 사라진 파일
        }
      }
    }
  }
  walk(dir)
  return { bytes, newest }
}

const scratchRoot = join(tmpdir(), 'claude')
const cands = []
let keepLive = 0
let keepNoMeta = 0
let projects = []
try {
  projects = readdirSync(scratchRoot, { withFileTypes: true }).filter(e => e.isDirectory())
} catch {
  // 스크래치가 아직 없는 PC
}
for (const proj of projects) {
  let ents = []
  try {
    ents = readdirSync(join(scratchRoot, proj.name), { withFileTypes: true }).filter(e => e.isDirectory())
  } catch {
    continue
  }
  for (const e of ents) {
    const m = byCli.get(e.name)
    if (!m) {
      keepNoMeta++
      continue
    }
    if (!m.isArchived) {
      keepLive++
      continue
    }
    const path = join(scratchRoot, proj.name, e.name)
    const s = sizeOf(path)
    if (s.bytes === 0) continue
    cands.push({ path, cli: e.name, title: m.title, bytes: s.bytes, days: s.newest ? Math.floor((now - s.newest) / DAY) : 0 })
  }
}

/** md 가 그 폴더 id 를 글로 가리키면 남긴다(가리키는 파일이 깨지지 않게) — 무거운 폴더는 건너뜀 */
const SKIP = new Set(['node_modules', '.git', 'cache', 'plugins', 'projects', 'Intermediate', 'Binaries', 'Saved', 'DerivedDataCache', 'Library'])
const MD_MAX = 20_000
const wanted = new Set(cands.map(c => c.cli))
const referenced = new Set()
let mdSeen = 0
const seenDirs = new Set()
const walkMd = d => {
  if (mdSeen >= MD_MAX || referenced.size === wanted.size || seenDirs.has(d.toLowerCase())) return
  seenDirs.add(d.toLowerCase())
  let ents
  try {
    ents = readdirSync(d, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of ents) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) walkMd(join(d, e.name))
    } else if (e.name.endsWith('.md') && mdSeen < MD_MAX) {
      mdSeen++
      let text = ''
      try {
        text = readFileSync(join(d, e.name), 'utf8')
      } catch {
        continue
      }
      for (const id of wanted) if (!referenced.has(id) && text.includes(id)) referenced.add(id)
    }
  }
}
for (const r of mdRoots) walkMd(r)

const items = cands.filter(c => !referenced.has(c.cli)).sort((a, b) => b.bytes - a.bytes)
process.stdout.write(
  `${JSON.stringify({
    items: items.map(({ path, title, bytes, days }) => ({ path, title, bytes, days })),
    bytes: items.reduce((a, c) => a + c.bytes, 0),
    keepLive,
    keepRef: cands.length - items.length,
    keepNoMeta,
  })}\n`,
)
