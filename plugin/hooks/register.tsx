/**
 * easy-session — 이 세션과 이어진 세션들을 패널 「세션」(세션 도구 · 설정 탭)에 보이고, 입력창 위에 한 줄(세션 패널 단추 ·
 * 고르는 칸들)을 둔다. 패널 자료는 앱 세션 메타(meta.ts · 아래 「앱 세션 자료」)에서 읽는다. 옛 이름 session-tree-viewer —
 * easy-compact 처럼 정식 플러그인으로 내려고 이름을 바꿨다. 공개 mod(easy-compact)에서 떼어 낸 세션 트리가 뿌리다.
 *
 * 옛 세션 트리(drawTree · 모드 표시줄 🌳 버튼 · 명령 tree)는 msg 스킬 세션 목록으로 채우는 개발자 모드 몫만 남았다 — 그 자료를 읽는
 * 곳은 `// #dev-only` 구역이라 공개본 내보내기가 빼고, 공개판에선 트리 자료가 빈 목록이라 🌳 가 뜨지 않는다.
 * 🌳 를 모드 표시줄에 둔 까닭: easy-compact 띠의 패널 버튼 칸에 끼워 넣었을 때 그 띠를 최소화하거나 "컴팩트할 때만" 으로 숨기면
 * 🌳 혼자 입력창 위 한 줄을 차지했다(공간 독립, 위치 잘 정하기).
 */
import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, Register } from 'claude-code'

import type { AdvisorCall, AdvisorShare, AdvisorUse, BoardFile, CleanScan, ContextInfo, EndRecord, EndedKid, OutItem, RelayFound, RelayMark, RelayPending, HeldBox, HeldReport, NavNode, PanelUi, PlanKind, SessionMeta, StoredPlan, TreeGroup, TreeLinks } from '../types'
import type { AdvisorPose } from './advisor-char'
import {
  DROP_REASON,
  INDEX_FILE,
  READ_LIMIT,
  TOP,
  agoText,
  applyIndex,
  baseName,
  boardFileText,
  boardKey,
  boardLines,
  buildFamilies,
  contextReportText,
  endLineOf,
  familiesText,
  familyRow,
  freshLines,
  heldFileText,
  heldKey,
  heldText,
  idOfFile,
  isCold,
  isNextOrdinal,
  isSessionFile,
  lastUsageOf,
  ownerChoices,
  pinWhyOf,
  scopeOf,
  parseAdvisorCalls,
  parseAdvisorShare,
  parseBoard,
  parseContextReport,
  parseEndRecord,
  parseHeld,
  parseHeldBox,
  parseIndex,
  parseOutbox,
  parsePending,
  pickAppFolder,
  pickContext,
  projectDirName,
  queuedReports,
  recentSent,
  relatives,
  roleOf,
  ultraTyped,
  RELAY_MARK_MS,
  RELAY_SLACK_MS,
  receiptState,
  relayContext,
  relayMissContext,
  relayText,
  relayWay,
  reportStateOf,
  samePath,
  sendTargets,
  settleArrived,
  signalOf,
  signalWord,
  slimMeta,
  splitRelayed,
  splitReports,
  takeOutbox,
  takeQueued,
  subtreeOf,
  wantedIds,
  withSignal,
  withTree,
  findTarget,
  isMainWord,
  mainOf,
  outboxText,
  peerIdOf,
  peerLine,
  peerRelOf,
  peerSenders,
} from './meta'
import type { AppFolder, PinWhy, SessionRole } from './meta'
import { ADV_FOLD, AUTO_SWITCH, COMPOSE_AT, PEER_SWITCH, QUICK_ITEMS, QUICK_SWITCH, SEND_MAIN, SEND_MISS, SEND_NONE, TOOL_START, bareTitle, compactWins, drawFableAsk, drawPanel, drawPanelBare, drawQuickRow, josa, sendPad, shortTitle } from './panel'
import type { AdvisorLog, AdvisorMark, Choice, FableActs, HeldPick, PanelActs, PanelView, QuickActs, QuickItem, QuickView, SendActs, SlashCmd } from './panel'
import { installedFrom, pluginDataId, syncedFrom } from './paths'
import { buildNav, buildTree, findSelf, fitCells, groupOf, paneFollows } from './tree'
import type { Entry } from './tree'

const PANE = 'easy-session'

/** $.store 키: 트리 패널을 연 그룹(StoredPane). 같은 그룹 세션만 따라 연다 */
const PANE_KEY = 'pane'

const nav = atom({ plugin: 'easy-session', key: 'nav' } as const, null)

const tree = atom({ plugin: 'easy-session', key: 'tree' } as const, [])

const previewAlias = atom({ plugin: 'easy-session', key: 'previewAlias' } as const, null)

const selfGroup = atom({ plugin: 'easy-session', key: 'selfGroup' } as const, null)

const isOpen = atom({ plugin: 'easy-session', key: 'isOpen' } as const, false)

const PANEL_UI_START: PanelUi = { view: 'self', tool: TOOL_START, open: null, remote: null, sending: null, card: null, draft: '', folds: [], ask: null }

const panelUi = atom({ plugin: 'easy-session', key: 'panelUi' } as const, PANEL_UI_START)

const appTick = atom({ plugin: 'easy-session', key: 'appTick' } as const, 0)

const fableAsk = atom({ plugin: 'easy-session', key: 'fableAsk' } as const, false)

const plan = atom({ plugin: 'easy-session', key: 'plan' } as const, null)

const advisorUse = atom({ plugin: 'easy-session', key: 'advisorUse' } as const, null)

const advisorTurn = atom({ plugin: 'easy-session', key: 'advisorTurn' } as const, null)

const mainModel = atom({ plugin: 'easy-session', key: 'mainModel' } as const, null)

const ultraOn = atom({ plugin: 'easy-session', key: 'ultraOn' } as const, false)
/** 지금 본 대화 차례 글에 ultrathink 가 들어갔나 — 채팅 작업 줄 글 앞 「ultrathink · 」(0.1.26 — 노트 register.md#ultraSpinner) */
const ultraTurn = atom({ plugin: 'easy-session', key: 'ultraTurn' } as const, false)

type Ui = ReturnType<EngineInterface['ui']['resolve']>

// 노트: register.md#log — 엔진이 앞에 「easy-session:」을 붙인다(0.1.5 — 격리 터미널에서 「easy-session: easy-session: …」 두 번으로 잼, 11-04)
function log($: EngineInterface, text: string): void {
  try {
    $.ui.log(text)
  } catch {
    // 로그도 못 남기는 곳(테스트 등)에선 조용히 넘어간다
  }
}

/** 옛 세션 트리 자료(머리 주석) — 개발자 모드면 msg 세션 목록, 공개판은 빈 목록 */
async function loadEntries($: EngineInterface): Promise<Entry[]> {
  return []
}

async function envPath(get: () => Promise<string | undefined>): Promise<string | null> {
  try {
    return (await get())?.replace(/\\/g, '/').replace(/\/+$/, '') || null
  } catch {
    return null
  }
}

// 노트: register.md#claudeHome
let claudeHomeCache: string | null = null

// 노트: register.md#claudeHome
async function claudeHome($: EngineInterface): Promise<string> {
  if (claudeHomeCache) return claudeHomeCache
  const root = $.plugin.root.replace(/\\/g, '/')
  const installed = installedFrom(root) ?? syncedFrom(root)
  if (installed) return (claudeHomeCache = installed.configDir)
  const configDir = await envPath(() => $.env.get('CLAUDE_CONFIG_DIR'))
  if (configDir) return (claudeHomeCache = configDir)
  const at = root.lastIndexOf('/.claude/')
  if (at >= 0) return (claudeHomeCache = root.slice(0, at + '/.claude'.length))
  const home = (await envPath(() => $.env.get('HOME'))) ?? (await envPath(() => $.env.get('USERPROFILE')))
  if (home) return (claudeHomeCache = `${home}/.claude`)
  throw new Error('Claude 설정 폴더를 못 찾음(CLAUDE_CONFIG_DIR · HOME 없음)')
}

// 노트: register.md#dataDir
async function dataDir($: EngineInterface): Promise<string> {
  const installed = installedFrom($.plugin.root) ?? syncedFrom($.plugin.root)
  if (installed) return `${installed.configDir}/plugins/data/${pluginDataId('easy-session', installed.marketplace)}`
  return `${await claudeHome($)}/plugins/data/easy-session`
}

// 노트: register.md#appDataDirs
async function appDataDirs($: EngineInterface): Promise<string[]> {
  const local = await envPath(() => $.env.get('LOCALAPPDATA'))
  const roaming = await envPath(() => $.env.get('APPDATA'))
  const home = (await envPath(() => $.env.get('HOME'))) ?? (await envPath(() => $.env.get('USERPROFILE')))
  const bases = [local, roaming, home && `${home}/Library/Application Support`, home && `${home}/.config`].filter((b): b is string => !!b)
  const out: string[] = []
  for (const base of bases) {
    for (const name of ['Claude-Data', 'Claude-3p', 'Claude']) {
      const dir = `${base}/${name}`
      try {
        for (const f of await $.fs.list(dir)) if (f.kind === 'dir' && /^claude_/i.test(f.name)) out.push(`${dir}/${f.name}`)
      } catch {
      }
      out.push(dir)
    }
  }
  return out
}

// 노트: register.md#selfAppId
async function selfAppId($: EngineInterface): Promise<string | null> {
  const id = await $.env.get('CLAUDE_CODE_HOST_SESSION_ID').catch(() => undefined)
  return id?.startsWith('local_') ? id : null
}

// 노트: register.md#app
const app = {
  dir: null as string | null,
  files: new Map<string, { mtimeMs: number; meta: SessionMeta | null }>(),
  archived: null as Set<string> | null,
  indexMtimeMs: -1,
  isAllRead: false,
  ended: new Map<string, { mtimeMs: number; record: EndRecord | null }>(),
}

// 노트: register.md#findAppSessions
async function findAppSessions($: EngineInterface, selfId: string | null): Promise<string | null> {
  const account = await $.env.get('CLAUDE_CODE_ACCOUNT_UUID').catch(() => undefined)
  const org = await $.env.get('CLAUDE_CODE_ORGANIZATION_UUID').catch(() => undefined)
  if (!account || !org) return null
  const found: AppFolder[] = []
  for (const base of await appDataDirs($)) {
    const dir = `${base}/claude-code-sessions/${account}/${org}`
    if (!(await $.fs.exists(dir).catch(() => false))) continue
    found.push({
      dir,
      hasSelf: selfId !== null && (await $.fs.exists(`${dir}/${selfId}.json`).catch(() => false)),
      indexMtimeMs: await $.fs.stat(`${dir}/${INDEX_FILE}`).then(
        s => s.mtimeMs,
        () => null,
      ),
    })
  }
  return pickAppFolder(found)
}

function appMetas(): Map<string, SessionMeta> {
  const out = new Map<string, SessionMeta>()
  for (const [id, f] of app.files) if (f.meta) out.set(id, applyIndex(f.meta, app.archived))
  return out
}

// 노트: register.md#refreshApp
async function refreshApp($: EngineInterface, isAll = false): Promise<Map<string, SessionMeta>> {
  const selfId = await selfAppId($)
  app.dir ??= await findAppSessions($, selfId)
  const dir = app.dir
  if (!dir) return new Map()
  let list: FsEntry[]
  try {
    list = await $.fs.list(dir)
  } catch {
    app.dir = null
    return new Map()
  }
  const index = list.find(f => f.kind === 'file' && f.name === INDEX_FILE)
  if (index && index.mtimeMs !== app.indexMtimeMs) {
    const archived = await $.fs.read(`${dir}/${INDEX_FILE}`).then(parseIndex, () => null)
    if (archived) {
      app.archived = archived
      app.indexMtimeMs = index.mtimeMs
    }
  }
  const onDisk = new Map(list.filter(f => f.kind === 'file' && isSessionFile(f.name)).map(f => [idOfFile(f.name), f.mtimeMs]))
  for (const id of [...app.files.keys()]) if (!onDisk.has(id)) app.files.delete(id)
  const failed = new Set<string>()
  const load = async (id: string): Promise<void> => {
    const mtimeMs = onDisk.get(id)
    if (mtimeMs === undefined || app.files.get(id)?.mtimeMs === mtimeMs) return
    try {
      app.files.set(id, { mtimeMs, meta: slimMeta(JSON.parse(await $.fs.read(`${dir}/${id}.json`)), id) })
    } catch {
      failed.add(id)
    }
  }
  for (const id of onDisk.keys()) if (isAll || app.files.has(id) || !app.archived?.has(id)) await load(id)
  if (isAll) app.isAllRead = true
  for (let round = 0; round < 16; round++) {
    const want = wantedIds(appMetas(), selfId).filter(id => onDisk.has(id) && !app.files.has(id) && !failed.has(id))
    if (want.length === 0) break
    for (const id of want) await load(id)
  }
  return appMetas()
}

// 노트: register.md#refreshEnded
async function refreshEnded($: EngineInterface): Promise<Map<string, EndRecord>> {
  const dir = `${await dataDir($)}/sessions`
  const list = await $.fs.list(dir).catch((): FsEntry[] => [])
  const onDisk = new Map(list.filter(f => f.kind === 'file' && isSessionFile(f.name)).map(f => [idOfFile(f.name), f.mtimeMs]))
  for (const id of [...app.ended.keys()]) if (!onDisk.has(id)) app.ended.delete(id)
  for (const [id, mtimeMs] of onDisk) {
    if (app.ended.get(id)?.mtimeMs === mtimeMs) continue
    app.ended.set(id, { mtimeMs, record: await $.fs.read(`${dir}/${id}.json`).then(parseEndRecord, () => null) })
  }
  const out = new Map<string, EndRecord>()
  for (const [id, f] of app.ended) if (f.record) out.set(id, f.record)
  return out
}

// 노트: register.md#writeContextReport
async function writeContextReport($: EngineInterface, model: string | null): Promise<void> {
  const id = await selfAppId($)
  if (!id) return
  const usage = await $.session.usage()
  const tokens = usage.context.tokens
  if (typeof tokens !== 'number' || tokens <= 0) return
  const text = contextReportText({ tokens, window: usage.context.window, model, at: await $.clock.now() })
  await $.fs.write(`${await dataDir($)}/context/${id}.json`, text)
}

// 노트: register.md#readContext
async function readContext($: EngineInterface, meta: SessionMeta): Promise<ContextInfo | null> {
  const report = await $.fs.read(`${await dataDir($)}/context/${meta.id}.json`).then(parseContextReport, () => null)
  let fromLog: ContextInfo | null = null
  if (meta.cli && meta.cwd) {
    const path = `${await claudeHome($)}/projects/${projectDirName(meta.cwd)}/${meta.cli}.jsonl`
    const stat = await $.fs.stat(path).catch(() => null)
    if (stat?.kind === 'file' && stat.size <= READ_LIMIT) fromLog = await $.fs.read(path).then(lastUsageOf, () => null)
  }
  return pickContext(report, fromLog)
}

// ── 데스크톱 새 패널 · 입력창 쪽(실물 확인판 2026-10-25) — 노트: register.md#appSelf ────────────────────────

/** 이 세션이 앱 세션이고 메타가 있으면 그 자료 — 아니면 null(터미널 · 시험 · 앱 자료 없음 → 지금 msg 꼴) */
async function appSelf($: EngineInterface, isAll = false): Promise<{ selfId: string; metas: Map<string, SessionMeta> } | null> {
  const selfId = await selfAppId($)
  if (!selfId) return null
  const metas = await refreshApp($, isAll)
  return metas.has(selfId) ? { selfId, metas } : null
}

// 노트: register.md#reportK
const ctxCache = new Map<string, { at: number; k: number | null }>()

/** 식은 세션의 컨텍스트(천 토큰) — 그 세션이 턴 끝에 적은 값만(작은 파일). 30초 안엔 다시 안 읽는다 */
async function reportK($: EngineInterface, id: string, now: number): Promise<number | null> {
  const hit = ctxCache.get(id)
  if (hit && now - hit.at < 30_000) return hit.k
  const report = await $.fs.read(`${await dataDir($)}/context/${id}.json`).then(parseContextReport, () => null)
  const k = report ? Math.round(report.tokens / 1000) : null
  ctxCache.set(id, { at: now, k })
  return k
}

// ── 자식 보고 켬 · 끔 — 노트: register.md#reports ────────────────────────────────────────────────────
// 켬 · 끔은 $.store(모든 세션이 같이 읽음 — 엔진이 get 마다 파일을 새로 읽고 set 은 잠금으로 씀), 모인 보고는 받는 세션 몫 파일
const REPORT_DEFAULT_KEY = 'reportDefault'
const REPORT_PREFIX = 'report:'

// 노트: register.md#reports — 저장값이 없으면 앱 그대로(정함 11 · 0.1.3 물음 ④), 'off' 만 모아 둠
async function reportDefault($: EngineInterface): Promise<boolean> {
  return (await $.store.get(REPORT_DEFAULT_KEY).catch(() => undefined)) !== 'off'
}

/** [설정] 「자식 보고」 — hold = 사이드 패널에 모아 둠('off') · app = 앱 그대로('on') */
const REPORT_MODES = [
  { value: 'hold', label: '사이드 패널에 모아 둠' },
  { value: 'app', label: '앱 그대로' },
] as const

async function setReportMode($: EngineInterface, value: string): Promise<void> {
  if (value !== 'app' && value !== 'hold') return
  const want = value === 'app' ? 'on' : 'off'
  if ((await $.store.get(REPORT_DEFAULT_KEY).catch(() => undefined)) === want) return
  await $.store.set(REPORT_DEFAULT_KEY, want)
  await update($, appTick, n => n + 1)
}

// ── 오케 나무 기록 — $.store 에 세션마다 열쇠(두 세션이 같이 눌러도 안 덮음). 노트: register.md#links ──────────────
const OWNER_PREFIX = 'owner:'
const SUCC_PREFIX = 'succ:'
const ORCHE_PREFIX = 'orche:'
const HANDOFF_PREFIX = 'handoff:'
/** 주인 고르기의 「앱 관계대로」(덮어쓰기 지움) */
const APP_OWNER = 'app'
/** 인계 대기 — 단추를 누른 뒤 이 세션이 연 첫 세션 하나만, 이 시간 안에 */
const HANDOFF_MS = 30 * 60_000

async function storeLinks($: EngineInterface): Promise<TreeLinks> {
  const owners = new Map<string, string>()
  const succ = new Map<string, string>()
  const orche = new Set<string>()
  for (const key of await $.store.keys().catch((): string[] => [])) {
    const kind = key.startsWith(OWNER_PREFIX) ? 'o' : key.startsWith(SUCC_PREFIX) ? 's' : key.startsWith(ORCHE_PREFIX) ? 'r' : null
    if (kind === null) continue
    const v = await $.store.get(key).catch(() => undefined)
    const id = key.slice(key.indexOf(':') + 1)
    if (kind === 'o' && typeof v === 'string') owners.set(id, v)
    if (kind === 's' && typeof v === 'string') succ.set(id, v)
    if (kind === 'r' && v === true) orche.add(id)
  }
  return { owners, succ, orche }
}

/** 기록이 바뀌면 다시 그리게 — 3초 비교(bumpTick)에 붙이는 값 */
function linksSig(l: TreeLinks): string {
  return [...l.owners].map(([k, v]) => `|o${k}=${v}`).join('') + [...l.succ].map(([k, v]) => `|s${k}=${v}`).join('') + [...l.orche].map(k => `|c${k}`).join('')
}

/** 세션마다 정한 값(정하지 않은 세션은 빠짐) */
async function reportSwitches($: EngineInterface): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>()
  for (const key of await $.store.keys().catch((): string[] => [])) {
    if (!key.startsWith(REPORT_PREFIX)) continue
    const v = await $.store.get(key).catch(() => undefined)
    if (typeof v === 'boolean') out.set(key.slice(REPORT_PREFIX.length), v)
  }
  return out
}

async function heldPath($: EngineInterface, id: string): Promise<string> {
  return `${await dataDir($)}/reports/${id}.json`
}

/** 그리기 · 세기용 — 못 읽으면 빈 목록(고치는 쪽은 editHeld) */
async function readHeld($: EngineInterface, id: string): Promise<HeldReport[]> {
  return $.fs.read(await heldPath($, id)).then(parseHeld, (): HeldReport[] => [])
}

// 노트: register.md#editHeld — 한 세션의 고침을 줄 세운다(시계 · 받기 · 누름이 겹쳐도 서로 덮지 않게)
let heldLine: Promise<unknown> = Promise.resolve()

// 노트: register.md#editHeld — 파일이 없을 때만 빈 칸에서 시작한다. 있는데 못 읽거나 꼴이 깨졌으면 던져서 덮어쓰지 않는다
async function editHeld($: EngineInterface, id: string, edit: (box: HeldBox) => HeldBox | null): Promise<boolean> {
  const run = async (): Promise<boolean> => {
    const path = await heldPath($, id)
    const text = await $.fs.read(path).catch(async (err: unknown) => {
      if (await $.fs.exists(path).catch(() => true)) throw err
      return null
    })
    const box = text === null ? { items: [], seen: [] } : parseHeldBox(text)
    if (!box) throw new Error('보고 파일을 읽을 수 없는 꼴입니다')
    const next = edit(box)
    if (!next) return false
    await $.fs.write(path, heldFileText(next.items, next.seen, next.took))
    return true
  }
  const out = heldLine.then(run, run)
  heldLine = out.catch(() => {})
  return out
}

// 노트: register.md#reports — 다른 세션 줄의 「보고 N」 · 바뀜 표시(bumpTick)에 쓴다. 바뀌지 않은 파일은 다시 안 읽는다
const heldCache = new Map<string, { mtimeMs: number; n: number }>()

async function heldCounts($: EngineInterface): Promise<Map<string, number>> {
  const list = await $.fs.list(`${await dataDir($)}/reports`).catch((): FsEntry[] => [])
  const onDisk = new Map(list.filter(f => f.kind === 'file' && isSessionFile(f.name)).map(f => [idOfFile(f.name), f.mtimeMs]))
  for (const id of [...heldCache.keys()]) if (!onDisk.has(id)) heldCache.delete(id)
  for (const [id, mtimeMs] of onDisk) {
    if (heldCache.get(id)?.mtimeMs === mtimeMs) continue
    heldCache.set(id, { mtimeMs, n: (await readHeld($, id)).length })
  }
  const out = new Map<string, number>()
  for (const [id, f] of heldCache) if (f.n > 0) out.set(id, f.n)
  return out
}

