import type { Nav, NavNode, StoredPane, TreeGroup, TreeRow } from '../types'

/** 옛 세션 트리 자료 한 줄(세션 하나) 중 여기서 쓰는 필드 — 꼴은 개발자 모드 자료(msg 스킬 세션 목록)를 따른다 */
export type Entry = {
  alias: string
  group?: string | null
  parent?: string | null
  status?: string
  session_id?: string
  transcript_id?: string
  title?: string
}

const NO_GROUP = '(그룹 없음)'

/** 레지스트리 항목의 그룹 이름. group 이 비면 같은 '(그룹 없음)' 으로 묶는다 */
export function groupOf(entry: Entry | null): string | null {
  return entry ? (entry.group ?? NO_GROUP) : null
}

/** $.store 의 열린 트리 패널을 이 세션 기준으로: 연 세션과 같은 그룹일 때만 따라 연다 */
export function paneFollows(stored: unknown, selfGroup: string | null): boolean {
  if (typeof stored !== 'object' || stored === null || selfGroup === null) return false
  return (stored as Partial<StoredPane>).group === selfGroup
}

/** "[큰그림-첫판] ..." → "첫판", "[큰그림 오케] ..." → "큰그림 오케", 태그 없으면 별칭 */
export function labelOf(entry: Entry): string {
  const tag = /^\[([^\]]+)\]/.exec(entry.title ?? '')?.[1]
  if (!tag) return entry.alias
  const dash = tag.indexOf('-')
  return dash > 0 ? tag.slice(dash + 1) : tag
}

function nodeOf(entry: Entry): NavNode | null {
  if (!entry.session_id) return null
  return {
    alias: entry.alias,
    label: labelOf(entry),
    sessionId: entry.session_id,
    isDone: entry.status === 'done',
  }
}

/** 이 세션의 레지스트리 항목: previewAlias 가 있으면 그 별칭, 없으면 트랜스크립트 ID 로 찾는다 */
export function findSelf(entries: Entry[], selfId: string, previewAlias: string | null): Entry | null {
  const found = previewAlias
    ? entries.find(entry => entry.alias === previewAlias)
    : entries.find(entry => entry.transcript_id === selfId)
  return found ?? null
}

/**
 * 이 세션 기준 트리 조각: 위로 루트까지의 길과 바로 아래 자식.
 * 레지스트리에 없거나 부모도 자식도 없으면 null.
 */
export function buildNav(entries: Entry[], selfEntry: Entry | null): Nav | null {
  if (!selfEntry) return null
  const self = nodeOf(selfEntry)
  if (!self) return null
  const byAlias = new Map(entries.map(entry => [entry.alias, entry]))

  // 부모를 따라 루트까지. 사이클 · 끊긴 부모에서 멈춘다.
  const path: NavNode[] = []
  const seen = new Set([selfEntry.alias])
  let parent = selfEntry.parent ? byAlias.get(selfEntry.parent) : undefined
  while (parent && !seen.has(parent.alias)) {
    seen.add(parent.alias)
    const node = nodeOf(parent)
    if (node) path.unshift(node)
    parent = parent.parent ? byAlias.get(parent.parent) : undefined
  }

  const kids = entries
    .filter(entry => entry.parent === selfEntry.alias)
    .map(nodeOf)
    .filter((node): node is NavNode => node !== null)
  const children = kids.filter(node => !node.isDone)
  const doneChildren = kids.length - children.length

  if (path.length === 0 && kids.length === 0) return null
  return { path, self, children, doneChildren }
}

/**
 * 레지스트리 전체를 그룹별 숲으로. 완료 세션은 진행 중 자손이 있을 때만 남기고,
 * 나머지는 부모 줄의 doneChildren 으로 센다. 자기 그룹이 맨 앞, 나머지는 이름순.
 */