/** 받은 글에서 자식 보고를 뗀다 — 이 세션이 끔이면 모으고, 막은 흔적은 늘 거른다. 보고만 든 앱 턴은 drop 이유와 함께 */
async function holdReports($: EngineInterface, e: { text: string; origin?: { kind: string } }): Promise<{ text: string; drop?: string } | null> {
  const selfId = await selfAppId($)
  if (!selfId) return null
  const kind = e.origin?.kind
  const metas = await refreshApp($)
  const on = reportStateOf(selfId, metas, await reportSwitches($), await reportDefault($)).on
  const split = splitReports(e.text, { isPerson: kind === 'composer' || kind === 'bridge', hold: !on, now: await $.clock.now() })
  if (split.held.length > 0) {
    lastArrivedAt = await $.clock.now()
    // 노트: meta.md#splitRelayed — 끝 답을 이미 받은 차례의 자동 보고는 카드로 안 만든다
    const { fresh, quiet } = splitRelayed(split.held, await relayMarks($), selfId, lastArrivedAt, false)
    await editHeld($, selfId, box => settleArrived(box, fresh))
    await dropMarks($, quiet)
    await update($, appTick, n => n + 1)
  }
  return split.isEmpty ? { text: split.text, drop: DROP_REASON } : { text: split.text }
}

// 노트: register.md#takeFromQueue — 앱이 글로 넘긴 뒤에도 앱 메타 저장 전까지 대기 칸에 그 보고가 보인다. 그동안은 안 받는다
const ARRIVE_QUIET_MS = 15_000
let lastArrivedAt = 0

// 노트: register.md#takeFromQueue — 앱 대기 칸(이 세션 앱 메타)의 곁가지 보고를 할 일로. 모아 둠 세션만. 3초 시계(bumpTick)가 부른다
async function takeFromQueue($: EngineInterface, selfId: string, metas: ReadonlyMap<string, SessionMeta>): Promise<void> {
  const queued = queuedReports(metas.get(selfId)?.queued ?? [])
  if (queued.length === 0 || (await $.clock.now()) - lastArrivedAt < ARRIVE_QUIET_MS) return
  if (reportStateOf(selfId, metas, await reportSwitches($), await reportDefault($)).on) return
  // 노트: meta.md#splitRelayed — 끝 답을 이미 받은 차례의 자동 보고는 서명만 남긴다(앱 글이 나중에 와도 안 생기게)
  const { fresh, quiet } = splitRelayed(queued, await relayMarks($), selfId, await $.clock.now())
  if (await editHeld($, selfId, box => takeQueued(box, fresh, quiet))) await update($, appTick, n => n + 1)
  await dropMarks($, quiet)
}

// ── 입력창 보내기 규격(0.1.14) — 신호 받기 · 차례 끝 보내기 · 할 일 카드. 노트: register.md#relay ────────────────
const RELAY_PREFIX = 'relay:'
const RELAYED_PREFIX = 'relayed:'
/** 보낸 뒤 앱 도착 기록을 다시 보는 때 — 받는 쪽 만료(dialogExpiry 기본 5분)까지 덮는다. 노트 register.md#relay */
const RELAY_WATCH_MS: readonly number[] = [20_000, 360_000]
const OUTBOX_DIR = 'outbox'
/** 모델이 같은 곳에 또 보낼 때 돌려주는 글(모델이 읽는다) */
const RELAY_SELF_SEND = 'easy-session 이 이 차례 끝 답을 그 세션으로 보냅니다. 직접 보내지 말고 답만 쓰세요.'

async function readPending($: EngineInterface, selfId: string): Promise<RelayPending | null> {
  return parsePending(await $.store.get(`${RELAY_PREFIX}${selfId}`).catch(() => undefined))
}

async function writePending($: EngineInterface, selfId: string, p: RelayPending | null): Promise<void> {
  if (p) await $.store.set(`${RELAY_PREFIX}${selfId}`, p)
  else await $.store.delete(`${RELAY_PREFIX}${selfId}`)
  await update($, appTick, n => n + 1)
}

// 노트: meta.md#splitRelayed — 받는 쪽이 읽는 표시. 하루 지난 표시는 지운다
async function relayMarks($: EngineInterface): Promise<Map<string, RelayMark>> {
  const out = new Map<string, RelayMark>()
  const now = await $.clock.now()
  for (const key of await $.store.keys().catch((): string[] => [])) {
    if (!key.startsWith(RELAYED_PREFIX)) continue
    const v = (await $.store.get(key).catch(() => undefined)) as Partial<RelayMark> | undefined
    if (typeof v?.to === 'string' && typeof v.at === 'number' && now - v.at < RELAY_MARK_MS) out.set(key.slice(RELAYED_PREFIX.length), { to: v.to, at: v.at })
    else await $.store.delete(key).catch(() => {})
  }
  return out
}

async function dropMarks($: EngineInterface, reports: readonly HeldReport[]): Promise<void> {
  for (const r of reports) await $.store.delete(`${RELAYED_PREFIX}${r.from}`).catch(() => {})
}

/** 칸 · 알림에 쓰는 받는 세션 이름 */
function relayName(metas: ReadonlyMap<string, SessionMeta>, id: string): string {
  return shortTitle(metas.get(id)?.title ?? id)
}

function relayMissText(word: string, found: Extract<RelayFound, { miss: string }>): string {
  const names = found.names.map(shortTitle).slice(0, 3).join(' · ')
  switch (found.miss) {
    case 'self':
      return isMainWord(word) ? '이 세션이 메인 오케입니다. 전달에서 받을 세션을 고르세요' : `「${word}」은 이 세션 이름입니다`
    case 'crowns':
      return `왕관 세션이 ${found.names.length}개라 메인을 못 정했습니다: ${names}. 전달 칸에서 고르세요`
    case 'many':
      return `「${word}」과 맞는 세션이 ${found.names.length}개입니다: ${names}`
    case 'none':
      return isMainWord(word) ? '메인 오케를 찾지 못했습니다. 세션 패널에서 오케를 지정하거나 전달 칸에서 고르세요' : `「${word}」과 맞는 세션이 없습니다`
  }
}

// 노트: register.md#relay — 사람이 친 글의 신호. 글은 안 고치고 그 차례 모델에게 줄 글만 돌려준다(못 찾으면 무시하라는 글)
async function relaySubmit($: EngineInterface, e: { turnId?: string }, text: string): Promise<string | null> {
  const selfId = await selfAppId($)
  if (!selfId) return null
  const sig = signalOf(text)
  if (!sig) {
    // 쉬던 세션의 새 차례인데 앞 대기가 남았다면(차례 끝을 못 들음) 그 답은 이미 지나갔다
    if (e.turnId === undefined && (await readPending($, selfId))) await writePending($, selfId, null)
    return null
  }
  const metas = await refreshApp($)
  const found = findTarget(sig.word, selfId, metas, await storeLinks($))
  if ('miss' in found) {
    toast($, `보내지 않습니다 — ${relayMissText(sig.word, found)}`)
    return relayMissContext(sig.word)
  }
  const way = relayWay(metas.get(selfId)?.mode, metas.get(found.id)?.mode)
  await writePending($, selfId, { to: found.id, word: sig.word, way, own: sig.rest, at: await $.clock.now(), turnId: e.turnId ?? null })
  return relayContext({ word: sig.word, title: metas.get(found.id)?.title ?? found.id, to: found.id, way, isBare: sig.rest === '' })
}

// 노트: register.md#peerRel — 받은 세션 글: 보낸 세션이 이 세션의 위인지 아래인지 그 차례 모델에게 줄 글(설정이 꺼졌거나 가릴 수 없으면 null)
async function peerSubmit($: EngineInterface, origin: unknown, text: string): Promise<string | null> {
  if (!(await storeOn($, PEER_REL_KEY))) return null
  const selfId = await selfAppId($)
  if (!selfId) return null
  const senders = peerSenders(text, origin)
  if (senders.length === 0) return null
  const metas = await refreshApp($)
  const links = await storeLinks($)
  const tree = withTree(metas, links)
  const lines: string[] = []
  for (const s of senders) {
    const rel = peerRelOf(selfId, peerIdOf(s, metas), tree, links.orche)
    if (rel) lines.push(peerLine(rel))
  }
  return lines.length > 0 ? lines.join('\n') : null
}

// 노트: meta.md#outbox — 받는 세션 할 일 카드로. 보낸 세션 몫 파일에만 쓴다(받는 세션 파일을 다른 프로세스가 고치면 서로 덮는다)
async function relayCard($: EngineInterface, selfId: string, to: string, title: string, text: string): Promise<void> {
  const path = `${await dataDir($)}/${OUTBOX_DIR}/${selfId}.json`
  const items = await $.fs.read(path).then(parseOutbox, (): OutItem[] => [])
  await $.fs.write(path, outboxText([...items, { to, title, text, at: await $.clock.now() }]))
}

/** 끝난 뒤: 알림 + 대화의 답 아래 줄(띠는 안 움직인다) */
function relayEnd($: EngineInterface, text: string): void {
  toast($, text)
  log($, text)
}

// 노트: register.md#relay — 「응답 없음」: 보내기 결과는 받는 쪽 줄에 들어간 것까지다. 앱 도착 기록을 다시 봐서 거절 · 만료면 카드로 남기고 알린다
function watchReceipt($: EngineInterface, selfId: string, to: string, at: number, card: { title: string; text: string }, left: readonly number[] = RELAY_WATCH_MS): void {
  const [wait, ...rest] = left
  if (wait === undefined) return
  $.clock.after(wait, () => {
    void (async () => {
      const metas = await refreshApp($)
      const r = (metas.get(selfId)?.receipts ?? []).filter(x => x.to === to && x.sentAt >= at - RELAY_SLACK_MS).at(-1)
      if (r && receiptState(r) === 'undelivered') {
        await relayCard($, selfId, to, card.title, card.text)
        relayEnd($, `「${relayName(metas, to)}」가 받지 않아(${r.reason ?? '까닭 모름'}) 그 세션 패널에 넣었습니다`)
      } else if (!r || receiptState(r) === 'sent') watchReceipt($, selfId, to, at, card, rest)
    })().catch(err => log($, `보낸 글 도착 확인 실패 — ${String(err)}`))
  })
}

// 노트: register.md#relay — 차례 끝: 메인 루프 · 그 차례 · 끝까지 돈 답만. 어떤 길이든 못 보내면 카드로 남긴다
async function finishRelay($: EngineInterface, e: { turnId: string; answer: string; reason: string; isAborted: boolean }): Promise<void> {
  const selfId = await selfAppId($)
  if (!selfId) return
  const p = await readPending($, selfId)
  if (!p || (p.turnId !== null && p.turnId !== e.turnId)) return
  await writePending($, selfId, null)
  const metas = await refreshApp($)
  const name = relayName(metas, p.to)
  if (e.isAborted || e.reason !== 'answer') return relayEnd($, `차례가 끝까지 돌지 않아 「${name}」에 보내지 않았습니다`)
  // 노트: meta.md#splitRelayed — 앱 부모에게 보낼 때만 같은 차례 자동 보고가 겹친다. 보고보다 먼저 적는다
  const mark = async () => {
    if (metas.get(selfId)?.parent === p.to) await $.store.set(`${RELAYED_PREFIX}${selfId}`, { to: p.to, at: await $.clock.now() } satisfies RelayMark)
  }
  const text = relayText({ word: p.word, own: p.own, answer: e.answer })
  const title = metas.get(selfId)?.title ?? selfId
  if (p.way === 'model' && p.modelSent) {
    await mark()
    watchReceipt($, selfId, p.to, p.at, { title, text })
    return relayEnd($, `Claude 가 「${name}」에 보냈습니다`)
  }
  if (e.answer.trim() === '') return relayEnd($, `끝 답에 글이 없어 「${name}」에 보내지 않았습니다`)
  await mark()
  if (p.way === 'direct') {
    const at = await $.clock.now()
    const sent = await $.session.send({ to: p.to, text }).catch((err: unknown) => ({ isDelivered: false as const, reason: String(err) }))
    if (sent.isDelivered) {
      watchReceipt($, selfId, p.to, at, { title, text })
      return relayEnd($, `「${name}」에 끝 답을 보냈습니다`)
    }
    await relayCard($, selfId, p.to, title, text)
    return relayEnd($, `「${name}」에 못 보내 그 세션 패널에 넣었습니다 — ${firstLine(sent.reason)}`)
  }
  await relayCard($, selfId, p.to, title, text)
  relayEnd($, p.way === 'model' ? `Claude 가 보내지 않아 「${name}」 패널에 넣었습니다` : `「${name}」 패널에 넣었습니다. 거기서 수락하면 처리합니다`)
}

// 노트: meta.md#outbox — 내보낸 칸을 받는 쪽에서 읽는다. 바뀐 파일만. 3초 시계(bumpTick)가 부른다 — 창에 띄운 세션만이라 안 띄웠으면 띄운 뒤 3초 안에
const outboxSeen = new Map<string, number>()

async function takeOutboxCards($: EngineInterface, selfId: string): Promise<void> {
  const dir = `${await dataDir($)}/${OUTBOX_DIR}`
  for (const f of await $.fs.list(dir).catch((): FsEntry[] => [])) {
    if (f.kind !== 'file' || !isSessionFile(f.name)) continue
    const from = idOfFile(f.name)
    if (from === selfId || outboxSeen.get(from) === f.mtimeMs) continue
    const items = parseOutbox(await $.fs.read(`${dir}/${f.name}`))
    if (await editHeld($, selfId, box => takeOutbox(box, from, items, selfId))) await update($, appTick, n => n + 1)
    outboxSeen.set(from, f.mtimeMs)
  }
}

// 노트: register.md#relay — 「글만 보내기」: 입력창 글 그대로, 모델 안 돎(제출하지 않아 막는 상자도 안 뜸). 우회 세션만 바로, 그 밖은 할 일 카드
const RELAY_TEXT_HEAD = '이 세션 사용자가 입력창에서 직접 보낸 글입니다(Claude 답이 아닙니다).'

async function relayTextOnly($: EngineInterface): Promise<void> {
  const s = await appSelf($)
  if (!s) return
  const draft = (await $.prompt.read().catch(() => null))?.text ?? ''
  const sig = signalOf(draft)
  if (!sig || sig.rest === '') return toast($, '보낼 글이 없습니다')
  const found = findTarget(sig.word, s.selfId, s.metas, await storeLinks($))
  if ('miss' in found) return toast($, `보내지 않습니다 — ${relayMissText(sig.word, found)}`)
  const name = relayName(s.metas, found.id)
  // 입력창 글 그대로(붙여 넣은 글도 — 신호 · ultrathink 낱말만 뺀다)
  const text = `${RELAY_TEXT_HEAD}\n\n${withSignal(draft, null).replace(/^\s*ultrathink\s+/i, '').trim()}`
  if (s.metas.get(s.selfId)?.mode === 'bypassPermissions') {
    const at = await $.clock.now()
    const sent = await $.session.send({ to: found.id, text }).catch((err: unknown) => ({ isDelivered: false as const, reason: String(err) }))
    if (!sent.isDelivered) return toast($, `보내지 못했습니다 — ${firstLine(sent.reason)}`)
    watchReceipt($, s.selfId, found.id, at, { title: s.metas.get(s.selfId)?.title ?? s.selfId, text })
    relayEnd($, `「${name}」에 글을 보냈습니다`)
  } else {
    await relayCard($, s.selfId, found.id, s.metas.get(s.selfId)?.title ?? s.selfId, text)
    relayEnd($, `「${name}」 패널에 넣었습니다. 거기서 수락하면 처리합니다`)
  }
  await $.prompt.fill({ text: '', mode: 'replace' }).catch(() => undefined)
  await update($, appTick, n => n + 1)
}

/** 드롭다운 글 — 앞쪽이 값 칸에 보이니 [범위] · 나머지, [범위]가 겹치면 나머지 · [범위]. 고른 뒤에도 같은 글(노트 panel.md#sendCell) */
function sendName(title: string, metas: ReadonlyMap<string, SessionMeta>): string {
  const rest = bareTitle(title)
  if (rest === title) return title
  const scope = shortTitle(title)
  const isDup = [...metas.values()].filter(m => !m.isArchived && shortTitle(m.title) === scope).length > 1
  return isDup ? `${rest} · ${scope}` : `${scope} · ${rest}`
}

/** 드롭다운 목록 줄 글자 수 — 제목 전체를 읽게 */
const SEND_LONG_CELLS = 44

// 노트: register.md#relay — 드롭다운 고르기: 입력창 글의 신호만 바꾼다(쓰던 글은 그대로, 없음이면 뺌). 차례 중이면 그 차례 받는 곳을 바꾸거나 취소한다
async function pickSend($: EngineInterface, value: string): Promise<void> {
  const s = await appSelf($)
  if (!s) return
  const main = mainOf(s.selfId, s.metas, await storeLinks($))
  const to = value === SEND_MAIN ? ('id' in main ? main.id : null) : value === SEND_NONE || value === SEND_MISS ? null : value
  const word = value === SEND_MAIN ? '메인' : to ? signalWord(to, s.metas) : null
  const p = await readPending($, s.selfId)
  if (p) {
    if (!to || !word) {
      await writePending($, s.selfId, null)
      return toast($, '이 차례 끝 답은 보내지 않습니다')
    }
    return writePending($, s.selfId, { ...p, to, word, way: relayWay(s.metas.get(s.selfId)?.mode, s.metas.get(to)?.mode) })
  }
  const text = (await $.prompt.read().catch(() => null))?.text ?? ''
  if (/^\s*\/\S/.test(text)) return toast($, '슬래시 명령 글에는 신호를 넣지 않습니다')
  const filled = await $.prompt.fill({ text: withSignal(text, word), mode: 'replace' }).catch(() => ({ isFilled: false }))
  if (!filled.isFilled) toast($, '입력창에 넣지 못했습니다')
  await update($, appTick, n => n + 1)
}

// 노트: register.md#relay — 「전달」 칸에 그릴 값. 입력창 글을 그릴 때 읽는다(친 글은 3초 시계가 다시 그리게 한다).
// 목록엔 관계 세션(메인 · 연 세션 · 자식)만. 줄 글은 고른 값이 바뀌어도 그대로다 — 앱은 고르는 순간 그 글을 값 칸에 넣는다(노트 panel.md#sendCell). 그 밖 세션은 패널 찾기 · >>이름
async function sendActsOf($: EngineInterface, selfId: string, draft: string): Promise<SendActs> {
  const s = await appSelf($)
  const metas = s?.metas ?? new Map<string, SessionMeta>()
  const links = await storeLinks($)
  const p = await readPending($, selfId)
  const main = mainOf(selfId, metas, links)
  const mainId = 'id' in main ? main.id : null
  const nameOf = (id: string) => relayName(metas, id)
  const titleOf = (id: string) => metas.get(id)?.title ?? id
  const labelOf = (name: string) => sendPad(fitCells(name, SEND_LONG_CELLS))
  const rowOf = (id: string) => ({ value: id, label: labelOf(sendName(titleOf(id), metas)) })
  const near = sendTargets(selfId, withTree(metas, links), mainId, await refreshEnded($))
  const mainName = mainId ? sendName(titleOf(mainId), metas) : ''
  const rows: { value: string; label: string }[] = [
    { value: SEND_NONE, label: labelOf('없음') },
    ...(mainId ? [{ value: SEND_MAIN, label: labelOf(mainName.includes('메인') ? mainName : `메인 · ${mainName}`) }] : []),
    ...near.map(rowOf),
  ]
  const base = {
    pick: (value: string) => void pickSend($, value).catch(err => log($, `전달 고르기 실패 — ${String(err)}`)),
    textOnly: () => relayTextOnly($),
  }
  const valueOf = (id: string) => (id === mainId ? SEND_MAIN : id)
  const keepRow = (id: string) => {
    if (!rows.some(r => r.value === valueOf(id))) rows.push(rowOf(id))
    return valueOf(id)
  }
  if (p) {
    const value = keepRow(p.to)
    return { ...base, value, options: rows, state: 'on', canText: null, tip: p.way === 'card' ? `이 차례 끝 답을 「${nameOf(p.to)}」 패널에 넣습니다 · 없음을 고르면 취소` : `이 차례 끝 답을 「${nameOf(p.to)}」로 보냅니다 · 없음을 고르면 취소` }
  }
  // 슬래시 명령 글은 신호로 안 읽는다(prompt.submit 도 건너뜀)
  const sig = /^\s*\/\S/.test(draft) ? null : signalOf(draft)
  if (!sig) return { ...base, value: SEND_NONE, options: rows, state: 'idle', canText: null, tip: `${mainId ? `메인: ${nameOf(mainId)} · ` : ''}다른 세션은 입력창에 >>이름` }
  const found = findTarget(sig.word, selfId, metas, links)
  if ('miss' in found) {
    rows.push({ value: SEND_MISS, label: labelOf('못 찾음') })
    return { ...base, value: SEND_MISS, options: rows, state: 'bad', canText: null, tip: relayMissText(sig.word, found) }
  }
  const way = relayWay(metas.get(selfId)?.mode, metas.get(found.id)?.mode)
  const value = keepRow(found.id)
  return {
    ...base,
    value,
    options: rows,
    state: 'on',
    canText: sig.rest !== '',
    tip: way === 'card' ? `권한 모드가 달라 「${nameOf(found.id)}」 패널로 갑니다` : `Enter 면 끝 답을 「${nameOf(found.id)}」로 보냅니다`,
  }
}

/** 입력칸에 글을 넣는다(보내는 건 사람) — 쓰던 글이 있으면 두 줄 띄워 그 뒤에. 넣었나 */
async function fillPrompt($: EngineInterface, text: string): Promise<boolean> {
  const box = await $.prompt.read().catch(() => null)
  const hasDraft = (box?.text ?? '').trim() !== ''
  const filled = await $.prompt.fill({ text: `${hasDraft ? '\n\n' : ''}${text}`, mode: hasDraft ? 'append' : 'replace' }).catch(() => ({ isFilled: false }))
  return filled.isFilled
}

/** 고른 메시지 — 열쇠 하나 · 여럿(카드의 전체 — 그 보낸 세션 것), null 이면 전체 */
function pickHeld(items: readonly HeldReport[], keys: HeldPick): HeldReport[] {
  if (keys === null) return [...items]
  return items.filter(r => (typeof keys === 'string' ? heldKey(r) === keys : keys.includes(heldKey(r))))
}

// 노트: register.md#accept — 수락: 이 세션 차례를 연다(사람이 누른 수락이라 사람 말로 — 엔진은 쉴 때 돌린다). keys 가 null 이면 전체.
// 먼저 지우고 보낸다 — 안 들어가면(막힘 · 던짐) 되돌린다
async function acceptHeld($: EngineInterface, keys: HeldPick): Promise<void> {
  const id = await selfAppId($)
  if (!id) return
  let pick: HeldReport[] = []
  await editHeld($, id, box => {
    pick = pickHeld(box.items, keys)
    return pick.length === 0 ? null : { ...box, items: box.items.filter(r => !pick.includes(r)) }
  })
  if (pick.length === 0) return
  await update($, appTick, n => n + 1)
  if (isWorking) toast($, '답이 끝나면 처리합니다')
  const r = await $.prompt.submit({ text: heldText(pick, await $.clock.now()), asUser: true }).catch((err: unknown) => ({ drop: String(err) }))
  if (r.drop === undefined) return
  await editHeld($, id, box => ({ ...box, items: [...pick, ...box.items.filter(x => !pick.some(p => heldKey(p) === heldKey(x)))].sort((a, b) => a.at - b.at) }))
  await update($, appTick, n => n + 1)
  toast($, `보내지 못했습니다 — ${firstLine(r.drop)}`)
}

/** 거절: 처리하지 않고 지운다. keys 가 null 이면 전체 삭제, 여럿이면 카드의 전체 삭제(그 보낸 세션 것) */
async function rejectHeld($: EngineInterface, keys: HeldPick): Promise<void> {
  const id = await selfAppId($)
  if (!id) return
  await editHeld($, id, box => {
    const pick = new Set(pickHeld(box.items, keys))
    return { ...box, items: box.items.filter(r => !pick.has(r)) }
  })
  await update($, appTick, n => n + 1)
}

// ── 진행판 — 오케마다 md 하나(곁가지 물음 · 끝). 자리 · 본 줄은 자료 폴더 파일(쓰는 건 그 오케 세션뿐). 노트: register.md#board ──
async function boardFile($: EngineInterface, id: string): Promise<string> {
  return `${await dataDir($)}/boards/${id}.json`
}

/** 정한 진행판 — 없거나 경로가 빈 글이면 null(안 정함) */
async function readBoard($: EngineInterface, id: string): Promise<BoardFile | null> {
  const b = await $.fs.read(await boardFile($, id)).then(parseBoard, () => null)
  return b && b.path !== '' ? b : null
}

async function writeBoard($: EngineInterface, id: string, b: BoardFile): Promise<void> {
  await $.fs.write(await boardFile($, id), boardFileText(b))
}

/** 입력 칸에 넣은 경로를 진행판으로 — md 이고 읽혀야 한다. 지금 줄은 모두 본 줄로(새 줄 0) */
async function boardSet($: EngineInterface, path: string): Promise<void> {
  const id = await selfAppId($)
  if (!id) return
  const p = path.trim().replace(/^["']|["']$/g, '')
  if (!/\.md$/i.test(p)) {
    toast($, 'md 파일 경로를 넣어 주세요')
    return
  }
  const text = await $.fs.read(p).catch(() => null)
  if (text === null) {
    toast($, '그 파일을 못 읽었습니다')
    return
  }
  await writeBoard($, id, { path: p, seen: boardLines(text).map(boardKey) })
  await update($, panelUi, u => ({ ...u, folds: u.folds.filter(f => f !== 'board-edit') }))
  await update($, appTick, n => n + 1)
  toast($, `진행판을 ${baseName(p)}${josa(baseName(p), '으로', '로')} 정했습니다`)
}

/** 새 줄을 입력칸에 넣고(보내는 건 사람) 본 줄로 */
async function boardFill($: EngineInterface): Promise<void> {
  const id = await selfAppId($)
  const b = id ? await readBoard($, id) : null
  if (!id || !b) return
  const text = await $.fs.read(b.path).catch(() => null)
  if (text === null) {
    toast($, '진행판을 못 읽었습니다')
    return
  }
  const fresh = freshLines(text, new Set(b.seen))
  if (fresh.length === 0) return
  if (!(await fillPrompt($, [`진행판 새 줄 ${fresh.length} — ${b.path}`, ...fresh].join('\n')))) {
    toast($, '입력칸에 넣지 못했습니다')
    return
  }
  await writeBoard($, id, { ...b, seen: [...b.seen, ...fresh.map(boardKey)] })
  await update($, appTick, n => n + 1)
}

/** 이 세션(오케)이 Edit · Write 로 진행판을 고치면 그 사이 생긴 줄은 본 줄로 — 주인이 쓴 줄이 주인에게 새 줄로 안 뜨게 */
async function seenOwnEdit<R>($: EngineInterface, filePath: unknown, run: () => Promise<R>): Promise<R> {
  const id = typeof filePath === 'string' ? await selfAppId($).catch(() => null) : null
  const b = id ? await readBoard($, id).catch(() => null) : null
  if (!id || typeof filePath !== 'string') return run()
  // 노트: register.md#sessionClean — 오케 자기 진행판이 아니면 곁가지 끝 줄인지 본다(0.1.6)
  if (!b || !samePath(filePath, b.path)) return endByBoard($, id, filePath, run)
  const keysNow = async () => boardLines((await $.fs.read(b.path).catch(() => null)) ?? '').map(boardKey)
  const before = new Set(await keysNow())
  const r = await run()
  const added = (await keysNow()).filter(k => !before.has(k))
  if (added.length > 0) await writeBoard($, id, { ...b, seen: [...b.seen, ...added] }).catch(() => {})
  return r
}

// 노트: register.md#sizeGuard — 그리기 크기 안전망(0.1.5): 플러그인 쪽 어림이 이 값을 넘으면 무거운 접힘을 비운다. 어림은 그린 길이보다 2 ~ 3% 크게
// 나와(0.1.5 재기 — 0.972 ~ 0.998) 그린 길이 약 7.8만 = 그려진 적 있는 8.1만 아래(기억 reference_mod_pane_size_limit — 9.6만 거부)
const DRAW_CAP = 80_000
/** 비우는 접힘 — 메시지 본문 · ? 설명 · 진행판 새 줄 · 밑으로 붙이기 · 첫 탭 목록 나머지 · 남은 자료 목록 · advisor 이전 줄(0.1.26 — 메시지 보내기 접힘은 칸이 되어 뺌, 마지막엔 편 칸을 닫는다) */
const HEAVY_FOLDS = ['msgs:', 'held:', 'help:', 'board-lines', 'adopt', 'sibs', 'kids', 'clean-list', 'adv-more']
/** 「세션 도구」 쪽 칸마다 가르는 보낸 글(앱 도착 기록 최근 것) 수 */
const SENT_ROWS = 12

/** 그린 꼴을 엔진이 받는 꼴로 어림한 글자 수 — 누름 함수는 자리 글 40자로 센다(엔진의 press 손잡이 몫보다 조금 길게) */
function drawnSize(tree: unknown): number {
  return JSON.stringify(tree, (_k, v: unknown) => (typeof v === 'function' ? '#'.repeat(40) : v)).length
}

async function loadPanelView($: EngineInterface, pu: PanelUi): Promise<PanelView | null> {
  // 패널을 연 세션은 보관 메타까지 한 번 다 읽는다(★16 「보관 N」 — 노트 register.md#refreshApp)
  const s = await appSelf($, true)
  if (!s) return null
  const now = await $.clock.now()
  const ended = await refreshEnded($)
  const links = await storeLinks($)
  // 노트: register.md#links — 패널 나무 = 앱 관계 위에 이지 세션 기록(주인 · 인계). 앱 메타의 parent 는 앱 동작 · 보고 기준이라 따로 둔다
  const tree = withTree(s.metas, links)
  const orche = links.orche
  const pinWhy = await pinWhys($)
  // 노트: register.md#sessionClean — 「남은 자료」는 [설정]을 볼 때 10분에 한 번 센다(0.1.25 — [전체]에서 옮김) — 그리는 중엔 상태를 못 써서(엔진 「drawing is pure」) 그린 뒤 시계로, 다 세면 다시 그림
  if (pu.view === 'settings' && !cleanScan?.running && (cleanScan?.at == null || now - cleanScan.at > CLEAN_SCAN_MS)) {
    $.clock.after(1, () => void scanScratch($).catch(() => {}))
  }
  // 「이 세션」 쪽 — 같은 주인 아래 세션 · 자식(노트 meta.md#relatives)
  const near = relatives(tree, { selfId: s.selfId, now, ended, orche, pinWhy })
  const ctxK = new Map<string, number>()
  for (const r of [...near.siblings, ...near.children]) {
    if (!r.isCold || r.isArchived || ctxK.has(r.id)) continue
    const k = await reportK($, r.id, now)
    if (k !== null) ctxK.set(r.id, k)
  }
  const owner = tree.get(s.selfId)?.parent ?? null
  // 노트: panel.md#compose — 보낼 곳 줄(0.1.26 「위 세션」 · 「다른 세션」 칸): 위 세션이 앱에서 연 세션이면 「연 세션」, 사람이 정했거나 인계로 넘어왔으면 「주인」.
  // 메인은 입력창 「전달」 · `>>메인` 과 같은 셈(mainOf) — 위 세션과 같으면 「위 세션」 칸 하나에만
  const mainHit = mainOf(s.selfId, s.metas, links)
  const mainId = 'id' in mainHit ? mainHit.id : null
  const rowTitle = (id: string) => tree.get(id)?.title ?? id
  const upMeta = owner !== null ? tree.get(owner) : undefined
  const up = upMeta && !upMeta.isArchived ? { id: upMeta.id, tag: s.metas.get(s.selfId)?.parent === owner ? '연 세션' : '주인', title: upMeta.title } : null
  const mainRow = mainId !== null && mainId !== s.selfId && mainId !== up?.id ? { id: mainId, tag: '메인', title: rowTitle(mainId) } : null
  // 보낼 칸을 열었으면 그 세션 식은 값도 — 깨우는 값 카드(값이 없으면 카드 없이 그대로 보낸다 — sendGo 와 같은 값)
  const writingTo = pu.sending?.startsWith(COMPOSE_AT) ? pu.sending.slice(COMPOSE_AT.length) : pu.sending
  if (writingTo && !ctxK.has(writingTo)) {
    const m = tree.get(writingTo)
    if (m && isCold(m.lastAt, now)) {
      const k = await reportK($, writingTo, now)
      if (k !== null) ctxK.set(writingTo, k)
    }
  }
  // 노트: meta.md#roleOf — 역할(관계 줄 칩) · 메인 세션(「역할 · 인계」 메인 줄 까닭)
  const role = roleOf(s.selfId, tree, orche)
  const mainSelf = [...orche].find(id => id !== s.selfId && roleOf(id, tree, orche) === 'main') ?? null
  // 노트: panel.md#roleTool — 「서브로 — 위 고름」(0.1.26): 단독만(오케는 [오케 풀기] 뒤 — 시안의 오케 → 서브는 오케 표시를 같이 끈다), 고를 것은 오케 표시가 있는 세션
  // (메인 포함 · 이 세션 아래 빠짐 — ownerChoices 의 고리 막기)
  const upPick = role === 'solo' ? { value: links.owners.get(s.selfId) ?? APP_OWNER, choices: ownerChoices(tree, s.selfId, orche).filter(id => orche.has(id)) } : null
  const advisor = await advisorOf($)
  // 노트: register.md#detachAct — 앱은 연 세션이나 그 세션 자신만 뗄 수 있다
  const canDetach = new Set<string>()
  // 노트: panel.md#kidRow — 이 세션이 앱에서 연 세션(하위 줄 「붙임」 가름 — 그 밖 하위는 이지세션 기록으로 붙인 세션)
  const opened = new Set<string>()
  for (const m of s.metas.values()) {
    if (m.isArchived || m.parent === null) continue
    if (m.id === s.selfId || m.parent === s.selfId) canDetach.add(m.id)
    if (m.parent === s.selfId) opened.add(m.id)
  }
  const selfMeta = s.metas.get(s.selfId)!
  const usage = await $.session.usage().catch(() => null)
  const tokens = usage?.context.tokens
  const window = usage?.context.window
  return {
    selfId: s.selfId,
    now,
    metas: tree,
    ctxK,
    orche,
    role,
    mainTitle: mainSelf ? rowTitle(mainSelf) : null,
    up,
    mainRow,
    opened,
    sent: recentSent(selfMeta, tree, SENT_ROWS),
    ctxPct: typeof tokens === 'number' && typeof window === 'number' && window > 0 ? Math.round((tokens / window) * 100) : null,
    isBypass: selfMeta.mode === 'bypassPermissions',
    upPick,
    canDetach,
    heldItems: await readHeld($, s.selfId),
    accept: typeof tokens === 'number' && tokens > 0 ? { tokens, isCold: isCold(selfMeta.lastAt, now) } : null,
    board: orche.has(s.selfId) ? await boardView($, s.selfId) : null,
    boardHint: orche.has(s.selfId) ? null : await boardHint($, tree, orche, owner),
    adopt: orche.has(s.selfId) ? adoptRows(tree, s.selfId, { selfId: s.selfId, now, ended, orche, pinWhy }) : [],
    settings: {
      quick: await quickItemsOf($),
      display: displayChoice(await displayOf($)),
      advisor: advisorChoice(advisor),
      isWorking,
      autoPin: await autoPinOn($),
      autoDetach: await autoDetachOn($),
      autoUnpin: await storeOn($, AUTO_UNPIN_KEY),
      autoGroup: await storeOn($, AUTO_GROUP_KEY),
      reports: { value: (await reportDefault($)) ? 'app' : 'hold', options: REPORT_MODES },
      peerRel: await storeOn($, PEER_REL_KEY),
    },
    selfRow: familyRow(tree.get(s.selfId)!, 0, { selfId: s.selfId, now, ended, orche, pinWhy }),
    siblings: near.siblings,
    children: near.children,
    // 노트: register.md#handoff — 보관을 묻는 글(0.1.5): 앱에 붙은 자식은 같이 보관된다(앱 메타의 parent — 패널 나무가 아니라), 인계한 옛 주인만 먼저 뗀다
    selfAttached: attachedKids(s.metas, s.selfId).length,
    isHanded: links.succ.has(s.selfId),
    // 노트: register.md#sessionClean — 끝난 곁가지(0.1.6): 이 세션 나무 아래 끝남 기록이 있는 살아 있는 세션 · 정리 칸(마지막 셈)
    endedKids: endedKidsOf(tree, s.metas, ended, s.selfId),
    clean: cleanScan,
    // 노트: register.md#ultrathink — 명령 칩 ultrathink 의 넣음 꼴(0.1.7 — 입력창 위 줄과 같은 값 · 같은 길)
    ultraOn: await ultraOf($),
    // 노트: register.md#advisorTimes — 「이 세션」 advisor 칸(0.1.13)
    advisorLog: await advisorLogOf($),
    // 노트: panel.md#settings — [설정] 입력창 위 줄 미리보기(0.1.25): 입력창 위 줄과 같은 값 · [설정]을 볼 때만
    quickPreview: pu.view === 'settings' ? { q: { self: selfMeta }, acts: await quickActs($, selfMeta) } : null,
  }
}

/** 오케 「이 세션」 쪽 진행판 칸 — 경로가 없으면 path null(입력 칸), 못 읽으면 fresh null */
async function boardView($: EngineInterface, id: string): Promise<{ path: string | null; fresh: readonly string[] | null }> {
  const b = await readBoard($, id)
  if (!b) return { path: null, fresh: [] }
  const text = await $.fs.read(b.path).catch(() => null)
  return { path: b.path, fresh: text === null ? null : freshLines(text, new Set(b.seen)) }
}

/** 곁가지 「이 세션」 쪽 — 가장 가까운 위 오케의 진행판(물음 · 끝을 적을 곳) */
async function boardHint(
  $: EngineInterface,
  tree: ReadonlyMap<string, SessionMeta>,
  orche: ReadonlySet<string>,
  from: string | null,
): Promise<{ name: string; owner: string } | null> {
  const b = await upBoard($, tree, orche, from)
  return b ? { name: baseName(b.path), owner: tree.get(b.owner)?.title ?? b.owner } : null
}

/** 들이기 후보 — 이 세션 묶음 밖의 살아 있는 세션(최근 활동순) */
function adoptRows(tree: ReadonlyMap<string, SessionMeta>, selfId: string, o: Parameters<typeof familyRow>[2]) {
  const seen = new Set<string>()
  let root = selfId
  for (let at: string | null = selfId; at !== null && !seen.has(at); at = tree.get(at)?.parent ?? null) {
    seen.add(at)
    if (tree.has(at)) root = at
  }
  const mine = subtreeOf(tree, root)
  return [...tree.values()]
    .filter(m => !m.isArchived && !mine.has(m.id))
    .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0))
    .map(m => familyRow(m, 0, o))
}

async function loadQuickView($: EngineInterface): Promise<QuickView | null> {
  const s = await appSelf($)
  return s ? { self: s.metas.get(s.selfId)! } : null
}

/** 나무 묶음으로 패널을 따라 연다(같은 맨 위 세션 아래 세션끼리 — 떼어 낸 곁가지도 주인 패널을 따라 연다, 0.1.3) — msg 묶음 대신 */
async function appGroup($: EngineInterface): Promise<string | null> {
  const s = await appSelf($)
  if (!s) return null
  const tree = withTree(s.metas, await storeLinks($))
  const f = buildFamilies(tree, { selfId: s.selfId, now: await $.clock.now() }).find(x => x.isSelf)
  return f ? `app:${f.rootId}` : null
}

// 화면 — 사람이 입력창 위 줄 · 패널 설정에서 고른 값 하나(모든 세션). 처음 값 쓰지 않음(줄도 막기도 없이 앱 그대로 — 정본 9절
// 정함 5). 짐작하지 않는다 — 노트 register.md#displayLine
const DISPLAY_KEY = 'display'
const DISPLAYS = [
  { value: 'off', label: '쓰지 않음', rule: '' },
  { value: 'pc', label: 'PC', rule: '그림 · 고르기 카드 · 패널을 써도 된다.' },
  { value: 'tablet', label: '태블릿', rule: '채팅 글을 기본으로, 고르기 카드 없이. 꼭 보일 그림은 파일로 보낸다.' },
  { value: 'phone', label: '폰', rule: '채팅 글로만 — 고르기 카드 · 그림 · 패널 없이, 결정은 번호 선택지로.' },
] as const
type Display = (typeof DISPLAYS)[number]

async function displayOf($: EngineInterface): Promise<Display> {
  const v = await $.store.get(DISPLAY_KEY).catch(() => undefined)
  return DISPLAYS.find(d => d.value === v) ?? DISPLAYS[0]
}

function displayChoice(d: Display): Choice {
  return { value: d.value, options: DISPLAYS.map(x => ({ value: x.value, label: x.label })) }
}

// 노트: register.md#displayLine
async function setDisplay($: EngineInterface, value: string): Promise<void> {
  const pick = DISPLAYS.find(d => d.value === value)
  if (pick === undefined || pick.value === (await displayOf($)).value) return
  await $.store.set(DISPLAY_KEY, pick.value)
  await update($, appTick, n => n + 1)
}

/** 글마다 붙이는 줄 — 쓰지 않음이면 없다 */
function displayLine(d: Display): string | null {
  if (d.value === 'off') return null
  return `[화면] ${d.label} — 사용자가 easy-session 에서 고른 값이다. ${d.rule} 대화 기록이나 다른 훅으로 기기를 짐작하지 말고 이 줄을 따른다.`
}

// 노트: register.md#toolBlock — 화면이 태블릿 · 폰이면 막는 도구(정본 9절 정함 7). 계획 승인은 막으면 계획 모드에 갇힐 수 있어 안 막는다
const BLOCKED_TOOLS = { AskUserQuestion: '고르기 카드', mcp__visualize__show_widget: '그림 위젯' } as const

function blockText(d: Display, tool: keyof typeof BLOCKED_TOOLS): string | null {
  if (d.value !== 'tablet' && d.value !== 'phone') return null
  const what = BLOCKED_TOOLS[tool]
  const how =
    tool === 'AskUserQuestion' ? '선택지는 채팅 글에 번호로 물으세요.' : d.value === 'tablet' ? '채팅 글로 답하고, 꼭 보일 그림은 파일로 보내세요.' : '채팅 글로만 답하세요.'
  return `easy-session: 사용자가 화면을 ${d.label}${josa(d.label, '으로', '로')} 골라 ${what}${josa(what, '을', '를')} 막았습니다. ${how}`
}

// 새 자식 세션 저절로 고정 — 처음 값 끔(정본 9절 정함 11). 노트 register.md#autoPin
const AUTO_PIN_KEY = 'autoPin'

async function autoPinOn($: EngineInterface): Promise<boolean> {
  return (await $.store.get(AUTO_PIN_KEY).catch(() => undefined)) === 'on'
}

async function setAutoPin($: EngineInterface, on: boolean): Promise<void> {
  if ((await autoPinOn($)) === on) return
  await $.store.set(AUTO_PIN_KEY, on ? 'on' : 'off')
  await update($, appTick, n => n + 1)
}

// 새 자식 세션 저절로 떼어 내기 — 처음 값 끔 · 이 PC 도 끔. 노트 register.md#newChild
const AUTO_DETACH_KEY = 'autoDetach'

async function autoDetachOn($: EngineInterface): Promise<boolean> {
  return (await $.store.get(AUTO_DETACH_KEY).catch(() => undefined)) === 'on'
}

async function setAutoDetach($: EngineInterface, on: boolean): Promise<void> {
  if ((await autoDetachOn($)) === on) return
  await $.store.set(AUTO_DETACH_KEY, on ? 'on' : 'off')
  await update($, appTick, n => n + 1)
}

// 끝나면 고정 풀기 · 사이드바 그룹으로(0.1.6) — 처음 값 끔(앱 그대로 — 정본 9절 「처음 값은 엔진 그대로」), 이 PC 는 켬. 노트 register.md#sessionClean
const AUTO_UNPIN_KEY = 'autoUnpin'
const AUTO_GROUP_KEY = 'autoGroup'
// 보낸 세션 관계 알리기(0.1.20) — 처음 값 끔(앱 그대로). 노트 register.md#peerRel
const PEER_REL_KEY = 'peerRel'

async function storeOn($: EngineInterface, key: string): Promise<boolean> {
  return (await $.store.get(key).catch(() => undefined)) === 'on'
}

async function setSwitch($: EngineInterface, key: string, on: boolean): Promise<void> {
  if ((await storeOn($, key)) === on) return
  await $.store.set(key, on ? 'on' : 'off')
  await update($, appTick, n => n + 1)
}