export function buildTree(entries: Entry[], selfAlias: string | null): TreeGroup[] {
  const byAlias = new Map(entries.map(entry => [entry.alias, entry]))
  const kidsOf = new Map<string, Entry[]>()
  const roots: Entry[] = []
  for (const entry of entries) {
    if (entry.parent && byAlias.has(entry.parent)) {
      const list = kidsOf.get(entry.parent) ?? []
      list.push(entry)
      kidsOf.set(entry.parent, list)
    } else {
      roots.push(entry)
    }
  }

  // 루트에서 내려가는 길에는 사이클이 없다(부모가 하나뿐) — 메모만 둔다
  const live = new Map<string, boolean>()
  const isLive = (entry: Entry): boolean => {
    const known = live.get(entry.alias)
    if (known !== undefined) return known
    live.set(entry.alias, false)
    const result = entry.status !== 'done' || (kidsOf.get(entry.alias) ?? []).some(isLive)
    live.set(entry.alias, result)
    return result
  }

  const walk = (entry: Entry, depth: number, rows: TreeRow[]): void => {
    const kids = kidsOf.get(entry.alias) ?? []
    const shown = kids.filter(isLive)
    const node = nodeOf(entry)
    if (node) {
      rows.push({ ...node, depth, isSelf: entry.alias === selfAlias, doneChildren: kids.length - shown.length })
    }
    for (const kid of shown) walk(kid, depth + 1, rows)
  }

  const groups = new Map<string, TreeGroup>()
  for (const root of roots.filter(isLive)) {
    const key = root.group ?? NO_GROUP
    const group = groups.get(key) ?? { group: key, rows: [] }
    groups.set(key, group)
    walk(root, 0, group.rows)
  }

  const selfGroup = selfAlias ? (byAlias.get(selfAlias)?.group ?? NO_GROUP) : null
  return [...groups.values()]
    .filter(group => group.rows.length > 0)
    .sort((a, b) =>
      a.group === selfGroup ? -1 : b.group === selfGroup ? 1 : a.group.localeCompare(b.group),
    )
}

/** 터미널 칸 수로 넓은 글자(한글 · 이모지 등)는 2칸 */
function isWide(c: number): boolean {
  return (
    (c >= 0x1100 && c <= 0x115f) ||
    (c >= 0x2e80 && c <= 0xa4cf) ||
    (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xfe30 && c <= 0xfe4f) ||
    (c >= 0xff00 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6) ||
    c >= 0x1f300
  )
}

/** 칸 수에 맞게 자른다(넘치면 끝에 …) — 버튼 이름은 줄을 안 바꿔 미리 잘라야 한다 */
export function fitCells(text: string, cells: number): string {
  let width = 0
  for (const ch of text) width += isWide(ch.codePointAt(0)!) ? 2 : 1
  if (width <= cells) return text
  let out = ''
  let n = 0
  for (const ch of text) {
    const w = isWide(ch.codePointAt(0)!) ? 2 : 1
    if (n + w > cells - 1) break
    out += ch
    n += w
  }
  return `${out}…`
}

/**
 * 데스크톱 글 폭 어림(ch — 점자 빈칸 하나 폭). 겹친 단추가 글을 덮을 빈칸 수에 쓴다. 값은 easy-compact text.ts `textCh`
 * (실물 스크린샷과 맞춘 값)를 그대로 옮겼다 — 바꾸면 실물로 다시 잰다
 */
export function textCh(text: string): number {
  let w = 0
  for (const ch of text) {
    const c = ch.codePointAt(0)!
    if (c >= 0x1f300) w += 2.1
    else if (isWide(c)) w += 1.66
    else if (c >= 0x2190 && c <= 0x2bff) w += 1.3
    else if (/[0-9A-Z$~%#@&]/.test(ch)) w += 1
    else if (/[a-z]/.test(ch)) w += 0.85
    else if (/[\s·.,:;'"()[\]|/\-]/.test(ch)) w += 0.45
    else w += 0.9
  }
  return w
}