// 노트: register.md#sessionClean — 고정 이유(0.1.6): 고정할 때마다 세션 열쇠에 적는다 — 저절로 고정 = 곁가지 · 인계 = 주인 · 패널 = 사람.
// 기록이 없는 고정(0.1.6 전 · 사이드바 손 고정)은 오케면 주인, 그 밖은 사람으로 보고 저절로 풀지 않는다(meta.md#sessionClean pinWhyOf)
const PIN_WHY_PREFIX = 'pinWhy:'

async function setPinWhy($: EngineInterface, id: string, why: PinWhy | null): Promise<void> {
  await (why === null ? $.store.delete(`${PIN_WHY_PREFIX}${id}`) : $.store.set(`${PIN_WHY_PREFIX}${id}`, why)).catch(() => {})
}

async function pinWhys($: EngineInterface): Promise<Map<string, PinWhy>> {
  const out = new Map<string, PinWhy>()
  for (const key of await $.store.keys().catch((): string[] => [])) {
    if (!key.startsWith(PIN_WHY_PREFIX)) continue
    const v = await $.store.get(key).catch(() => undefined)
    if (v === 'owner' || v === 'child' || v === 'user') out.set(key.slice(PIN_WHY_PREFIX.length), v)
  }
  return out
}

// 입력창 위 줄에 둘 것(0.1.4 — 사용자 11-03 확정): 모든 세션 값 하나(켠 것 목록), 저장값이 없으면 앞 넷만(/btw 도 끔). 노트 register.md#quickItems
const QUICK_KEY = 'quickRow'
const QUICK_START: readonly QuickItem[] = ['pin', 'ultra', 'advisor', 'send']
// 노트: register.md#quickItems — 0.1.14 에 더한 칸을 이미 저장된 목록에 한 번만 넣는다(끈 뒤엔 그대로)
const QUICK_SEND_ADDED = 'quickSendAdded'
// 노트: register.md#quickItems — 0.1.18: 화면(옛 화면)은 줄에서 뺀다(전달이 들어와 한 줄을 넘어 혼자 둘째 줄로 떨어졌다 — 사용자 「왔다갔다거림 답꼴때문에」). 한 번만, [설정]에서 다시 켤 수 있다
const QUICK_DISPLAY_OFF = 'quickDisplayOff'

async function addSendOnce($: EngineInterface): Promise<void> {
  const isSendDone = (await $.store.get(QUICK_SEND_ADDED).catch(() => undefined)) === true
  const isDisplayDone = (await $.store.get(QUICK_DISPLAY_OFF).catch(() => undefined)) === true
  if (isSendDone && isDisplayDone) return
  if (!isSendDone) await $.store.set(QUICK_SEND_ADDED, true)
  if (!isDisplayDone) await $.store.set(QUICK_DISPLAY_OFF, true)
  const v = await $.store.get(QUICK_KEY).catch(() => undefined)
  if (!Array.isArray(v)) return
  const next = QUICK_ITEMS.map(x => x.key).filter(k => (k === 'send' && !isSendDone) || (k === 'display' ? isDisplayDone && v.includes(k) : v.includes(k)))
  if (next.join() !== v.join()) await $.store.set(QUICK_KEY, next)
}

async function quickItemsOf($: EngineInterface): Promise<ReadonlySet<QuickItem>> {
  const v = await $.store.get(QUICK_KEY).catch(() => undefined)
  if (!Array.isArray(v)) return new Set(QUICK_START)
  return new Set(QUICK_ITEMS.map(x => x.key).filter(key => v.includes(key)))
}

async function setQuickItem($: EngineInterface, key: QuickItem, on: boolean): Promise<void> {
  const now = await quickItemsOf($)
  if (now.has(key) === on) return
  await $.store.set(
    QUICK_KEY,
    QUICK_ITEMS.map(x => x.key).filter(k => (k === key ? on : now.has(k))),
  )
  await update($, appTick, n => n + 1)
}

// 노트: register.md#ultrathink — 입력창 맨 앞에 넣고 보내는 건 사람(mod 가 보낼 글에 덧붙인 낱말은 엔진이 버린다) · 다시 누르면 뺀다.
// 맨 앞이 슬래시 명령이면 그 뒤에 넣는다(앞에 넣으면 명령으로 안 읽힘). 엔진 fill 은 커서를 안 받는다 — replace 는 커서를 글 끝에 둔다
const ULTRA = 'ultrathink'
/** 작업 줄 글 앞에 붙이는 말(0.1.26 — 정본 9절 ★ 「ultrathink · 」) */
const ULTRA_SPIN = 'ultrathink · '
const ULTRA_RE = /\bultrathink\b ?/i
const LEAD_SLASH = /^\/\S+/

async function ultrathinkAct($: EngineInterface): Promise<void> {
  const text = (await $.prompt.read().catch(() => null))?.text ?? ''
  const m = ULTRA_RE.exec(text)
  const next = m ? text.slice(0, m.index) + text.slice(m.index + m[0].length) : addUltra(text)
  const filled = await $.prompt.fill({ text: next, mode: 'replace' }).catch(() => ({ isFilled: false }))
  if (!filled.isFilled) toast($, '입력창에 넣지 못했습니다')
  else await update($, ultraOn, () => ULTRA_RE.test(next))
}

// 노트: register.md#ultrathink — 입력창 위 단추 꼴: 그릴 때 입력창을 읽어 낱말이 있나 본다. 못 읽으면 마지막으로 안 값(우리 넣기 · prompt.change)
async function ultraOf($: EngineInterface, draft?: { text: string } | null): Promise<boolean> {
  const known = await read($, ultraOn)
  const box = draft === undefined ? await $.prompt.read().catch(() => null) : draft
  return box ? ULTRA_RE.test(box.text) : known
}

function addUltra(text: string): string {
  const lead = LEAD_SLASH.exec(text)
  if (!lead) return `${ULTRA} ${text}`
  const at = lead[0].length
  return `${text.slice(0, at)} ${ULTRA} ${text.slice(text[at] === ' ' ? at + 1 : at)}`
}

// 노트: register.md#slashFill — /btw · /fork · /rewind 단추: 입력창 맨 앞에 넣고 보내는 건 사람(앱이 친 글처럼 받는다).
// 맨 앞 명령은 하나만 — 같은 명령을 다시 누르면 빼고, 다른 명령이면 바꿔 끼운다
const FILL_CMD_RE = /^\/(btw|fork|rewind)\b ?/

async function slashAct($: EngineInterface, cmd: SlashCmd): Promise<void> {
  const text = (await $.prompt.read().catch(() => null))?.text ?? ''
  const m = FILL_CMD_RE.exec(text)
  const head = m?.[1] === cmd ? '' : `/${cmd} `
  const filled = await $.prompt.fill({ text: head + text.slice(m ? m[0].length : 0), mode: 'replace' }).catch(() => ({ isFilled: false }))
  if (!filled.isFilled) toast($, '입력창에 넣지 못했습니다')
}

// 노트: register.md#recap — 엔진 명령을 바로 돌린다. 세션이 쉴 때 돌고 출력은 대화에 줄로 남는다(엔진 $.command.run).
// 답하는 중이면 끝난 뒤라 먼저 알린다 — 답하는 중인지는 입력창 위 띠가 받은 isWorking
let isWorking = false
// 입력창 위 띠에서 이 mod 행의 이름(AbovePrompt 의 e.plugin). 노트: register.md#quickForm
let ownRow: string | null = null

async function recapAct($: EngineInterface): Promise<void> {
  if (isWorking) toast($, '답이 끝나면 요약합니다')
  await $.command.run({ command: 'recap' }).catch((err: unknown) => toast($, `요약하지 못했습니다 — ${firstLine(String(err))}`))
}

// 노트: register.md#advisor — 모든 세션 설정. fable 은 띠 안 확인 카드부터
const ADVISORS = ['off', 'sonnet', 'opus', 'fable'] as const

async function advisorOf($: EngineInterface): Promise<string> {
  const v = await $.settings.read({ key: 'advisorModel' }).catch(() => undefined)
  if (typeof v !== 'string' || v.trim() === '') return 'off'
  const low = v.toLowerCase()
  return ADVISORS.find(a => a !== 'off' && low.includes(a)) ?? v
}

function advisorChoice(value: string): Choice {
  const options = ADVISORS.map(a => ({ value: a, label: a }))
  return { value, options: options.some(o => o.value === value) ? options : [...options, { value, label: value }] }
}

async function setAdvisor($: EngineInterface, value: string): Promise<void> {
  const now = await advisorOf($)
  if (value === 'fable' && now !== 'fable') {
    await update($, fableAsk, () => true)
    // 고르기는 앞 값으로 다시 그린다 — 카드의 [켜기] 로 바꾼다
    await update($, appTick, n => n + 1)
    return
  }
  await update($, fableAsk, () => false)
  if (value !== now) await runAdvisor($, value)
}

async function runAdvisor($: EngineInterface, value: string): Promise<void> {
  const r = await $.command.run({ command: 'advisor', args: value }).catch((err: unknown) => ({ text: `advisor 를 바꾸지 못했습니다 — ${String(err)}` }))
  if (r.text) toast($, advisorToast(r.text))
  await update($, appTick, n => n + 1)
}

// 노트: register.md#advisor — 엔진 답(영어 두 줄)을 한국어 한 줄로. 모르는 꼴이면 원문 그대로
function advisorToast(text: string): string {
  const set = /Advisor set to ([^\n]+?)\.?\s*(?:\n|$)/i.exec(text)
  const said = /Advisor disabled/i.test(text) ? 'advisor 를 껐습니다' : set ? `advisor 를 ${set[1].trim()} ${josa(set[1].trim(), '으로', '로')} 바꿨습니다` : null
  if (!said) return text
  const keeps = /current conversation keeps (.+?) as its advisor model/i.exec(text)
  const notes = [
    ...(keeps ? [`이 대화는 /clear · /compact 전까지 ${keeps[1]} 그대로`] : []),
    ...(/will not activate on the main model/i.test(text) ? ['이 세션 메인 모델엔 안 걸림 · 하위 에이전트만'] : []),
  ]
  return [said, ...notes].join(' · ')
}

/** 빠른 줄 고르기가 답하는 중에 오면 바꾸지 않는다 — 응답 중 고른 값이 첫 항목(off)으로 와 전역 advisor 가 꺼졌다(0.1.1 실측) */
function refusePick($: EngineInterface): void {
  toast($, '답이 끝난 뒤 다시 고르세요')
  void update($, appTick, n => n + 1).catch(() => {})
}

// 노트: register.md#advisorUse — 엔진 2.1.309 advisor_rank: 메인 등급이 advisor 등급 이하일 때만 메인 대화에 붙는다(못 가리면 걸린다고 본다)
const RANKS: readonly (readonly [RegExp, number])[] = [
  [/haiku/i, 4],
  [/sonnet/i, 6],
  [/opus/i, 7],
  [/fable/i, 9],
]
const rankOf = (model: string | null): number | null => (model ? (RANKS.find(([re]) => re.test(model))?.[1] ?? null) : null)

/** 조언 받은 뒤 한 번 손짓하는 동안 — 이 안에 그릴 때만 움직이는 그림(다시 그릴 때 또 돌면 새로 불린 것처럼 보여서) */
const ADV_MOTION_MS = 3000

async function advisorFile($: EngineInterface): Promise<string | null> {
  const id = await selfAppId($)
  return id ? `${await dataDir($)}/advisor/${id}.json` : null
}

// 노트: register.md#advisorUse — 판을 다시 불러와도 횟수가 이어지게 저장한 값(없거나 꼴이 다르면 0)
async function savedUse($: EngineInterface): Promise<AdvisorUse> {
  const path = await advisorFile($)
  const text = path ? await $.fs.read(path).catch(() => null) : null
  try {
    const v = (text ? JSON.parse(text) : {}) as Partial<AdvisorUse>
    return { n: typeof v.n === 'number' && Number.isFinite(v.n) ? v.n : 0, lastAt: typeof v.lastAt === 'number' ? v.lastAt : null }
  } catch {
    return { n: 0, lastAt: null }
  }
}

/** 이 세션 횟수 — 상태가 비었으면(아직 안 읽음) 저장 값. 그리는 중에도 부르니 상태는 안 바꾼다 */
async function useOf($: EngineInterface): Promise<AdvisorUse> {
  return (await read($, advisorUse)) ?? (await savedUse($))
}

// 노트: register.md#advisorUse — 응답 한 덩이가 끝난 뒤 그 안의 advisor 를 센다(하위 에이전트 포함 · 결과까지 온 것만 — endedAt).
// 메인 요청 모델도 여기서 적는다
async function noteStep(
  $: EngineInterface,
  model: string,
  agentId: string | undefined,
  uses: readonly { name: string; endedAt?: number }[] | undefined,
): Promise<void> {
  if (agentId === undefined && (await read($, mainModel)) !== model) await update($, mainModel, () => model)
  const n = (uses ?? []).filter(u => u.name === 'advisor' && typeof u.endedAt === 'number').length
  if (n === 0) return
  const base = await useOf($)
  const now = await $.clock.now()
  await update($, advisorUse, u => ({ n: (u ?? base).n + n, lastAt: now }))
  await update($, advisorTurn, () => now)
  markAdvisorDirty()
  const path = await advisorFile($)
  if (path) await $.fs.write(path, `${JSON.stringify({ v: 1, ...(await useOf($)) })}\n`).catch(() => {})
  // 손짓이 끝나면 멈춘 그림으로 다시 그린다
  $.clock.after(ADV_MOTION_MS + 100, () => {
    void update($, appTick, x => x + 1).catch(() => {})
  })
}

// 노트: register.md#advisorShare — 이지 컴팩트가 세션마다 적는 advisor 횟수 · 금액(열쇠는 엔진 세션 id). 없거나 꼴이 다르면 null(횟수만)
const ADVISOR_SHARE_DIR = 'plugins/data/advisor-use'

async function advisorShareFile($: EngineInterface): Promise<string | null> {
  const cli = await $.session.id().catch(() => null)
  return cli ? `${await claudeHome($)}/${ADVISOR_SHARE_DIR}/${cli}.json` : null
}

async function advisorShare($: EngineInterface): Promise<AdvisorShare | null> {
  const path = await advisorShareFile($)
  return path ? $.fs.read(path).then(parseAdvisorShare, () => null) : null
}

/** 입력창 위 advisor 칸의 횟수 — 이지 컴팩트 공용 파일이 있으면 그 값(결과까지 온 것 · 하위 에이전트 포함), 없으면 이 세션이 센 값. 「이 세션」 칸 머리도 이 값 */
const advisorCountOf = (use: AdvisorUse, share: AdvisorShare | null): number => share?.n ?? use.n

// 노트: register.md#advisorTimes — 「이 세션」 advisor 칸 자료. 기록을 읽은 값은 이 모듈 안에만 둔다(글 조각을 파일에 안 쓴다 — 다시 불리면 다시 읽는다).
// wants = 다음 3초 시계에 읽을 일 있음(처음 · 새 호출 뒤 · 차례 끝), retries = 줄이 늦게 써질 때 더 읽을 수, dirty = 이번 차례에 새 호출이 있었음
const advLog: { calls: readonly AdvisorCall[] | null; error: string | null; running: boolean; again: boolean; wants: boolean; retries: number; dirty: boolean } = {
  calls: null,
  error: null,
  running: false,
  again: false,
  wants: true,
  retries: 0,
  dirty: false,
}
const ADV_RETRIES = 2

/** 새 호출을 센 뒤 — 다음 시계에 다시 읽고, 차례 끝에 한 번 더(그 뒤 글 · 도구가 늘어서) */
function markAdvisorDirty(): void {
  advLog.wants = true
  advLog.dirty = true
  advLog.retries = ADV_RETRIES
}

// 노트: register.md#advisorTimes — 세션 기록에서 호출 시점을 읽는다(tools/advisor-times.mjs). 여기로 들어오는 것은 도구가 낸 시각 · 토큰 · 글 조각뿐이다
async function readAdvisorTimes($: EngineInterface): Promise<void> {
  if (advLog.running) {
    advLog.again = true
    return
  }
  const cli = await $.session.id().catch(() => null)
  if (!cli) return
  advLog.running = true
  advLog.wants = false
  try {
    const ran = await $.process.run(['node', `${$.plugin.root}/tools/advisor-times.mjs`, `${await claudeHome($)}/projects`, cli], { timeoutMs: 120_000 })
    if (ran.exitCode !== 0) throw new Error(`exit ${ran.exitCode} ${firstLine(String(ran.stderr ?? ''))}`)
    const calls = parseAdvisorCalls(String(ran.stdout ?? ''))
    if (calls === null) throw new Error('도구 출력을 못 읽음')
    advLog.calls = calls
    advLog.error = null
    // 줄이 늦게 써지면 입력창 위 칸보다 적게 읽힌다 — 다음 시계에 다시(횟수만큼 — 이 값이 끝내 다른 세션도 있다, 그때는 칸에 적어 둔다)
    if (advLog.retries > 0 && calls.length < advisorCountOf(await useOf($), await advisorShare($))) {
      advLog.retries -= 1
      advLog.wants = true
    }
  } catch (err) {
    advLog.error = firstLine(String(err))
    log($, `advisor 기록 읽기 실패 — ${advLog.error}`)
  }
  advLog.running = false
  await update($, appTick, n => n + 1)
  if (advLog.again) {
    advLog.again = false
    await readAdvisorTimes($)
  }
}

// 노트: register.md#advisorTimes — 3초 시계가 부른다: 읽을 일이 있고(wants) 패널 「어드바이저」 칸을 펴 두었고 불린 적이 있을 때만. 시계마다 읽지 않는다
async function kickAdvisorTimes($: EngineInterface): Promise<void> {
  if (!advLog.wants || advLog.running || !(await read($, isOpen))) return
  // 첫 탭이 아닌 쪽은 [설정]뿐(0.1.25 — 옛 값 'all' 은 첫 탭으로 그린다) · 칸은 「어드바이저」만(0.1.26 — 다른 칸엔 호출 줄이 없다)
  const pu = await read($, panelUi)
  if (pu.view === 'settings' || (pu.tool ?? TOOL_START) !== 'adv') return
  if (advisorCountOf(await useOf($), await advisorShare($)) <= 0) return
  await readAdvisorTimes($)
}

/** 패널 칸 값 — 그리는 중에 부른다(읽기만) */
async function advisorLogOf($: EngineInterface): Promise<AdvisorLog | null> {
  const share = await advisorShare($)
  const count = advisorCountOf(await useOf($), share)
  if (count <= 0) return null
  const usd = share ? ` · $${share.usd.toFixed(2)}(이지 컴팩트 셈)` : ''
  return { count, tip: `이 세션에서 ${count}번 불림(하위 에이전트 포함)${usd}`, calls: advLog.calls, error: advLog.error, isFresh: !advLog.wants && !advLog.running }
}

// 노트: register.md#advisorUse — 드롭다운 뒤 그림: 꺼짐이면 없음, 이 세션 메인에 안 걸리면 잠든 그림, 지금 메인 차례에 불렸으면 손짓 그림.
// 이지 컴팩트 공용 파일이 있으면 횟수도 그 값 · 금액을 붙인다
async function advisorMarkOf($: EngineInterface, value: string, self: SessionMeta | null): Promise<AdvisorMark | null> {
  if (value === 'off') return null
  const use = await useOf($)
  const share = await advisorShare($)
  const count = advisorCountOf(use, share)
  const turnAt = await read($, advisorTurn)
  const main = (await read($, mainModel)) ?? self?.model ?? null
  const adv = rankOf(value)
  const m = rankOf(main)
  const applies = adv === null || m === null || m <= adv
  const now = await $.clock.now()
  const pose: AdvisorPose = !applies ? 'sleep' : turnAt !== null ? 'adv' : 'on'
  const lastAt = use.lastAt ?? (share && share.at > 0 ? share.at : null)
  const usd = share ? ` · $${share.usd.toFixed(2)}(이지 컴팩트 셈)` : ''
  const used = count > 0 ? `이 세션에서 ${count}번 불림(하위 에이전트 포함)${usd} · ${agoText(lastAt, now)}` : '이 세션에서 아직 안 불림'
  const tip = applies ? `advisor 켜짐 · ${used}` : `이 세션 메인 모델이 더 세서 메인엔 안 걸림 · 하위 에이전트는 부를 수 있음${count > 0 ? ` · ${used}` : ''}`
  return { pose, count, usd: share?.usd ?? null, tip, isMoving: pose === 'adv' && turnAt !== null && now - turnAt < ADV_MOTION_MS }
}

function fableActs($: EngineInterface): FableActs {
  return {
    confirm: async () => {
      await update($, fableAsk, () => false)
      await runAdvisor($, 'fable')
    },
    dismiss: async () => {
      await update($, fableAsk, () => false)
    },
  }
}

// 노트: register.md#plan — 5시간 · 7일 창이 오면 구독, 응답이 있었는데 없으면 토큰마다 요금, 첫 응답 전엔 모든 세션의 마지막 판정
const PLAN_KEY = 'plan'
const SUB_WINDOWS: readonly string[] = ['five_hour', 'seven_day']

const hasSubWindow = (limits: readonly { kind: string }[]): boolean => limits.some(r => SUB_WINDOWS.includes(r.kind))

/** 측정에서 갈래를 적는다 — 구독 창을 한 번 보면 리셋돼 빠져도 구독으로 둔다 */
async function notePlan($: EngineInterface, limits: readonly { kind: string }[], tokens: number | undefined): Promise<void> {
  const seen = await read($, plan)
  const kind: PlanKind | null = hasSubWindow(limits) ? 'sub' : (tokens ?? 0) > 0 && seen !== 'sub' ? 'rate' : null
  if (kind === null || kind === seen) return
  await update($, plan, () => kind)
  const stored: StoredPlan = { kind, at: await $.clock.now() }
  await $.store.set(PLAN_KEY, stored).catch(() => {})
}

/** 카드 글을 고를 갈래 — 그리는 중이라 읽기만 한다(적기는 session.measure) */
async function planOf($: EngineInterface): Promise<PlanKind | null> {
  const seen = await read($, plan)
  if (seen) return seen
  const u = await $.session.usage().catch(() => null)
  if (u && hasSubWindow(u.rateLimits)) return 'sub'
  if (u && (u.context.tokens ?? 0) > 0) return 'rate'
  const v = (await $.store.get(PLAN_KEY).catch(() => undefined)) as Partial<StoredPlan> | undefined
  return v?.kind === 'sub' || v?.kind === 'rate' ? v.kind : null
}

function toast($: EngineInterface, text: string): void {
  try {
    $.ui.toast(text)
  } catch {
    // 알림을 못 띄우는 곳(시험 등)
  }
}

// ── 앱 동작 — bypass 세션이면 mod 가 앱 도구를 바로, 아니면 지시 글을 입력칸에(정본 10절 「모드 따라 가름」) — 노트: register.md#appAct ──

async function callApp($: EngineInterface, server: string, tool: string, args: Record<string, unknown>): Promise<{ ok: boolean; text: string }> {
  try {
    const r = await $.mcp.call(server, tool, args)
    return { ok: !r.isError, text: r.content.map(c => ('text' in c && typeof c.text === 'string' ? c.text : '')).join('\n') }
  } catch (err) {
    return { ok: false, text: String(err) }
  }
}

/** 이 세션 권한 모드가 bypass 인가 — 누를 때 앱 메타로 읽는다(세션 중에 바뀔 수 있음) */
async function isBypass($: EngineInterface): Promise<boolean> {
  const s = await appSelf($)
  return s?.metas.get(s.selfId)?.mode === 'bypassPermissions'
}

/** 지시 글 속 세션 이름과 목적격 조사 — 이 세션이면 「이 세션을」, 아니면 「「제목」(`local_…`)을」 */
function askName(id: string, selfId: string | null): { name: string; eul: string } {
  if (id === selfId) return { name: '이 세션', eul: '을' }
  const title = app.files.get(id)?.meta?.title ?? id
  return { name: `「${title}」(\`${id}\`)`, eul: josa(title, '을', '를') }
}

const firstLine = (text: string): string => fitCells(text.split('\n')[0] ?? '', 60)

/** 입력칸 지시 글 단추의 결과 — 넣음 · 뺌(다시 누름) · 못 함 */
type AskResult = 'filled' | 'removed' | 'failed'

// 노트: register.md#askToggle — 지시 글을 입력칸에 넣고 알린다(보내는 건 사람, 처리는 모델 · 앱 도구). said 는 알림 앞에 붙일 말.
// ultrathink 처럼 같은 글이 이미 입력칸에 있으면 그 글(과 넣을 때 앞에 띄운 줄)만 빼고 쓰던 글은 남긴다(0.1.10 — 사용자 11-04)
async function ask($: EngineInterface, text: string, said = ''): Promise<AskResult> {
  const cur = (await $.prompt.read().catch(() => null))?.text ?? ''
  const at = cur.indexOf(text)
  if (at >= 0) {
    const next = `${cur.slice(0, at).replace(/\n{1,2}$/, '')}${cur.slice(at + text.length)}`
    const out = await $.prompt.fill({ text: next, mode: 'replace' }).catch(() => ({ isFilled: false }))
    toast($, `${said}${out.isFilled ? '입력칸에서 뺐습니다' : '입력칸에서 빼지 못했습니다'}`)
    return out.isFilled ? 'removed' : 'failed'
  }
  const isFilled = await fillPrompt($, text)
  toast($, `${said}${isFilled ? '입력칸에 넣었습니다 — 보내면 처리합니다 · 다시 누르면 뺍니다' : '입력칸에 넣지 못했습니다'}`)
  return isFilled ? 'filled' : 'failed'
}

/** 앱 동작 하나 — bypass 면 바로 부르고 결과를 알린다, 아니면 지시 글. 바로 해냈나 */
async function appAct(
  $: EngineInterface,
  a: { ask: string; server: string; tool: string; args: Record<string, unknown>; done: string },
  said = '',
): Promise<boolean> {
  if (!(await isBypass($))) {
    await ask($, a.ask, said)
    return false
  }
  const r = await callApp($, a.server, a.tool, a.args)
  toast($, `${said}${r.ok ? a.done : `안 됐습니다 — ${firstLine(r.text)}`}`)
  return r.ok
}

const appSid = (id: string, selfId: string | null): string => (id === selfId ? 'self' : id)

/** 앱 메타가 바뀌었으면 바로 다시 그린다 — 앱이 메타 파일을 늦게 쓰면 3초 타이머가 잡는다 */
const redraw = ($: EngineInterface): Promise<void> => bumpTick($).catch(() => {})

async function pinAct($: EngineInterface, id: string, on: boolean, said = ''): Promise<void> {
  const selfId = await selfAppId($)
  const n = askName(id, selfId)
  const ok = await appAct(
    $,
    {
      ask: on ? `${n.name}${n.eul} 사이드바에 고정해 주세요.` : `${n.name}의 사이드바 고정을 풀어 주세요.`,
      server: 'ccd_sidebar',
      tool: 'set_pinned',
      args: { session_id: appSid(id, selfId), pinned: on },
      done: on ? '고정했습니다' : '고정을 풀었습니다',
    },
    said,
  )
  // 노트: register.md#sessionClean — 패널에서 사람이 붙인 고정은 「사람」(저절로 안 풂), 풀면 이유도 지운다
  if (ok) await setPinWhy($, id, on ? 'user' : null)
  await redraw($)
}

/** 끝내기 = 끝남 기록(easy-session 몫 — 모드와 무관하게 바로) + 고정 풀기(앱 동작). 끝남 풀기는 기록만 되돌린다 */
async function finishAct($: EngineInterface, id: string, on: boolean): Promise<void> {
  await $.fs.write(`${await dataDir($)}/sessions/${id}.json`, `${JSON.stringify({ ended: on, summary: '', by: 'user', at: await $.clock.now() })}\n`)
  await update($, panelUi, u => ({ ...u, open: null }))
  const said = on ? '끝남으로 표시했습니다' : '끝남을 풀었습니다'
  if (on && app.files.get(id)?.meta?.isStarred) await pinAct($, id, false, `${said} · `)
  else {
    toast($, said)
    await redraw($)
  }
}

/** 그 세션이 지금 화면(창 · 나눈 칸 · 따로 띄운 창)에 열려 있나 — 못 읽으면 열린 것으로 친다(보관을 막는 쪽) */
async function isOnScreen($: EngineInterface, id: string): Promise<boolean> {
  const r = await callApp($, 'ccd_window', 'get_window_layout', {})
  return !r.ok || r.text.includes(id)
}

/** 보관 · 보관 풀기 — 고정된 세션은 앱이 보관을 막아 먼저 풀고(★), 다른 세션이 화면에 열려 있으면 안 한다(정본 10절) */
async function archiveAct($: EngineInterface, id: string, on: boolean): Promise<void> {
  const selfId = await selfAppId($)
  const n = askName(id, selfId)
  if (!on) {
    await appAct($, { ask: `${n.name}의 보관을 풀어 주세요.`, server: 'ccd_session_mgmt', tool: 'unarchive_session', args: { session_id: id }, done: '보관을 풀었습니다' })
    await redraw($)
    return
  }
  const isSelf = id === selfId
  const isStarred = app.files.get(id)?.meta?.isStarred === true
  const links = await storeLinks($)
  // 노트: register.md#handoff — 인계한 옛 주인을 보관할 때만 붙은 자식을 먼저 뗀다(같이 보관되지 않게 — 사용자 20:3x)
  const isHanded = isSelf && links.succ.has(id)
  if (!(await isBypass($))) {
    const where = isSelf ? '' : '(화면에 열려 있으면 하지 않음)'
    const first = '붙은 세션을 먼저 떼어 낸 뒤(detach_session)'
    const what = isHanded
      ? `${n.name}에 ${first} ${isStarred ? '고정을 풀고 ' : ''}보관해 주세요`
      : isStarred
        ? `${n.name}의 고정을 풀고 보관해 주세요`
        : `${n.name}${n.eul} 보관해 주세요`
    await ask($, `${what}${where}.`)
    return
  }
  if (!isSelf && (await isOnScreen($, id))) {
    toast($, '화면에 열려 있어 보관하지 않았습니다')
    return
  }
  if (isHanded) {
    const failed = await detachKids($, id)
    if (failed > 0) {
      toast($, `붙은 세션 ${failed}개를 못 떼어 보관하지 않았습니다`)
      return
    }
  } else if (!isSelf && selfId && links.succ.get(id) === selfId) {
    const why = await leaveOldOwner($, id, selfId)
    if (why) {
      toast($, why)
      return
    }
  }
  if (isStarred) {
    const r = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: appSid(id, selfId), pinned: false })
    if (!r.ok) {
      toast($, `고정을 못 풀어 보관하지 않았습니다 — ${firstLine(r.text)}`)
      return
    }
  }
  await update($, panelUi, u => ({ ...u, open: null }))
  const r = await callApp($, 'ccd_session_mgmt', 'archive_session', { session_id: appSid(id, selfId), reason: 'easy-session 패널에서 보관' })
  toast($, r.ok ? '보관했습니다' : `안 됐습니다 — ${firstLine(r.text)}`)
  await redraw($)
}

// 노트: register.md#handoff — 뒤 주인이 옛 주인을 보관하기 전(패널 [보관] · Claude 의 보관 도구 둘 다): 앱은 자기만 떼게 한다(`"self"`).
// 다른 붙은 세션이 있으면 같이 쓸려 가니 막는다. 막을 까닭 글, 보관해도 되면 null
async function leaveOldOwner($: EngineInterface, oldId: string, selfId: string): Promise<string | null> {
  const kids = attachedKids(await refreshApp($), oldId)
  const others = kids.filter(k => k !== selfId)
  if (others.length > 0) return `옛 주인에게 붙은 세션 ${others.length}개가 같이 보관됩니다 — 옛 주인 패널에서 보관하세요`
  if (!kids.includes(selfId)) return null
  const r = await callApp($, 'ccd_session_mgmt', 'detach_session', { session_id: 'self' })
  return r.ok ? null : `이 세션을 못 떼어 보관하지 않았습니다 — ${firstLine(r.text)}`
}

async function remoteOffAct($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfAppId($)
  const n = askName(id, selfId)
  await appAct($, {
    ask: `${n.name}의 원격 연결을 꺼 주세요.`,
    server: 'ccd_session_mgmt',
    tool: 'set_remote_control',
    args: { session_id: appSid(id, selfId), enabled: false },
    done: '원격을 껐습니다',
  })
  await update($, panelUi, u => ({ ...u, remote: null }))
}

/** 내보내기 — 앱 세션 메뉴 Export 와 같다(앱 도구 export_transcript: 다운로드 폴더에 zip, 한 시간 6번까지) */
async function exportAct($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfAppId($)
  const n = askName(id, selfId)
  if (!(await isBypass($))) {
    await ask($, `${n.name}의 대화를 내보내 주세요.`)
    return
  }
  const r = await callApp($, 'ccd_session_mgmt', 'export_transcript', { session_id: appSid(id, selfId) })
  const file = /[^\\/\s"']+\.zip/i.exec(r.text)?.[0]
  toast($, r.ok ? `다운로드 폴더에 저장했습니다${file ? ` · ${file}` : ''}` : `안 됐습니다 — ${firstLine(r.text)}`)
}

/** ⋯ 메뉴를 열 때 · 「이 세션」 쪽을 볼 때 그 세션 원격이 켜졌나 본다 — 켜졌을 때만 「원격 끄기」(정본 9절 정함 6). 못 읽으면 안 띄운다 */
async function checkRemote($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfAppId($)
  const r = await callApp($, 'ccd_session_mgmt', 'get_session', { session_id: appSid(id, selfId) })
  if (!r.ok || !/"remoteControl(?:Active"\s*:\s*true|State"\s*:\s*"on")/.test(r.text)) return
  await update($, panelUi, u => (u.open === id || ((u.view ?? 'self') === 'self' && u.open === null && id === selfId) ? { ...u, remote: id } : u))
}

/** 보내기 — bypass 면 앱 세션 채널로 바로(보관된 세션은 풀고 — 정본 11절 ★9), 아니면 SendMessage 지시 글 */
async function sendAct($: EngineInterface, id: string, text: string): Promise<void> {
  const selfId = await selfAppId($)
  const meta = (await refreshApp($)).get(id)
  const n = askName(id, selfId)
  const clear = () => update($, panelUi, u => ({ ...u, sending: null, card: null, draft: '' }))
  if (!(await isBypass($))) {
    if ((await ask($, meta?.isArchived ? `${n.name}의 보관을 풀고 SendMessage 로 보내 주세요:\n\n${text}` : `${n.name}에 SendMessage 로 보내 주세요:\n\n${text}`)) === 'filled') await clear()
    return
  }
  if (meta?.isArchived) {
    const r = await callApp($, 'ccd_session_mgmt', 'unarchive_session', { session_id: id })
    if (!r.ok) {
      toast($, `보관을 못 풀어 보내지 않았습니다 — ${firstLine(r.text)}`)
      return
    }
  }
  const sent = await $.session.send({ to: id, text }).catch((err: unknown) => ({ isDelivered: false as const, reason: String(err) }))
  if (!sent.isDelivered) {
    toast($, `보내지 못했습니다 — ${firstLine(sent.reason)}`)
    return
  }
  toast($, `「${shortTitle(meta?.title ?? id)}」에 보냈습니다`)
  await clear()
  await redraw($)
}

const LOCAL_ID = /local_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

const asObj = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

const jsonOf = (text: string): Record<string, unknown> | null => {
  try {
    return asObj(JSON.parse(text))
  } catch {
    return null
  }
}

type Kid = { id: string; group: string | null; title: string | null }

/** 결과 글의 id 가운데 이 세션이 연 · 아직 안 뗀 세션 — 앱에 묻는다(되돌릴 수 없는 떼기 · 뒤 주인 기록 전에). 못 물으면 null */
async function verifyKid($: EngineInterface, ids: readonly string[], selfId: string): Promise<Kid | null> {
  for (const id of ids) {
    const r = await callApp($, 'ccd_session_mgmt', 'get_session', { session_id: id })
    const j = r.ok ? jsonOf(r.text) : null
    if (!j || j.parentSessionId !== selfId || j.detached === true) continue
    const group = asObj(j.group)
    return { id, group: typeof group?.id === 'string' ? group.id : null, title: typeof j.title === 'string' ? j.title : null }
  }
  return null
}

/** 인계 대기를 꺼낸다 — 한 번만(꺼내면 지움) · 30분 안 · 이 세션 몫 */
async function takeHandoff($: EngineInterface, selfId: string): Promise<boolean> {
  const key = `${HANDOFF_PREFIX}${selfId}`
  const v = asObj(await $.store.get(key).catch(() => undefined))
  if (v === null) return false
  await $.store.delete(key).catch(() => {})
  return typeof v.at === 'number' && (await $.clock.now()) - v.at < HANDOFF_MS
}

// 노트: register.md#handoff — 새 세션이 옛 세션 자리를 이어받는다: 뒤 주인 기록 · 오케 · 진행판 옮김 · 고정 옮김(bypass) · 고정 이유.
// 떼기는 하지 않는다 — 붙은 채라 옛 세션 그룹을 물려받고, 떼기는 옛 세션을 보관할 때(archiveAct · archive_session 훅).
// 부르는 쪽은 옛 세션(세션 열기 결과 훅) 또는 새 세션(처음 켤 때 — takeOverAsKid) — 앱 도구엔 부르는 세션 자신만 "self"
async function takeOver($: EngineInterface, oldId: string, kid: Kid, bypass: boolean, callerId: string = oldId): Promise<void> {
  await $.store.set(`${SUCC_PREFIX}${oldId}`, kid.id)
  if ((await $.store.get(`${ORCHE_PREFIX}${oldId}`).catch(() => undefined)) === true) {
    await $.store.set(`${ORCHE_PREFIX}${kid.id}`, true)
    await $.store.delete(`${ORCHE_PREFIX}${oldId}`)
  }
  const b = await readBoard($, oldId)
  if (b) {
    await writeBoard($, kid.id, b)
    await writeBoard($, oldId, { path: '', seen: [] })
  }
  let pin = ' · 고정은 bypass 세션에서만 됩니다 — 사이드바에서 옮겨 주세요'
  if (bypass) {
    const a = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: appSid(kid.id, callerId), pinned: true })
    const c = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: appSid(oldId, callerId), pinned: false })
    pin = a.ok && c.ok ? ' · 고정을 옮겼습니다' : ' · 고정은 못 옮겼습니다'
    if (a.ok) await setPinWhy($, kid.id, 'owner')
    if (c.ok) await setPinWhy($, oldId, null)
  }
  const name = shortTitle(kid.title ?? kid.id)
  toast($, callerId === oldId ? `인계: 「${name}」${josa(name, '이', '가')} 이 세션 자리를 이어받았습니다${pin}` : `인계: 이 세션이 앞 차수 자리를 이어받았습니다${pin}`)
  await update($, appTick, n => n + 1)
}

/** 새 세션 제목이 이 세션의 다음 차수인가 — 인계 */
function isHandoffTitle(oldTitle: string | null | undefined, newTitle: string | null | undefined): boolean {
  return typeof oldTitle === 'string' && typeof newTitle === 'string' && isNextOrdinal(oldTitle, newTitle)
}

// 노트: register.md#handoff — 새 세션 쪽 이어받기(0.1.6): 나중에 누른 제안 카드 · hand_off 로 열려 연 세션 훅이 결과를 못 받은 길.
// 켤 때마다 보지만 하는 것은 한 번 — 앱 부모가 살아 있고, 이 세션 제목이 그 다음 차수이고, 아직 뒤 주인이 없을 때만(연 세션 훅이 먼저 했으면 그대로)
async function takeOverAsKid($: EngineInterface): Promise<void> {
  const selfId = await selfAppId($)
  if (!selfId) return
  const metas = await refreshApp($)
  const me = metas.get(selfId)
  const oldId = me?.parent ?? null
  const old = oldId ? metas.get(oldId) : undefined
  if (!me || !oldId || !old || old.isArchived || !isHandoffTitle(old.title, me.title)) return
  if ((await $.store.get(`${SUCC_PREFIX}${oldId}`).catch(() => undefined)) !== undefined) return
  await takeOver($, oldId, { id: selfId, group: null, title: me.title }, await isBypass($), selfId)
}

// 노트: register.md#newChild — 이 세션이 연 새 세션: 제목이 다음 차수면(또는 0.1.5 단추 표시가 남았으면) 이어받기, 저절로 떼어 내기(설정)면
// 확인 → 떼기 → 원래 그룹 → 고정, 저절로 고정만이면 고정 → 고정 이유 「곁가지」, 그다음 사이드바 그룹으로(설정)
async function newChild($: EngineInterface, text: string): Promise<void> {
  const selfId = await selfAppId($)
  if (!selfId) return
  // 결과 글의 「session_id: local_…」 를 먼저 — 글에 다른 세션 id 가 섞여도(연결 목록 등) 그쪽을 안 집게
  const named = /session_id:\s*(local_[0-9a-f-]{36})/.exec(text)?.[1]
  const ids = [...new Set([...(named ? [named] : []), ...(text.match(LOCAL_ID) ?? [])])].filter(x => x !== selfId)
  if (ids.length === 0) return
  const bypass = await isBypass($)
  // 인계를 알아보려면 새 세션 제목이 있어야 해서 늘 앱에 묻는다(세션 하나에 한 번 — 떼기 확인과 같은 부름)
  const kid = await verifyKid($, ids, selfId)
  const marked = await takeHandoff($, selfId)
  const handoff = marked || isHandoffTitle((await refreshApp($)).get(selfId)?.title, kid?.title)
  if (handoff) {
    await takeOver($, selfId, kid ?? { id: ids[0]!, group: null, title: null }, bypass)
    return
  }
  const detach = await autoDetachOn($)
  const pin = await autoPinOn($)
  if (!detach && !pin) {
    if (kid) await groupTree($, selfId, [kid.id])
    return
  }
  if (!bypass) {
    const what = detach ? '떼어 내기' : '고정'
    toast($, `새 자식 세션 저절로 ${what}${josa(what, '은', '는')} bypass 세션에서만 됩니다`)
    return
  }
  if (detach && !kid) toast($, '새 자식 세션을 떼어 내지 않았습니다 — 이 세션이 연 세션인지 확인하지 못했습니다')
  if (detach && kid) {
    const d = await callApp($, 'ccd_session_mgmt', 'detach_session', { session_id: kid.id })
    if (!d.ok) toast($, `새 자식 세션을 떼어 내지 못했습니다 — ${firstLine(d.text)}`)
    else if (kid.group) {
      // 떼면 그룹이 빠진다 — 원래 그룹에 되돌린다(그룹에 넣으면 고정이 풀려 고정은 그 뒤 — 11-03 20:09 잼)
      const g = await callApp($, 'ccd_sidebar', 'move_sessions', { session_ids: [kid.id], group_id: kid.group })
      if (!g.ok) toast($, `떼어 낸 세션을 원래 그룹에 못 넣었습니다 — ${firstLine(g.text)}`)
    }
  }
  if (pin) {
    const r = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: kid?.id ?? ids[0]!, pinned: true })
    if (!r.ok) toast($, `새 자식 세션을 고정하지 못했습니다 — ${firstLine(r.text)}`)
    else await setPinWhy($, kid?.id ?? ids[0]!, 'child')
  }
  if (kid) await groupTree($, selfId, [kid.id])
}

// ── 사이드바 그룹으로(0.1.6 — 사용자 11-04 02:1x 「주인 그룹 + 없으면 만듦」). 노트: register.md#sessionClean ─────────────────
type SideInfo = { group: string | null; pinned: boolean; title: string }

async function sideInfo($: EngineInterface, id: string, selfId: string | null): Promise<SideInfo | null> {
  const r = await callApp($, 'ccd_session_mgmt', 'get_session', { session_id: appSid(id, selfId) })
  const j = r.ok ? jsonOf(r.text) : null
  if (!j) return null
  const g = asObj(j.group)
  return { group: typeof g?.id === 'string' ? g.id : null, pinned: j.pinned === true, title: typeof j.title === 'string' ? j.title : '' }
}

/** 이름이 같은 그룹이 있으면 그 id, 없으면 만든다 — 못 하면 null */
async function groupNamed($: EngineInterface, name: string): Promise<string | null> {
  const list = await callApp($, 'ccd_sidebar', 'list_groups', {})
  const groups = list.ok ? ((): unknown[] => { try { return JSON.parse(list.text) as unknown[] } catch { return [] } })() : []
  for (const g of groups) {
    const o = asObj(g)
    if (o && o.name === name && typeof o.id === 'string') return o.id
  }
  const made = await callApp($, 'ccd_sidebar', 'create_group', { name })
  return made.ok ? (/cg-[0-9a-f-]{36}/.exec(made.text)?.[0] ?? null) : null
}

/** 그룹에 넣는다 — 앱이 고정을 풀어서(도구 설명) 고정돼 있던 세션은 넣은 뒤 다시 고정한다 */
async function fileInto($: EngineInterface, ids: readonly string[], group: string, pinned: ReadonlySet<string>, selfId: string | null): Promise<void> {
  if (ids.length === 0) return
  const r = await callApp($, 'ccd_sidebar', 'move_sessions', { session_ids: ids.map(id => appSid(id, selfId)), group_id: group })
  if (!r.ok) {
    toast($, `사이드바 그룹에 못 넣었습니다 — ${firstLine(r.text)}`)
    return
  }
  for (const id of ids) if (pinned.has(id)) await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: appSid(id, selfId), pinned: true })
}

// 노트: register.md#sessionClean — 나무 세션을 주인 그룹으로: 주인에게 그룹이 없으면 제목 [범위] 이름 그룹을 만들어 주인부터 넣는다.
// 다른 그룹에 둔 세션(사람이 넣은 주제 그룹)은 안 옮긴다 — 그룹 없는 세션만. 설정이 켜졌고 bypass 세션일 때만(앱 동작)
// 기준은 나무 뿌리(패널 나무로 가장 위 살아 있는 세션) — 곁가지가 자식을 열어도 곁가지 이름 그룹을 만들지 않는다(0.1.6 출고 뒤 advisor 가 잡음:
// 그룹 없는 메인 오케 나무의 곁가지 「[관리 프로그램 칸 내용] …」가 자식을 열면 그 이름 그룹이 생겨 나무가 갈라질 뻔했다)
async function groupTree($: EngineInterface, ownerId: string, ids: readonly string[]): Promise<void> {
  if (!(await storeOn($, AUTO_GROUP_KEY)) || !(await isBypass($))) return
  const selfId = await selfAppId($)
  const s = await appSelf($)
  const tree = s ? withTree(s.metas, await storeLinks($)) : new Map<string, SessionMeta>()
  let root = ownerId
  const seen = new Set([ownerId])
  for (let at = tree.get(ownerId)?.parent ?? null; at !== null && !seen.has(at) && tree.has(at); at = tree.get(at)?.parent ?? null) {
    seen.add(at)
    if (tree.get(at)?.isArchived !== true) root = at
  }
  const top = await sideInfo($, root, selfId)
  if (!top) return
  const move: string[] = []
  const pinned = new Set<string>()
  let group = top.group
  let members = [ownerId, ...ids]
  if (group === null) {
    // 뿌리에 그룹이 없으면 뿌리 [범위] 이름 그룹을 찾거나 만들어 뿌리 · 그 나무의 그룹 없는 살아 있는 세션을 다 넣는다(나무가 갈라지지 않게)
    const name = scopeOf(top.title)
    group = name ? await groupNamed($, name) : null
    if (group === null) return
    move.push(root)
    if (top.pinned) pinned.add(root)
    members = [...members, ...[...subtreeOf(tree, root)].filter(id => tree.get(id)?.isArchived !== true)]
  }
  for (const id of new Set(members)) {
    if (id === root) continue
    const info = await sideInfo($, id, selfId)
    if (!info || info.group !== null) continue
    move.push(id)
    if (info.pinned) pinned.add(id)
  }
  await fileInto($, move, group, pinned, selfId)
}

/** 떼기 전에 잰 그룹 · 고정으로 되돌린다 — 떼면 그룹이 빠진다(11-03 20:09 잼). 설정이 켜졌을 때만 */
async function regroupDetached($: EngineInterface, before: ReadonlyMap<string, SideInfo>): Promise<void> {
  if (!(await storeOn($, AUTO_GROUP_KEY))) return
  const selfId = await selfAppId($)
  const byGroup = new Map<string, string[]>()
  for (const [id, s] of before) if (s.group !== null) byGroup.set(s.group, [...(byGroup.get(s.group) ?? []), id])
  const pinned = new Set([...before].filter(([, s]) => s.pinned).map(([id]) => id))
  for (const [group, ids] of byGroup) await fileInto($, ids, group, pinned, selfId)
}

/** 스위치를 켤 때 한 번 — 이 세션 나무(이 세션이 주인인 묶음)를 그룹으로 */
async function groupOwnTree($: EngineInterface): Promise<void> {
  const s = await appSelf($)
  if (!s) return
  const tree = withTree(s.metas, await storeLinks($))
  const ids = [...subtreeOf(tree, s.selfId)].filter(id => id !== s.selfId && tree.get(id)?.isArchived !== true)
  await groupTree($, s.selfId, ids)
}

// ── 세션 정리(0.1.6 — 사용자 11-04 02:1x 「끝 신호 = 진행판 끝 줄」 · 「정리 = 보관 세션 몫 + 실측 자료」). 노트: register.md#sessionClean ──

/** 끝난 곁가지 — 이 세션 나무 아래(패널 나무) 끝남 기록이 있는 살아 있는 세션, 늦게 끝난 차례. attached = 보관하면 같이 보관될 붙은 세션 수 */
function endedKidsOf(tree: ReadonlyMap<string, SessionMeta>, metas: ReadonlyMap<string, SessionMeta>, ended: ReadonlyMap<string, EndRecord>, selfId: string): EndedKid[] {
  const out: EndedKid[] = []
  for (const id of subtreeOf(tree, selfId)) {
    const m = tree.get(id)
    const e = ended.get(id)
    if (id === selfId || !m || m.isArchived || e?.ended !== true) continue
    out.push({ id, title: m.title, summary: e.summary, at: e.at, attached: attachedKids(metas, id).length })
  }
  return out.sort((a, b) => b.at - a.at)
}

/** 이 세션 위(패널 나무)에서 가장 가까운 오케의 진행판 */
async function upBoard($: EngineInterface, tree: ReadonlyMap<string, SessionMeta>, orche: ReadonlySet<string>, from: string | null): Promise<{ path: string; owner: string } | null> {
  const seen = new Set<string>()
  for (let at = from; at !== null && !seen.has(at); at = tree.get(at)?.parent ?? null) {
    seen.add(at)
    if (!orche.has(at)) continue
    const b = await readBoard($, at)
    if (b) return { path: b.path, owner: at }
  }
  return null
}

// 노트: register.md#sessionClean — 끝 신호: 곁가지가 위 오케 진행판에 「끝:」 줄을 쓰면(Edit · Write) 이 세션을 끝남으로 적고, 「끝나면 고정 풀기」가
// 켜졌고 저절로 붙인 고정(곁가지)이면 푼다(bypass). 주인은 안 깨운다 — 주인 패널은 다음에 그릴 때 할 일 「끝난 곁가지」에 띄운다
async function endByBoard<R>($: EngineInterface, selfId: string, filePath: string, run: () => Promise<R>): Promise<R> {
  if (!/\.md$/i.test(filePath)) return run()
  const s = await appSelf($).catch(() => null)
  const links = s ? await storeLinks($).catch(() => null) : null
  if (!s || !links) return run()
  const tree = withTree(s.metas, links)
  const up = await upBoard($, tree, links.orche, tree.get(selfId)?.parent ?? null).catch(() => null)
  if (!up || !samePath(filePath, up.path)) return run()
  const lines = async () => boardLines((await $.fs.read(up.path).catch(() => null)) ?? '')
  const before = new Set((await lines()).map(boardKey))
  const r = await run()
  const end = (await lines())
    .filter(l => !before.has(boardKey(l)))
    .map(endLineOf)
    .find(x => x !== null)
  if (end) await endSelf($, selfId, end.text).catch(err => log($, `끝 줄 처리 실패 — ${String(err)}`))
  return r
}

async function endSelf($: EngineInterface, selfId: string, summary: string): Promise<void> {
  if (!(await refreshEnded($)).get(selfId)) {
    await $.fs.write(`${await dataDir($)}/sessions/${selfId}.json`, `${JSON.stringify({ ended: true, summary: [...summary].slice(0, 160).join(''), by: 'self', at: await $.clock.now() })}\n`)
  }
  let said = '진행판 끝 줄로 끝남을 적었습니다'
  if ((await storeOn($, AUTO_UNPIN_KEY)) && (await pinWhys($)).get(selfId) === 'child' && (await isBypass($))) {
    const r = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: 'self', pinned: false })
    if (r.ok) {
      await setPinWhy($, selfId, null)
      said += ' · 저절로 붙인 고정을 풀었습니다'
    }
  }
  toast($, said)
  await update($, appTick, n => n + 1)
}

// 노트: register.md#sessionClean — 정리 글(11-02 정리 흐름 2단계): 정본 · 커밋 · 잠금 · 임시 md · 진행판 끝 줄. 보관은 안 함(주인 · 사람 몫)
const CLEAN_ASK = [
  '이 세션을 정리해 주세요(easy-session 「정리」 단추).',
  '① 정본 맨 위 「지금 상태」 · 「인계」를 지금대로 고칩니다.',
  '② 안 한 커밋은 경로를 붙여 커밋하고, 쥔 잠금을 풉니다.',
  '③ 이 세션이 만든 임시 md 가 있으면, 정본 · 노트가 가리키지 않는 것을 끝 줄에 적습니다(지우지 않음). 스크래치는 보관 뒤 easy-session 이 휴지통으로 옮깁니다.',
  '④ 진행판이 있으면 맨 위에 끝 줄 「- MM-DD [세션 이름] 끝: 한 일 · 남은 것」을 씁니다 — easy-session 이 끝남으로 적고 저절로 붙인 고정을 풉니다.',
  '⑤ 보관은 하지 않습니다 — 주인이나 사용자가 합니다.',
].join('\n')

// 노트: register.md#sessionClean — 메인 · 오케 [정리] 글 앞 세 줄(0.1.26 — 정본 9절 「시안 5.1 확정」 ② · 「「정리 · 보고」 꼴 정함」: 끝낼 때 차례 = 정리 글이 맡음, 권하기만 · 실행은 줄마다 단추).
// 시안 글의 「(>>위)」는 아직 없는 신호라 「보고 꼴 다섯 칸」으로 풀어 씀
const CLEAN_TOP = [
  'ⓐ 하위 세션 — 「하위 세션」 칸의 줄을 보고, 끝난 세션은 일 합치기 · 보관을, 오래 쉰 세션은 정리 부탁 · 끝내기를 줄마다 권합니다(실행은 줄마다 단추로).',
  'ⓑ 일 — 진행판 · 정본의 닫힌 물음을 정리하고 남은 결정을 한 줄로 모읍니다.',
  'ⓒ 보고 — 위 세션이 있으면 위로, 없으면 사용자에게 보고 꼴 다섯 칸(끝난 것 · 하는 중 · 막힌 것 · 기다리는 결정 · 다음)으로 씁니다.',
]

/** 이 세션 역할(패널 나무 · 오케 표시로 — meta.md#roleOf) */
async function selfRole($: EngineInterface): Promise<{ selfId: string; role: SessionRole; up: string | null; tree: Map<string, SessionMeta> } | null> {
  const s = await appSelf($)
  if (!s) return null
  const links = await storeLinks($)
  const tree = withTree(s.metas, links)
  const up = tree.get(s.selfId)?.parent ?? null
  return { selfId: s.selfId, role: roleOf(s.selfId, tree, links.orche), up: up !== null && tree.get(up)?.isArchived === false ? up : null, tree }
}

/** 세션 관리 [정리] = 이 세션 입력칸에 정리 글(메인 · 오케면 앞에 세 줄), 하위 줄 ⋯ 「정리 부탁」 = 그 세션에 보낼 칸을 정리 글로 채워 연다(보내기 · 깨우는 값 카드는 보내기 그대로) */
async function cleanAct($: EngineInterface, id: string): Promise<AskResult | null> {
  if (id === (await selfAppId($))) {
    const r = await selfRole($)
    const [head, ...rest] = CLEAN_ASK.split('\n')
    return ask($, r && (r.role === 'main' || r.role === 'orche') ? [head, ...CLEAN_TOP, ...rest].join('\n') : CLEAN_ASK)
  }
  await update($, panelUi, u => ({ ...u, open: null, sending: id, card: null, draft: CLEAN_ASK }))
  return null
}

// 노트: register.md#sessionClean — 일 합치기(0.1.26 — 정본 9절 결정 6 「합치기 = 일 합치기」: 한 세션의 끝 줄 · 만든 문서를 다른 세션에 넘기고 그 세션은 끝냄 · 보관).
// 하위 줄 ⋯ [일 합치기] = 그 하위 보낼 칸을 이 글로 채워 연다(정리 부탁과 같은 길 — 보내는 건 사람). 보관은 위 세션이 그 줄 [보관]으로
const MERGE_ASK = [
  '하던 일을 위 세션에 넘기고 끝내 주세요(easy-session 「일 합치기」).',
  '① 끝 줄 — 한 일 · 남은 것을 한 줄로 씁니다.',
  '② 만든 문서 · 바뀐 파일 경로를 적습니다 — 안 한 커밋은 경로를 붙여 커밋합니다.',
  '③ ①과 ②를 답으로 씁니다 — 위 세션이 받아 이어 갑니다.',
  '④ 진행판이 있으면 맨 위에 끝 줄 「- MM-DD [세션 이름] 끝: 한 일 · 남은 것」을 씁니다 — easy-session 이 끝남으로 적습니다.',
  '⑤ 보관은 하지 않습니다 — 위 세션이 그 줄 [보관]으로 합니다.',
].join('\n')

async function mergeAct($: EngineInterface, id: string): Promise<void> {
  await update($, panelUi, u => ({ ...u, open: null, sending: id, card: null, draft: MERGE_ASK }))
}

// 노트: register.md#reportForm — 보고 꼴로(0.1.26 — 정본 9절 「시안 5.1 확정」 ② 보고 꼴 다섯 칸 · Claude 안): 입력칸에 다섯 칸 보고 글. 위 세션이 있으면 끝에 그 세션 전달 신호
// (`>>낱말` — 입력창 「전달」과 같은 길: 보내면 차례 끝 답이 위로 간다), 위가 없으면(메인 · 맨 위 오케) 사용자에게 채팅으로. 다시 누르면 뺀다(ask 의 같은 글 찾기)
const REPORT_LINES = [
  '① 끝난 것 — 커밋 · 경로와 함께',
  '② 하는 중 — 지금 단계 · 다음 단계',
  '③ 막힌 것 — 무엇 때문인지 · 누가 풀 수 있는지',
  '④ 기다리는 결정 — 물음 하나씩, ★ 가 있으면 함께',
  '⑤ 다음 — 이 세션이 할 일 · 위가 할 일',
  '칸마다 한두 줄, 없으면 「없음」.',
]

async function reportAct($: EngineInterface): Promise<void> {
  const r = await selfRole($)
  if (!r) return
  if (r.role === 'solo') {
    toast($, '위 세션이 없어 보고 꼴은 쓰지 않습니다')
    return
  }
  const upTitle = r.up ? (r.tree.get(r.up)?.title ?? r.up) : null
  const head = upTitle
    ? `지금까지를 정해진 꼴로 보고해 주세요(easy-session 「보고 꼴로」). 받는 곳: 위 「${shortTitle(upTitle)}」 — 이 차례 끝 답을 easy-session 이 보냅니다.`
    : '지금까지를 정해진 꼴로 보고해 주세요(easy-session 「보고 꼴로」). 받는 곳: 사용자(이 채팅).'
  const body = [head, ...REPORT_LINES].join('\n')
  // 신호는 글 맨 앞이나 맨 끝이어야 읽힌다(meta.md#signalOf) — 쓰던 글 뒤에 이어 붙이므로 끝 줄에 둔다(withSignal 은 앞에 붙여 쓰던 글이 있으면 가운데 낀다)
  await ask($, r.up ? `${body}\n>>${signalWord(r.up, r.tree)}` : body)
}

// 노트: register.md#sessionClean — 제목 정리(0.1.26 — 시안 5.1 「현재 세션」 · 정본 9절 결정 7 「제목 = 역할 표지 없이 꼴만」): 이 세션 제목을 역할 꼴로. 자기 제목이라 어느 모드든 Claude 가 앱 도구로 바꾼다
const TITLE_FORM: Record<SessionRole, string> = {
  main: '「[범위] 원래 제목 N차 — 묶음」',
  orche: '「[범위] 원래 제목 N차 — 묶음」',
  sub: '「[범위] 하는 일」 — [범위]는 위 오케의 것',
  solo: '정한 꼴 없음 — 하는 일이 드러나게 짧게',
}

async function titleTidyAct($: EngineInterface): Promise<void> {
  const r = await selfRole($)
  if (!r) return
  await ask(
    $,
    [
      '이 세션 제목을 역할 꼴로 다듬어 주세요(easy-session 「제목 정리」).',
      `꼴: ${TITLE_FORM[r.role]}. 메인 · 오케 같은 역할 표지는 제목에 넣지 않습니다.`,
      '바꾼 제목은 set_session_title 로 씁니다 — 이미 꼴에 맞으면 그대로 둡니다.',
    ].join('\n'),
  )
}

/** Remote Control 켜기(0.1.26 — 「현재 세션」 칸, 끄기와 같은 길) */
async function remoteOnAct($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfAppId($)
  const n = askName(id, selfId)
  const ok = await appAct($, {
    ask: `${n.name}의 Remote Control 을 켜 주세요.`,
    server: 'ccd_session_mgmt',
    tool: 'set_remote_control',
    args: { session_id: appSid(id, selfId), enabled: true },
    done: 'Remote Control 을 켰습니다',
  })
  if (ok) await update($, panelUi, u => ({ ...u, remote: id }))
}

// 노트: register.md#archiveAll — [모두 보관](0.1.26 — 정본 9절 「시안 5.1 확정」 ②): bypass 만 한 번에 — 창 배치를 한 번 묻고 화면에 열린 세션은 건너뛰고, 고정은 풀고 보관,
// 알림은 한 줄(보관 N · 건너뜀 K · 못 함 F). auto 면 패널에 단추가 없고(지시 글 하나에 보관이 여럿 들어가 판정기가 뒤엣것을 막을 수 있다), 눌러도 줄마다 하라고 알린다
async function archiveAllAct($: EngineInterface, ids: readonly string[]): Promise<void> {
  if (!(await isBypass($))) {
    toast($, 'auto 세션은 보관을 줄마다 합니다 — 지시 글 하나에 보관 하나')
    return
  }
  const selfId = await selfAppId($)
  const layout = await callApp($, 'ccd_window', 'get_window_layout', {})
  let done = 0
  let skipped = 0
  let failed = 0
  for (const id of ids) {
    // 못 읽으면 열린 것으로 친다(보관을 막는 쪽 — isOnScreen 과 같음)
    if (id === selfId || !layout.ok || layout.text.includes(id)) {
      skipped++
      continue
    }
    if (app.files.get(id)?.meta?.isStarred === true) {
      const r = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: id, pinned: false })
      if (!r.ok) {
        failed++
        continue
      }
    }
    const r = await callApp($, 'ccd_session_mgmt', 'archive_session', { session_id: id, reason: 'easy-session 패널에서 보관' })
    if (r.ok) done++
    else failed++
  }
  await update($, panelUi, u => ({ ...u, open: null }))
  toast($, `끝남 ${ids.length} 가운데 ${done} 보관${skipped > 0 ? ` · 화면에 열려 있어 건너뜀 ${skipped}` : ''}${failed > 0 ? ` · 못 함 ${failed}` : ''}`)
  await redraw($)
}

/** [설정] 「정리」 칸의 남은 자료 — 마지막 셈. [설정]을 볼 때 10분에 한 번 센다(파일 4만 개 · 이 PC 3.6초라 그릴 때마다는 안 셈 — 0.1.25 에 [전체]에서 옮김) */
let cleanScan: CleanScan | null = null
const CLEAN_SCAN_MS = 10 * 60_000

// 노트: register.md#sessionClean — 보관된 세션 스크래치 목록(읽기만): 앱 메타로 보관 여부를 보고, md 가 그 폴더 id 를 가리키면 뺀다(tools/clean-scratch.mjs)
async function scanScratch($: EngineInterface): Promise<void> {
  if (cleanScan?.running) return
  const now = await $.clock.now()
  cleanScan = { at: cleanScan?.at ?? null, running: true, items: cleanScan?.items ?? [], bytes: cleanScan?.bytes ?? 0, keepLive: 0, keepRef: 0, error: null }
  await update($, appTick, n => n + 1)
  try {
    const s = await appSelf($)
    const metaDir = s ? await findAppSessions($, s.selfId) : null
    if (!s || !metaDir) throw new Error('앱 세션 자료를 못 찾음')
    const roots = [await claudeHome($), ...new Set([...s.metas.values()].filter(m => !m.isArchived && m.cwd).map(m => m.cwd!))]
    const ran = await $.process.run(['node', `${$.plugin.root}/tools/clean-scratch.mjs`, metaDir, ...roots], { timeoutMs: 120_000 })
    if (ran.exitCode !== 0) throw new Error(`exit ${ran.exitCode} ${firstLine(String(ran.stderr ?? ''))}`)
    const out = asObj(JSON.parse(String(ran.stdout ?? ''))) ?? {}
    const items = (Array.isArray(out.items) ? out.items : []).map(asObj).filter((x): x is Record<string, unknown> => x !== null)
    cleanScan = {
      at: now,
      running: false,
      items: items.map(x => ({ path: String(x.path), title: String(x.title ?? ''), bytes: Number(x.bytes) || 0, days: Number(x.days) || 0 })),
      bytes: Number(out.bytes) || 0,
      keepLive: Number(out.keepLive) || 0,
      keepRef: Number(out.keepRef) || 0,
      error: null,
    }
  } catch (err) {
    cleanScan = { at: now, running: false, items: [], bytes: 0, keepLive: 0, keepRef: 0, error: firstLine(String(err)) }
  }
  await update($, appTick, n => n + 1)
}

// 노트: register.md#sessionClean — 휴지통으로(묻는 카드 뒤): 목록 파일 → tools/recycle.mjs(PowerShell 을 부름 — 휴지통이 받을 수 있을 때만: 바로 지움 꺼짐 · 최대 크기가 합보다 큼)
async function recycleScratch($: EngineInterface): Promise<void> {
  const items = cleanScan?.items ?? []
  if (items.length === 0 || cleanScan?.moving) return
  cleanScan = { ...cleanScan!, moving: true }
  await update($, appTick, n => n + 1)
  const dir = `${await dataDir($)}/clean`
  await $.fs.write(`${dir}/list.txt`, `${items.map(i => i.path).join('\n')}\n`)
  const ran = await $.process
    .run(['node', `${$.plugin.root}/tools/recycle.mjs`, `${dir}/list.txt`, `${dir}/log.txt`], { timeoutMs: 600_000 })
    .catch((err: unknown) => ({ exitCode: 1, stdout: '', stderr: String(err) }))
  const out = String(ran.stdout ?? '')
  const done = /recycled=(\d+) failed=(\d+) already_gone=(\d+)/.exec(out)
  // recycle.mjs 는 영문 코드만 낸다(PowerShell 5.1 표준 출력은 코드 페이지라 한글이 깨짐) — 까닭 글은 여기서
  const refused = /refused=(\S+)(?: used=(\d+) max=(\d+) need=(\d+))?/.exec(out)
  const why =
    refused?.[1] === 'nuke'
      ? '휴지통이 「바로 지움」으로 설정돼 있습니다'
      : refused?.[1] === 'full'
        ? `휴지통에 이미 ${refused[2]}MB 가 있어 ${refused[4]}MB 를 더하면 최대 크기(${refused[3]}MB)를 넘습니다 — 넘으면 옛 항목이 영구히 지워집니다`
        : refused?.[1] === 'os'
          ? '휴지통 옮기기는 Windows 에서만 됩니다'
          : '휴지통 설정을 못 읽었습니다'
  if (refused) toast($, `휴지통으로 옮기지 않았습니다 — ${why}`)
  else if (done) toast($, `휴지통으로 옮겼습니다 — ${done[1]}개${Number(done[2]) > 0 ? ` · 못 옮긴 것 ${done[2]}개(쓰는 중일 수 있음)` : ''}`)
  else toast($, `휴지통으로 옮기지 못했습니다 — ${firstLine(out || String(ran.stderr ?? ''))}`)
  cleanScan = { ...cleanScan!, moving: false }
  await scanScratch($)
}

/** 앱이 그 세션에 붙여 둔 살아 있는 자식(보관하면 같이 쓸려 가는 것) */
function attachedKids(metas: ReadonlyMap<string, SessionMeta>, id: string): string[] {
  return [...metas.values()].filter(m => m.parent === id && !m.isArchived).map(m => m.id)
}

/** 이 세션에 붙은 살아 있는 자식을 다 뗀다(bypass) — 못 뗀 수. 떼면 그룹이 빠져서 뗀 뒤 원래 그룹 · 고정으로 되돌린다(설정 — 0.1.6) */
async function detachKids($: EngineInterface, selfId: string): Promise<number> {
  let failed = 0
  const kids = attachedKids(await refreshApp($), selfId)
  const before = new Map<string, SideInfo>()
  if (await storeOn($, AUTO_GROUP_KEY)) {
    for (const kid of kids) {
      const s = await sideInfo($, kid, selfId)
      if (s) before.set(kid, s)
    }
  }
  const done = new Map<string, SideInfo>()
  for (const kid of kids) {
    if (!(await callApp($, 'ccd_session_mgmt', 'detach_session', { session_id: kid })).ok) failed++
    else if (before.has(kid)) done.set(kid, before.get(kid)!)
  }
  await regroupDetached($, done)
  return failed
}

// 노트: register.md#detachAct — ⋯ 「떼어 내기」: 앱은 연 세션이나 그 세션 자신만 뗄 수 있다(보이는 것도 그때만 — canDetach). 되돌릴 수 없다
async function detachAct($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfAppId($)
  const n = askName(id, selfId)
  await appAct($, {
    ask: id === selfId ? '이 세션을 맨 위로 떼어 내 주세요(detach_session "self").' : `${n.name}${n.eul} 떼어 내 주세요(detach_session).`,
    server: 'ccd_session_mgmt',
    tool: 'detach_session',
    args: { session_id: appSid(id, selfId) },
    done: id === selfId ? '떼어 냈습니다 — 연 세션에 보고가 더는 안 갑니다' : '떼어 냈습니다 — 그 세션 보고가 더는 안 옵니다',
  })
  await update($, panelUi, u => ({ ...u, open: null }))
  await redraw($)
}

// 노트: register.md#links — 주인 바꾸기 · 들이기: 저장소만(앱 관계 · 앱 보고는 그대로). 고리가 생기면 안 바꾼다
async function setOwnerAct($: EngineInterface, id: string, value: string): Promise<boolean> {
  const key = `${OWNER_PREFIX}${id}`
  if (value === APP_OWNER) await $.store.delete(key)
  else if (value === TOP) await $.store.set(key, TOP)
  else {
    const s = await appSelf($)
    const tree = s ? withTree(s.metas, await storeLinks($)) : new Map<string, SessionMeta>()
    if (value === id || subtreeOf(tree, id).has(value)) {
      toast($, '고리가 생겨 주인을 안 바꿨습니다')
      return false
    }
    await $.store.set(key, value)
  }
  await update($, appTick, n => n + 1)
  return true
}

async function adoptAct($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfAppId($)
  if (!selfId) return
  if (await setOwnerAct($, id, selfId)) {
    await groupTree($, selfId, [id])
    toast($, `「${shortTitle(app.files.get(id)?.meta?.title ?? id)}」${josa(shortTitle(app.files.get(id)?.meta?.title ?? id), '을', '를')} 이 세션 밑으로 붙였습니다`)
  }
}

async function orcheAct($: EngineInterface, id: string, on: boolean): Promise<void> {
  if (on) await $.store.set(`${ORCHE_PREFIX}${id}`, true)
  else await $.store.delete(`${ORCHE_PREFIX}${id}`)
  await update($, appTick, n => n + 1)
  // 노트: register.md#sessionClean — 오케로 정하면 그 나무를 사이드바 그룹으로(설정 — 0.1.6)
  if (on && id === (await selfAppId($))) await groupOwnTree($)
}

// 노트: register.md#handoff — 인계 단추: 입력칸에 지시 글만(0.1.6 — 표시 없음). 세션 열기는 사람 글 차례에서만 돼서(2절) 사람이 보내고 모델이
// 채팅 카드(offer)를 띄운다. 나무는 새 세션 제목이 다음 차수면 넘어간다
const HANDOFF_ASK = [
  '이 세션을 인계해 주세요(easy-session 「인계」 단추).',
  '① 정본 맨 위 「지금 상태」 · 「인계」를 지금대로 고치고 커밋합니다.',
  '② 채팅에 새 세션 카드를 띄웁니다 — start_session(initiation "offer"), 제목은 이 세션의 다음 차수 「[범위] 원래 제목 N+1차 — 다음 묶음」. 사용자가 새 세션을 고르면 할 일은 정본 맨 위부터 읽고 잇기로 씁니다.',
  '③ 나무는 easy-session 이 넘깁니다 — 제목이 다음 차수면 새 세션 고정 · 이 세션 고정 풀기 · 곁가지 · 오케 표시 · 진행판.',
  '④ 이 세션 보관은 사용자 말 뒤에 합니다. 사이드바에서 보관하면 붙은 새 세션까지 같이 보관되니, 이 세션 패널 [보관]이나 Claude 에게 말로 합니다(붙은 세션을 먼저 떼어 남깁니다).',
].join('\n')

async function handoffAct($: EngineInterface): Promise<void> {
  if (await selfAppId($)) await ask($, HANDOFF_ASK)
}

async function goApp($: EngineInterface, id: string): Promise<void> {
  const title = app.files.get(id)?.meta?.title ?? id
  await go($, { alias: id, label: title, sessionId: id, isDone: false })
}

/** 보내기 누름 — 식은 세션이고 컴팩트가 싸면 깨우는 값 카드부터 */
async function sendGo($: EngineInterface, id: string, text: string): Promise<void> {
  if (!text.trim()) return
  const now = await $.clock.now()
  const meta = app.files.get(id)?.meta ?? null
  const k = await reportK($, id, now)
  // 카드의 [그대로 보내기]가 쓸 글 — Enter 값에만 끝 글자까지 든다(앱 입력 칸은 한글 조합 중엔 안 알린다, 노트 panel.md#find)
  if (meta && isCold(meta.lastAt, now) && compactWins(k ?? undefined)) await update($, panelUi, u => ({ ...u, card: id, draft: text }))
  else await sendAct($, id, text)
}

// 노트: register.md#sizeGuard — 접힘 열고 닫기: 누른 것만 바꾼다. 한 번에 하나만 남기는 것은 메시지 본문(held: — 크기)
function toggleFold(folds: readonly string[], key: string): string[] {
  if (folds.includes(key)) return folds.filter(f => f !== key)
  const only = ['held:'].find(p => key.startsWith(p))
  return [...(only ? folds.filter(f => !f.startsWith(only)) : folds), key]
}

function panelActs($: EngineInterface): PanelActs {
  const set = (fn: (u: PanelUi) => PanelUi) => void update($, panelUi, fn)
  return {
    view: async to => {
      await update($, panelUi, u => ({ ...u, view: to, open: null, remote: null, ask: null }))
      const id = await selfAppId($)
      if (to === 'self' && id) await checkRemote($, id)
    },
    // 노트: register.md#toolPick — 도구판 칸 고르기(0.1.26): 편 칸 하나 · 바꾸면 줄 손질 · 보낼 칸 · 깨우는 값 카드 · 묻는 글을 닫는다. 「현재 세션」은 원격이 켜졌나 보고,
    // 「어드바이저」는 기록을 바로 읽는다(설치판 어드바이저 칸을 펼 때와 같음)
    tool: k => {
      void (async () => {
        await update($, panelUi, u => (u.tool === k ? u : { ...u, tool: k, open: null, sending: null, card: null, ask: null }))
        const id = await selfAppId($)
        if (k === 'mgr' && id) await checkRemote($, id)
        if (k === 'adv' && advisorCountOf(await useOf($), await advisorShare($)) > 0) await readAdvisorTimes($)
      })().catch(err => log($, `칸 고르기 실패 — ${String(err)}`))
    },
    go: id => goApp($, id),
    more: async id => {
      const isOpening = (await read($, panelUi)).open !== id
      await update($, panelUi, u => ({ ...u, open: isOpening ? id : null, remote: null }))
      if (isOpening) await checkRemote($, id)
    },
    send: at => set(u => ({ ...u, sending: u.sending === at ? null : at, card: null })),
    draft: text => set(u => ({ ...u, draft: text })),
    sendGo: (id, text) => void sendGo($, id, text),
    sendCancel: () => set(u => ({ ...u, sending: null, card: null })),
    cardOpen: id => {
      set(u => ({ ...u, card: null }))
      void goApp($, id)
    },
    cardSend: async id => sendAct($, id, (await read($, panelUi)).draft),
    cardCancel: () => set(u => ({ ...u, card: null })),
    // on 을 주면 그 값으로(이미 그렇면 그대로). 묻던 카드는 칸을 바꿀 때 닫는다(tool — 0.1.26)
    fold: (key, on) => set(u => ({ ...u, folds: on === undefined || u.folds.includes(key) !== on ? toggleFold(u.folds, key) : u.folds })),
    ask: what => set(u => ({ ...u, ask: what })),
    pin: (id, on) => pinAct($, id, on),
    finish: (id, on) => finishAct($, id, on),
    archive: (id, on) => archiveAct($, id, on),
    remoteOff: id => remoteOffAct($, id),
    remoteOn: id => remoteOnAct($, id),
    accept: keys => acceptHeld($, keys),
    reject: keys => rejectHeld($, keys),
    setOwner: (id, value) => void setOwnerAct($, id, value),
    orche: (id, on) => orcheAct($, id, on),
    detach: id => detachAct($, id),
    adopt: id => adoptAct($, id),
    handoff: () => handoffAct($),
    boardSet: path => void boardSet($, path),
    boardFill: () => boardFill($),
    pickDisplay: value => void setDisplay($, value),
    pickQuick: (key, on) => void setQuickItem($, key, on),
    pickAdvisor: value => (isWorking ? refusePick($) : void setAdvisor($, value)),
    pickAutoPin: on => void setAutoPin($, on),
    pickAutoDetach: on => void setAutoDetach($, on),
    pickPeerRel: on => void setSwitch($, PEER_REL_KEY, on),
    pickAutoUnpin: on => void setSwitch($, AUTO_UNPIN_KEY, on),
    pickAutoGroup: on => void setSwitch($, AUTO_GROUP_KEY, on).then(() => (on ? groupOwnTree($) : undefined)),
    // 노트: register.md#sessionClean — 정리 · 끝난 곁가지 모두 보관 · 남은 자료 세기 · 휴지통으로(0.1.6)
    clean: async id => {
      const r = await cleanAct($, id)
      // 누른 자리에 「넣었습니다」 한 줄 — 20초 뒤 거둔다(접힘 값이라 다시 열어도 안 남게). 다시 눌러 뺐으면 바로 거둔다(0.1.10)
      if (r === 'filled') {
        await update($, panelUi, u => ({ ...u, folds: [...u.folds.filter(f => f !== 'clean-hint'), 'clean-hint'] }))
        $.clock.after(20_000, () => void update($, panelUi, u => ({ ...u, folds: u.folds.filter(f => f !== 'clean-hint') })).catch(() => {}))
      } else if (r === 'removed') await update($, panelUi, u => ({ ...u, folds: u.folds.filter(f => f !== 'clean-hint') }))
    },
    archiveAll: ids => archiveAllAct($, ids),
    merge: id => mergeAct($, id),
    report: () => reportAct($),
    titleTidy: () => titleTidyAct($),
    cleanScan: () => scanScratch($),
    cleanMove: () => recycleScratch($),
    pickReports: value => void setReportMode($, value),
    ultrathink: () => ultrathinkAct($),
    slash: cmd => slashAct($, cmd),
    recap: () => recapAct($),
    exportSession: id => exportAct($, id),
  }
}

async function quickActs($: EngineInterface, self: SessionMeta): Promise<QuickActs> {
  const advisor = await advisorOf($)
  // 그리는 중 앱을 오가는 입력창 읽기는 한 번만(노트 register.md#ultrathink 함정 후보)
  const box = await $.prompt.read().catch(() => null)
  const items = await quickItemsOf($)
  return {
    pin: async () => {
      const s = await appSelf($)
      if (s) await pinAct($, s.selfId, s.metas.get(s.selfId)?.isStarred !== true)
    },
    pane: { isShown: await wantsPane($), toggle: () => togglePane($) },
    display: { ...displayChoice(await displayOf($)), pick: value => (isWorking ? refusePick($) : void setDisplay($, value)) },
    ultrathink: () => ultrathinkAct($),
    ultraOn: await ultraOf($, box),
    items,
    // 이 칸을 못 읽어도 띠 전체는 그린다
    send: items.has('send') ? await sendActsOf($, self.id, box?.text ?? '').catch(err => (log($, `전달 칸 읽기 실패 — ${String(err)}`), null)) : null,
    slash: cmd => slashAct($, cmd),
    recap: () => recapAct($),
    exportSession: () => exportAct($, self.id),
    advisor: { ...advisorChoice(advisor), pick: value => (isWorking ? refusePick($) : void setAdvisor($, value)), mark: await advisorMarkOf($, advisor, self) },
    isWorking,
  }
}

// 노트: register.md#bumpTick
let lastSig = ''

/** 앱 메타 · 끝남 기록이 바뀌었거나 분이 넘어가면 appTick 을 올려 그리는 쪽을 다시 그리게 한다 */
async function bumpTick($: EngineInterface): Promise<void> {
  const selfId = await selfAppId($)
  if (!selfId) return
  // 창에 안 띄운 세션은 그릴 것이 없어 건너뛴다 — 창에 붙으면 그리면서 새로 읽는다(0.1.3 물음 ⑥). 못 물으면 그대로 돈다
  const surfaces = await $.session.surfaces().catch(() => null)
  if (surfaces !== null && surfaces.length === 0) return
  // 노트: register.md#advisorTimes — 읽을 일이 있을 때만 기록을 읽는다(기다리지 않음 — 큰 기록은 몇 초)
  void kickAdvisorTimes($).catch(err => log($, `advisor 기록 읽기 실패 — ${String(err)}`))
  // 노트: register.md#takeFromQueue — 못 받아도 표시는 돈다(다음 3초에 다시)
  await takeFromQueue($, selfId, await refreshApp($)).catch(err => log($, `앱 대기 칸 받기 실패 — ${String(err)}`))
  // 노트: meta.md#outbox — 다른 세션이 이 세션 앞으로 내보낸 글을 할 일에
  await takeOutboxCards($, selfId).catch(err => log($, `내보낸 칸 받기 실패 — ${String(err)}`))
  await refreshEnded($)
  await heldCounts($)
  let sig = String(Math.floor((await $.clock.now()) / 60_000))
  for (const [id, f] of app.files) sig += `|${id}:${f.mtimeMs}`
  for (const [id, f] of app.ended) sig += `|e${id}:${f.mtimeMs}`
  for (const [id, f] of heldCache) sig += `|h${id}:${f.mtimeMs}`
  // advisor 는 다른 세션이 바꿔도 이 세션 드롭다운이 따라오게(0.1.1 실측 — 비교 값에 없어 분이 바뀔 때만 따라왔다)
  sig += `|r${String(await reportDefault($))}|d${(await displayOf($)).value}|p${String(await autoPinOn($))}|x${String(await autoDetachOn($))}|a${await advisorOf($)}`
  // 입력창 위 줄에 둘 것(다른 세션이 바꿔도 따라오게) · 답하는 중(패널 [설정] advisor 를 막고 풀게) — 0.1.4
  const quick = await quickItemsOf($)
  sig += `|q${[...quick].join(',')}|w${String(isWorking)}`
  // 노트: register.md#relay — 손으로 친 신호도 3초 안에 칸이 따라오게(prompt.edit 은 키마다 엔진을 오가서 안 쓴다)
  if (quick.has('send')) sig += `|z${signalOf((await $.prompt.read().catch(() => null))?.text ?? '')?.word ?? ''}`
  for (const [id, on] of await reportSwitches($)) sig += `|r${id}:${String(on)}`
  // 오케 나무 기록 · 진행판 · advisor 공용 파일 — 바뀌면 나무 · 새 줄 수 · 금액을 다시 그린다(0.1.3)
  sig += linksSig(await storeLinks($))
  const b = await readBoard($, selfId)
  if (b) sig += `|b${(await $.fs.stat(b.path).catch(() => null))?.mtimeMs ?? 0}:${b.seen.length}`
  const share = await advisorShareFile($)
  if (share) sig += `|v${(await $.fs.stat(share).catch(() => null))?.mtimeMs ?? 0}`
  if (sig === lastSig) return
  lastSig = sig
  await update($, appTick, n => n + 1)
}


async function refreshRegistry($: EngineInterface): Promise<void> {
  let self: Entry | null = null
  try {
    const entries = await loadEntries($)
    self = findSelf(entries, await $.session.id(), await read($, previewAlias))
    await update($, nav, () => buildNav(entries, self))
    await update($, tree, () => buildTree(entries, self?.alias ?? null))
  } catch (err) {
    log($, `레지스트리 읽기 실패 — ${String(err)}`)
  }
  // 데스크톱 앱 세션은 앱 묶음으로 패널을 따라 연다 — 앱 자료가 없으면(터미널 · 시험) msg 묶음.
  // msg 레지스트리를 못 읽어도 앱 묶음은 정한다 — 안 그러면 입력창 위 세션 트리 그림을 눌러도 패널이 안 열린다
  const group = (await appGroup($).catch(() => null)) ?? groupOf(self)
  await update($, selfGroup, () => group)
}

/** 앱 딥링크로 화면을 그 세션으로 옮긴다. & 가 cmd 에 잘리지 않게 rundll32 로 연다(Windows) */
async function go($: EngineInterface, node: NavNode): Promise<void> {
  const url = `claude://code/continue?session=${encodeURIComponent(node.sessionId)}&source=session_nav`
  try {
    const ran = await $.process.run(['rundll32.exe', 'url.dll,FileProtocolHandler', url], { timeoutMs: 10000 })
    if (ran.exitCode !== 0) $.ui.toast(`이동 실패(${ran.exitCode}): ${node.label}`)
  } catch (err) {
    $.ui.toast(`이동 실패: ${String(err)}`)
  }
}

/** 이 세션에 트리 패널을 열어 둘지: 연 세션과 같은 그룹이면 따라 연다 */
async function wantsPane($: EngineInterface): Promise<boolean> {
  return paneFollows(await $.store.get(PANE_KEY), await read($, selfGroup))
}

/** 이 세션의 패널을 저장된 상태에 맞춘다. 타이머가 계속 불러 세션을 옮겨도 따라 열린다 */
async function syncPane($: EngineInterface): Promise<void> {
  const want = await wantsPane($)
  const isShown = (await $.ui.panes()).some(pane => pane.id === PANE)
  if (!want) {
    if (isShown) await $.ui.close({ id: PANE })
    if (await read($, isOpen)) await update($, isOpen, () => false)
    return
  }
  if (isShown && (await read($, isOpen))) return
  // 노트: register.md#syncPane
  if ((await $.session.surfaces()).length === 0) return
  await refreshRegistry($)
  await update($, isOpen, () => true)
  await $.ui.open({ id: PANE, title: '세션' })
  // 「이 세션」 쪽(처음 값)의 원격 끄기 단추 — 열 때 한 번 본다
  const id = await selfAppId($)
  if (id && ((await read($, panelUi)).view ?? 'self') === 'self') await checkRemote($, id).catch(() => {})
}

/** 띠 버튼 · 명령: 열려 있으면 닫고, 아니면 이 그룹으로 연다. 묶음을 아직 모르면(레지스트리를 못 읽은 채) 먼저 읽는다 — 안 그러면 눌러도 안 열린다 */
async function togglePane($: EngineInterface): Promise<void> {
  if ((await read($, selfGroup)) === null) await refreshRegistry($)
  if (await wantsPane($)) await $.store.delete(PANE_KEY)
  else await $.store.set(PANE_KEY, { group: await read($, selfGroup) })
  await syncPane($)
}

/** 그룹별 트리. 자기 세션은 굵게, 나머지는 누르면 이동 */
// 터미널은 그림 글자(🟣 · 🌳)를 뺀다 — 앱 터미널 패널이 2칸 그림 글자를 1칸처럼 그려 칸이 어긋나고 찌꺼기가 남았다(easy-compact glyph.ts)
function drawTree($: EngineInterface, ui: Ui, groups: readonly TreeGroup[], cols: number, isTerminal = false) {
  const { Box, Button, Text } = ui
  if (groups.length === 0) return <Text key="t-none" dimColor>· 진행 중인 세션이 없습니다.</Text>
  return (
    <Box flexDirection="column">
      {groups.map((group, index) => (
        <Box key={`g-${group.group}`} flexDirection="column" marginTop={index === 0 ? 0 : 1}>
          {group.rows.map(row => (
            <Box key={`r-${group.group}-${row.alias}`} marginLeft={row.depth * 2}>
              <Text dimColor>{row.depth === 0 ? (isTerminal ? '● ' : '🟣 ') : '└ '}</Text>
              {row.isSelf ? (
                <Text bold>{row.label} (여기)</Text>
              ) : (
                // 버튼 이름은 줄을 안 바꾼다 — 들여쓰기 · 표시 · 완료 수 자리를 빼고 미리 자른다
                <Button key={`tree-${row.alias}`} label={fitCells(row.label, Math.max(8, cols - row.depth * 2 - 14))} onPress={() => go($, row)} />
              )}
              {row.isDone && <Text dimColor> ✓</Text>}
              {row.doneChildren > 0 && <Text dimColor> · 완료 {row.doneChildren}</Text>}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}


export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refreshRegistry($)
    // 다른 세션에서 열고 닫은 패널을 따라간다
    $.clock.every(1500, () => {
      void syncPane($).catch(() => {})
    })
    // 다른 세션이 앱 메타를 바꾸면 새 패널 · 아래 줄을 다시 그린다(노트 register.md#bumpTick)
    $.clock.every(3000, () => {
      void bumpTick($).catch(() => {})
    })
    // 노트: register.md#handoff — 새 세션 쪽 이어받기(0.1.6): 연 세션 훅이 먼저 하게 20초 뒤 한 번(이미 뒤 주인이 있으면 그대로)
    $.clock.after(20_000, () => {
      void takeOverAsKid($).catch(err => log($, `새 세션 쪽 인계 실패 — ${String(err)}`))
    })
    void addSendOnce($).catch(() => {})
    // advisor 횟수는 판을 다시 불러와도 잇는다(노트 register.md#advisorUse)
    void savedUse($)
      .then(saved => update($, advisorUse, u => u ?? saved))
      .catch(() => {})
    return next(e)
  })

  // 레지스트리는 다른 세션이 고친다 — 턴이 끝날 때마다 다시 읽는다
  // 노트: register.md#writeContextReport
  // 노트: register.md#relay — 쉬던 세션에서 친 신호를 그 차례에 묶는다(도구 도는 중에 친 신호는 prompt.submit 의 turnId 로 이미 묶임)
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      // 노트: register.md#ultraSpinner — 낱말이 없는 다음 차례에도 끈다(앞 차례가 끝 알림 없이 멈췄어도 남지 않게)
      const isUltra = ultraTyped(e.text)
      if ((await read($, ultraTurn)) !== isUltra) await update($, ultraTurn, () => isUltra)
      const selfId = await selfAppId($).catch(() => null)
      const p = selfId ? await readPending($, selfId) : null
      if (selfId && p && p.turnId === null) await writePending($, selfId, { ...p, turnId: e.turnId }).catch(() => {})
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refreshRegistry($)
    if (e.agentId === undefined) {
      if (await read($, ultraTurn)) await update($, ultraTurn, () => false)
      // 노트: register.md#relay — 기다리지 않는다(앱 길은 2.6초 걸릴 수 있음)
      void finishRelay($, e).catch(err => log($, `끝 답 보내기 실패 — ${String(err)}`))
      await writeContextReport($, e.usage?.model ?? null).catch(err => log($, `컨텍스트 적기 실패 — ${String(err)}`))
      // 메인 차례가 끝나면 advisor 그림은 손짓에서 쉬는 그림으로(횟수는 남는다)
      if ((await read($, advisorTurn)) !== null) await update($, advisorTurn, () => null)
      // 노트: register.md#advisorTimes — 이번 차례에 새 호출이 있었으면 차례 끝에 한 번 더 읽는다(그 뒤 글 · 도구가 다 써진 뒤)
      if (advLog.dirty) {
        advLog.dirty = false
        advLog.wants = true
        advLog.retries = ADV_RETRIES
      }
    }
    return next(e)
  })

  // advisor 쓰임 · 메인 요청 모델: 응답 한 덩이가 끝난 결과에서 읽는다. 흐르는 조각은 손대지 않고 그대로 넘긴다(노트 register.md#advisorUse)
  on('turn.step', async function* ($, e, next) {
    const r = yield* next(e)
    await noteStep($, e.model, e.agentId, r.serverToolUses).catch(err => log($, `advisor 세기 실패 — ${String(err)}`))
    return r
  })

  // 노트: register.md#relay — 신호 차례에 모델이 스스로 보내면: 모델 길이면 보냈다고 적고, 아니면 막는다(같은 글이 두 번 가지 않게). 그 밖은 그대로 지나간다
  on('session.send', async ($, e, next) => {
    if (e.origin.kind !== 'model' || e.agentId !== undefined) return next(e)
    const selfId = await selfAppId($).catch(() => null)
    const p = selfId ? await readPending($, selfId) : null
    if (!selfId || !p || e.to !== p.to) return next(e)
    if (p.way !== 'model') return { isDelivered: false, reason: RELAY_SELF_SEND }
    const r = await next(e)
    if (r.isDelivered) await writePending($, selfId, { ...p, modelSent: true }).catch(() => {})
    return r
  })

  // ultrathink 단추 꼴: 입력창이 넣기 · 보내기 · 지우기 · 기록 불러오기로 바뀌면 낱말이 있나 다시 본다(노트 register.md#ultrathink)
  on('prompt.change', async ($, e, next) => {
    const isOn = ULTRA_RE.test(e.text)
    if ((await read($, ultraOn)) !== isOn) await update($, ultraOn, () => isOn)
    return next(e)
  })

  // 사람이 패널을 닫으면 모든 세션에서 닫는다
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE && e.origin.kind === 'person') {
      await $.store.delete(PANE_KEY)
      await update($, isOpen, () => false)
    }
    return next(e)
  }).catch(($, e, next) => next(e)) // 저장이 실패해도 닫기는 그대로 간다


  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box } = ui
    // 데스크톱 패널은 한글이 칸 계산보다 넓게 그려져 오른쪽 끝이 가려진다 — 폭의 1할가량을 비워 둔다
    const pad = Math.max(3, Math.round(e.props.bodyColumns * 0.1))
    const cols = Math.max(24, e.props.bodyColumns - pad)
    // 데스크톱에 앱 자료가 있으면 새 패널(노트 register.md#appSelf), 터미널 · 앱 자료 없음은 지금 msg 꼴(9절 「CLI 꼴 한동안 뺌」)
    if (e.surface !== 'terminal') {
      await read($, appTick)
      // 옛 판이 남긴 화면 상태엔 새 칸(remote)이 없다 — 처음 값 위에 얹는다
      const pu = { ...PANEL_UI_START, ...(await read($, panelUi)) }
      const view = await loadPanelView($, pu).catch(err => {
        log($, `패널 자료 읽기 실패 — ${String(err)}`)
        return null
      })
      if (view) {
        const acts = panelActs($)
        const draw = (v: PanelView, p: PanelUi) => (
          <Box key="es-pane" flexDirection="column" width={cols}>
            {drawPanel(ui, v, p, cols, acts)}
          </Box>
        )
        const out = draw(view, pu)
        if (drawnSize(out) <= DRAW_CAP) return out
        // 노트: register.md#sizeGuard — 마지막 안전망(0.1.5): 넘은 채로 내면 패널이 통째로 비고 쪽 고르기도 사라져 패널 안에서 못 되돌린다.
        // 메뉴 · 보낼 칸을 닫고 무거운 접힘을 비운다 — 먼저 방금 편 것(접힘 목록 맨 끝)만 남기고, 그래도 넘으면 다 비운다. 맞는 상태를 저장하고 알림 한 줄,
        // 더 비울 것이 없거나 다 비워도 넘으면 쪽 고르기와 안내 줄만
        const isHeavy = (f: string) => HEAVY_FOLDS.some(h => f.startsWith(h))
        const last = pu.folds.filter(isHeavy).at(-1)
        const reset = { ...pu, open: null, sending: null, card: null, ask: null }
        // 0.1.26: 다 비워도 넘으면 편 칸을 닫는다(도구판 · 「지금」 줄만)
        const tries: PanelUi[] = [
          ...(last === undefined ? [] : [{ ...reset, folds: pu.folds.filter(f => !isHeavy(f) || f === last) }]),
          { ...reset, folds: pu.folds.filter(f => !isHeavy(f)) },
          { ...reset, folds: pu.folds.filter(f => !isHeavy(f)), tool: null },
        ]
        const isSame = (p: PanelUi) => p.folds.length === pu.folds.length && p.tool === pu.tool && pu.open === null && pu.sending === null && pu.card === null && pu.ask === null
        for (const light of tries) {
          if (isSame(light)) continue
          const lightView = await loadPanelView($, light).catch(() => null)
          const next = lightView ? draw(lightView, light) : null
          if (!next || drawnSize(next) > DRAW_CAP) continue
          // 그리는 중엔 상태를 못 쓴다(엔진 — 「drawing is pure」, 시험에서 잼) — 저장 · 알림은 그린 뒤 타이머로. 그사이 접힘이 바뀌었으면 덮지 않는다
          const seen = JSON.stringify(pu.folds)
          $.clock.after(1, () => {
            void (async () => {
              let isSaved = false
              await update($, panelUi, u => {
                isSaved = JSON.stringify(u.folds) === seen
                return isSaved ? { ...u, open: null, sending: null, card: null, ask: null, folds: light.folds, tool: light.tool } : u
              })
              if (isSaved) toast($, light.tool === null && pu.tool !== null ? '패널에 그릴 줄이 너무 많아 편 칸을 닫았습니다' : '패널에 그릴 줄이 너무 많아 앞서 펼친 것을 접었습니다')
            })().catch(() => {})
          })
          return next
        }
        return (
          <Box key="es-pane" flexDirection="column" width={cols}>
            {drawPanelBare(ui, pu, acts, '패널에 그릴 것이 너무 많습니다 — 다른 쪽을 고르세요')}
          </Box>
        )
      }
    }
    return (
      <Box flexDirection="column" width={cols}>
        {drawTree($, ui, await read($, tree), cols, e.surface === 'terminal')}
      </Box>
    )
  })

  // 노트: register.md#quickItems — [설정] 「입력창 위 줄에 둘 것」 스위치(switch.tsx)는 element `es-sw-<칸>` 으로 온다. 지금 값에서
  // 뒤집고(스위치가 든 값이 낡았어도 맞게) 새 props 를 바로 돌려준다. 이지 컴팩트 스위치(`sw-<키>`)는 건드리지 않고 넘긴다
  on('ui.message', async ($, e, next) => {
    if (!e.module.endsWith('switch.tsx') || !e.element.startsWith(QUICK_SWITCH)) return next(e)
    // 새 자식 세션 저절로 고정 · 떼어 내기(0.1.5 — 드롭다운에서 스위치로)
    if (e.element === AUTO_SWITCH.pin || e.element === AUTO_SWITCH.detach) {
      const isPin = e.element === AUTO_SWITCH.pin
      const isOn = !(await (isPin ? autoPinOn($) : autoDetachOn($)))
      await (isPin ? setAutoPin($, isOn) : setAutoDetach($, isOn))
      return { props: { on: isOn, disabled: false } }
    }
    // 끝나면 고정 풀기 · 사이드바 그룹으로(0.1.6) — 그룹은 켤 때 이 세션 나무를 한 번 맞춘다
    if (e.element === AUTO_SWITCH.unpin || e.element === AUTO_SWITCH.group) {
      const key = e.element === AUTO_SWITCH.unpin ? AUTO_UNPIN_KEY : AUTO_GROUP_KEY
      const isOn = !(await storeOn($, key))
      await setSwitch($, key, isOn)
      if (isOn && key === AUTO_GROUP_KEY) void groupOwnTree($).catch(() => {})
      return { props: { on: isOn, disabled: false } }
    }
    // 보낸 세션 관계 알리기(0.1.20)
    if (e.element === PEER_SWITCH) {
      const isOn = !(await storeOn($, PEER_REL_KEY))
      await setSwitch($, PEER_REL_KEY, isOn)
      return { props: { on: isOn, disabled: false } }
    }
    const key = QUICK_ITEMS.find(x => `${QUICK_SWITCH}${x.key}` === e.element)?.key
    if (key === undefined) return next(e)
    const isOn = !(await quickItemsOf($)).has(key)
    await setQuickItem($, key, isOn)
    return { props: { on: isOn, disabled: false } }
  })

  // 입력창 위 띠: 한 줄(세션 패널 · 이 세션 고정 · 화면) — 데스크톱 앱 세션은 늘 보인다. advisor 를 fable 로 고르면 그 아래 확인 카드.
  // 안쪽(next — easy-compact 바)은 가는 선 아래 그대로 둔다. 질문 카드가 띠를 쥐면 비킨다. 노트: register.md#quickForm
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    isWorking = e.props.isWorking === true
    if (typeof e.plugin === 'string') ownRow = e.plugin
    const inner = await next(e)
    if (e.surface === 'terminal' || e.props.hasSurvey) return inner
    await read($, appTick)
    await read($, isOpen)
    const isAsking = await read($, fableAsk)
    const q = await loadQuickView($).catch(() => null)
    if (!q) return inner
    const ui = $.ui.resolve(e)
    const { Box } = ui
    const acts = await quickActs($, q.self)
    return (
      <Box key="es-above" flexDirection="column" rowGap={0.5}>
        {drawQuickRow(ui, q, acts)}
        {isAsking ? drawFableAsk(ui, await planOf($), fableActs($)) : null}
        <Box key="es-above-line" height={0.06} backgroundColor="promptBorder" />
        {inner}
      </Box>
    )
  })

  // 노트: register.md#ultraSpinner — 채팅 작업 줄(0.1.26 — 정본 9절 「울트라띵크 작업 줄 표시」 ★): 이 차례 글에 ultrathink 가 들어갔으면 글 앞에 「ultrathink · 」.
  // 그림은 안 돌려준다 — 데스크톱 앱은 이 줄에서 글 고쳐 쓰기만 받는다(도구 묶음 줄은 그림을 버림). 터미널은 그대로
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface === 'terminal' || !(await read($, ultraTurn))) return next(e)
    const p = e.props
    return next({ ...e, props: p.message !== null ? { ...p, message: `${ULTRA_SPIN}${p.message}` } : { ...p, word: `${ULTRA_SPIN}${p.word}` } })
  })

  // 입력창 위 띠의 행 쌓기(엔진 2.1.325 부터): 이 mod 행을 맨 앞으로 옮기기만 한다. 노트: register.md#quickForm
  on('ui.render', { component: 'AbovePromptList' }, async (_$, e, next) => {
    const rows = e.props.rows
    const at = rows.findIndex(r => (ownRow !== null ? r.plugin === ownRow : /^easy-session(@|$)/.test(r.plugin)))
    const mine = rows[at]
    if (at <= 0 || mine === undefined) return next(e)
    return next({ ...e, props: { ...e.props, rows: [mine, ...rows.filter((_, i) => i !== at)] } })
  })

  // 요금 갈래: 응답마다 엔진이 알리는 측정(5시간 · 7일 창 · 컨텍스트)으로 적는다. 노트: register.md#plan
  on('session.measure', async ($, e, next) => {
    await notePlan($, e.rateLimits, e.context.tokens).catch(() => {})
    return next(e)
  })

  // 🌳 버튼: 입력창 아래 오른쪽 모드 표시줄(SessionMode)에, 앱 자료가 없고 msg 트리가 있는 세션(터미널 등)에서만.
  // 데스크톱 앱 세션은 이 줄을 앱 몫으로 둔다 — 세션 트리는 입력창 위 줄 맨 앞 그림으로 연다(노트 register.md#quickForm).
  // 앱이 이 줄을 한 줄 글로 다시 짜며 단추만 남기고 Select 를 버린다(노트 register.md#displayLine).
  // 엔진 모드 글(focus · memory paused 등)은 앞에 그대로 두고 그 뒤에 버튼 — 모드 글은 문자열이라 버튼을 넣으려면 줄을 직접 그린다.
  // 안쪽(next — 엔진 모드 글 + 다른 mod, 이지 컴팩트 바가 접혔을 때의 [🗜 이지 컴팩트 ⇱] 등)을 앞에 그대로 두고 그 뒤에 🌳 — 모드 글을 직접
  // 그리고 next 를 안 부르면 안쪽 mod 의 버튼이 사라졌다
  // 이지 컴팩트 바가 접혀 안쪽에 그 버튼(key "band-reveal", [🗜 이지 컴팩트 ⇱])이 있으면 데스크톱에선 🌳 를 그림 하나로
  // 줄인다 — 이 줄은 폭이 좁아 둘이 다 글이면 🌳 가 밀려 안 보였다. 평소엔 글까지
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const inner = await next(e)
    if (e.surface !== 'terminal') {
      await read($, appTick)
      if (await appSelf($).catch(() => null)) return inner
    }
    if ((await read($, nav)) === null) return inner
    const ui = $.ui.resolve(e)
    const { Box, Button } = ui
    const isShown = await wantsPane($)
    const isTight = e.surface !== 'terminal' && JSON.stringify(inner).includes('"band-reveal"')
    return (
      <Box key="tree-mode" columnGap={1} alignItems="center">
        {inner}
        <Button
          key="tree"
          label={
            isTight
              ? `🌳 ${isShown ? '✕' : '▸'}`
              : `${e.surface === 'terminal' ? '' : '🌳 '}${isShown ? '세션 트리 열림 ✕' : '세션 트리 ▸'}`
          }
          variant="secondary"
          dimColor
          onPress={() => togglePane($)}
        />
      </Box>
    )
  })

  // 자식 보고: 끈 세션은 보고 덩이를 떼어 모으고 보고만 든 앱 턴은 막는다 — 노트 register.md#reports.
  // 화면: 고른 값을 글마다 한 줄로 붙인다(쓰지 않음이면 안 붙임) — 노트 register.md#displayLine
  on('prompt.submit', async ($, e, next) => {
    let text = e.text
    if (!e.command && text.includes('you started (local_')) {
      const held = await holdReports($, e).catch(err => {
        log($, `자식 보고 가르기 실패 — ${String(err)}`)
        return null
      })
      if (held?.drop !== undefined) return { drop: held.drop }
      if (held) text = held.text
    }
    // 노트: register.md#relay — 사람이 친 글의 보내기 신호. 글은 안 고치고 그 차례 모델에게만 한 줄(실패해도 글은 그대로 간다)
    const kind = e.origin?.kind
    const relayLine = !e.command && (kind === 'composer' || kind === 'bridge') ? await relaySubmit($, e, text).catch(err => (log($, `보내기 신호 처리 실패 — ${String(err)}`), null)) : null
    // 노트: register.md#peerRel — 다른 세션이 보낸 글에만(사람 글 · 앱 보고는 안 본다). 실패해도 글은 그대로 간다
    const peerRel = !e.command && (kind === 'peer' || kind === 'peer-send-message') ? await peerSubmit($, e.origin, text).catch(err => (log($, `보낸 세션 관계 가리기 실패 — ${String(err)}`), null)) : null
    const line = displayLine(await displayOf($))
    const added = [relayLine, peerRel, line].filter((x): x is string => x !== null)
    return next(added.length === 0 ? { ...e, text } : { ...e, text, context: [...(e.context ?? []), ...added] })
  })

  // 도구 막기: 화면이 태블릿 · 폰이면 고르기 카드 · 그림 위젯을 거절하고 Claude 에게 글로 물으라고 돌려준다 — 노트 register.md#toolBlock
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    const why = blockText(await displayOf($), 'AskUserQuestion')
    return why === null ? next(e) : { deny: why }
  })
  on('tool.call', { tool: 'mcp__visualize__show_widget' }, async ($, e, next) => {
    const why = blockText(await displayOf($), 'mcp__visualize__show_widget')
    return why === null ? next(e) : { deny: why }
  })

  // 이 세션이 연 새 세션: 인계 대기 · 저절로 떼어 내기 · 저절로 고정(설정) — 세션 열기 결과 글의 새 id 로. 노트 register.md#newChild
  on('tool.call', { tool: 'mcp__ccd_session__start_session' }, async ($, e, next) => {
    const r = await next(e)
    if (r.deny !== undefined || r.isError) return r
    // 모델이 읽는 결과 글(text)에 새 id 가 있다 — core 가 아닌 답엔 text 가 없어 결과 값을 본다
    await newChild($, r.text ?? JSON.stringify(r.result ?? '')).catch(err => log($, `새 자식 세션 처리 실패 — ${String(err)}`))
    return r
  })

  // 인계한 옛 주인을 Claude 가 보관할 때 — 붙은 자식을 먼저 떼어 남긴다(같이 보관되지 않게). 노트 register.md#handoff
  on('tool.call', { tool: 'mcp__ccd_session_mgmt__archive_session' }, async ($, e, next) => {
    const sid = (e as unknown as { session_id?: unknown }).session_id
    const selfId = await selfAppId($).catch(() => null)
    const links = selfId === null ? null : await storeLinks($).catch(() => null)
    const isHanded = selfId !== null && (sid === 'self' || sid === selfId) && (links?.succ.has(selfId) ?? false)
    if (isHanded && (await isBypass($).catch(() => false))) {
      const failed = await detachKids($, selfId).catch(() => -1)
      if (failed !== 0) return { deny: 'easy-session: 이 세션에 붙은 세션을 다 떼지 못해 보관하지 않았습니다 — 보관하면 그 세션도 같이 보관됩니다. 사용자에게 알려 주세요.' }
    }
    // 뒤 주인이 옛 주인을 보관(0.1.9 — 11-04 개발 3차가 2차를 이 길로 보관해 붙은 채 남았다): 패널 [보관]과 같이 자기를 먼저 뗀다
    if (selfId !== null && typeof sid === 'string' && sid !== 'self' && sid !== selfId && links?.succ.get(sid) === selfId) {
      const why = (await isBypass($).catch(() => false))
        ? await leaveOldOwner($, sid, selfId).catch((err: unknown) => `이 세션을 못 떼어 보관하지 않았습니다 — ${firstLine(String(err))}`)
        : attachedKids(await refreshApp($), sid).includes(selfId)
          ? '이 세션이 그 세션에 붙어 있어 같이 보관될 수 있습니다 — 먼저 detach_session("self") 로 이 세션을 떼고 다시 보관하세요'
          : null
      if (why) return { deny: `easy-session: ${why}. 사용자에게 알려 주세요.` }
    }
    return next(e)
  })

  // 오케가 Edit · Write 로 진행판을 고치면 그 사이 생긴 줄은 본 줄로 — 노트 register.md#board
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => seenOwnEdit($, (e as unknown as { file_path?: unknown }).file_path, () => next(e)))
  on('tool.call', { tool: 'Write' }, async ($, e, next) => seenOwnEdit($, (e as unknown as { file_path?: unknown }).file_path, () => next(e)))
}
