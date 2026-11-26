/**
 * easy-session — 이 세션과 이어진 세션들을 패널 「세션」(세션 도구 · 설정 탭)에 보이고, 입력창 위에 한 줄(세션 패널 단추 ·
 * 고르는 칸들)을 둔다. 패널 자료는 앱 세션 메타(meta.ts · 아래 「앱 세션 자료」)에서 읽는다. 옛 이름 session-tree-viewer —
 * easy-compact 처럼 정식 플러그인으로 내려고 이름을 바꿨다. 공개 mod(easy-compact)에서 떼어 낸 세션 트리가 뿌리다.
 */
import { atom, read, update } from 'claude-code'
import type { CommandInfo, EngineInterface, FsEntry, Register } from 'claude-code'

import type { AdvisorCall, AdvisorShare, AdvisorUse, BoardFile, ChangeGroup, CleanScan, EndRecord, EndedKid, LowerJob, MatchAsk, OpenRow, OutItem, RegistryEntry, RelayFound, RelayMark, RelayPending, HeldBox, HeldReport, NavNode, PanelUi, PlanKind, PreAsk, SendKind, SessionMeta, StoredPlan, TreeLinks, UpdateState } from '../types'
import type { AdvisorPose } from './advisor-char'
import { ADVISORS, advisorAlias, advisorKeptToast, advisorToast, readAdvisorAnswer } from './advisor-say'
import {
  dropReason,
  INDEX_FILE,
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
  familyRow,
  freshLines,
  heldFileText,
  heldKey,
  heldText,
  idOfFile,
  isCold,
  isNextOrdinal,
  isSessionFile,
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
  queuedReports,
  recentSent,
  relatives,
  belowRows,
  roleOf,
  ultraTyped,
  withFirstUltra,
  RULES_EMPTY,
  filledSendTargets,
  judgeSend,
  ruleFailText,
  sendPlaceOf,
  LINE_FIRST,
  hasGrandKids,
  isLaterOrdinal,
  isOurFill,
  isUpWord,
  roleRuleLine,
  voiceHints,
  RELAY_MARK_MS,
  RELAY_SLACK_MS,
  receiptState,
  relayContext,
  relayMissContext,
  relayNameContext,
  RELAY_UP_ONLY,
  RELAY_TEXT_HEADS,
  relayText,
  relayWay,
  holdRisk,
  parsePinAsks,
  pinAsksText,
  pinHelperOf,
  type PinAsk,
  leftText,
  lockOwnerId,
  parseMdLock,
  releasedLockText,
  shouldAutoRelease,
  holdLine,
  HOLD_SHORT,
  type MdLock,
  reportStateOf,
  samePath,
  sendTargets,
  settleArrived,
  signalOf,
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
  engineMeta,
  isKeyFile,
  oauthOf,
  openDeskRows,
  openOutRows,
  parseRecvLog,
  parseRegistryEntry,
  parseSentLog,
  peerBodyOf,
  peerEntryOf,
  recvLogText,
  sentLogText,
  sentRowsOf,
  endingOf,
  mentionHits,
  mentionLine,
  parseEnding,
  endFileText,
  leftoverLine,
  leftoverOf,
  blockedCell,
  matchDenyText,
  matchWay,
  modeName,
  topicMark,
  withIra,
  attachKinds,
  judgeKind,
  parseSentKinds,
  parseTalks,
  peerKindLine,
  pushSentKind,
  kindIn,
  stripKind,
  withKind,
  kindOfText,
} from './meta'
import type { AppFolder, LeftMsgs, PinWhy, SentItem, SessionRole } from './meta'
import { ADV_FOLD, AUTO_SWITCH, COMPOSE_AT, DESKTOP_LOOK, MD_LOCK_SWITCH, MENTION_SWITCH, MGR_SWITCH, PEER_SWITCH, QUICK_ITEMS, RULES_SWITCH, QUICK_SWITCH, SEND_MAIN, SEND_MISS, SEND_NONE, TOOL_START, bareTitle, compactWins, drawFableAsk, drawPanel, drawPanelBare, drawQuickRow, josa, sendPad, shortTitle } from './panel'
import type { AdvisorLog, AdvisorMark, Choice, FableActs, HeldPick, MdLockView, PanelActs, PanelLook, PanelView, QuickActs, QuickItem, QuickView, SendActs, SlashCmd, UpdView } from './panel'
import { changeRange, changelogItems, changelogVersionsBetween, installedFrom, isFolderMarket, isMarketName, marketVersionOf, pluginDataId, syncedFrom, updateAskText, versionGt } from './paths'
import { L, bothLangs, isKorean, lang, plural, setLang } from './i18n'
import type { Lang } from './i18n'
import { fitCells, paneFollows } from './tree'
import { CLEAN_ASK, CLEAN_TOP, HANDOFF_ASK, MERGE_ASK, REPORT_LINES, TITLE_FORM } from './asks'
import { fillsByFlex, hasVscode, isVscodeEntry, isVscodeSurface, lacksClient, padsPane, paneIsCondensed, pressesText, rainbowAsHex, toastsStack } from './vscode'

const PANE = 'easy-session'

/** $.store 키: 트리 패널을 연 그룹(StoredPane). 같은 그룹 세션만 따라 연다 */
const PANE_KEY = 'pane'
const OWN_PANE_PREFIX = 'pane:'

const selfGroup = atom({ plugin: 'easy-session', key: 'selfGroup' } as const, null)

const isOpen = atom({ plugin: 'easy-session', key: 'isOpen' } as const, false)

const PANEL_UI_START: PanelUi = { view: 'self', tool: TOOL_START, open: null, remote: null, remoteBad: null, sending: null, card: null, draft: '', folds: [], ask: null, pre: null, match: null, kidsAsk: null }

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
/** 보내기 확인(0.1.27 msg 규칙 R1 · R2) — 지금 본 대화 차례 기록 · 다음 차례를 시작할 글(노트 register.md#sendRules) */
const rulesTurn = atom({ plugin: 'easy-session', key: 'rulesTurn' } as const, RULES_EMPTY)
const rulesPending = atom({ plugin: 'easy-session', key: 'rulesPending' } as const, null)
const noteLine = atom({ plugin: 'easy-session', key: 'noteLine' } as const, null)
const UPDATE_IDLE: UpdateState = { phase: 'idle', own: null, market: null, marketAt: null }
const updateInfo = atom({ plugin: 'easy-session', key: 'update' } as const, UPDATE_IDLE)
const updDrawer = atom({ plugin: 'easy-session', key: 'updDrawer' } as const, false)
let drawnSurface: string | null = null

function log($: EngineInterface, text: string): void {
  try {
    $.ui.log(text)
  } catch {
    // 로그도 못 남기는 곳(테스트 등)에선 조용히 넘어간다
  }
}

async function envPath(get: () => Promise<string | undefined>): Promise<string | null> {
  try {
    return (await get())?.replace(/\\/g, '/').replace(/\/+$/, '') || null
  } catch {
    return null
  }
}

let claudeHomeCache: string | null = null

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
  throw new Error(L('Claude 설정 폴더를 못 찾음(CLAUDE_CONFIG_DIR · HOME 없음)', "Can't find Claude's config folder (no CLAUDE_CONFIG_DIR or HOME)"))
}

async function dataDir($: EngineInterface): Promise<string> {
  const installed = installedFrom($.plugin.root) ?? syncedFrom($.plugin.root)
  if (installed) return `${installed.configDir}/plugins/data/${pluginDataId('easy-session', installed.marketplace)}`
  return `${await claudeHome($)}/plugins/data/easy-session`
}

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

// ── 언어(0.1.29 ⑤ — easy-compact register.tsx 의 detectLang · ensureLang · saveLang 을 옮김, 노트 register.md#detectLang) ──

const LANG_KEY = 'lang'
type LangPick = 'auto' | Lang

async function langPick($: EngineInterface): Promise<LangPick> {
  const v = await $.store.get(LANG_KEY).catch(() => undefined)
  return v === 'ko' || v === 'en' ? v : 'auto'
}

async function detectLang($: EngineInterface): Promise<Lang> {
  const readJson = async (path: string): Promise<Record<string, unknown> | null> => {
    try {
      return JSON.parse(await $.fs.read(path)) as Record<string, unknown>
    } catch {
      return null
    }
  }
  const settingsFiles: string[] = []
  try {
    const cwd = (await $.session.cwd()).replace(/\\/g, '/')
    settingsFiles.push(`${cwd}/.claude/settings.local.json`, `${cwd}/.claude/settings.json`)
  } catch {
  }
  try {
    settingsFiles.push(`${await claudeHome($)}/settings.json`)
  } catch {
  }
  for (const path of settingsFiles) {
    const v = (await readJson(path))?.language
    if (typeof v === 'string' && v.trim()) return isKorean(v) ? 'ko' : 'en'
  }
  for (const dir of await appDataDirs($)) {
    const v = (await readJson(`${dir}/config.json`))?.locale
    if (typeof v === 'string' && v.trim()) return isKorean(v) ? 'ko' : 'en'
  }
  const safeEnv = async (get: () => Promise<string | undefined>) => {
    try {
      return await get()
    } catch {
      return undefined
    }
  }
  const osVars = [await safeEnv(() => $.env.get('LC_ALL')), await safeEnv(() => $.env.get('LC_MESSAGES')), await safeEnv(() => $.env.get('LANG'))]
  const osVar = osVars.find(v => v && !/^(c|posix)([._]|$)/i.test(v))
  if (osVar) return isKorean(osVar) ? 'ko' : 'en'
  try {
    return isKorean(Intl.DateTimeFormat().resolvedOptions().locale) ? 'ko' : 'en'
  } catch {
    return 'en'
  }
}

let autoLang: Lang | null = null

let langCheckedAt = Number.NEGATIVE_INFINITY

async function ensureLang($: EngineInterface): Promise<void> {
  let forced: string | undefined
  try {
    forced = await $.env.get('EASY_SESSION_LANG')
  } catch {
    forced = undefined
  }
  let pick: Lang | null = forced === 'ko' || forced === 'en' ? forced : null
  if (pick === null) {
    const chosen = await langPick($)
    if (chosen !== 'auto') pick = chosen
  }
  if (pick === null) {
    const now = await $.clock.now()
    if (autoLang === null || now - langCheckedAt >= 30_000) {
      langCheckedAt = now
      autoLang = await detectLang($)
    }
    pick = autoLang
  }
  if (pick === lang()) return
  setLang(pick)
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // 다시 그리기를 못 부르는 곳(시험 등)
  }
  $.clock.after(1, () => {
    void refreshUpdateInfo($).catch(() => {})
  })
}

async function saveLang($: EngineInterface, choice: LangPick): Promise<void> {
  if (choice === 'auto') await $.store.delete(LANG_KEY)
  else await $.store.set(LANG_KEY, choice)
  langCheckedAt = Number.NEGATIVE_INFINITY
  await ensureLang($)
  await update($, appTick, n => n + 1)
}

/** [설정] 「언어 · Language」 고르기 재료 — 자동이면 지금 감지한 언어를 이름에(이지 컴팩트 꼴) */
async function langChoice($: EngineInterface): Promise<{ value: LangPick; auto: Lang | null }> {
  return { value: await langPick($), auto: autoLang }
}

// ── 패널 판 단추 · 서랍(0.1.29 — easy-compact register.tsx 업데이트를 옮김, 노트 register.md#refreshUpdateInfo) ──

const SEEN_VERSION_KEY = 'seenVersion'
const CHECK_TOTAL_MS = 90_000
const APPLY_TOTAL_MS = 150_000
const UPDATE_GRACE_MS = 30_000

type Install = { configDir: string; marketplace: string }

async function installNow($: EngineInterface): Promise<Install | null> {
  const real = installedFrom($.plugin.root) ?? syncedFrom($.plugin.root)
  if (real) return real
  return null
}

async function readJsonFile($: EngineInterface, path: string): Promise<unknown> {
  try {
    return JSON.parse(await $.fs.read(path)) as unknown
  } catch {
    return null
  }
}

async function ownVersion($: EngineInterface): Promise<string | null> {
  const v = ((await readJsonFile($, `${$.plugin.root}/.claude-plugin/plugin.json`)) as { version?: unknown } | null)?.version
  return typeof v === 'string' ? v : null
}

const knownMarkets = ($: EngineInterface, inst: Install): Promise<unknown> => readJsonFile($, `${inst.configDir}/plugins/known_marketplaces.json`)

async function marketDir($: EngineInterface, inst: Install): Promise<string> {
  const known = (await knownMarkets($, inst)) as Record<string, { installLocation?: unknown }> | null
  const loc = known?.[inst.marketplace]?.installLocation
  return typeof loc === 'string' && loc.trim() !== '' ? loc.replace(/\\/g, '/').replace(/\/$/, '') : `${inst.configDir}/plugins/marketplaces/${inst.marketplace}`
}

async function readMarket($: EngineInterface, inst: Install): Promise<{ market: string | null; marketAt: string | null }> {
  const market = marketVersionOf(await readJsonFile($, `${await marketDir($, inst)}/.claude-plugin/marketplace.json`))
  const known = (await knownMarkets($, inst)) as Record<string, { lastUpdated?: unknown }> | null
  const at = known?.[inst.marketplace]?.lastUpdated
  return { market, marketAt: typeof at === 'string' ? at : null }
}

async function readChanges($: EngineInterface, inst: Install | null, from: string | null, to: string | null): Promise<{ versions: string[]; changes: Record<string, ChangeGroup[]> }> {
  const root = $.plugin.root.replace(/\\/g, '/')
  const dirs = !inst ? [root, `${root}/docs/public`] : inst.marketplace === 'synced' ? [root] : [await marketDir($, inst)]
  const names = lang() === 'ko' ? ['CHANGELOG.ko.md', 'CHANGELOG.md'] : ['CHANGELOG.md', 'CHANGELOG.ko.md']
  for (const path of dirs.flatMap(dir => names.map(name => `${dir}/${name}`))) {
    let md: string
    try {
      md = await $.fs.read(path)
    } catch {
      continue
    }
    const changes: Record<string, ChangeGroup[]> = {}
    const versions: string[] = []
    for (const v of changelogVersionsBetween(md, from, to)) {
      const groups = changelogItems(md, v)
      if (groups && groups.length > 0) {
        changes[v] = groups
        versions.push(v)
      }
    }
    return { versions, changes }
  }
  return { versions: [], changes: {} }
}

async function refreshUpdateInfo($: EngineInterface): Promise<void> {
  await dropStaleUpdateJob($)
  const isJobLive = updateJob !== null
  const inst = await installNow($)
  const own = await ownVersion($)
  if (!inst || (inst.marketplace !== 'synced' && isFolderMarket(await knownMarkets($, inst), inst.marketplace))) {
    const got = await readChanges($, null, null, own)
    let devOff = false
    let devBuild = false
    await update($, updateInfo, prev => ({ ...prev, own, updatedTo: null, ...got, phase: 'dev', devOff, devBuild }))
    return
  }
  const seen = await $.store.get(SEEN_VERSION_KEY).catch(() => undefined)
  const updatedTo = own && seen !== own ? own : null
  if (inst.marketplace === 'synced') {
    const r = changeRange(own, null, seen, updatedTo)
    const got = await readChanges($, inst, r.from, r.to)
    await update($, updateInfo, prev => ({ ...prev, own, updatedTo, ...got, phase: 'synced' }))
    return
  }
  const m = await readMarket($, inst)
  const r = changeRange(own, m.market, seen, updatedTo)
  const got = await readChanges($, inst, r.from, r.to)
  const isAhead = versionGt(m.market, own)
  await update($, updateInfo, prev => {
    const was = !isJobLive && (prev.phase === 'checking' || prev.phase === 'updating') ? 'idle' : prev.phase
    return {
      ...prev,
      own,
      ...m,
      updatedTo,
      ...got,
      phase: (was === 'done' || was === 'newer') && !isAhead ? 'latest' : (was === 'idle' || was === 'latest' || was === 'dev') && isAhead ? 'newer' : was === 'dev' ? 'idle' : was,
    }
  })
}

async function seedSeenVersion($: EngineInterface): Promise<void> {
  if ((await $.store.get(SEEN_VERSION_KEY)) !== undefined) return
  if ((await $.store.keys()).length > 0) return
  const own = await ownVersion($)
  if (own) await $.store.set(SEEN_VERSION_KEY, own)
}

async function toggleUpdateDrawer($: EngineInterface): Promise<void> {
  if (await read($, updDrawer)) return closeUpdateDrawer($)
  await update($, updDrawer, () => true)
  void refreshUpdateInfo($).catch(() => {})
}

async function closeUpdateDrawer($: EngineInterface): Promise<void> {
  if (!(await read($, updDrawer))) return
  await update($, updDrawer, () => false)
  const upd = await read($, updateInfo)
  if (upd.updatedTo) {
    await $.store.set(SEEN_VERSION_KEY, upd.updatedTo).catch(() => {})
    void refreshUpdateInfo($).catch(() => {})
  }
  await update($, updateInfo, prev => ({ ...prev, open: {} }))
}

async function toggleUpdateOpen($: EngineInterface, key: 'error'): Promise<void> {
  await update($, updateInfo, prev => ({ ...prev, open: { ...prev.open, [key]: !prev.open?.[key] } }))
}

async function claudeCandidates($: EngineInterface): Promise<string[]> {
  const found: { version: string; path: string }[] = []
  for (const dir of await appDataDirs($)) {
    try {
      const vers = (await $.fs.list(`${dir}/claude-code`)).filter(f => f.kind === 'dir' && /^\d+\.\d+\.\d+$/.test(f.name)).map(f => f.name)
      for (const v of vers) {
        for (const build of await $.fs.list(`${dir}/claude-code/${v}`)) {
          if (build.kind !== 'dir') continue
          for (const exe of ['claude.exe', 'claude']) {
            const path = `${dir}/claude-code/${v}/${build.name}/${exe}`
            try {
              if ((await $.fs.stat(path)).kind === 'file') found.push({ version: v, path })
            } catch {
              // 그 빌드엔 이 이름이 없다
            }
          }
        }
      }
    } catch {
      // 앱 자료 폴더에 엔진이 없다
    }
  }
  found.sort((a, b) => (versionGt(a.version, b.version) ? -1 : versionGt(b.version, a.version) ? 1 : 0))
  return ['claude', ...found.map(f => f.path)]
}

async function runClaude($: EngineInterface, cmd: 'marketplace-update' | 'plugin-update', market: string, totalMs: number): Promise<{ exitCode: number; last: string; isTimeout?: boolean } | null> {
  if (!isMarketName(market)) return { exitCode: -1, last: L(`마켓 이름을 읽지 못함(${market})`, `Can't read the marketplace name (${market})`) }
  const start = await $.clock.now()
  for (const bin of await claudeCandidates($)) {
    const t0 = await $.clock.now()
    const timeoutMs = totalMs - (t0 - start)
    if (timeoutMs < 1000) return { exitCode: -1, last: '', isTimeout: true }
    try {
      const r =
        cmd === 'marketplace-update'
          ? await $.process.run([bin, 'plugin', 'marketplace', 'update', market], { timeoutMs })
          : await $.process.run([bin, 'plugin', 'update', `easy-session@${market}`], { timeoutMs })
      const lines = `${r.stdout}\n${r.stderr}`.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
      return { exitCode: r.exitCode, last: lines[lines.length - 1] ?? '' }
    } catch {
      if ((await $.clock.now()) - t0 >= timeoutMs - 1000) return { exitCode: -1, last: '', isTimeout: true }
    }
  }
  return null
}

let updateJob: { kind: 'check' | 'apply'; at: number } | null = null

async function dropStaleUpdateJob($: EngineInterface): Promise<void> {
  if (updateJob === null || updateJob.at === 0) return
  const limit = (updateJob.kind === 'check' ? CHECK_TOTAL_MS : APPLY_TOTAL_MS) + UPDATE_GRACE_MS
  if ((await $.clock.now()) - updateJob.at > limit) updateJob = null
}

/** 단추를 돌릴 설치본 — 폴더로 불러온 판 · 디렉터리 설치본 · 폴더 마켓 판은 null(단추 없음) */
async function marketInstall($: EngineInterface): Promise<Install | null> {
  const inst = await installNow($)
  if (!inst || inst.marketplace === 'synced' || isFolderMarket(await knownMarkets($, inst), inst.marketplace)) return null
  return inst
}

async function checkUpdate($: EngineInterface): Promise<void> {
  if (updateJob !== null) return
  const job = { kind: 'check' as const, at: 0 }
  updateJob = job
  try {
    job.at = await $.clock.now()
    const inst = await marketInstall($)
    if (!inst) return
    const cur = await read($, updateInfo)
    await update($, updateInfo, prev => ({ ...prev, phase: 'checking', error: undefined, failedOn: undefined, isTimeout: undefined }))
    const r = await runClaude($, 'marketplace-update', inst.marketplace, CHECK_TOTAL_MS)
    if (updateJob !== job) return
    const own = await ownVersion($)
    const m = await readMarket($, inst)
    const range = changeRange(own, m.market, await $.store.get(SEEN_VERSION_KEY).catch(() => undefined), cur.updatedTo)
    const got = await readChanges($, inst, range.from, range.to)
    const isFailed = !r || r.exitCode !== 0
    await update($, updateInfo, prev => ({
      ...prev,
      own,
      ...m,
      ...got,
      phase: isFailed ? 'failed' : versionGt(m.market, own) ? 'newer' : 'latest',
      error: isFailed && r ? (r.isTimeout ? L(`${CHECK_TOTAL_MS / 1000}초 안에 끝나지 않음`, `Didn't finish within ${CHECK_TOTAL_MS / 1000} seconds`) : r.last || `exit ${r.exitCode}`) : undefined,
      failedOn: isFailed ? 'check' : undefined,
      isTimeout: isFailed && r?.isTimeout === true ? true : undefined,
    }))
  } finally {
    if (updateJob === job) updateJob = null
  }
}

async function applyUpdate($: EngineInterface): Promise<void> {
  if (updateJob !== null) return
  const job = { kind: 'apply' as const, at: 0 }
  updateJob = job
  try {
    job.at = await $.clock.now()
    const inst = await marketInstall($)
    if (!inst) return
    await update($, updateInfo, prev => ({ ...prev, phase: 'updating', error: undefined, failedOn: undefined, isTimeout: undefined }))
    const r = await runClaude($, 'plugin-update', inst.marketplace, APPLY_TOTAL_MS)
    if (updateJob !== job) return
    const isFailed = !r || r.exitCode !== 0
    await update($, updateInfo, prev => ({
      ...prev,
      phase: isFailed ? 'failed' : 'done',
      error: isFailed && r ? (r.isTimeout ? L(`${APPLY_TOTAL_MS / 1000}초 안에 끝나지 않음`, `Didn't finish within ${APPLY_TOTAL_MS / 1000} seconds`) : r.last || `exit ${r.exitCode}`) : undefined,
      failedOn: isFailed ? 'apply' : undefined,
      isTimeout: isFailed && r?.isTimeout === true ? true : undefined,
    }))
  } finally {
    if (updateJob === job) updateJob = null
  }
}

async function askUpdate($: EngineInterface): Promise<void> {
  const inst = await marketInstall($)
  if (!inst || !isMarketName(inst.marketplace)) return
  await ask($, bothAsk(() => updateAskText(inst.marketplace)))
}

async function selfAppId($: EngineInterface): Promise<string | null> {
  const id = await $.env.get('CLAUDE_CODE_HOST_SESSION_ID').catch(() => undefined)
  return id?.startsWith('local_') ? id : null
}

async function engineId($: EngineInterface): Promise<string | null> {
  return (await $.session.id().catch(() => null)) || null
}

const TERMINAL_SURFACE = 'terminal'

async function engineServed($: EngineInterface, surface?: string): Promise<boolean> {
  if (surface !== undefined) return isVscodeSurface(surface) || surface === TERMINAL_SURFACE
  const list = await $.session.surfaces().catch(() => null)
  return list !== null && (hasVscode(list) || list.includes(TERMINAL_SURFACE))
}

async function selfKey($: EngineInterface, surface?: string): Promise<string | null> {
  const appId = await selfAppId($)
  if (appId) return appId
  return (await engineServed($, surface)) ? engineId($) : null
}

const reg = { files: new Map<string, { mtimeMs: number; entry: RegistryEntry }>() }

async function readRegistry($: EngineInterface): Promise<RegistryEntry[]> {
  const dir = `${await claudeHome($)}/sessions`
  const list = await $.fs.list(dir).catch((): FsEntry[] => [])
  const onDisk = new Map(list.filter(f => f.kind === 'file' && /^\d+\.json$/.test(f.name)).map(f => [f.name, f.mtimeMs]))
  for (const name of [...reg.files.keys()]) if (!onDisk.has(name)) reg.files.delete(name)
  for (const [name, mtimeMs] of onDisk) {
    if (reg.files.get(name)?.mtimeMs === mtimeMs) continue
    const entry = await $.fs.read(`${dir}/${name}`).then(parseRegistryEntry, () => null)
    if (entry) reg.files.set(name, { mtimeMs, entry })
    else reg.files.delete(name)
  }
  return [...reg.files.values()].map(f => f.entry)
}

/** 등록부가 바뀌면 다시 그리게 — 3초 비교(bumpTick)에 붙이는 값(readRegistry 뒤에) */
function registrySig(): string {
  return [...reg.files].map(([name, f]) => `|g${name}:${f.mtimeMs}`).join('')
}

async function canUseApp($: EngineInterface, s: { isApp: boolean } | null, surface: string | undefined): Promise<boolean> {
  if (!s?.isApp) return false
  if (surface === undefined || (!isVscodeSurface(surface) && surface !== 'terminal')) return true
  const list = await $.tool.list().catch(() => null)
  return list === null || list.length === 0 || list.some(t => t.name.startsWith('mcp__ccd_'))
}

function panelLook(surface: string, placement: string | undefined, isApp: boolean): PanelLook {
  return {
    isApp,
    isNarrow: paneIsCondensed(surface, placement),
    hasSwitch: !lacksClient(surface),
    rainbowHex: rainbowAsHex(surface),
    textPress: pressesText(surface),
    fluid: fillsByFlex(surface),
    isText: surface === TERMINAL_SURFACE,
  }
}

type SelfView = { selfId: string; metas: Map<string, SessionMeta>; isApp: boolean }

async function sessionSelf($: EngineInterface, surface?: string, isAll = false): Promise<SelfView | null> {
  const appId = await selfAppId($)
  if (appId) {
    const metas = await refreshApp($, isAll)
    return metas.has(appId) ? { selfId: appId, metas, isApp: true } : null
  }
  if (!(await engineServed($, surface))) return null
  const id = await engineId($)
  if (!id) return null
  const entry = (await readRegistry($)).find(r => r.sessionId === id) ?? null
  const cwd = entry?.cwd ? null : await $.session.cwd().catch(() => null)
  const metas = new Map(await refreshApp($).catch(() => new Map<string, SessionMeta>()))
  metas.set(id, engineMeta(id, entry, cwd))
  return { selfId: id, metas, isApp: false }
}

const app = {
  dir: null as string | null,
  files: new Map<string, { mtimeMs: number; meta: SessionMeta | null }>(),
  archived: null as Set<string> | null,
  indexMtimeMs: -1,
  isAllRead: false,
  ended: new Map<string, { mtimeMs: number; record: EndRecord | null }>(),
  /** 끝난 듯 후보(0.1.31 ② — <자료 폴더>/ending/<id>.json) */
  ending: new Map<string, { mtimeMs: number; record: { at: number; gist: string } | null }>(),
}

async function oauthIds($: EngineInterface): Promise<{ account: string; org: string } | null> {
  const dir = (await envPath(() => $.env.get('CLAUDE_CONFIG_DIR'))) ?? (await envPath(() => $.env.get('HOME'))) ?? (await envPath(() => $.env.get('USERPROFILE')))
  if (!dir) return null
  const text = await $.fs.read(`${dir}/.claude.json`).catch(() => null)
  return text === null ? null : oauthOf(text)
}

async function findAppSessions($: EngineInterface, selfId: string | null): Promise<string | null> {
  let account = await $.env.get('CLAUDE_CODE_ACCOUNT_UUID').catch(() => undefined)
  let org = await $.env.get('CLAUDE_CODE_ORGANIZATION_UUID').catch(() => undefined)
  if ((!account || !org) && selfId === null) {
    const ids = await oauthIds($)
    account = ids?.account
    org = ids?.org
  }
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

async function refreshEnded($: EngineInterface): Promise<Map<string, EndRecord>> {
  const dir = `${await dataDir($)}/sessions`
  const list = await $.fs.list(dir).catch((): FsEntry[] => [])
  const onDisk = new Map(list.filter(f => f.kind === 'file' && isKeyFile(f.name)).map(f => [idOfFile(f.name), f.mtimeMs]))
  for (const id of [...app.ended.keys()]) if (!onDisk.has(id)) app.ended.delete(id)
  for (const [id, mtimeMs] of onDisk) {
    if (app.ended.get(id)?.mtimeMs === mtimeMs) continue
    app.ended.set(id, { mtimeMs, record: await $.fs.read(`${dir}/${id}.json`).then(parseEndRecord, () => null) })
  }
  const out = new Map<string, EndRecord>()
  for (const [id, f] of app.ended) if (f.record) out.set(id, f.record)
  return out
}

const ENDING_DIR = 'ending'
async function refreshEnding($: EngineInterface): Promise<Set<string>> {
  const dir = `${await dataDir($)}/${ENDING_DIR}`
  const list = await $.fs.list(dir).catch((): FsEntry[] => [])
  const onDisk = new Map(list.filter(f => f.kind === 'file' && isKeyFile(f.name)).map(f => [idOfFile(f.name), f.mtimeMs]))
  for (const id of [...app.ending.keys()]) if (!onDisk.has(id)) app.ending.delete(id)
  for (const [id, mtimeMs] of onDisk) {
    if (app.ending.get(id)?.mtimeMs === mtimeMs) continue
    app.ending.set(id, { mtimeMs, record: await $.fs.read(`${dir}/${id}.json`).then(parseEnding, () => null) })
  }
  return new Set([...app.ending].filter(([, f]) => f.record !== null).map(([id]) => id))
}

// 끝남 기록 · 보내기 확인 · 잠금 풀기 · [모두 보관] 셈은 이 파일을 안 본다(끝남이 아님 — 사람이 [끝내기]로 확정)
async function noteEnding($: EngineInterface, answer: string): Promise<void> {
  const id = await selfKey($)
  if (!id) return
  const path = `${await dataDir($)}/${ENDING_DIR}/${id}.json`
  const hit = endingOf(answer)
  const at = await $.clock.now()
  if (hit) {
    await $.fs.write(path, JSON.stringify({ v: 1, at, gist: hit.gist }))
    return
  }
  const old = await $.fs.read(path).then(parseEnding, () => null)
  if (old) await $.fs.write(path, JSON.stringify({ v: 1, cleared: true, at }))
}

async function writeContextReport($: EngineInterface, model: string | null): Promise<void> {
  const id = await selfKey($)
  if (!id) return
  const usage = await $.session.usage()
  const tokens = usage.context.tokens
  if (typeof tokens !== 'number' || tokens <= 0) return
  const text = contextReportText({ tokens, window: usage.context.window, model, at: await $.clock.now() })
  await $.fs.write(`${await dataDir($)}/context/${id}.json`, text)
}

// ── 데스크톱 새 패널 · 입력창 쪽(실물 확인판 2026-10-25) — 노트: register.md#appSelf ────────────────────────

/** 이 세션이 앱 세션이고 메타가 있으면 그 자료 — 아니면 null(터미널 · 시험 · 앱 자료 없음 → 지금 msg 꼴) */
async function appSelf($: EngineInterface, isAll = false): Promise<{ selfId: string; metas: Map<string, SessionMeta> } | null> {
  const selfId = await selfAppId($)
  if (!selfId) return null
  const metas = await refreshApp($, isAll)
  return metas.has(selfId) ? { selfId, metas } : null
}

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

async function reportDefault($: EngineInterface): Promise<boolean> {
  return (await $.store.get(REPORT_DEFAULT_KEY).catch(() => undefined)) !== 'off'
}

/** [설정] 「자식 보고」 — hold = 패널에 모아 둠('off') · app = 앱 그대로('on'). 이름은 368 폭에서 안 잘리게 짧게(0.1.29 ② F5 — 옛 「사이드 패널에 모아 둠」) */
const REPORT_MODES = [
  {
    value: 'hold',
    get label() {
      return L('패널에 모아 둠', 'Hold in the panel')
    },
  },
  {
    value: 'app',
    get label() {
      return L('앱 그대로', "The app's way")
    },
  },
] as const

async function setReportMode($: EngineInterface, value: string): Promise<void> {
  if (value !== 'app' && value !== 'hold') return
  const want = value === 'app' ? 'on' : 'off'
  if ((await $.store.get(REPORT_DEFAULT_KEY).catch(() => undefined)) === want) return
  await $.store.set(REPORT_DEFAULT_KEY, want)
  await update($, appTick, n => n + 1)
}

// ── 오케 세션 트리 기록 — $.store 에 세션마다 열쇠(두 세션이 같이 눌러도 안 덮음). 노트: register.md#links ──────────────
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

let heldLine: Promise<unknown> = Promise.resolve()

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

const heldCache = new Map<string, { mtimeMs: number; n: number }>()

async function heldCounts($: EngineInterface): Promise<Map<string, number>> {
  const list = await $.fs.list(`${await dataDir($)}/reports`).catch((): FsEntry[] => [])
  const onDisk = new Map(list.filter(f => f.kind === 'file' && isKeyFile(f.name)).map(f => [idOfFile(f.name), f.mtimeMs]))
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
    const { fresh, quiet } = splitRelayed(split.held, await relayMarks($), selfId, lastArrivedAt, false)
    await editHeld($, selfId, box => settleArrived(box, fresh))
    await dropMarks($, quiet)
    await update($, appTick, n => n + 1)
  }
  return split.isEmpty ? { text: split.text, drop: dropReason() } : { text: split.text }
}

const ARRIVE_QUIET_MS = 15_000
let lastArrivedAt = 0

async function takeFromQueue($: EngineInterface, selfId: string, metas: ReadonlyMap<string, SessionMeta>): Promise<void> {
  const queued = queuedReports(metas.get(selfId)?.queued ?? [])
  if (queued.length === 0 || (await $.clock.now()) - lastArrivedAt < ARRIVE_QUIET_MS) return
  if (reportStateOf(selfId, metas, await reportSwitches($), await reportDefault($)).on) return
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
const RELAY_SELF_SEND = (): string => L('easy-session 이 이 차례 끝 답을 그 세션으로 보냅니다. 직접 보내지 말고 답만 쓰세요.', "easy-session sends this turn's last answer to that session. Don't send it yourself — just write the answer.")

async function readPending($: EngineInterface, selfId: string): Promise<RelayPending | null> {
  return parsePending(await $.store.get(`${RELAY_PREFIX}${selfId}`).catch(() => undefined))
}

async function writePending($: EngineInterface, selfId: string, p: RelayPending | null): Promise<void> {
  if (p) await $.store.set(`${RELAY_PREFIX}${selfId}`, p)
  else await $.store.delete(`${RELAY_PREFIX}${selfId}`)
  await update($, appTick, n => n + 1)
}

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
      return isMainWord(word) ? L('이 세션이 이 세션 트리의 메인입니다', 'This session is the main of this session tree') : L(`「${word}」은 이 세션 이름입니다`, `“${word}” is this session's name`)
    case 'crowns':
      return L(`왕관 세션이 ${found.names.length}개라 메인을 못 정했습니다: ${names}. 전달 칸에서 고르세요`, `${found.names.length} crowned sessions, so no single main: ${names}. Pick one in Forward`)
    case 'many':
      return L(`「${word}」과 맞는 세션이 ${found.names.length}개입니다: ${names}`, `${found.names.length} sessions match “${word}”: ${names}`)
    case 'name':
      return RELAY_UP_ONLY()
    case 'none':
      return isMainWord(word) ? L('이 세션 트리에 메인이 없습니다', 'This session tree has no main') : isUpWord(word) ? L('위 세션이 없습니다', 'No session above') : L(`「${word}」과 맞는 세션이 없습니다`, `No session matches “${word}”`)
  }
}

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
  const links = await storeLinks($)
  const found = findTarget(sig.word, selfId, metas, links)
  if ('miss' in found) {
    toast($, L(`보내지 않습니다 — ${relayMissText(sig.word, found)}`, `Not sent — ${relayMissText(sig.word, found)}`))
    return found.miss === 'name' ? relayNameContext(sig.word) : relayMissContext(sig.word)
  }
  const way = relayWay(metas.get(selfId)?.mode, metas.get(found.id)?.mode)
  await writePending($, selfId, { to: found.id, word: sig.word, way, own: sig.rest, at: await $.clock.now(), turnId: e.turnId ?? null })
  const hold = holdRisk(metas.get(selfId)?.mode, metas.get(found.id)?.mode)
  return relayContext({ word: sig.word, title: metas.get(found.id)?.title ?? found.id, to: found.id, way, isBare: sig.rest === '', hold })
}

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
  let entries: RegistryEntry[] | null = null
  for (const s of senders) {
    let rel = peerRelOf(selfId, peerIdOf(s, metas), tree, links.orche)
    if (rel?.kind === 'unknown') {
      entries ??= await readRegistry($)
      const e = peerEntryOf(s, entries)
      const tag = e && e.entrypoint !== DESKTOP_ENTRY ? outsideTag(e) : null
      if (e && tag) rel = { kind: 'outside', title: e.name ?? s.name ?? L('제목 없음', 'Untitled'), surface: tag }
    }
    if (rel) lines.push(peerLine(rel))
  }
  return lines.length > 0 ? lines.join('\n') : null
}

// 스위치(처음 값 꺼짐) 뒤 · 앱 자료 · 끝남 기록 · 끝난 듯 · 엔진 등록부(도는 중)를 읽고, 하나라도 못 읽으면 그 칸만 빈다(글은 그대로 간다)
async function mentionSubmit($: EngineInterface, text: string): Promise<string | null> {
  if (!(await storeOn($, MENTION_KEY))) return null
  const metas = await refreshApp($)
  const selfId = (await selfAppId($).catch(() => null)) ?? ''
  const hits = mentionHits(text, selfId, metas)
  if (hits.length === 0) return null
  const tree = withTree(metas, await storeLinks($))
  const ended = await refreshEnded($).catch((): Map<string, EndRecord> => new Map())
  const ending = await refreshEnding($).catch((): Set<string> => new Set())
  const entries = await readRegistry($).catch((): RegistryEntry[] => [])
  const busy = new Set(entries.filter(e => e.status === 'busy' && e.hostSessionId !== null).map(e => e.hostSessionId!))
  const now = await $.clock.now()
  return hits.map(m => mentionLine(m, { now, tree, ended, ending, busy })).join('\n')
}

async function relayCard($: EngineInterface, selfId: string, to: string, title: string, text: string): Promise<void> {
  const path = `${await dataDir($)}/${OUTBOX_DIR}/${selfId}.json`
  const items = await $.fs.read(path).then(parseOutbox, (): OutItem[] => [])
  await $.fs.write(path, outboxText([...items, { to, title, text, at: await $.clock.now() }]))
}

/** 끝난 뒤: 알림 + 대화의 답 아래 줄(띠는 안 움직인다) */
function relayEnd($: EngineInterface, text: string, isDone = false): void {
  toast($, text, isDone)
  log($, text)
}

function watchReceipt($: EngineInterface, selfId: string, to: string, at: number, card: { title: string; text: string }, left: readonly number[] = RELAY_WATCH_MS): void {
  const [wait, ...rest] = left
  if (wait === undefined) return
  $.clock.after(wait, () => {
    void (async () => {
      const metas = await refreshApp($)
      const r = (metas.get(selfId)?.receipts ?? []).filter(x => x.to === to && x.sentAt >= at - RELAY_SLACK_MS).at(-1)
      if (r && receiptState(r) === 'undelivered') {
        await relayCard($, selfId, to, card.title, card.text)
        const gone = metas.get(to)?.isArchived ? L(' — 받는 곳 보관됨', ' — the receiver is archived') : ''
        relayEnd($, L(`「${relayName(metas, to)}」가 받지 않아(${r.reason ?? '까닭 모름'}) 그 세션 패널에 넣었습니다${gone}`, `“${relayName(metas, to)}” didn't take it (${r.reason ?? 'no reason given'}), so it went into that session's panel${gone}`))
      } else if (!r || receiptState(r) === 'sent') watchReceipt($, selfId, to, at, card, rest)
    })().catch(err => log($, `보낸 글 도착 확인 실패 — ${String(err)}`))
  })
}

async function finishRelay($: EngineInterface, e: { turnId: string; answer: string; reason: string; isAborted: boolean }): Promise<void> {
  const selfId = await selfAppId($)
  if (!selfId) return
  const p = await readPending($, selfId)
  if (!p || (p.turnId !== null && p.turnId !== e.turnId)) return
  await writePending($, selfId, null)
  const metas = await refreshApp($)
  const name = relayName(metas, p.to)
  if (e.isAborted || e.reason !== 'answer') return relayEnd($, L(`차례가 끝까지 돌지 않아 「${name}」에 보내지 않았습니다`, `The turn didn't finish, so nothing was sent to “${name}”`))
  const mark = async () => {
    if (metas.get(selfId)?.parent === p.to) await $.store.set(`${RELAYED_PREFIX}${selfId}`, { to: p.to, at: await $.clock.now() } satisfies RelayMark)
  }
  const text = relayText({ word: p.word, own: p.own, answer: e.answer })
  const title = metas.get(selfId)?.title ?? selfId
  if (p.way === 'model' && p.modelSent) {
    await mark()
    watchReceipt($, selfId, p.to, p.at, { title, text })
    return relayEnd($, L(`Claude 가 「${name}」에 보냈습니다`, `Claude sent it to “${name}”`), true)
  }
  if (e.answer.trim() === '') return relayEnd($, L(`끝 답에 글이 없어 「${name}」에 보내지 않았습니다`, `The last answer had no text, so nothing was sent to “${name}”`))
  await mark()
  if (p.way === 'direct') {
    const at = await $.clock.now()
    const sent = await $.session.send({ to: p.to, text }).catch((err: unknown) => ({ isDelivered: false as const, reason: String(err) }))
    if (sent.isDelivered) {
      watchReceipt($, selfId, p.to, at, { title, text })
      const hold = holdRisk(metas.get(selfId)?.mode, metas.get(p.to)?.mode) ? ` — ${holdLine()}` : ''
      return relayEnd($, L(`「${name}」에 끝 답을 보냈습니다${hold}`, `Sent the last answer to “${name}”${hold}`), true)
    }
    await relayCard($, selfId, p.to, title, text)
    return relayEnd($, L(`「${name}」에 못 보내 그 세션 패널에 넣었습니다 — ${firstLine(sent.reason)}`, `Couldn't send to “${name}”, so it went into that session's panel — ${firstLine(sent.reason)}`))
  }
  await relayCard($, selfId, p.to, title, text)
  relayEnd($, p.way === 'model' ? L(`Claude 가 보내지 않아 「${name}」 패널에 넣었습니다`, `Claude didn't send it, so it went into the “${name}” panel`) : L(`「${name}」 패널에 넣었습니다. 거기서 수락하면 처리합니다`, `Put in the “${name}” panel. It runs once accepted there`), p.way !== 'model')
}

const outboxSeen = new Map<string, number>()

async function takeOutboxCards($: EngineInterface, selfId: string): Promise<void> {
  const dir = `${await dataDir($)}/${OUTBOX_DIR}`
  for (const f of await $.fs.list(dir).catch((): FsEntry[] => [])) {
    if (f.kind !== 'file' || !isKeyFile(f.name)) continue
    const from = idOfFile(f.name)
    if (from === selfId || outboxSeen.get(from) === f.mtimeMs) continue
    const items = parseOutbox(await $.fs.read(`${dir}/${f.name}`))
    if (await editHeld($, selfId, box => takeOutbox(box, from, items, selfId))) await update($, appTick, n => n + 1)
    outboxSeen.set(from, f.mtimeMs)
  }
}

const RELAY_TEXT_HEAD = (): string => L(`${RELAY_TEXT_HEADS[0]}(Claude 답이 아닙니다).`, `${RELAY_TEXT_HEADS[1]} (not an answer from Claude).`)

async function relayTextOnly($: EngineInterface): Promise<void> {
  const s = await appSelf($)
  if (!s) return
  const draft = (await $.prompt.read().catch(() => null))?.text ?? ''
  const sig = signalOf(draft)
  if (!sig || sig.rest === '') return toast($, L('보낼 글이 없습니다', 'Nothing to send'))
  const found = findTarget(sig.word, s.selfId, s.metas, await storeLinks($))
  if ('miss' in found) return toast($, L(`보내지 않습니다 — ${relayMissText(sig.word, found)}`, `Not sent — ${relayMissText(sig.word, found)}`))
  const name = relayName(s.metas, found.id)
  // 입력창 글 그대로(붙여 넣은 글도 — 신호 · ultrathink 낱말만 뺀다)
  const text = withKind(`${RELAY_TEXT_HEAD()}\n\n${withSignal(draft, null).replace(/^\s*ultrathink\s+/i, '').trim()}`, 'note')
  if (s.metas.get(s.selfId)?.mode === 'bypassPermissions') {
    const at = await $.clock.now()
    const sent = await $.session.send({ to: found.id, text }).catch((err: unknown) => ({ isDelivered: false as const, reason: String(err) }))
    if (!sent.isDelivered) return toast($, L(`보내지 못했습니다 — ${firstLine(sent.reason)}`, `Couldn't send — ${firstLine(sent.reason)}`))
    watchReceipt($, s.selfId, found.id, at, { title: s.metas.get(s.selfId)?.title ?? s.selfId, text })
    const hold = holdRisk(s.metas.get(s.selfId)?.mode, s.metas.get(found.id)?.mode) ? ` — ${holdLine()}` : ''
    relayEnd($, L(`「${name}」에 글을 보냈습니다${hold}`, `Sent the text to “${name}”${hold}`), true)
  } else {
    await relayCard($, s.selfId, found.id, s.metas.get(s.selfId)?.title ?? s.selfId, text)
    relayEnd($, L(`「${name}」 패널에 넣었습니다. 거기서 수락하면 처리합니다`, `Put in the “${name}” panel. It runs once accepted there`), true)
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

async function pickSend($: EngineInterface, value: string): Promise<void> {
  const s = await appSelf($)
  if (!s) return
  const links = await storeLinks($)
  const main = mainOf(s.selfId, s.metas, links)
  const upHit = findTarget('위', s.selfId, s.metas, links)
  const upId = 'id' in upHit ? upHit.id : null
  const picked = value === SEND_MAIN ? ('id' in main ? main.id : null) : value === SEND_NONE || value === SEND_MISS ? null : value
  const word = value === SEND_MAIN ? (picked ? L('메인', 'main') : null) : picked !== null && picked === upId ? L('위', 'up') : null
  const to = word === null ? null : picked
  const p = await readPending($, s.selfId)
  if (p) {
    if (!to || !word) {
      await writePending($, s.selfId, null)
      return toast($, L('이 차례 끝 답은 보내지 않습니다', "This turn's last answer won't be sent"))
    }
    return writePending($, s.selfId, { ...p, to, word, way: relayWay(s.metas.get(s.selfId)?.mode, s.metas.get(to)?.mode) })
  }
  const text = (await $.prompt.read().catch(() => null))?.text ?? ''
  if (/^\s*\/\S/.test(text)) return toast($, L('슬래시 명령 글에는 신호를 넣지 않습니다', "A slash command doesn't take a send signal"))
  const filled = await $.prompt.fill({ text: withSignal(text, word), mode: 'replace' }).catch(() => ({ isFilled: false }))
  if (!filled.isFilled) toast($, L('입력창에 넣지 못했습니다', "Couldn't put it in the prompt box"))
  await update($, appTick, n => n + 1)
}

// 목록엔 메인 · 위 세션만(0.1.29 ③ F9 — 입력창 보내기는 위로만). 줄 글은 고른 값이 바뀌어도 그대로다 — 앱은 고르는 순간 그 글을 값 칸에 넣는다(노트 panel.md#sendCell). 하위 · 형제는 패널 그 칸 [보내기]
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
  const near = sendTargets(selfId, withTree(metas, links), mainId)
  const mainName = mainId ? sendName(titleOf(mainId), metas) : ''
  const rows: { value: string; label: string }[] = [
    { value: SEND_NONE, label: labelOf(L('없음', 'None')) },
    ...(mainId ? [{ value: SEND_MAIN, label: labelOf(mainName.includes('메인') || /\bmain\b/i.test(mainName) ? mainName : L(`메인 · ${mainName}`, `Main · ${mainName}`)) }] : []),
    ...near.map(id => ({ value: id, label: labelOf(L(`위 · ${sendName(titleOf(id), metas)}`, `Up · ${sendName(titleOf(id), metas)}`)) })),
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
    return { ...base, value, options: rows, state: 'on', canText: null, tip: p.way === 'card' ? L(`이 차례 끝 답을 「${nameOf(p.to)}」 패널에 넣습니다 · 없음을 고르면 취소`, `This turn's last answer goes into the “${nameOf(p.to)}” panel · pick None to cancel`) : L(`이 차례 끝 답을 「${nameOf(p.to)}」로 보냅니다 · 없음을 고르면 취소`, `This turn's last answer goes to “${nameOf(p.to)}” · pick None to cancel`) }
  }
  // 슬래시 명령 글은 신호로 안 읽는다(prompt.submit 도 건너뜀)
  const sig = /^\s*\/\S/.test(draft) ? null : signalOf(draft)
  if (!sig) return { ...base, value: SEND_NONE, options: rows, state: 'idle', canText: null, tip: L(`${mainId ? `메인: ${nameOf(mainId)} · ` : ''}입력창 보내기는 위 세션 · 메인만(>>위 · >>메인)`, `${mainId ? `Main: ${nameOf(mainId)} · ` : ''}the prompt box sends only to the session above or the main (>>up · >>main)`) }
  const found = findTarget(sig.word, selfId, metas, links)
  if ('miss' in found) {
    rows.push({ value: SEND_MISS, label: labelOf(L('못 찾음', 'Not found')) })
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
    tip:
      way === 'card'
        ? L(`권한 모드가 달라 「${nameOf(found.id)}」 패널로 갑니다`, `Permission modes differ, so it goes into the “${nameOf(found.id)}” panel`)
        : L(
            `Enter 면 끝 답을 「${nameOf(found.id)}」로 보냅니다${holdRisk(metas.get(selfId)?.mode, metas.get(found.id)?.mode) ? ` · ${HOLD_SHORT()}` : ''}`,
            `On Enter the last answer goes to “${nameOf(found.id)}”${holdRisk(metas.get(selfId)?.mode, metas.get(found.id)?.mode) ? ` · ${HOLD_SHORT()}` : ''}`,
          ),
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

// 먼저 지우고 보낸다 — 안 들어가면(막힘 · 던짐) 되돌린다
async function acceptHeld($: EngineInterface, keys: HeldPick): Promise<void> {
  const id = await selfKey($)
  if (!id) return
  let pick: HeldReport[] = []
  await editHeld($, id, box => {
    pick = pickHeld(box.items, keys)
    return pick.length === 0 ? null : { ...box, items: box.items.filter(r => !pick.includes(r)) }
  })
  if (pick.length === 0) return
  await update($, appTick, n => n + 1)
  if (isWorking) toast($, L('답이 끝나면 처리합니다', 'It runs once the answer ends'))
  const r = await $.prompt.submit({ text: heldText(pick, await $.clock.now()), asUser: true }).catch((err: unknown) => ({ drop: String(err) }))
  if (r.drop === undefined) return
  await editHeld($, id, box => ({ ...box, items: [...pick, ...box.items.filter(x => !pick.some(p => heldKey(p) === heldKey(x)))].sort((a, b) => a.at - b.at) }))
  await update($, appTick, n => n + 1)
  toast($, L(`보내지 못했습니다 — ${firstLine(r.drop)}`, `Couldn't send — ${firstLine(r.drop)}`))
}

/** 거절: 처리하지 않고 지운다. keys 가 null 이면 전체 삭제, 여럿이면 카드의 전체 삭제(그 보낸 세션 것) */
async function rejectHeld($: EngineInterface, keys: HeldPick): Promise<void> {
  const id = await selfKey($)
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
  const id = await selfKey($)
  if (!id) return
  const p = path.trim().replace(/^["']|["']$/g, '')
  if (!/\.md$/i.test(p)) {
    toast($, L('md 파일 경로를 넣어 주세요', 'Enter the path of an .md file'))
    return
  }
  const text = await $.fs.read(p).catch(() => null)
  if (text === null) {
    toast($, L('그 파일을 못 읽었습니다', "Couldn't read that file"))
    return
  }
  await writeBoard($, id, { path: p, seen: boardLines(text).map(boardKey) })
  await update($, panelUi, u => ({ ...u, folds: u.folds.filter(f => f !== 'board-edit') }))
  await update($, appTick, n => n + 1)
  toast($, L(`진행판을 ${baseName(p)}${josa(baseName(p), '으로', '로')} 정했습니다`, `Progress board set to ${baseName(p)}`), true)
}

/** 새 줄을 입력칸에 넣고(보내는 건 사람) 본 줄로 */
async function boardFill($: EngineInterface): Promise<void> {
  const id = await selfKey($)
  const b = id ? await readBoard($, id) : null
  if (!id || !b) return
  const text = await $.fs.read(b.path).catch(() => null)
  if (text === null) {
    toast($, L('진행판을 못 읽었습니다', "Couldn't read the progress board"))
    return
  }
  const fresh = freshLines(text, new Set(b.seen))
  if (fresh.length === 0) return
  if (!(await fillPrompt($, [L(`진행판 새 줄 ${fresh.length} — ${b.path}`, `Progress board: ${fresh.length} new ${fresh.length === 1 ? 'line' : 'lines'} — ${b.path}`), ...fresh].join('\n')))) {
    toast($, L('입력칸에 넣지 못했습니다', "Couldn't put it in the prompt box"))
    return
  }
  await writeBoard($, id, { ...b, seen: [...b.seen, ...fresh.map(boardKey)] })
  await update($, appTick, n => n + 1)
}

/** 이 세션(오케)이 Edit · Write 로 진행판을 고치면 그 사이 생긴 줄은 본 줄로 — 주인이 쓴 줄이 주인에게 새 줄로 안 뜨게 */
async function seenOwnEdit<R>($: EngineInterface, filePath: unknown, run: () => Promise<R>): Promise<R> {
  const id = typeof filePath === 'string' ? await selfKey($).catch(() => null) : null
  const b = id ? await readBoard($, id).catch(() => null) : null
  if (!id || typeof filePath !== 'string') return run()
  if (!b || !samePath(filePath, b.path)) return endByBoard($, id, filePath, run)
  const keysNow = async () => boardLines((await $.fs.read(b.path).catch(() => null)) ?? '').map(boardKey)
  const before = new Set(await keysNow())
  const r = await run()
  const added = (await keysNow()).filter(k => !before.has(k))
  if (added.length > 0) await writeBoard($, id, { ...b, seen: [...b.seen, ...added] }).catch(() => {})
  return r
}

// 자료 폴더 diag/first-draw.json 에(최근 FIRST_DRAW_KEEP 줄). 화면엔 안 보인다. 그리는 중엔 상태 · 파일을 안 쓰고 그린 뒤 시계로
const FIRST_DRAW_FILE = 'diag/first-draw.json'
const FIRST_DRAW_KEEP = 50
let sessionStartAt: number | null = null
let firstDrawn = false
type FirstDraw = { at: number; ms: number; drawMs: number; metas: number; surface: string | null; session: string | null }

async function noteFirstDraw($: EngineInterface, t0: number, surface: string | undefined): Promise<void> {
  if (firstDrawn || sessionStartAt === null) return
  firstDrawn = true
  const t1 = await $.clock.now()
  const rec: FirstDraw = { at: t1, ms: Math.max(0, t0 - sessionStartAt), drawMs: Math.max(0, t1 - t0), metas: app.files.size, surface: surface ?? null, session: await selfKey($).catch(() => null) }
  $.clock.after(1, () => {
    void (async () => {
      const path = `${await dataDir($)}/${FIRST_DRAW_FILE}`
      const old = await $.fs.read(path).then(parseFirstDraws, (): FirstDraw[] => [])
      await $.fs.write(path, JSON.stringify({ v: 1, items: [...old, rec].slice(-FIRST_DRAW_KEEP) }))
    })().catch(err => log($, `첫 그리기 기록 실패 — ${String(err)}`))
  })
}

/** diag/first-draw.json 꼴 — 깨졌거나 꼴이 다르면 빈 목록(새로 씀). 줄은 숫자 칸이 다 있는 것만 */
function parseFirstDraws(text: string): FirstDraw[] {
  const v = jsonOf(text)
  const items = Array.isArray(v?.items) ? (v.items as unknown[]) : []
  return items.flatMap(x => {
    const o = asObj(x)
    const num = (k: string) => (typeof o?.[k] === 'number' ? (o[k] as number) : null)
    const at = num('at'), ms = num('ms'), drawMs = num('drawMs'), metas = num('metas')
    if (at === null || ms === null || drawMs === null || metas === null) return []
    return [{ at, ms, drawMs, metas, surface: typeof o?.surface === 'string' ? o.surface : null, session: typeof o?.session === 'string' ? o.session : null }]
  })
}

// 진단 줄 diag/pane-events.json(화면엔 안 보임). 값은 모듈 값(이 엔진 프로세스 몫 — 판을 다시 불러오면 빈다)
const PANE_EVENTS_FILE = 'diag/pane-events.json'
const PANE_EVENTS_KEEP = 200
const PANE_EVENTS_FLUSH_MS = 5_000
/** 이보다 오래 걸린 그림은 진단 줄(slow) */
const PANE_SLOW_MS = 500
/** 화면 폭 값이 숫자가 아닐 때 쓰는 칸 수 */
const PANE_COLS_FALLBACK = 40
/** ⓐ 같은 오류가 이어질 때 다시 그리기 사이 ★ */
const PANE_RETRY_MS = 10_000
/** ⓐ 같은 진단 줄(오류 · 가벼운 그림)을 다시 적는 사이 — 오류가 이어져도 200줄을 금방 채우지 않게 */
const PANE_EVENT_REPEAT_MS = 60_000
/** ⓑ 화면이 붙은 뒤 그림이 없으면 다시 그리기를 부르는 때 ★(세 번까지) · 그 뒤 그침 줄 */
const UNSTICK_AT = [3_000, 6_000, 12_000] as const
const UNSTICK_GIVE_UP_MS = 24_000
type PaneEventKind = 'error' | 'light' | 'unstick' | 'attach' | 'detach' | 'slow' | 'press'
type PaneEvent = { at: number; kind: PaneEventKind; session: string | null; surface: string | null; ms?: number; detail?: string }
let paneEvents: Omit<PaneEvent, 'session'>[] = []
let paneFlushSet = false
let paneEventSeen = new Map<string, number>()
/** 마지막으로 Pane 그림을 끝낸 때(돌려주기 직전 — 가벼운 그림 포함) */
let lastPaneDrawAt: number | null = null
/** 화면이 붙은 때(surfaces 가 빔 → 안 빔) · 지금 화면 수 · 이번 붙음에 부른 다시 그리기 수 */
let paneAttachedAt: number | null = null
let paneSurfaceCount = 0
let unstickTries = 0
let unstickGaveUp = false
/** ⓐ 다시 그리기 — 마지막으로 부른(부를) 때 · 그 까닭 열쇠 · 걸어 둔 시계가 있나 */
let paneRetryAt: number | null = null
let paneRetryKey: string | null = null
let paneRetrySet = false

/** 새 엔진 프로세스(session.start) — 진단 · 풀기 값을 비운다(앞 판 · 앞 시험의 시계가 남긴 표시를 안 이어 가게) */
function resetPaneGuard(): void {
  paneEvents = []
  paneFlushSet = false
  paneEventSeen = new Map()
  lastPaneDrawAt = null
  paneAttachedAt = null
  paneSurfaceCount = 0
  unstickTries = 0
  unstickGaveUp = false
  paneRetryAt = null
  paneRetryKey = null
  paneRetrySet = false
}

/** 다시 그리기 — 못 부르는 곳(시험 등)은 넘김 */
function invalidatePane($: EngineInterface): void {
  try {
    $.ui.invalidate('ui.render')
  } catch {
    // 다시 그리기를 못 부르는 곳
  }
}

function notePaneEvent($: EngineInterface, ev: Omit<PaneEvent, 'session'>, repeatKey?: string): void {
  if (repeatKey !== undefined) {
    const seen = paneEventSeen.get(repeatKey)
    if (seen !== undefined && ev.at - seen < PANE_EVENT_REPEAT_MS) return
    paneEventSeen.set(repeatKey, ev.at)
  }
  paneEvents.push(ev)
  if (paneFlushSet) return
  paneFlushSet = true
  $.clock.after(PANE_EVENTS_FLUSH_MS, () => {
    paneFlushSet = false
    const batch = paneEvents
    paneEvents = []
    void (async () => {
      const session = await selfKey($).catch(() => null)
      const path = `${await dataDir($)}/${PANE_EVENTS_FILE}`
      const old = await $.fs.read(path).then(parsePaneEvents, (): PaneEvent[] => [])
      await $.fs.write(path, JSON.stringify({ v: 1, items: [...old, ...batch.map(x => ({ ...x, session }))].slice(-PANE_EVENTS_KEEP) }))
    })().catch(err => log($, `패널 진단 기록 실패 — ${String(err)}`))
  })
}

function notePress($: EngineInterface, what: string): void {
  void $.clock.now().then(at => notePaneEvent($, { at, kind: 'press', surface: null, detail: what }), () => {})
}

/** diag/pane-events.json 꼴 — 깨졌거나 꼴이 다르면 빈 목록(새로 씀). 줄은 at · kind 가 맞는 것만 */
function parsePaneEvents(text: string): PaneEvent[] {
  const v = jsonOf(text)
  const items = Array.isArray(v?.items) ? (v.items as unknown[]) : []
  const kinds: readonly string[] = ['error', 'light', 'unstick', 'attach', 'detach', 'slow', 'press']
  return items.flatMap(x => {
    const o = asObj(x)
    if (typeof o?.at !== 'number' || typeof o.kind !== 'string' || !kinds.includes(o.kind)) return []
    const ev: PaneEvent = { at: o.at, kind: o.kind as PaneEventKind, session: typeof o.session === 'string' ? o.session : null, surface: typeof o.surface === 'string' ? o.surface : null }
    if (typeof o.ms === 'number') ev.ms = o.ms
    if (typeof o.detail === 'string') ev.detail = o.detail
    return [ev]
  })
}

function paneRetry($: EngineInterface, key: string, now: number): void {
  if (paneRetrySet) return
  const wait = paneRetryKey === key && paneRetryAt !== null ? Math.max(1, paneRetryAt + PANE_RETRY_MS - now) : 1
  paneRetrySet = true
  paneRetryAt = now + wait
  paneRetryKey = key
  $.clock.after(wait, () => {
    paneRetrySet = false
    invalidatePane($)
  })
}

// 그래도 없으면 24초에 그침 줄 하나. 화면이 없는 세션은 안 센다
async function unstickPane($: EngineInterface): Promise<void> {
  const surfaces = await $.session.surfaces()
  const now = await $.clock.now()
  if (surfaces.length === 0) {
    if (paneSurfaceCount > 0) notePaneEvent($, { at: now, kind: 'detach', surface: null })
    paneSurfaceCount = 0
    paneAttachedAt = null
    return
  }
  if (paneSurfaceCount === 0) {
    paneAttachedAt = now
    unstickTries = 0
    unstickGaveUp = false
    notePaneEvent($, { at: now, kind: 'attach', surface: surfaces.join(',') })
  }
  paneSurfaceCount = surfaces.length
  if (paneAttachedAt === null || (lastPaneDrawAt !== null && lastPaneDrawAt >= paneAttachedAt)) return
  if (!(await $.ui.panes()).some(pane => pane.id === PANE)) return
  const waited = now - paneAttachedAt
  if (unstickTries < UNSTICK_AT.length) {
    if (waited < UNSTICK_AT[unstickTries]!) return
    unstickTries++
    invalidatePane($)
    notePaneEvent($, { at: now, kind: 'unstick', surface: surfaces.join(','), ms: waited, detail: `${unstickTries}/${UNSTICK_AT.length}` })
    return
  }
  if (!unstickGaveUp && waited >= UNSTICK_GIVE_UP_MS) {
    unstickGaveUp = true
    notePaneEvent($, { at: now, kind: 'unstick', surface: surfaces.join(','), ms: waited, detail: 'gave up — no draw' })
  }
}

// 나와(0.1.5 재기 — 0.972 ~ 0.998) 그린 길이 약 7.8만 = 그려진 적 있는 8.1만 아래(기억 reference_mod_pane_size_limit — 9.6만 거부)
const DRAW_CAP = 80_000
/** 비우는 접힘 — 메시지 본문 · ? 설명 · 진행판 새 줄 · 밑으로 붙이기 · 첫 탭 목록 나머지 · 남은 자료 목록 · advisor 이전 줄(0.1.26 — 메시지 보내기 접힘은 칸이 되어 뺌, 마지막엔 편 칸을 닫는다) */
// 0.1.29 ③ ⓒ: 하위 줄 아래(손자 이하) 펼침 under: · under-all: 도(panel UNDER_FOLD — 앞머리 under 하나로 둘 다)
const HEAVY_FOLDS = ['msgs:', 'held:', 'help:', 'board-lines', 'adopt', 'sibs', 'kids', 'clean-list', 'adv-more', 'under']
/** 「세션 도구」 쪽 칸마다 가르는 보낸 글(앱 도착 기록 최근 것) 수 */
const SENT_ROWS = 12

/** 그린 꼴을 엔진이 받는 꼴로 어림한 글자 수 — 누름 함수는 자리 글 40자로 센다(엔진의 press 손잡이 몫보다 조금 길게) */
function drawnSize(tree: unknown): number {
  return JSON.stringify(tree, (_k, v: unknown) => (typeof v === 'function' ? '#'.repeat(40) : v)).length
}

let allReading = false
function kickAllRead($: EngineInterface): void {
  if (allReading || app.isAllRead) return
  allReading = true
  $.clock.after(1, () => {
    void refreshApp($, true)
      .then(() => (app.isAllRead ? update($, appTick, n => n + 1) : undefined))
      .catch((err: unknown) => log($, `보관 메타 읽기 실패 — ${String(err)}`))
      .finally(() => {
        allReading = false
      })
  })
}

async function loadPanelView($: EngineInterface, pu: PanelUi, surface?: string): Promise<PanelView | null> {
  // 패널을 연 세션은 보관 메타까지 한 번 다 읽는다(★16 「보관 N」 — 노트 register.md#refreshApp). 0.1.32: 첫 그림은 안 보관만 읽고 보관은 그린 뒤(kickAllRead).
  // 엔진 세션은 등록부로 지은 이 세션 하나(노트 register.md#sessionSelf)
  const s = await sessionSelf($, surface, app.isAllRead)
  if (!s) return null
  if (s.isApp) kickAllRead($)
  const now = await $.clock.now()
  const ended = await refreshEnded($)
  const links = await storeLinks($)
  const tree = withTree(s.metas, links)
  const orche = links.orche
  const pinWhy = await pinWhys($)
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
  // 메인은 입력창 「전달」 · `>>메인` 과 같은 셈(mainOf) — 위 세션과 같으면 「위 세션」 칸 하나에만
  const mainHit = mainOf(s.selfId, s.metas, links)
  const mainId = 'id' in mainHit ? mainHit.id : null
  const rowTitle = (id: string) => tree.get(id)?.title ?? id
  const upMeta = owner !== null ? tree.get(owner) : undefined
  const upTag = owner !== null && links.succ.get(owner) === s.selfId ? L('이전 차수', 'Previous') : s.metas.get(s.selfId)?.parent === owner ? L('연 세션', 'Opener') : L('주인', 'Owner')
  const up = upMeta && !upMeta.isArchived ? { id: upMeta.id, tag: upTag, title: upMeta.title } : null
  const heirId = links.succ.get(s.selfId) ?? null
  const heir = heirId !== null && tree.get(heirId)?.parent === s.selfId ? heirId : null
  const mainRow = s.isApp && mainId !== null && mainId !== s.selfId && mainId !== up?.id ? { id: mainId, tag: L('메인', 'Main'), title: rowTitle(mainId) } : null
  // 보낼 칸을 열었으면 그 세션 식은 값도 — 깨우는 값 카드(값이 없으면 카드 없이 그대로 보낸다 — sendGo 와 같은 값)
  const writingTo = pu.sending?.startsWith(COMPOSE_AT) ? pu.sending.slice(COMPOSE_AT.length) : pu.sending
  if (writingTo && !ctxK.has(writingTo)) {
    const m = tree.get(writingTo)
    if (m && isCold(m.lastAt, now)) {
      const k = await reportK($, writingTo, now)
      if (k !== null) ctxK.set(writingTo, k)
    }
  }
  const role = roleOf(s.selfId, tree, orche)
  const mainSelf = mainId !== null && mainId !== s.selfId ? mainId : null
  // (메인 포함 · 이 세션 아래 빠짐 — ownerChoices 의 고리 막기)
  // 엔진 세션(VS Code)은 데스크톱 세션 밑에 붙이지 않는다(0.1.28 결정 2 의 (다)는 0.1.28 뒤 — 정본 9절)
  // 0.1.29 ③ F14: 패널에서 뗀 세션은 주인 맨 위(TOP)를 적는다 — 고르기 목록엔 그 값이 없어 「앱 관계대로」 자리로 읽는다
  const ownNow = links.owners.get(s.selfId)
  const upPick = s.isApp && role === 'solo' ? { value: ownNow === undefined || ownNow === TOP ? APP_OWNER : ownNow, choices: ownerChoices(tree, s.selfId, orche).filter(id => orche.has(id)) } : null
  const advisor = await advisorOf($)
  const canDetach = new Set<string>()
  const opened = new Set<string>()
  for (const m of s.metas.values()) {
    if (m.isArchived || m.parent === null) continue
    if (m.id === s.selfId || m.parent === s.selfId) canDetach.add(m.id)
    if (m.parent === s.selfId) opened.add(m.id)
  }
  const selfMeta = s.metas.get(s.selfId)!
  // (보관 메타까지 읽은 앱 메타 — appSelf(isAll)). 받은 글을 보낸 세션 기록을 못 읽으면(지움 등) 빠진다
  const sentN = new Map<string, number>()
  for (const r of selfMeta.receipts) sentN.set(r.to, (sentN.get(r.to) ?? 0) + 1)
  const recv = new Map<string, number>()
  for (const m of s.metas.values()) {
    if (m.id === s.selfId) continue
    const n = m.receipts.filter(r => r.to === s.selfId).length
    if (n > 0) recv.set(m.id, n)
  }
  const sentLog = s.isApp ? null : await $.fs.read(await sentLogPath($, s.selfId)).then(parseSentLog, (): SentItem[] => [])
  if (sentLog) for (const x of sentLog) sentN.set(x.to, (sentN.get(x.to) ?? 0) + 1)
  if (!s.isApp) for (const [id, n] of await $.fs.read(await recvLogPath($, s.selfId)).then(parseRecvLog, () => new Map<string, number>())) recv.set(id, (recv.get(id) ?? 0) + n)
  const usage = await $.session.usage().catch(() => null)
  const tokens = usage?.context.tokens
  const window = usage?.context.window
  const open = await openLists($, s, tree, orche)
  return {
    selfId: s.selfId,
    isApp: await canUseApp($, s, surface),
    openDesk: open.desk,
    openOut: open.out,
    now,
    metas: tree,
    ctxK,
    orche,
    role,
    mainTitle: mainSelf ? rowTitle(mainSelf) : null,
    up,
    heir,
    mainRow,
    opened,
    ending: await refreshEnding($).catch((): Set<string> => new Set()),
    sent: attachKinds(
      sentLog ? sentRowsOf(sentLog, SENT_ROWS) : recentSent(selfMeta, tree, SENT_ROWS),
      parseSentKinds(await $.store.get(`${SENT_KIND_PREFIX}${s.selfId}`).catch(() => undefined)),
      await readTalks($, s.selfId),
    ),
    sentN,
    recv,
    ctxPct: typeof tokens === 'number' && typeof window === 'number' && window > 0 ? Math.round((tokens / window) * 100) : null,
    isBypass: selfMeta.mode === 'bypassPermissions',
    upPick,
    canDetach,
    heldItems: await readHeld($, s.selfId),
    upHeld: up ? (await readHeld($, up.id)).filter(r => r.from === s.selfId).length : 0,
    accept: typeof tokens === 'number' && tokens > 0 ? { tokens, isCold: isCold(selfMeta.lastAt, now) } : null,
    board: orche.has(s.selfId) ? await boardView($, s.selfId) : null,
    boardHint: orche.has(s.selfId) ? null : await boardHint($, tree, orche, owner),
    adopt: s.isApp && orche.has(s.selfId) ? adoptRows(tree, s.selfId, { selfId: s.selfId, now, ended, orche, pinWhy }) : [],
    settings: {
      quick: await quickItemsOf($),
      display: displayChoice(await displayOf($)),
      lang: await langChoice($),
      advisor: advisorChoice(advisor),
      isWorking,
      autoPin: await autoPinOn($),
      autoDetach: await autoDetachOn($),
      autoUnpin: await storeOn($, AUTO_UNPIN_KEY),
      autoGroup: await storeOn($, AUTO_GROUP_KEY),
      firstUltra: await storeOn($, FIRST_ULTRA_KEY),
      reports: { value: (await reportDefault($)) ? 'app' : 'hold', options: REPORT_MODES },
      peerRel: await storeOn($, PEER_REL_KEY),
      sessionRules: await rulesOn($),
      mentionInfo: await storeOn($, MENTION_KEY),
      ...(pu.view === 'settings' ? { mdLock: await mdLockView($, s.metas).catch(() => ({ on: false, dir: '', rows: null, expired: 0, error: null })) } : {}),
    },
    selfRow: familyRow(tree.get(s.selfId)!, 0, { selfId: s.selfId, now, ended, orche, pinWhy }),
    siblings: near.siblings,
    children: near.children,
    below: new Map(near.children.filter(c => c.kids > 0).map(c => [c.id, belowRows(tree, c.id, { selfId: s.selfId, now, ended, orche, pinWhy })] as const)),
    selfAttached: attachedKids(s.metas, s.selfId).length,
    isHanded: links.succ.has(s.selfId),
    endedKids: endedKidsOf(tree, s.metas, ended, s.selfId),
    clean: cleanScan,
    ultraOn: await ultraOf($),
    advisorLog: await advisorLogOf($),
    quickPreview: pu.view === 'settings' ? { q: { self: selfMeta }, acts: await quickActs($, selfMeta) } : null,
    firstSetup: await needsFirstSetup($),
  }
}

const DESKTOP_ENTRY = 'claude-desktop'
const TERMINAL_ENTRY = 'cli'

/** 데스크톱 앱 밖 세션 이름표 — VS Code · 터미널, 그 밖 entrypoint(SDK · 헤드리스 …)는 안 보인다(null) */
function outsideTag(e: RegistryEntry): string | null {
  if (isVscodeEntry(e.entrypoint)) return 'VS Code'
  return e.entrypoint === TERMINAL_ENTRY ? L('터미널', 'Terminal') : null
}

async function openLists($: EngineInterface, s: SelfView, tree: ReadonlyMap<string, SessionMeta>, orche: ReadonlySet<string>): Promise<{ desk: OpenRow[]; out: OpenRow[] }> {
  const me = s.isApp ? null : s.selfId
  const entries = (await readRegistry($)).filter(e => e.sessionId !== me && e.hostSessionId !== s.selfId && (e.kind === null || e.kind === 'interactive'))
  const out = openOutRows(
    entries.flatMap(entry => {
      const tag = entry.entrypoint === DESKTOP_ENTRY ? null : outsideTag(entry)
      return tag ? [{ entry, tag }] : []
    }),
  )
  if (s.isApp) return { desk: [], out }
  return { desk: openDeskRows(entries.filter(e => e.entrypoint === DESKTOP_ENTRY && (e.hostSessionId?.startsWith('local_') ?? false)), tree, orche), out }
}

// ── 엔진 세션 보내기 · 받기 기록(0.1.28 결정 5 · 8 — 노트 register.md#engineSend) ──────────────────────────────

/** 받는 곳 줄 id(데스크톱 세션 = 앱 id, 그 밖 = 엔진 세션 번호)로 등록부 항목 찾기 */
function entryOfRow(entries: readonly RegistryEntry[], id: string): RegistryEntry | null {
  return entries.find(e => e.sessionId === id || e.hostSessionId === id) ?? null
}

/** 엔진 SendMessage 의 받는 곳 글(이름 · uds:<통로> · 앱 id · 엔진 세션 번호)로 등록부 항목 찾기 — 못 찾으면 null */
function entryOfAddress(entries: readonly RegistryEntry[], to: string): RegistryEntry | null {
  return entries.find(e => (e.socket !== null && to === `uds:${e.socket}`) || to === e.sessionId || to === e.hostSessionId) ?? entries.find(e => e.name === to) ?? null
}

/** 줄 id — 데스크톱 세션은 앱 id, 그 밖은 엔진 세션 번호 */
const rowIdOf = (e: RegistryEntry): string => (e.entrypoint === DESKTOP_ENTRY && e.hostSessionId?.startsWith('local_') ? e.hostSessionId : e.sessionId)

async function sentLogPath($: EngineInterface, key: string): Promise<string> {
  return `${await dataDir($)}/sent/${key}.json`
}

async function recvLogPath($: EngineInterface, key: string): Promise<string> {
  return `${await dataDir($)}/recv/${key}.json`
}

async function noteSent($: EngineInterface, key: string, item: Omit<SentItem, 'at'>): Promise<void> {
  const path = await sentLogPath($, key)
  const items = await $.fs.read(path).then(parseSentLog, (): SentItem[] => [])
  await $.fs.write(path, sentLogText([...items, { ...item, at: await $.clock.now() }]))
}

const recvSeen = new Map<string, number>()

async function noteRecv($: EngineInterface, text: string, origin: unknown): Promise<void> {
  if (await selfAppId($)) return
  const key = await selfKey($)
  if (!key) return
  const senders = peerSenders(text, origin)
  if (senders.length === 0) return
  const now = await $.clock.now()
  for (const [sig, at] of recvSeen) if (now - at > 120_000) recvSeen.delete(sig)
  const entries = await readRegistry($)
  const ids: string[] = []
  for (const s of senders) {
    const e = (s.session !== null ? entries.find(x => x.sessionId === s.session) : undefined) ?? (s.from !== null ? entryOfAddress(entries, s.from) : null)
    const id = e ? rowIdOf(e) : (s.from?.startsWith('local_') ? s.from : null)
    if (!id) continue
    const sig = `${id}|${peerBodyOf(text).slice(0, 200)}`
    if (recvSeen.has(sig)) continue
    recvSeen.set(sig, now)
    ids.push(id)
  }
  if (ids.length === 0) return
  const path = await recvLogPath($, key)
  const counts = await $.fs.read(path).then(parseRecvLog, () => new Map<string, number>())
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  await $.fs.write(path, recvLogText(counts))
  await update($, appTick, n => n + 1)
}

async function noteModelSent($: EngineInterface, to: string): Promise<void> {
  const key = await selfKey($)
  if (!key) return
  const e = entryOfAddress(await readRegistry($), to)
  if (!e) return
  const id = rowIdOf(e)
  await noteSent($, key, { to: id, title: app.files.get(id)?.meta?.title ?? e.name ?? to, delivered: true })
  await update($, appTick, n => n + 1)
}

// 데스크톱 세션이 데스크톱 앱 밖 세션에 보낼 때는 지금 길(권한 모드로 가름) — 주소만 { sessionId } · 지시 글 주소는 통로. 다른 때(데스크톱 → 데스크톱)는 false
async function engineSendAct($: EngineInterface, id: string, text: string): Promise<boolean> {
  const appId = await selfAppId($)
  const entries = await readRegistry($)
  const target = entryOfRow(entries, id)
  if (appId && (target === null || target.entrypoint === DESKTOP_ENTRY)) return false
  const title = app.files.get(id)?.meta?.title ?? target?.name ?? id
  const addr = target?.socket ? `uds:${target.socket}` : id
  const askText = bothAsk(() => L(`「${title}」(\`${addr}\`)에 SendMessage 로 보내 주세요:\n\n${kindIn(text, 0)}`, `Send this to 「${title}」(\`${addr}\`) with SendMessage:\n\n${kindIn(text, 1)}`))
  const clear = () => update($, panelUi, u => ({ ...u, sending: null, card: null, draft: '', match: null, kidsAsk: null, sendKind: 'note' as const }))
  if (appId && !(await isBypass($))) {
    if ((await ask($, askText)) === 'filled') await clear()
    return true
  }
  const sessionId = target?.sessionId ?? (id.startsWith('local_') ? null : id)
  const sent =
    sessionId === null
      ? { isDelivered: false as const, reason: L('지금 열린 세션이 아닙니다', 'Not a session open now') }
      : await $.session.send({ to: { sessionId }, text }).catch((err: unknown) => ({ isDelivered: false as const, reason: String(err) }))
  if (sent.isDelivered) {
    const key = appId ? null : await selfKey($)
    if (key) await noteSent($, key, { to: id, title, delivered: true }).catch(err => log($, `보낸 글 적기 실패 — ${String(err)}`))
    toast($, L(`「${shortTitle(title)}」에 보냈습니다`, `Sent to “${shortTitle(title)}”`), true)
    await clear()
    await redraw($)
    return true
  }
  if (appId) {
    toast($, L(`보내지 못했습니다 — ${firstLine(sent.reason ?? '')}`, `Couldn't send — ${firstLine(sent.reason ?? '')}`))
    return true
  }
  if (await fillPrompt($, askText[0]!)) {
    toast($, L('바로 못 보내 입력칸에 넣었습니다', "Couldn't send right away, so it's in the prompt box"))
    await clear()
  } else toast($, L(`보내지 못했습니다 — ${firstLine(sent.reason ?? '')}`, `Couldn't send — ${firstLine(sent.reason ?? '')}`))
  return true
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

async function loadQuickView($: EngineInterface, surface?: string): Promise<{ q: QuickView; isApp: boolean } | null> {
  const s = await sessionSelf($, surface)
  return s ? { q: { self: s.metas.get(s.selfId)! }, isApp: await canUseApp($, s, surface) } : null
}

/** 세션 트리 묶음으로 패널을 따라 연다(같은 맨 위 세션 아래 세션끼리 — 떼어 낸 곁가지도 주인 패널을 따라 연다, 0.1.3) — msg 묶음 대신 */
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
  {
    value: 'off',
    get label() {
      return L('쓰지 않음', 'Off')
    },
    rule: '',
  },
  {
    value: 'pc',
    label: 'PC',
    get rule() {
      return L('그림 · 고르기 카드 · 패널을 써도 된다.', 'Pictures, choice cards and panels are fine.')
    },
  },
  {
    value: 'tablet',
    get label() {
      return L('태블릿', 'Tablet')
    },
    get rule() {
      return L('채팅 글을 기본으로, 고르기 카드 없이. 꼭 보일 그림은 파일로 보낸다.', 'Chat text first, no choice cards. Send a picture that must be seen as a file.')
    },
  },
  {
    value: 'phone',
    get label() {
      return L('폰', 'Phone')
    },
    get rule() {
      return L('채팅 글로만 — 고르기 카드 · 그림 · 패널 없이, 결정은 번호 선택지로.', 'Chat text only — no choice cards, pictures or panels; numbered options for decisions.')
    },
  },
] as const
type Display = (typeof DISPLAYS)[number]

async function displayOf($: EngineInterface): Promise<Display> {
  const v = await $.store.get(DISPLAY_KEY).catch(() => undefined)
  return DISPLAYS.find(d => d.value === v) ?? DISPLAYS[0]
}

function displayChoice(d: Display): Choice {
  return { value: d.value, options: DISPLAYS.map(x => ({ value: x.value, label: x.label })) }
}

async function setDisplay($: EngineInterface, value: string): Promise<void> {
  const pick = DISPLAYS.find(d => d.value === value)
  if (pick === undefined || pick.value === (await displayOf($)).value) return
  await $.store.set(DISPLAY_KEY, pick.value)
  await update($, appTick, n => n + 1)
}

/** 글마다 붙이는 줄 — 쓰지 않음이면 없다 */
function displayLine(d: Display): string | null {
  if (d.value === 'off') return null
  return L(
    `[화면] ${d.label} — 사용자가 easy-session 에서 고른 값이다. ${d.rule} 대화 기록이나 다른 훅으로 기기를 짐작하지 말고 이 줄을 따른다.`,
    `[Screen] ${d.label} — the user picked this in easy-session. ${d.rule} Don't guess the device from the conversation or other hooks; follow this line.`,
  )
}

const BLOCKED_TOOLS = {
  get AskUserQuestion() {
    return L('고르기 카드', 'choice cards')
  },
  get mcp__visualize__show_widget() {
    return L('그림 위젯', 'picture widgets')
  },
}

function blockText(d: Display, tool: keyof typeof BLOCKED_TOOLS): string | null {
  if (d.value !== 'tablet' && d.value !== 'phone') return null
  const what = BLOCKED_TOOLS[tool]
  const how =
    tool === 'AskUserQuestion'
      ? L('선택지는 채팅 글에 번호로 물으세요.', 'Ask with numbered options in chat text.')
      : d.value === 'tablet'
        ? L('채팅 글로 답하고, 꼭 보일 그림은 파일로 보내세요.', 'Answer in chat text, and send a picture that must be seen as a file.')
        : L('채팅 글로만 답하세요.', 'Answer in chat text only.')
  return L(`easy-session: 사용자가 화면을 ${d.label}${josa(d.label, '으로', '로')} 골라 ${what}${josa(what, '을', '를')} 막았습니다. ${how}`, `easy-session: the user set the screen to ${d.label}, so ${what} are blocked. ${how}`)
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
// 글에 나온 세션 정보 붙이기(0.1.31 ①) — 처음 값 끔('on' 만 켬). 노트 register.md#mention
const MENTION_KEY = 'mentionInfo'

// (DESIGN-features 3절) 저절로 고정 · 끝나면 풀기를 못 한다 → 자기 몫 파일 pin-asks/<이 세션>.json 에 부탁을 적고, 같은 세션 트리 위 가장 가까운 살아 있는 bypass 세션이 받아 한다
const PIN_ASK_DIR = 'pin-asks'
/** 3초 시계가 부탁 폴더를 다시 볼지 — 파일 이름 · 수정 시각 표시(바뀐 때만 받기를 돈다. 차례 끝은 늘) */
let pinAskSig = ''

async function askPinHelp($: EngineInterface, selfId: string, ask: Omit<PinAsk, 'at'>): Promise<void> {
  const path = `${await dataDir($)}/${PIN_ASK_DIR}/${selfId}.json`
  const items = await $.fs.read(path).then(parsePinAsks, (): PinAsk[] => [])
  // 같은 세션 부탁은 새것 하나만(고정 뒤 풀기면 풀기가 남는다)
  await $.fs.write(path, pinAsksText([...items.filter(x => x.id !== ask.id), { ...ask, at: await $.clock.now() }]))
}

// 받는 세션이 보관됐거나 기록에 없으면 그 부탁은 버린다(다시 해도 안 됨). 앱 도구가 실패하면 남겨 다음 차례 끝에 다시
async function takePinAsks($: EngineInterface, always = true): Promise<number> {
  const selfId = await selfAppId($)
  if (!selfId) return 0
  const dir = `${await dataDir($)}/${PIN_ASK_DIR}`
  const list = (await $.fs.list(dir).catch((): FsEntry[] => [])).filter(f => f.kind === 'file' && isKeyFile(f.name))
  const sig = list.map(f => `${f.name}:${f.mtimeMs}`).join('|')
  if (!always && sig === pinAskSig) return 0
  pinAskSig = sig
  if (list.length === 0) return 0
  const metas = await refreshApp($)
  if (metas.get(selfId)?.mode !== 'bypassPermissions') return 0
  const tree = withTree(metas, await storeLinks($))
  let n = 0
  for (const f of list) {
    const asker = idOfFile(f.name)
    const path = `${dir}/${f.name}`
    const items = parsePinAsks((await $.fs.read(path).catch(() => null)) ?? '')
    if (items.length === 0 || pinHelperOf(asker, tree) !== selfId) continue
    const gone: PinAsk[] = []
    for (const it of items) {
      const target = metas.get(it.id)
      if (!target || target.isArchived) {
        gone.push(it)
        continue
      }
      const res = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: it.id === selfId ? 'self' : it.id, pinned: it.what === 'pin' })
      if (!res.ok) continue
      await setPinWhy($, it.id, it.what === 'pin' ? (it.why ?? 'child') : null)
      gone.push(it)
      n++
    }
    if (gone.length === 0) continue
    // 그 사이 부탁한 세션이 새 줄을 적었을 수 있어 다시 읽고 한 줄만 뺀다
    const left = parsePinAsks((await $.fs.read(path).catch(() => null)) ?? '').filter(x => !gone.some(g => g.id === x.id && g.at === x.at && g.what === x.what))
    await $.fs.write(path, pinAsksText(left))
  }
  if (n > 0) {
    log($, `auto 세션 부탁으로 고정 · 풀기 ${n}개를 했습니다`)
    await update($, appTick, x => x + 1)
  }
  return n
}

const MD_LOCK_KEY = 'mdLock'
const MD_LOCK_DIR_KEY = 'mdLockDir'
/** 한 번에 읽는 잠금 파일 상한(이름 차례) */
const MD_LOCK_FILES_MAX = 100

async function mdLockDir($: EngineInterface): Promise<string> {
  const v = await $.store.get(MD_LOCK_DIR_KEY).catch(() => undefined)
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : `${await claudeHome($)}/locks`
}

/** 잠금 폴더의 잠금 파일(이름 차례 · 상한) — 스위치가 꺼졌으면 null. 폴더가 없으면 빈 목록, 못 읽으면 error */
async function readMdLocks($: EngineInterface): Promise<{ dir: string; locks: MdLock[]; error: string | null } | null> {
  if (!(await storeOn($, MD_LOCK_KEY))) return null
  const dir = await mdLockDir($)
  const list = await $.fs.list(dir).catch(async (err: unknown) => ((await $.fs.exists(dir).catch(() => true)) ? firstLine(String(err)) : ([] as FsEntry[])))
  if (typeof list === 'string') return { dir, locks: [], error: list }
  const files = list.filter(f => f.kind === 'file' && f.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name)).slice(0, MD_LOCK_FILES_MAX)
  const locks: MdLock[] = []
  for (const f of files) {
    const text = await $.fs.read(`${dir}/${f.name}`).catch(() => null)
    const lock = text === null ? null : parseMdLock(f.name, text)
    if (lock) locks.push(lock)
  }
  return { dir, locks, error: null }
}

/** 잠금 주인 이름 — 앱 세션 제목 → 잠금 파일의 주인 이름(holder_alias) → 주인 id 앞부분 */
function lockOwnerName(lock: MdLock, metas: ReadonlyMap<string, SessionMeta>): string {
  const id = lockOwnerId(lock.holder, metas)
  const title = id === null ? null : (metas.get(id)?.title ?? app.files.get(id)?.meta?.title ?? null)
  return title ?? lock.alias ?? (lock.holder ? fitCells(lock.holder, 20) : L('주인 모름', 'Owner unknown'))
}

async function mdLockView($: EngineInterface, metas: ReadonlyMap<string, SessionMeta>): Promise<MdLockView> {
  const on = await storeOn($, MD_LOCK_KEY)
  const dir = await mdLockDir($).catch(() => '')
  if (!on) return { on, dir, rows: null, expired: 0, error: null }
  const got = await readMdLocks($)
  if (!got) return { on, dir, rows: null, expired: 0, error: null }
  const now = await $.clock.now()
  const live = got.locks.filter(l => l.until > now)
  return {
    on,
    dir: got.dir,
    rows: live.map(l => ({ file: l.file, target: l.target, owner: lockOwnerName(l, metas), intent: l.intent, left: leftText(l.until - now) })),
    expired: got.locks.length - live.length,
    error: got.error,
  }
}

/** 잠금 하나 풀기 — 파일을 지우지 않고 끝 시각을 지금으로(meta.md#mdLock releasedLockText). 풀었나 */
async function releaseMdLock($: EngineInterface, file: string): Promise<MdLock | null> {
  if (/[\\/]|\.\./.test(file)) return null
  const path = `${await mdLockDir($)}/${file}`
  const text = await $.fs.read(path).catch(() => null)
  const lock = text === null ? null : parseMdLock(file, text)
  const next = text !== null && lock ? releasedLockText(text, lock, await $.clock.now()) : null
  if (!lock || next === null) return null
  await $.fs.write(path, next)
  return lock
}

async function mdLockReleaseAct($: EngineInterface, file: string): Promise<void> {
  if (!(await storeOn($, MD_LOCK_KEY))) return
  const lock = await releaseMdLock($, file).catch(() => null)
  toast($, lock ? L(`「${fitCells(lock.target, 40)}」 잠금을 풀었습니다`, `Released the lock on “${fitCells(lock.target, 40)}”`) : L('잠금을 풀지 못했습니다 — 파일을 다시 확인하세요', "Couldn't release the lock — check the file again"), lock !== null)
  await update($, appTick, n => n + 1)
}

async function setMdLockDir($: EngineInterface, path: string): Promise<void> {
  const clean = path.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\\/g, '/').replace(/\/+$/, '')
  if (clean === '') await $.store.delete(MD_LOCK_DIR_KEY)
  else await $.store.set(MD_LOCK_DIR_KEY, clean)
  await update($, panelUi, u => ({ ...u, folds: u.folds.filter(f => f !== 'mdlock-dir') }))
  await update($, appTick, n => n + 1)
}

async function autoReleaseLocks($: EngineInterface, justArchived: string | null = null): Promise<number> {
  const got = await readMdLocks($)
  if (!got || got.error) return 0
  const metas = await refreshApp($)
  const ended = await refreshEnded($)
  const archived = new Set(app.archived ?? [])
  if (justArchived) archived.add(justArchived)
  const now = await $.clock.now()
  let n = 0
  for (const lock of got.locks) {
    if (!shouldAutoRelease(lock, lockOwnerId(lock.holder, metas), { now, archived, ended, metas })) continue
    if (await releaseMdLock($, lock.file).catch(() => null)) n++
  }
  if (n > 0) {
    log($, `md 잠금 ${n}개를 저절로 풀었습니다 — 주인 세션이 보관됐거나 끝났습니다`)
    await update($, appTick, x => x + 1)
  }
  return n
}
// 새 세션 첫 글에 ultrathink(0.1.27) — 처음 값 끔(storeOn 셈 — 'on' 만 켬). 노트 register.md#firstUltra
const FIRST_ULTRA_KEY = 'firstUltra'
// 세션 규칙(0.1.27 — msg 규칙 R1 · R2 · 차례 줄 · 말로 하기 힌트): 처음 값 켬(사용자가 훅으로 하자고 정함) — 'off' 만 끔. 노트 register.md#sendRules
const SESSION_RULES_KEY = 'sessionRules'

/** 세션 규칙이 켜졌나 — 줄 붙이기 · 그리기에서(못 읽으면 켬으로). 보내기 확인 훅은 던지게 따로 읽는다(닫힌 쪽 — 노트 register.md#sendRules) */
async function rulesOn($: EngineInterface): Promise<boolean> {
  return (await $.store.get(SESSION_RULES_KEY).catch(() => undefined)) !== 'off'
}

/** 세션 규칙 켬 · 끔 저장 — 처음 값이 켬이라 setSwitch(처음 값 끔 셈)를 안 쓴다 */
async function setRulesOn($: EngineInterface, on: boolean): Promise<void> {
  if ((await rulesOn($)) === on) return
  await $.store.set(SESSION_RULES_KEY, on ? 'on' : 'off')
  await update($, appTick, n => n + 1)
}

const FIRST_SETUP_KEY = 'firstSetup'
const FIRST_SETUP_SEEN = [FIRST_SETUP_KEY, AUTO_PIN_KEY, AUTO_DETACH_KEY, AUTO_UNPIN_KEY, AUTO_GROUP_KEY, FIRST_ULTRA_KEY, REPORT_DEFAULT_KEY] as const

/** 카드를 띄울까 — 저장소를 못 읽으면 안 띄운다(쓰던 사람이 눌러 값을 덮지 않게) */
async function needsFirstSetup($: EngineInterface): Promise<boolean> {
  try {
    for (const key of FIRST_SETUP_SEEN) if ((await $.store.get(key)) !== undefined) return false
    return true
  } catch {
    return false
  }
}

/** 카드 답 — rec = 자식 보고 모아 둠 · 저절로 고정 · 끝나면 풀기 · 그룹 묶기 켬(떼어 내기 · 첫 글 ultrathink 는 처음 값 끔 그대로), app = 아무것도 안 바꿈. 스위치와 같은 저장 함수 */
async function firstSetupAct($: EngineInterface, pick: 'rec' | 'app'): Promise<void> {
  await $.store.set(FIRST_SETUP_KEY, pick)
  if (pick === 'rec') {
    await setReportMode($, 'hold')
    await setAutoPin($, true)
    await setSwitch($, AUTO_UNPIN_KEY, true)
    await setSwitch($, AUTO_GROUP_KEY, true)
    // 그룹 스위치를 켤 때와 같이 이 세션의 세션 트리를 한 번 맞춘다(bypass 만 — groupTree)
    void groupOwnTree($).catch(() => {})
    toast($, L('추천 설정을 켰습니다 — [설정] 「새 자식 세션」에서 바꿀 수 있습니다', 'Turned on the recommended settings — change them in Settings → New child sessions'), true)
  }
  await update($, appTick, n => n + 1)
}

/** 이 mod 자신이 부른 도구인가(플러그인 $.tool.call 의 next.origin) — 이지 세션 자기 보내기는 확인하지 않는다 */
const isOwnCall = (next: unknown): boolean => /^easy-session(@|$)/.test(String((next as { origin?: { plugin?: unknown } }).origin?.plugin ?? ''))

// 판정은 상태 갱신 안에서(같은 차례 보내기 여럿이 겹쳐도 셈이 안 엇갈리게)
// 카드 갈래만 글(message)을 읽어 받는 세션 패널 카드로 남긴다. 판정은 보내기 확인의 통과(allow · ok)보다 앞 — 허락받은 보내기도 앱이 버리는 칸이라
const CARD_DUP_MS = 10 * 60_000
async function modeMatch($: EngineInterface, selfId: string, to: string, metas: ReadonlyMap<string, SessionMeta>, entries: readonly RegistryEntry[], message: unknown): Promise<string | null> {
  const self = metas.get(selfId)
  const target = metas.get(to)
  if (!self || !target || !self.mode || !target.mode) return null
  const parentHolds = self.parent === to && !reportStateOf(to, metas, await reportSwitches($), await reportDefault($)).on
  const way = matchWay({ fromMode: self.mode, toMode: target.mode, isParent: self.parent === to, parentHolds, isOwnKid: target.parent === selfId, unattended: self.isScheduled === true })
  if (way === 'none') return null
  if (way === 'card') {
    const text = typeof message === 'string' ? message : JSON.stringify(message ?? '')
    // 같은 글을 Claude 가 곧 다시 보내도 카드는 하나(「다시 보내지 마세요」를 못 지킨 때). outbox 칸은 가져가도 안 줄어 몇 분 창으로만 본다
    const now = await $.clock.now()
    const out = await $.fs.read(`${await dataDir($)}/${OUTBOX_DIR}/${selfId}.json`).then(parseOutbox, (): OutItem[] => [])
    if (!out.some(x => x.to === to && x.text === text && now - x.at < CARD_DUP_MS)) await relayCard($, selfId, to, self.title, text)
    const name = shortTitle(target.title)
    log($, L(`「${name}」${topicMark(name)} ${withIra(modeName(target.mode) ?? target.mode)} Claude 의 보내기를 그 세션 패널 카드로 남겼습니다`, `“${name}” is in ${modeName(target.mode)}, so Claude's send was left as a card in that session's panel`))
  }
  const busy = entries.some(e => e.hostSessionId === to && e.status === 'busy')
  return matchDenyText(way, { title: target.title, to, fromMode: self.mode, toMode: target.mode, busy })
}

async function guardSend($: EngineInterface, raw: unknown, kind: 'send' | 'mcp', message?: unknown, notify?: unknown): Promise<string | null> {
  kindPending = null
  // 스위치는 못 읽으면 던진다 — .catch 가 막는다(열려 버리면 규칙이 없는 것과 같다)
  if ((await $.store.get(SESSION_RULES_KEY)) === 'off') return null
  if (typeof raw !== 'string') return null
  // 보낸 쪽은 데스크톱 앱 세션만(0.1.28 ⑦ — 2차 「보낸 쪽까지 넓히는 것은 짓지 않음」: VS Code · 터미널 세션이 보내면 안 돈다)
  const selfId = await selfAppId($)
  if (!selfId) return null
  const metas = await refreshApp($)
  // 등록부를 못 읽으면 빈 목록(짓기 명세 6절) — 여기서 던지면 보내기 확인이 닫혀 평범한 local_ 보내기까지 막힌다
  const entries = await readRegistry($).catch((): RegistryEntry[] => [])
  const place = sendPlaceOf(raw, kind, selfId, metas, entries, await engineId($))
  if (!place) return null
  const ended = place.id === null ? undefined : (await refreshEnded($)).get(place.id)
  const isArchived = place.id !== null && (metas.get(place.id)?.isArchived ?? app.archived?.has(place.id) ?? false)
  const isGone = ended?.ended === true || isArchived
  if (place.id !== null && !isGone) {
    const held = await modeMatch($, selfId, place.id, metas, entries, message)
    if (held !== null) return held
  }
  // 앞서 보낸 곳 이름 — 앱 제목, 등록부 엔진 세션이면 그 이름
  const titleOf = (key: string) => metas.get(key)?.title ?? entries.find(e => e.sessionId === key)?.name ?? key.replace(/^\?/, '')
  const lastAt = place.id === null ? null : (metas.get(place.id)?.lastAt ?? null)
  const idleMs = lastAt === null ? null : (await $.clock.now()) - lastAt
  let deny: string | null = null
  await update($, rulesTurn, t => {
    const r = judgeSend(t, place, { isEnded: ended?.ended === true, isArchived, titleOf, idleMs })
    deny = r.deny
    return r.next
  })
  if (deny === null && place.id !== null && isGone) {
    const held = await modeMatch($, selfId, place.id, metas, entries, message)
    if (held !== null) return held
  }
  if (deny !== null) return deny
  return kindCheck($, selfId, place.id ?? place.key, message, notify)
}

async function afterKind<R extends { deny?: unknown; isError?: boolean }>($: EngineInterface, r: R): Promise<R> {
  const p = kindPending
  kindPending = null
  if (p && r.deny === undefined && !r.isError) await recordKind($, p.selfId, p.to, p.kind).catch(err => log($, `갈래 기록 실패 — ${String(err)}`))
  return r
}

function guardCatch($: EngineInterface, e: unknown, next: { called: boolean; error: { message?: string } } & ((x: never) => unknown)) {
  if (next.called) return next(e as never)
  const why = (next.error?.message ?? L('까닭 모름', 'unknown reason')).split('\n')[0]!.slice(0, 80)
  log($, `보내기 확인 실패 — ${why}`)
  return { deny: ruleFailText(why) }
}

// allow = 사용자가 시킨 보내기의 곳(이지 세션이 채운 [보내기] 글 · 사람이 친 >> 신호 · 「위로 보내」 힌트의 위 세션 — more)
async function noteTurnOrigin($: EngineInterface, e: { turnId?: string; origin?: { kind: string } }, text: string, more: readonly string[] = []): Promise<void> {
  const kind = e.origin?.kind
  const isHuman = kind === 'composer' || kind === 'bridge'
  const allow = [...filledSendTargets(text), ...(isHuman ? more : [])]
  if (isHuman) {
    const selfId = await selfAppId($)
    if (selfId) await $.store.delete(`${TALK_PREFIX}${selfId}`)
    const p = selfId ? await readPending($, selfId) : null
    if (p && (p.turnId === null || p.turnId === (e.turnId ?? null))) allow.push(p.to)
  }
  if (e.turnId === undefined) {
    await update($, rulesPending, () => ({ isHuman, allow }))
    return
  }
  await update($, rulesTurn, t => ({
    ...t,
    isHuman: t.isHuman || isHuman,
    allow: [...new Set([...t.allow, ...allow])],
    ...(isHuman ? { ok: [...new Set([...t.ok, ...t.asked])], asked: [] } : {}),
  }))
}

/** 같은 차례에서 고르기 카드(AskUserQuestion)가 답을 받음 — 물은 곳은 이 차례에 통과 */
async function humanAnswered($: EngineInterface): Promise<void> {
  await update($, rulesTurn, t => (t.asked.length === 0 ? t : { ...t, ok: [...new Set([...t.ok, ...t.asked])], asked: [] }))
}

/** 패널 세션 트리의 위 세션(살아 있는 것) — 관계 줄 「위 · 제목」 · selfRole 과 같은 셈 */
function aliveUp(tree: ReadonlyMap<string, SessionMeta>, selfId: string): SessionMeta | null {
  const up = tree.get(selfId)?.parent ?? null
  const m = up !== null ? tree.get(up) : undefined
  return m && !m.isArchived ? m : null
}

// 앱이 센 끝난 차례 수 0(completedTurns — 컴팩트로 기록이 줄어도 안 줄어듦). $.state 는 다시 불러오면 비어 안 쓴다
async function isFirstTurn($: EngineInterface, self: SessionMeta | undefined): Promise<boolean> {
  if ((await $.session.turns()) !== 0) return false
  return (self?.turnsDone ?? 0) === 0
}

/** 줄 하나 셈 — 던지면 그 줄만 뺀다(글은 그대로 간다) */
function lineOr<T>($: EngineInterface, what: string, f: () => T): T | null {
  try {
    return f()
  } catch (err) {
    log($, `${what} 실패 — ${String(err)}`)
    return null
  }
}

// 세션 규칙 스위치 뒤 · 앱 자료 · 세션 트리는 한 번 읽고 · 줄마다 실패하면 그 줄만 뺀다. allow = 힌트로 보내라고 한 위 세션(보내기 확인이 막지 않게)
async function turnLines($: EngineInterface, kind: string | undefined, text: string): Promise<{ lines: string[]; allow: string[] }> {
  const isHuman = kind === 'composer' || kind === 'bridge'
  if ((!isHuman && kind !== 'sdk') || !(await rulesOn($))) return { lines: [], allow: [] }
  const s = await sessionSelf($)
  if (!s) return { lines: [], allow: [] }
  const self = s.metas.get(s.selfId)
  const lines: string[] = []
  const allow: string[] = []
  // 첫 차례 선언 — 사람이 연 세션(composer · bridge) · 다른 세션이 연 세션(sdk)의 첫 글, 제목이 다음 차수(2차 이상)일 때 한 번
  if (isLaterOrdinal(self?.title) && (await isFirstTurn($, self).catch(err => (log($, `첫 차례 셈 실패 — ${String(err)}`), false)))) lines.push(LINE_FIRST())
  if (!isHuman) return { lines, allow }
  const links = await storeLinks($)
  const tree = withTree(s.metas, links)
  const role = lineOr($, '조율자 · 위임 줄', () => roleRuleLine({ isLead: ['main', 'orche'].includes(roleOf(s.selfId, tree, links.orche)), hasGrand: hasGrandKids(tree, s.selfId) }))
  if (role) lines.push(role)
  if (!isOurFill(text) && s.isApp) {
    const up = aliveUp(tree, s.selfId)
    const hints = lineOr($, '말로 하기 힌트', () => voiceHints(text, up ? { id: up.id, title: up.title, ...(blockedCell(self?.mode, up.mode) && up.mode && { heldMode: up.mode }) } : null)) ?? []
    lines.push(...hints)
    if (up && hints.some(h => h.includes(`(to = ${up.id})`))) allow.push(up.id)
  }
  return { lines, allow }
}

async function storeOn($: EngineInterface, key: string): Promise<boolean> {
  return (await $.store.get(key).catch(() => undefined)) === 'on'
}

async function setSwitch($: EngineInterface, key: string, on: boolean): Promise<void> {
  if ((await storeOn($, key)) === on) return
  await $.store.set(key, on ? 'on' : 'off')
  await update($, appTick, n => n + 1)
}

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
const QUICK_SEND_ADDED = 'quickSendAdded'
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
  if (!filled.isFilled) toast($, L('입력창에 넣지 못했습니다', "Couldn't put it in the prompt box"))
  else await update($, ultraOn, () => ULTRA_RE.test(next))
}

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

// 맨 앞 명령은 하나만 — 같은 명령을 다시 누르면 빼고, 다른 명령이면 바꿔 끼운다
const FILL_CMD_RE = /^\/(btw|fork|rewind)\b ?/

async function slashAct($: EngineInterface, cmd: SlashCmd): Promise<void> {
  const text = (await $.prompt.read().catch(() => null))?.text ?? ''
  const m = FILL_CMD_RE.exec(text)
  if (cmd === 'rewind' && m?.[1] !== 'rewind' && text.slice(m ? m[0].length : 0).trim() !== '') {
    toast($, L('입력창 글을 비운 뒤 누르세요', 'Clear the prompt box first, then press'))
    return
  }
  const head = m?.[1] === cmd ? '' : `/${cmd} `
  const filled = await $.prompt.fill({ text: head + text.slice(m ? m[0].length : 0), mode: 'replace' }).catch(() => ({ isFilled: false }))
  if (!filled.isFilled) toast($, L('입력창에 넣지 못했습니다', "Couldn't put it in the prompt box"))
}

// 답하는 중이면 끝난 뒤라 먼저 알린다 — 답하는 중인지는 입력창 위 띠가 받은 isWorking
let isWorking = false
// 입력창 위 띠에서 이 mod 행의 이름(AbovePrompt 의 e.plugin). 노트: register.md#quickForm
let ownRow: string | null = null

async function recapAct($: EngineInterface): Promise<void> {
  if (isWorking) toast($, L('답이 끝나면 요약합니다', 'It sums up once the answer ends'))
  await $.command.run({ command: 'recap' }).catch((err: unknown) => toast($, L(`요약하지 못했습니다 — ${firstLine(String(err))}`, `Couldn't sum up — ${firstLine(String(err))}`)))
}

// 칸 값 = 엔진이 「이 세션만 바꿨다」고 답한 값(세션마다 · 그때 설정 값과 함께), 없거나 설정 값이 그 뒤 바뀌었으면 설정 값. fable 은 띠 안 확인 카드부터
const ADV_KEY = 'adv:'

async function advisorRaw($: EngineInterface): Promise<string> {
  const v = await $.settings.read({ key: 'advisorModel' }).catch(() => undefined)
  return typeof v === 'string' ? v.trim() : ''
}

async function advisorOf($: EngineInterface): Promise<string> {
  const raw = await advisorRaw($)
  const id = await selfKey($)
  const kept = (id ? await $.store.get(ADV_KEY + id).catch(() => undefined) : undefined) as { value?: unknown; base?: unknown } | undefined
  return kept && typeof kept.value === 'string' && kept.base === raw ? kept.value : advisorAlias(raw)
}

/** 엔진이 이 세션만 바꿨으면 그 값을 적고(value), 기본값에 썼으면(옛 엔진 — null) 지운다 */
async function keepAdvisor($: EngineInterface, value: string | null): Promise<void> {
  const id = await selfKey($)
  if (!id) return
  if (value === null) await $.store.delete(ADV_KEY + id).catch(() => {})
  else await $.store.set(ADV_KEY + id, { value, base: await advisorRaw($) }).catch(() => {})
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
  if (value !== now) await runAdvisor($, value, now)
}

//
async function runAdvisor($: EngineInterface, value: string, prev: string): Promise<void> {
  const run = (v: string) =>
    $.command.run({ command: 'advisor', args: v }).then(
      r => r.text ?? '',
      (err: unknown) => L(`advisor 를 바꾸지 못했습니다 — ${String(err)}`, `Couldn't change the advisor — ${String(err)}`),
    )
  const text = await run(value)
  const a = readAdvisorAnswer(text)
  if (a.said && a.isLater && prev !== value) {
    const back = readAdvisorAnswer(await run(prev))
    await keepAdvisor($, back.said ? (back.isSession ? prev : null) : a.isSession ? value : null)
    toast($, advisorKeptToast(text, back.said, value))
  } else {
    if (a.said) await keepAdvisor($, a.isSession ? value : null)
    if (text) toast($, advisorToast(text), a.said)
  }
  await update($, appTick, n => n + 1)
}

/** 빠른 줄 고르기가 답하는 중에 오면 바꾸지 않는다 — 응답 중 고른 값이 첫 항목(off)으로 와 전역 advisor 가 꺼졌다(0.1.1 실측) */
function refusePick($: EngineInterface): void {
  toast($, L('답이 끝난 뒤 다시 고르세요', 'Pick again once the answer ends'))
  void update($, appTick, n => n + 1).catch(() => {})
}

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
  const id = await selfKey($)
  return id ? `${await dataDir($)}/advisor/${id}.json` : null
}

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
    if (calls === null) throw new Error(L('도구 출력을 못 읽음', "Can't read the tool output"))
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

async function kickAdvisorTimes($: EngineInterface): Promise<void> {
  if (!advLog.wants || advLog.running || !(await read($, isOpen))) return
  // 첫 탭이 아닌 쪽은 [설정]뿐(0.1.25 — 옛 값 'all' 은 첫 탭으로 그린다) · 칸은 「어드바이저」를 폈을 때만(0.1.26 — 다른 칸엔 호출 줄이 없다 · 0.1.27 처음 편 칸 없음)
  const pu = await read($, panelUi)
  if (pu.view === 'settings' || pu.tool !== 'adv') return
  if (advisorCountOf(await useOf($), await advisorShare($)) <= 0) return
  await readAdvisorTimes($)
}

/** 패널 칸 값 — 그리는 중에 부른다(읽기만) */
async function advisorLogOf($: EngineInterface): Promise<AdvisorLog | null> {
  const share = await advisorShare($)
  const count = advisorCountOf(await useOf($), share)
  if (count <= 0) return null
  const usd = share ? ` · $${share.usd.toFixed(2)}${L('(이지 컴팩트 셈)', ' (easy-compact)')}` : ''
  return { count, tip: L(`이 세션에서 ${count}번 불림(하위 에이전트 포함)${usd}`, `Called ${count === 1 ? 'once' : `${count} times`} in this session (subagents included)${usd}`), calls: advLog.calls, error: advLog.error, isFresh: !advLog.wants && !advLog.running }
}

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
  const usd = share ? ` · $${share.usd.toFixed(2)}${L('(이지 컴팩트 셈)', ' (easy-compact)')}` : ''
  const used =
    count > 0
      ? L(`이 세션에서 ${count}번 불림(하위 에이전트 포함)${usd} · ${agoText(lastAt, now)}`, `called ${count === 1 ? 'once' : `${count} times`} in this session (subagents included)${usd} · ${agoText(lastAt, now)}`)
      : L('이 세션에서 아직 안 불림', 'not called in this session yet')
  const tip = applies
    ? L(`advisor 켜짐 · ${used}`, `Advisor on · ${used}`)
    : L(`이 세션 메인 모델이 더 세서 메인엔 안 걸림 · 하위 에이전트는 부를 수 있음${count > 0 ? ` · ${used}` : ''}`, `This session's main model is stronger, so it doesn't apply to the main · subagents can call it${count > 0 ? ` · ${used}` : ''}`)
  return { pose, count, usd: share?.usd ?? null, tip, isMoving: pose === 'adv' && turnAt !== null && now - turnAt < ADV_MOTION_MS }
}

function fableActs($: EngineInterface): FableActs {
  return {
    confirm: async () => {
      await update($, fableAsk, () => false)
      await runAdvisor($, 'fable', await advisorOf($))
    },
    dismiss: async () => {
      await update($, fableAsk, () => false)
    },
  }
}

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

// isDone: 한 일이 됐나(한 줄 앞 ✓ — 0.1.28 사용자 답 「성공 줄에만 ✓」). 데스크톱 알림 글은 그대로
function toast($: EngineInterface, text: string, isDone = false): void {
  if (drawnSurface !== null && toastsStack(drawnSurface)) {
    void update($, noteLine, () => (isDone ? `✓ ${text}` : text)).catch(() => {})
    return
  }
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

/** 지시 글 속 세션 이름과 목적격 조사 — 이 세션이면 「이 세션을」(영어 this session), 아니면 「「제목」(`local_…`)을」(영어는 조사 없음) */
function askName(id: string, selfId: string | null): { name: string; eul: string } {
  if (id === selfId) return { name: L('이 세션', 'this session'), eul: L('을', '') }
  const title = app.files.get(id)?.meta?.title ?? id
  return { name: `「${title}」(\`${id}\`)`, eul: L(josa(title, '을', '를'), '') }
}

function bothAsk(make: () => string): string[] {
  const [ko, en] = bothLangs(make)
  return lang() === 'ko' ? [ko, en] : [en, ko]
}

/** 세션 하나에 대한 지시 글 두 언어 — ko · en 은 askName 으로 지은 이름을 받는다 */
const askAbout = (id: string, selfId: string | null, ko: (n: { name: string; eul: string }) => string, en: (n: { name: string; eul: string }) => string): string[] =>
  bothAsk(() => {
    const n = askName(id, selfId)
    return L(ko(n), en(n))
  })

const firstLine = (text: string): string => fitCells(text.split('\n')[0] ?? '', 60)

/** 입력칸 지시 글 단추의 결과 — 넣음 · 뺌(다시 누름) · 못 함 */
type AskResult = 'filled' | 'removed' | 'failed'

// ultrathink 처럼 같은 글이 이미 입력칸에 있으면 그 글(과 넣을 때 앞에 띄운 줄)만 빼고 쓰던 글은 남긴다(0.1.10 — 사용자 11-04)
async function ask($: EngineInterface, text: string | readonly string[], said = ''): Promise<AskResult> {
  const forms = typeof text === 'string' ? [text] : text
  const cur = (await $.prompt.read().catch(() => null))?.text ?? ''
  const hit = forms.map(t => ({ t, at: cur.indexOf(t) })).find(x => x.t !== '' && x.at >= 0)
  if (hit) {
    const next = `${cur.slice(0, hit.at).replace(/\n{1,2}$/, '')}${cur.slice(hit.at + hit.t.length)}`
    const out = await $.prompt.fill({ text: next, mode: 'replace' }).catch(() => ({ isFilled: false }))
    toast($, `${said}${out.isFilled ? L('입력칸에서 뺐습니다', 'Took it out of the prompt box') : L('입력칸에서 빼지 못했습니다', "Couldn't take it out of the prompt box")}`, out.isFilled)
    return out.isFilled ? 'removed' : 'failed'
  }
  const isFilled = await fillPrompt($, forms[0] ?? '')
  toast($, `${said}${isFilled ? L('입력칸에 넣었습니다 — 보내면 처리합니다 · 다시 누르면 뺍니다', 'Put it in the prompt box — it runs when you send it · press again to take it out') : L('입력칸에 넣지 못했습니다', "Couldn't put it in the prompt box")}`, isFilled)
  return isFilled ? 'filled' : 'failed'
}

/** 앱 동작 하나 — bypass 면 바로 부르고 결과를 알린다, 아니면 지시 글. 바로 해냈나 */
async function appAct(
  $: EngineInterface,
  a: { ask: string | readonly string[]; server: string; tool: string; args: Record<string, unknown>; done: string },
  said = '',
): Promise<boolean> {
  if (!(await isBypass($))) {
    await ask($, a.ask, said)
    return false
  }
  const r = await callApp($, a.server, a.tool, a.args)
  toast($, `${said}${r.ok ? a.done : L(`안 됐습니다 — ${firstLine(r.text)}`, `Didn't work — ${firstLine(r.text)}`)}`, r.ok)
  return r.ok
}

const appSid = (id: string, selfId: string | null): string => (id === selfId ? 'self' : id)

/** 앱 메타가 바뀌었으면 바로 다시 그린다 — 앱이 메타 파일을 늦게 쓰면 3초 타이머가 잡는다 */
const redraw = ($: EngineInterface): Promise<void> => bumpTick($).catch(() => {})

async function pinAct($: EngineInterface, id: string, on: boolean, said = ''): Promise<boolean> {
  const selfId = await selfAppId($)
  const ok = await appAct(
    $,
    {
      ask: on
        ? askAbout(id, selfId, n => `${n.name}${n.eul} 사이드바에 고정해 주세요.`, n => `Pin ${n.name} in the sidebar.`)
        : askAbout(id, selfId, n => `${n.name}의 사이드바 고정을 풀어 주세요.`, n => `Unpin ${n.name} in the sidebar.`),
      server: 'ccd_sidebar',
      tool: 'set_pinned',
      args: { session_id: appSid(id, selfId), pinned: on },
      done: on ? L('고정했습니다', 'Pinned') : L('고정을 풀었습니다', 'Unpinned'),
    },
    said,
  )
  if (ok) await setPinWhy($, id, on ? 'user' : null)
  await redraw($)
  return ok
}

// ── 보관 · 끝내기 전 남은 메시지(0.1.31 ⑧ — 시안 2 확정). 노트: register.md#leftover ──────────────────────────
/** ⑧ 묻기를 지난 뒤 보관 · 끝내기에 넘기는 값 — skipPre = 다시 묻지 않음, msgs = 고른 결과(끝남 기록 · 대화 줄) */
type PreOpts = { skipPre?: boolean; msgs?: ReadonlyMap<string, LeftMsgs> }

async function patchEndFile($: EngineInterface, id: string, patch: Readonly<Record<string, unknown>>): Promise<void> {
  const path = `${await dataDir($)}/sessions/${id}.json`
  const old = await $.fs.read(path).catch(() => null)
  await $.fs.write(path, endFileText(old, patch))
}

async function readHeldBox($: EngineInterface, id: string): Promise<HeldBox | null> {
  return $.fs.read(await heldPath($, id)).then(parseHeldBox, () => null)
}

async function leftoverRows($: EngineInterface, act: PreAsk['act'], ids: readonly string[]): Promise<PreAsk['rows']> {
  const selfId = await selfAppId($)
  if (!selfId) return []
  await takeOutboxCards($, selfId).catch(() => {})
  const metas = await refreshApp($)
  const mine = await readHeldBox($, selfId)
  const out = await $.fs.read(`${await dataDir($)}/${OUTBOX_DIR}/${selfId}.json`).then(parseOutbox, (): OutItem[] => [])
  const receipts = metas.get(selfId)?.receipts ?? []
  const rows: PreAsk['rows'] = []
  for (const id of ids) {
    if (id === selfId) continue
    const l = leftoverOf(id, selfId, mine, await readHeldBox($, id), out, receipts)
    const attached = act === 'tidy' ? attachedKids(metas, id).length : 0
    if (l.inKeys.length > 0 || l.outN > 0 || attached > 0) rows.push({ id, title: metas.get(id)?.title ?? id, inN: l.inKeys.length, outN: l.outN, attached })
  }
  return rows
}

async function preAsk($: EngineInterface, act: PreAsk['act'], ids: readonly string[]): Promise<boolean> {
  const rows = await leftoverRows($, act, ids)
  if (rows.length === 0) return false
  await update($, panelUi, u => ({ ...u, pre: { act, ids: [...ids], rows }, ask: null }))
  await redraw($)
  return true
}

// 누를 때 다시 센다(띄운 사이 글이 늘 수 있다). 고른 결과는 끝남 기록 파일 msgs 칸에, 보관 · 끝내기는 묻기 없이 이어서
async function preGo($: EngineInterface, choice: 'take' | 'drop' | 'keep' | null): Promise<void> {
  const pre = (await read($, panelUi)).pre ?? null
  notePress($, `pre:${choice ?? 'x'}:${pre?.act ?? 'none'}`)
  await update($, panelUi, u => ({ ...u, pre: null }))
  const selfId = await selfAppId($)
  if (!pre || choice === null || !selfId) return redraw($)
  await takeOutboxCards($, selfId).catch(() => {})
  const mine = await readHeldBox($, selfId)
  const msgs = new Map<string, LeftMsgs>()
  const keys: string[] = []
  for (const r of pre.rows) {
    const own = (mine?.items ?? []).filter(x => x.from === r.id).map(heldKey)
    keys.push(...own)
    if (own.length > 0 || r.outN > 0) msgs.set(r.id, { took: choice === 'take' ? own.length : 0, dropped: choice === 'drop' ? own.length : 0, kept: choice === 'keep' ? own.length : 0, unread: r.outN })
  }
  if (keys.length > 0 && choice === 'take') await acceptHeld($, keys)
  else if (keys.length > 0 && choice === 'drop') await rejectHeld($, keys)
  for (const [id, m] of msgs) await patchEndFile($, id, { msgs: m })
  const o: PreOpts = { skipPre: true, msgs }
  if (pre.act === 'finish') await finishAct($, pre.ids[0]!, true, o)
  else if (pre.act === 'archive') await archiveAct($, pre.ids[0]!, true, o)
  else await archiveAllAct($, pre.ids, o)
  notePress($, 'pre:done')
}

// 먼저 이지세션 코드가 바로 부르고, 안 되면(자동 모드에서 앱이 플러그인 부름을 막는 등 — 실물 미확인) 입력칸에 지시 글 → 사람이 보내면 Claude 가 같은 도구로
// 돌려주는 값 = 바로 바뀜(done) · 이미 권한 무시(already) · 입력칸 지시 글로 넘김(asked) · 못 함(none — 앱 세션 아님)
async function selfBypassAct($: EngineInterface, said = ''): Promise<'done' | 'already' | 'asked' | 'none'> {
  const selfId = await selfAppId($)
  if (!selfId) return 'none'
  if (await isBypass($)) {
    toast($, L('이 세션은 이미 권한 무시입니다', 'This session is already in Bypass permissions'), true)
    return 'already'
  }
  const r = await callApp($, 'ccd_session_mgmt', 'set_session_permission_mode', { session_id: selfId, mode: 'bypassPermissions' })
  if (r.ok) {
    toast($, L('권한 무시로 바꿨습니다', 'Switched to Bypass permissions'), true)
    await redraw($)
    return 'done'
  }
  log($, L(`권한 무시로 바로 못 바꿈 — ${firstLine(r.text)}`, `Couldn't switch to Bypass permissions directly — ${firstLine(r.text)}`))
  await ask($, bothAsk(() => L('이 세션 권한 모드를 권한 무시로 바꿔 주세요(set_session_permission_mode — 앱이 승인 카드를 띄웁니다).', "Switch this session's permission mode to Bypass permissions (set_session_permission_mode — the app shows an approval card).")), said)
  return 'asked'
}

// 그 밖은 보낼 칸 자리에 고르기 셋(panel.md#matchCard). 훅(modeMatch)과 같은 갈래 — 부모가 앱 그대로면 사람이 있는 패널이라 끝 답 대신 고르기
async function matchStart($: EngineInterface, selfId: string, id: string, text: string, self: SessionMeta, target: SessionMeta): Promise<void> {
  const metas = await refreshApp($)
  if (self.parent === id && !reportStateOf(id, metas, await reportSwitches($), await reportDefault($)).on) return matchCardAct($, id, text)
  const busy = isBusy(await readRegistry($).catch((): RegistryEntry[] => []), id)
  const m: MatchAsk = { id, text, fromMode: self.mode ?? '', toMode: target.mode ?? '', busy, isOwnKid: target.parent === selfId, confirm: false }
  await update($, panelUi, u => ({ ...u, card: null, draft: stripKind(text), match: m }))
}

/** 받는 곳(앱 id)이 지금 일하는 중 — 엔진 세션 등록부 status(busy · idle, 11-23 잼) */
const isBusy = (entries: readonly RegistryEntry[], id: string): boolean => entries.some(e => e.hostSessionId === id && e.status === 'busy')

async function matchCardAct($: EngineInterface, id: string, text?: string): Promise<void> {
  const s = await appSelf($)
  if (!s) return
  const body = text ?? (await read($, panelUi)).match?.text ?? ''
  if (!body.trim()) return
  await relayCard($, s.selfId, id, s.metas.get(s.selfId)?.title ?? s.selfId, body)
  const name = relayName(s.metas, id)
  relayEnd($, L(`「${name}」 패널에 넣었습니다. 거기서 수락하면 처리합니다`, `Put in the “${name}” panel. It runs once accepted there`), true)
  await update($, panelUi, u => ({ ...u, sending: null, card: null, draft: '', match: null, kidsAsk: null }))
  await update($, appTick, n => n + 1)
}

async function matchLowerAct($: EngineInterface): Promise<void> {
  const m = (await read($, panelUi)).match
  if (!m) return
  if (!m.isOwnKid && !m.confirm) {
    await update($, panelUi, u => ({ ...u, match: u.match ? { ...u.match, confirm: true } : null }))
    return
  }
  const selfId = await selfAppId($)
  if (!selfId) return
  await update($, panelUi, u => ({ ...u, sending: null, card: null, draft: '', match: null, kidsAsk: null }))
  if (isBusy(await readRegistry($).catch((): RegistryEntry[] => []), m.id)) {
    await queueLower($, selfId, [{ id: m.id, text: m.text, at: await $.clock.now() }])
    const name = relayName(await refreshApp($), m.id)
    toast($, L(`「${name}」${topicMark(name)} 일하는 중이라 그 차례가 끝나면 자동으로 내리고 보냅니다`, `“${name}” is working, so it'll be lowered to Auto and sent once that turn ends`), true)
    return
  }
  await lowerAndSend($, m.id, m.text)
}

async function matchUpAct($: EngineInterface): Promise<void> {
  const m = (await read($, panelUi)).match
  if (!m) return
  const r = await selfBypassAct($)
  if (r === 'asked' || r === 'none') {
    await update($, panelUi, u => ({ ...u, match: null, kidsAsk: null }))
    if (r === 'asked') toast($, L('권한 무시로 바뀐 뒤 다시 [보내기]를 누르세요 — 쓴 글은 그대로 둡니다', 'Once it switches to Bypass permissions, press Send again — your text stays'))
    return
  }
  await directSend($, m.id, m.text)
}

/** 바로 보내기(권한 무시 세션 — 앱 세션 채널) + 보낸 알림 · 도착 확인. 못 보내면 글은 보낼 칸에 남는다 */
async function directSend($: EngineInterface, id: string, text: string): Promise<boolean> {
  const s = await appSelf($)
  if (!s) return false
  const at = await $.clock.now()
  const sent = await $.session.send({ to: id, text }).catch((err: unknown) => ({ isDelivered: false as const, reason: String(err) }))
  const name = relayName(s.metas, id)
  if (!sent.isDelivered) {
    toast($, L(`보내지 못했습니다 — ${firstLine(sent.reason)}`, `Couldn't send — ${firstLine(sent.reason)}`))
    await update($, panelUi, u => ({ ...u, match: null, kidsAsk: null }))
    return false
  }
  watchReceipt($, s.selfId, id, at, { title: s.metas.get(s.selfId)?.title ?? s.selfId, text })
  toast($, L(`「${name}」에 보냈습니다`, `Sent to “${name}”`), true)
  await update($, panelUi, u => ({ ...u, sending: null, card: null, draft: '', match: null, kidsAsk: null }))
  await redraw($)
  return true
}

// 먼저 이지세션 코드가 바로 부르고, 안 되면 입력칸 지시 글(「제목」(`id`)에 SendMessage 로 보내 주세요 꼴 — 채운 보내기 글로 읽힘). 바로 내렸으면 보내기는 권한 무시면 바로, 그 밖은 SendMessage 지시 글.
// quiet = 글 없는 내리기의 알림을 부른 쪽이 모아서(하위 모두 자동으로)
async function lowerAndSend($: EngineInterface, id: string, text: string | null, quiet = false): Promise<'done' | 'asked' | 'none'> {
  const s = await appSelf($)
  if (!s) return 'none'
  const name = relayName(s.metas, id)
  const lowered = L(`「${name}」${josa(name, '을', '를')} 자동으로 내렸습니다`, `Lowered “${name}” to Auto`)
  const r = await callApp($, 'ccd_session_mgmt', 'set_session_permission_mode', { session_id: id, mode: 'auto' })
  if (r.ok) {
    if (text === null) {
      if (!quiet) {
        toast($, lowered, true)
        await redraw($)
      }
      return 'done'
    }
    if (s.metas.get(s.selfId)?.mode === 'bypassPermissions') {
      await directSend($, id, text)
      return 'done'
    }
    const filled = await ask($, askAbout(id, s.selfId, n => `${n.name}에 SendMessage 로 보내 주세요:\n\n${kindIn(text, 0)}`, n => `Send this to ${n.name} with SendMessage:\n\n${kindIn(text, 1)}`), `${lowered} · `)
    if (filled === 'failed') await cardInstead($, s.selfId, id, text)
    return 'done'
  }
  log($, L(`「${name}」${josa(name, '을', '를')} 자동으로 바로 못 내림 — ${firstLine(r.text)}`, `Couldn't lower “${name}” to Auto directly — ${firstLine(r.text)}`))
  const lower = (n: { name: string; eul: string }) => `${n.name}${n.eul} set_session_permission_mode 로 자동(auto)으로 내려 주세요`
  const filled = await ask(
    $,
    askAbout(
      id,
      s.selfId,
      n => (text === null ? `${lower(n)}.` : `${lower(n)}. 그다음 ${n.name}에 SendMessage 로 보내 주세요:\n\n${kindIn(text, 0)}`),
      n => (text === null ? `Lower ${n.name} to Auto (auto) with set_session_permission_mode.` : `Lower ${n.name} to Auto (auto) with set_session_permission_mode. Then send this to ${n.name} with SendMessage:\n\n${kindIn(text, 1)}`),
    ),
  )
  // 입력칸에 못 넣었으면(패널 · 대기는 이미 비움) 글은 그 세션 패널 카드로 — 사라지지 않게(advisor 11-23)
  if (filled === 'failed') {
    if (text !== null) await cardInstead($, s.selfId, id, text)
    return 'none'
  }
  return 'asked'
}

async function cardInstead($: EngineInterface, selfId: string, id: string, text: string): Promise<void> {
  const metas = await refreshApp($)
  await relayCard($, selfId, id, metas.get(selfId)?.title ?? selfId, text)
  const name = relayName(metas, id)
  relayEnd($, L(`입력칸에 못 넣어 「${name}」 패널에 카드로 넣었습니다`, `Couldn't fill the prompt box, so it went into the “${name}” panel as a card`))
}

// 지시 하나에 동작 하나). 30분 안에 못 하면 내리지 않고 글은 그 세션 패널 카드로 · 알림
const LOWER_PREFIX = 'lowerAfter:'
const LOWER_WAIT_MS = 30 * 60_000

async function readLowerJobs($: EngineInterface, selfId: string): Promise<LowerJob[]> {
  const v = await $.store.get(`${LOWER_PREFIX}${selfId}`).catch(() => undefined)
  return Array.isArray(v) ? v.filter((j): j is LowerJob => typeof j === 'object' && j !== null && typeof (j as LowerJob).id === 'string' && typeof (j as LowerJob).at === 'number') : []
}

async function queueLower($: EngineInterface, selfId: string, jobs: readonly LowerJob[]): Promise<void> {
  const old = await readLowerJobs($, selfId)
  // 같은 세션 글 없는 내리기는 하나만(글 있는 대기는 글마다)
  const next = [...old.filter(o => !jobs.some(j => j.id === o.id && j.text === null && o.text === null)), ...jobs]
  await $.store.set(`${LOWER_PREFIX}${selfId}`, next)
}

/** 차례대로 내린다 — 지시 글로 넘기면(입력칸 하나) 거기서 멈추고 나머지를 돌려준다 */
async function lowerSeq($: EngineInterface, jobs: readonly LowerJob[], quiet: boolean): Promise<{ done: number; rest: LowerJob[] }> {
  let done = 0
  for (const [i, j] of jobs.entries()) {
    const r = await lowerAndSend($, j.id, j.text, quiet)
    if (r === 'done') done++
    if (r === 'asked') return { done, rest: jobs.slice(i + 1) }
  }
  return { done, rest: [] }
}

async function runLowerQueue($: EngineInterface, selfId: string): Promise<void> {
  const jobs = await readLowerJobs($, selfId)
  if (jobs.length === 0) return
  const entries = await readRegistry($).catch((): RegistryEntry[] => [])
  const now = await $.clock.now()
  const late = jobs.filter(j => now - j.at >= LOWER_WAIT_MS)
  // 입력칸에 글이 있으면(넣은 지시 글을 아직 안 보냄 · 사람이 쓰는 중) 기다린다 — 지시 글을 덮지 않게
  const isBoxBusy = ((await $.prompt.read().catch(() => null))?.text ?? '').trim() !== ''
  const ready = isBoxBusy ? [] : jobs.filter(j => !late.includes(j) && !isBusy(entries, j.id))
  if (ready.length === 0 && late.length === 0) return
  // 먼저 지우고 한다(지시 글로 넘기는 갈래가 다음 3초에 또 돌지 않게)
  await $.store.set(`${LOWER_PREFIX}${selfId}`, jobs.filter(j => !ready.includes(j) && !late.includes(j)))
  const metas = await refreshApp($)
  for (const j of late) {
    const name = relayName(metas, j.id)
    if (j.text !== null) await relayCard($, selfId, j.id, metas.get(selfId)?.title ?? selfId, j.text)
    const why = isBusy(entries, j.id) ? L('30분 넘게 일하는 중이라', 'has been working for over 30 minutes, so it') : L('30분 안에 못 해', "couldn't be done within 30 minutes, so it")
    toast($, L(`「${name}」${topicMark(name)} ${why} 내리지 않았습니다${j.text !== null ? ' — 글은 그 세션 패널 카드로 넣었습니다' : ''}`, `“${name}” ${why} wasn't lowered${j.text !== null ? ' — the text went into that session’s panel as a card' : ''}`))
  }
  const { rest } = await lowerSeq($, ready, false)
  if (rest.length > 0) await queueLower($, selfId, rest)
}

// 올리기라 세션마다 승인 카드). own = 이 세션이 연 하위(앱 부모 · 떼지 않음 — 앱 카드 없음), tree = 트리로만 묶인 하위(묻기 카드 하나로 묶어 물음)
async function kidsAutoTargets($: EngineInterface, selfId: string): Promise<{ own: string[]; tree: string[] }> {
  const metas = await refreshApp($)
  const tree = withTree(metas, await storeLinks($))
  const ended = await refreshEnded($)
  const live = [...tree.values()].filter(m => m.parent === selfId && m.id !== selfId && !m.isArchived && ended.get(m.id)?.ended !== true && m.mode === 'bypassPermissions')
  const isOwn = (id: string) => metas.get(id)?.parent === selfId && metas.get(id)?.detached !== true
  return { own: live.filter(m => isOwn(m.id)).map(m => m.id), tree: live.filter(m => !isOwn(m.id)).map(m => m.id) }
}

// ids 없이 = 단추(이 세션이 연 하위는 바로 · 트리로만 묶인 하위는 묻기 카드), ids = 묻기 카드 [내리기](그 하위들)
async function kidsAutoAct($: EngineInterface, ids?: readonly string[]): Promise<void> {
  const selfId = await selfAppId($)
  if (!selfId) return
  const t = await kidsAutoTargets($, selfId)
  if (ids === undefined) {
    await update($, panelUi, u => ({ ...u, kidsAsk: t.tree.length > 0 ? t.tree : null }))
    if (t.own.length === 0) {
      if (t.tree.length === 0) toast($, L('자동으로 내릴 권한 무시 하위가 없습니다', 'No Bypass sessions below to lower'))
      return
    }
    return lowerMany($, selfId, t.own)
  }
  await update($, panelUi, u => ({ ...u, kidsAsk: null }))
  await lowerMany($, selfId, ids.filter(id => t.tree.includes(id)))
}

async function lowerMany($: EngineInterface, selfId: string, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  const entries = await readRegistry($).catch((): RegistryEntry[] => [])
  const now = await $.clock.now()
  const busy = ids.filter(id => isBusy(entries, id))
  const ready = ids.filter(id => !busy.includes(id)).map(id => ({ id, text: null, at: now }))
  const { done, rest } = await lowerSeq($, ready, true)
  const later = [...busy.map(id => ({ id, text: null, at: now })), ...rest]
  if (later.length > 0) await queueLower($, selfId, later)
  const parts = [
    done > 0 ? L(`하위 ${done}개를 자동으로 내렸습니다`, `Lowered ${plural(done, 'session')} below to Auto`) : null,
    busy.length > 0 ? L(`일하는 중 ${busy.length}개는 그 차례가 끝난 뒤 내립니다`, `${plural(busy.length, 'working session')} will be lowered once their turns end`) : null,
    rest.length > 0 ? L(`나머지 ${rest.length}개는 입력칸 지시 글을 보낸 뒤 이어서 합니다`, `the other ${rest.length} follow once you send the instruction in the prompt box`) : null,
  ].filter((x): x is string => x !== null)
  if (parts.length > 0) toast($, parts.join(' · '), done > 0)
  await redraw($)
}

/** 끝내기 = 끝남 기록(easy-session 몫 — 모드와 무관하게 바로) + 고정 풀기(앱 동작). 끝남 풀기는 기록만 되돌린다.
 *  다른 세션을 끝낼 때 남은 메시지가 있으면 먼저 묻는다(0.1.31 ⑧) */
async function finishAct($: EngineInterface, id: string, on: boolean, o: PreOpts = {}): Promise<void> {
  if (on && !o.skipPre && id !== (await selfAppId($)) && (await preAsk($, 'finish', [id]))) return
  await patchEndFile($, id, { ended: on, summary: '', by: 'user', at: await $.clock.now() })
  const m = o.msgs?.get(id)
  if (on && m) log($, leftoverLine('finish', bareTitle(app.files.get(id)?.meta?.title ?? id), m))
  await update($, panelUi, u => ({ ...u, open: null }))
  const said = on ? L('끝남으로 표시했습니다', 'Marked ended') : L('끝남을 풀었습니다', 'Unmarked ended')
  if (on && app.files.get(id)?.meta?.isStarred) await pinAct($, id, false, `${said} · `)
  else {
    toast($, said, true)
    await redraw($)
  }
}

/** 그 세션이 지금 화면(창 · 나눈 칸 · 따로 띄운 창)에 열려 있나 — 못 읽으면 열린 것으로 친다(보관을 막는 쪽) */
async function isOnScreen($: EngineInterface, id: string): Promise<boolean> {
  const r = await callApp($, 'ccd_window', 'get_window_layout', {})
  return !r.ok || r.text.includes(id)
}

/** 보관 · 보관 풀기 — 고정된 세션은 앱이 보관을 막아 먼저 풀고(★), 다른 세션이 화면에 열려 있으면 안 한다(정본 10절) */
async function archiveAct($: EngineInterface, id: string, on: boolean, o: PreOpts = {}): Promise<void> {
  const selfId = await selfAppId($)
  if (on && !o.skipPre && id !== selfId && (await preAsk($, 'archive', [id]))) return
  if (!on) {
    await appAct($, {
      ask: askAbout(id, selfId, n => `${n.name}의 보관을 풀어 주세요.`, n => `Unarchive ${n.name}.`),
      server: 'ccd_session_mgmt',
      tool: 'unarchive_session',
      args: { session_id: id },
      done: L('보관을 풀었습니다', 'Unarchived'),
    })
    await redraw($)
    return
  }
  const isSelf = id === selfId
  const isStarred = app.files.get(id)?.meta?.isStarred === true
  const links = await storeLinks($)
  const isHanded = isSelf && links.succ.has(id)
  if (!(await isBypass($))) {
    await ask(
      $,
      askAbout(
        id,
        selfId,
        n =>
          `${isHanded ? `${n.name}에 붙은 세션을 먼저 떼어 낸 뒤(detach_session) ${isStarred ? '고정을 풀고 ' : ''}보관해 주세요` : isStarred ? `${n.name}의 고정을 풀고 보관해 주세요` : `${n.name}${n.eul} 보관해 주세요`}${isSelf ? '' : '(화면에 열려 있으면 하지 않음)'}.`,
        n =>
          `${isHanded ? `First detach the sessions attached to ${n.name} (detach_session), then ${isStarred ? 'unpin and ' : ''}archive it` : isStarred ? `Unpin and archive ${n.name}` : `Archive ${n.name}`}${isSelf ? '' : " (not if it's open on screen)"}.`,
      ),
    )
    return
  }
  if (!isSelf && (await isOnScreen($, id))) {
    toast($, L('화면에 열려 있어 보관하지 않았습니다', "It's open on screen, so it wasn't archived"))
    return
  }
  if (isHanded) {
    const failed = await detachKids($, id)
    if (failed > 0) {
      toast($, L(`붙은 세션 ${failed}개를 못 떼어 보관하지 않았습니다`, `Couldn't detach ${failed} attached ${failed === 1 ? 'session' : 'sessions'}, so it wasn't archived`))
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
      toast($, L(`고정을 못 풀어 보관하지 않았습니다 — ${firstLine(r.text)}`, `Couldn't unpin it, so it wasn't archived — ${firstLine(r.text)}`))
      return
    }
  }
  await update($, panelUi, u => ({ ...u, open: null }))
  const r = await callApp($, 'ccd_session_mgmt', 'archive_session', { session_id: appSid(id, selfId), reason: L('easy-session 패널에서 보관', 'Archived from the easy-session panel') })
  toast($, r.ok ? L('보관했습니다', 'Archived') : L(`안 됐습니다 — ${firstLine(r.text)}`, `Didn't work — ${firstLine(r.text)}`), r.ok)
  const m = o.msgs?.get(id)
  if (r.ok && m) {
    await patchEndFile($, id, { archivedAt: await $.clock.now() })
    log($, leftoverLine('archive', bareTitle(app.files.get(id)?.meta?.title ?? id), m))
  }
  await redraw($)
}

// 다른 붙은 세션이 있으면 같이 쓸려 가니 막는다. 막을 까닭 글, 보관해도 되면 null
async function leaveOldOwner($: EngineInterface, oldId: string, selfId: string): Promise<string | null> {
  const kids = attachedKids(await refreshApp($), oldId)
  const others = kids.filter(k => k !== selfId)
  if (others.length > 0) return L(`옛 주인에게 붙은 세션 ${others.length}개가 같이 보관됩니다 — 옛 주인 패널에서 보관하세요`, `${others.length} ${others.length === 1 ? 'session is' : 'sessions are'} attached to the old owner and would be archived too — archive it from the old owner's panel`)
  if (!kids.includes(selfId)) return null
  const r = await callApp($, 'ccd_session_mgmt', 'detach_session', { session_id: 'self' })
  return r.ok ? null : L(`이 세션을 못 떼어 보관하지 않았습니다 — ${firstLine(r.text)}`, `Couldn't detach this session, so it wasn't archived — ${firstLine(r.text)}`)
}

// ── 엔진 명령으로 하는 앱 동작(0.1.28 ⑨ — 사용자 11-19 「그냥 눌러도 바로되게」). 노트: register.md#engineCmd ──────────────────
// 데스크톱 앱 도구를 못 부르는 세션(VS Code · 터미널 엔진 세션 · 앱 번호를 이어받은 그 표면 세션)은 [Remote Control] · [내보내기]를
// 누를 때 엔진 명령 목록을 보고 그 이름이 있으면 $.command.run(지시 글 없음), 없으면 지금 길. 데스크톱 · 모바일 앱 세션은 지금 길 그대로
/** 엔진이 Remote Control 이 켜졌을 때 그 명령 설명을 바꿔 다는 글(엔진 2.1.325 코드 — 켜짐을 읽는 길) */
const RC_ON_DESC = 'Disconnect Remote Control'

async function engineCmdHere($: EngineInterface, id: string, name: string): Promise<CommandInfo | null> {
  // 그린 표면을 모르면(그리기 전 누름은 없음) 지금 길
  if (drawnSurface === null) return null
  const surface = drawnSurface
  const s = await sessionSelf($, surface).catch(() => null)
  if (!s || id !== s.selfId || (await canUseApp($, s, surface))) return null
  const list = await $.command.list().catch((): CommandInfo[] => [])
  return list.find(c => c.name === name) ?? null
}

// 목록으로 잴 수 있을 때만 알림(있는 글), 아니면 엔진이 대화에 적는 글(로그인 필요 등)에 맡긴다. 엔진 명령으로 했으면 true
async function remoteByCommand($: EngineInterface, id: string): Promise<boolean> {
  const cmd = await engineCmdHere($, id, 'remote-control')
  if (!cmd) return false
  const wasOn = cmd.description === RC_ON_DESC
  const r = await $.command.run({ command: 'remote-control' }).catch((err: unknown) => ({ text: String(err) }))
  const now = (await $.command.list().catch((): CommandInfo[] => [])).find(c => c.name === 'remote-control')
  const isOn = now?.description === RC_ON_DESC
  if (now && isOn !== wasOn) toast($, isOn ? L('Remote Control 을 켰습니다', 'Turned Remote Control on') : L('Remote Control 을 껐습니다', 'Turned Remote Control off'), true)
  else if (r.text) toast($, L(`안 됐습니다 — ${firstLine(r.text)}`, `Didn't work — ${firstLine(r.text)}`))
  if (now) await update($, panelUi, u => remoteMark(u, id, isOn ? 'on' : 'off'))
  return true
}

/** 다운로드 폴더(데스크톱 앱 내보내기와 같은 자리) — 사용자 폴더 아래 Downloads 가 있으면 그 경로, 없으면 null(명령 기본 자리 = 작업 폴더) */
async function downloadsDir($: EngineInterface): Promise<string | null> {
  const home = (await envPath(() => $.env.get('USERPROFILE'))) ?? (await envPath(() => $.env.get('HOME')))
  if (!home) return null
  const dir = `${home}/Downloads`
  return (await $.fs.exists(dir).catch(() => false)) ? dir : null
}

/** 내보낼 파일 이름 — 엔진 /export 의 이름 없는 꼴(conversation-<날짜-시각>.txt) */
async function exportName($: EngineInterface): Promise<string> {
  const d = new Date(await $.clock.now())
  const two = (n: number) => String(n).padStart(2, '0')
  return `conversation-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}.txt`
}

// 이름을 주면 고르기 창 없이 바로 쓴다(값 없이 부르면 「복사 · 파일」 고르기 창 — 11-19 잼). 명령은 글을 안 돌려줘 파일이 생겼나로 알린다
async function exportByCommand($: EngineInterface, id: string): Promise<boolean> {
  const cmd = await engineCmdHere($, id, 'export')
  if (!cmd) return false
  const dir = await downloadsDir($)
  const name = await exportName($)
  const cwd = dir ? null : ((await $.session.cwd().catch(() => null)) ?? null)
  const path = dir ? `${dir}/${name}` : cwd ? `${cwd.replace(/\\/g, '/')}/${name}` : name
  const r = await $.command.run({ command: 'export', args: path }).catch((err: unknown) => ({ text: String(err) }))
  const isSaved = await $.fs.exists(path).catch(() => false)
  if (isSaved) toast($, dir ? L(`다운로드 폴더에 저장했습니다 · ${name}`, `Saved to Downloads · ${name}`) : path, true)
  else toast($, r.text ? L(`안 됐습니다 — ${firstLine(r.text)}`, `Didn't work — ${firstLine(r.text)}`) : L('안 됐습니다', "Didn't work"))
  return true
}

async function remoteOffAct($: EngineInterface, id: string): Promise<void> {
  if (await remoteByCommand($, id)) return
  const selfId = await selfAppId($)
  const ok = await appAct($, {
    ask: askAbout(id, selfId, n => `${n.name}의 Remote Control 을 꺼 주세요.`, n => `Turn Remote Control off for ${n.name}.`),
    server: 'ccd_session_mgmt',
    tool: 'set_remote_control',
    args: { session_id: appSid(id, selfId), enabled: false },
    done: L('Remote Control 을 껐습니다', 'Turned Remote Control off'),
  })
  // 지시 글만 넣었으면(bypass 아님) 아직 켜진 채 — 스위치도 켬 그대로(0.1.29 ② F1). ⋯ 메뉴 「원격 끄기」는 누르면 닫히니 지금처럼 지운다
  await update($, panelUi, u => (ok || u.open === id ? remoteMark(u, id, 'off') : u))
}

/** 내보내기 — 앱 세션 메뉴 Export 와 같다(앱 도구 export_transcript: 다운로드 폴더에 zip, 한 시간 6번까지) */
async function exportAct($: EngineInterface, id: string): Promise<void> {
  if (await exportByCommand($, id)) return
  const selfId = await selfAppId($)
  if (!(await isBypass($))) {
    await ask($, askAbout(id, selfId, n => `${n.name}의 대화를 내보내 주세요.`, n => `Export the conversation of ${n.name}.`))
    return
  }
  const r = await callApp($, 'ccd_session_mgmt', 'export_transcript', { session_id: appSid(id, selfId) })
  const file = /[^\\/\s"']+\.zip/i.exec(r.text)?.[0]
  toast($, r.ok ? L(`다운로드 폴더에 저장했습니다${file ? ` · ${file}` : ''}`, `Saved to Downloads${file ? ` · ${file}` : ''}`) : L(`안 됐습니다 — ${firstLine(r.text)}`, `Didn't work — ${firstLine(r.text)}`), r.ok)
}

/** 원격 상태를 화면 상태에 — on = 켜짐 · off = 꺼짐 · bad = 못 읽음(이 세션만 — 「고정 · 보관」 칸 스위치 흐림, 0.1.29 ② F1) */
function remoteMark(u: PanelUi, id: string, state: 'on' | 'off' | 'bad'): PanelUi {
  return { ...u, remote: state === 'on' ? id : u.remote === id ? null : u.remote, remoteBad: state === 'bad' ? id : u.remoteBad === id ? null : (u.remoteBad ?? null) }
}

/**
 * ⋯ 메뉴를 열 때 · 「이 세션」 쪽을 볼 때 그 세션 원격이 켜졌나 본다 — 켜졌을 때만 「원격 끄기」(정본 9절 정함 6). 못 읽으면 ⋯ 메뉴엔 안 띄우고,
 * 이 세션이면 「고정 · 보관」 칸 스위치를 흐린다(0.1.29 ② F1). 데스크톱 앱 도구를 못 부르는 이 세션은 엔진 명령 설명으로 읽는다(노트 register.md#engineCmd)
 */
async function checkRemote($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfAppId($)
  const key = await selfKey($, drawnSurface ?? undefined).catch(() => null)
  const isSelf = id === key
  const mark = (state: 'on' | 'off' | 'bad') =>
    update($, panelUi, u => (u.open === id || ((u.view ?? 'self') === 'self' && u.open === null && isSelf) ? remoteMark(u, id, isSelf || state !== 'bad' ? state : 'off') : u))
  if (isSelf && drawnSurface !== null) {
    const s = await sessionSelf($, drawnSurface).catch(() => null)
    if (s && !(await canUseApp($, s, drawnSurface))) {
      const cmd = (await $.command.list().catch((): CommandInfo[] => [])).find(c => c.name === 'remote-control')
      await mark(cmd ? (cmd.description === RC_ON_DESC ? 'on' : 'off') : 'bad')
      return
    }
  }
  const r = await callApp($, 'ccd_session_mgmt', 'get_session', { session_id: appSid(id, selfId) })
  await mark(!r.ok ? 'bad' : /"remoteControl(?:Active"\s*:\s*true|State"\s*:\s*"on")/.test(r.text) ? 'on' : 'off')
}

/**
 * 「고정 · 보관」 칸 상태 스위치를 눌렀을 때(0.1.29 ② F1 — 꼴은 panel.md#manage). 고정 = 고정 · 풀기(bypass 면 바로, 아니면 지시 글 — 그땐 값 그대로),
 * Remote Control = 켜기 · 끄기(엔진 명령 · 앱 도구 · 지시 글 — 못 읽은 상태면 안 누름), 끝남 표시 = 켜면 묻는 카드만(스위치는 꺼진 채), 끄면 바로 끝남 풀기.
 * 돌려주는 값 = 그 뒤 실제 값(스위치 Client 는 이 값을 그린다)
 */
async function mgrSwitch($: EngineInterface, element: string): Promise<{ on: boolean; disabled: boolean }> {
  const id = await selfKey($, drawnSurface ?? undefined)
  if (!id) return { on: false, disabled: true }
  if (element === MGR_SWITCH.pin) {
    const isStarred = (await refreshApp($)).get(id)?.isStarred === true
    const ok = await pinAct($, id, !isStarred)
    return { on: ok ? !isStarred : isStarred, disabled: false }
  }
  if (element === MGR_SWITCH.remote) {
    const before = await read($, panelUi)
    if (before.remoteBad === id && before.remote !== id) return { on: false, disabled: true }
    await (before.remote === id ? remoteOffAct($, id) : remoteOnAct($, id))
    return { on: (await read($, panelUi)).remote === id, disabled: false }
  }
  const isEnded = (await refreshEnded($)).get(id)?.ended === true
  if (isEnded) {
    await finishAct($, id, false)
    return { on: false, disabled: false }
  }
  await update($, panelUi, u => ({ ...u, ask: u.ask === 'end' ? null : 'end' }))
  return { on: false, disabled: false }
}

const SENT_KIND_PREFIX = 'kinds:'
const TALK_PREFIX = 'talk:'
let kindPending: { selfId: string; to: string; kind: SendKind } | null = null

async function recordKind($: EngineInterface, selfId: string, to: string, kind: SendKind): Promise<void> {
  const key = `${SENT_KIND_PREFIX}${selfId}`
  const items = parseSentKinds(await $.store.get(key).catch(() => undefined))
  await $.store.set(key, pushSentKind(items, { to, at: await $.clock.now(), kind }))
}

async function readTalks($: EngineInterface, selfId: string): Promise<Record<string, number>> {
  return parseTalks(await $.store.get(`${TALK_PREFIX}${selfId}`).catch(() => undefined))
}

async function kindCheck($: EngineInterface, selfId: string, to: string, message: unknown, notify: unknown): Promise<string | null> {
  const talks = await readTalks($, selfId)
  const r = judgeKind({ message, notify, talks: talks[to] ?? 0 })
  if (r.deny !== null || r.kind === null) return r.deny
  if (r.kind === 'talk') await $.store.set(`${TALK_PREFIX}${selfId}`, { ...talks, [to]: (talks[to] ?? 0) + 1 })
  kindPending = { selfId, to, kind: r.kind }
  return null
}

/** 보내기 — bypass 면 앱 세션 채널로 바로(보관된 세션은 풀고 — 정본 11절 ★9), 아니면 SendMessage 지시 글 */
async function sendAct($: EngineInterface, id: string, text: string): Promise<void> {
  text = withKind(text, (await read($, panelUi)).sendKind ?? 'note')
  const kind = kindOfText(text) ?? 'note'
  if (await engineSendAct($, id, text)) return
  const selfId = await selfAppId($)
  const meta = (await refreshApp($)).get(id)
  const clear = () => update($, panelUi, u => ({ ...u, sending: null, card: null, draft: '', match: null, kidsAsk: null, sendKind: 'note' as const }))
  // 묻는 쪽 → 권한 무시(지시 글 맨 앞 줄이던 칸)는 0.1.31 8b 부터 막히는 칸이라 아래 고르기로 간다
  const selfMeta = (await refreshApp($)).get(selfId ?? '')
  const hold = holdRisk(selfMeta?.mode, meta?.mode)
  if (selfId && selfMeta && meta && blockedCell(selfMeta.mode, meta.mode)) return matchStart($, selfId, id, text, selfMeta, meta)
  if (!(await isBypass($))) {
    const forms = askAbout(
      id,
      selfId,
      n => (meta?.isArchived ? `${n.name}의 보관을 풀고 SendMessage 로 보내 주세요:\n\n${kindIn(text, 0)}` : `${n.name}에 SendMessage 로 보내 주세요:\n\n${kindIn(text, 0)}`),
      n => (meta?.isArchived ? `Unarchive ${n.name}, then send this to it with SendMessage:\n\n${kindIn(text, 1)}` : `Send this to ${n.name} with SendMessage:\n\n${kindIn(text, 1)}`),
    )
    if ((await ask($, forms)) === 'filled') await clear()
    return
  }
  if (meta?.isArchived) {
    const r = await callApp($, 'ccd_session_mgmt', 'unarchive_session', { session_id: id })
    if (!r.ok) {
      toast($, L(`보관을 못 풀어 보내지 않았습니다 — ${firstLine(r.text)}`, `Couldn't unarchive it, so nothing was sent — ${firstLine(r.text)}`))
      return
    }
  }
  const sent = await $.session.send({ to: id, text }).catch((err: unknown) => ({ isDelivered: false as const, reason: String(err) }))
  if (!sent.isDelivered) {
    toast($, L(`보내지 못했습니다 — ${firstLine(sent.reason)}`, `Couldn't send — ${firstLine(sent.reason)}`))
    return
  }
  if (selfId) await recordKind($, selfId, id, kind).catch(err => log($, `갈래 기록 실패 — ${String(err)}`))
  toast($, L(`「${shortTitle(meta?.title ?? id)}」에 보냈습니다${hold ? ` — ${holdLine()}` : ''}`, `Sent to “${shortTitle(meta?.title ?? id)}”${hold ? ` — ${holdLine()}` : ''}`), true)
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
  let pin = L(' · 고정은 bypass 세션에서만 됩니다 — 사이드바에서 옮겨 주세요', ' · moving the pin works only in a Bypass session — move it in the sidebar')
  if (bypass) {
    const a = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: appSid(kid.id, callerId), pinned: true })
    const c = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: appSid(oldId, callerId), pinned: false })
    pin = a.ok && c.ok ? L(' · 고정을 옮겼습니다', ' · moved the pin') : L(' · 고정은 못 옮겼습니다', " · couldn't move the pin")
    if (a.ok) await setPinWhy($, kid.id, 'owner')
    if (c.ok) await setPinWhy($, oldId, null)
  }
  const name = shortTitle(kid.title ?? kid.id)
  toast(
    $,
    callerId === oldId
      ? L(`인계: 「${name}」${josa(name, '이', '가')} 이 세션 자리를 이어받았습니다${pin}`, `Handover: “${name}” took over this session's place${pin}`)
      : L(`인계: 이 세션이 앞 차수 자리를 이어받았습니다${pin}`, `Handover: this session took over the previous round's place${pin}`),
    true,
  )
  await update($, appTick, n => n + 1)
}

/** 새 세션 제목이 이 세션의 다음 차수인가 — 인계 */
function isHandoffTitle(oldTitle: string | null | undefined, newTitle: string | null | undefined): boolean {
  return typeof oldTitle === 'string' && typeof newTitle === 'string' && isNextOrdinal(oldTitle, newTitle)
}

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
    if (pin && kid) await askPinHelp($, selfId, { what: 'pin', id: kid.id, why: 'child' })
    if (pin && kid && !detach) {
      toast($, L('새 자식 세션 고정을 위 bypass 세션에 맡겼습니다 — 그 세션 차례 끝에 고정합니다(없으면 그대로)', "Left pinning the new child session to a Bypass session above — it pins at the end of that session's turn (if there is none, nothing changes)"))
      return
    }
    const what = detach ? '떼어 내기' : '고정'
    toast($, L(`새 자식 세션 저절로 ${what}${josa(what, '은', '는')} bypass 세션에서만 됩니다`, `${detach ? 'Detaching' : 'Pinning'} new child sessions automatically works only in a Bypass session`))
    return
  }
  if (detach && !kid) toast($, L('새 자식 세션을 떼어 내지 않았습니다 — 이 세션이 연 세션인지 확인하지 못했습니다', "Didn't detach the new child session — couldn't confirm this session opened it"))
  if (detach && kid) {
    const d = await callApp($, 'ccd_session_mgmt', 'detach_session', { session_id: kid.id })
    // 이 세션을 주인으로 적어(「붙임」 꼴) 앱 메타가 떼어 냄이어도 F14 맨 위 규칙에 안 걸리게 — 하위 칸 · 끝난 곁가지 · 그룹 · 진행판 끝 줄이 그대로 잡힌다(11-03 「떼어 낸 세션도 원래 부모 밑」을 여기에만 살림)
    if (d.ok) await $.store.set(`${OWNER_PREFIX}${kid.id}`, selfId)
    if (!d.ok) toast($, L(`새 자식 세션을 떼어 내지 못했습니다 — ${firstLine(d.text)}`, `Couldn't detach the new child session — ${firstLine(d.text)}`))
    else if (kid.group) {
      // 떼면 그룹이 빠진다 — 원래 그룹에 되돌린다(그룹에 넣으면 고정이 풀려 고정은 그 뒤 — 11-03 20:09 잼)
      const g = await callApp($, 'ccd_sidebar', 'move_sessions', { session_ids: [kid.id], group_id: kid.group })
      if (!g.ok) toast($, L(`떼어 낸 세션을 원래 그룹에 못 넣었습니다 — ${firstLine(g.text)}`, `Couldn't put the detached session back in its group — ${firstLine(g.text)}`))
    }
  }
  if (pin) {
    const r = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: kid?.id ?? ids[0]!, pinned: true })
    if (!r.ok) toast($, L(`새 자식 세션을 고정하지 못했습니다 — ${firstLine(r.text)}`, `Couldn't pin the new child session — ${firstLine(r.text)}`))
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
    toast($, L(`사이드바 그룹에 못 넣었습니다 — ${firstLine(r.text)}`, `Couldn't put it in the sidebar group — ${firstLine(r.text)}`))
    return
  }
  for (const id of ids) if (pinned.has(id)) await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: appSid(id, selfId), pinned: true })
}

// 다른 그룹에 둔 세션(사람이 넣은 주제 그룹)은 안 옮긴다 — 그룹 없는 세션만. 설정이 켜졌고 bypass 세션일 때만(앱 동작)
// 기준은 세션 트리 뿌리(패널 세션 트리로 가장 위 살아 있는 세션) — 곁가지가 자식을 열어도 곁가지 이름 그룹을 만들지 않는다(0.1.6 출고 뒤 advisor 가 잡음:
// 그룹 없는 메인 오케 세션 트리의 곁가지 「[관리 프로그램 칸 내용] …」가 자식을 열면 그 이름 그룹이 생겨 세션 트리가 갈라질 뻔했다)
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
    // 뿌리에 그룹이 없으면 뿌리 [범위] 이름 그룹을 찾거나 만들어 뿌리 · 그 세션 트리의 그룹 없는 살아 있는 세션을 다 넣는다(세션 트리가 갈라지지 않게)
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

/** 스위치를 켤 때 한 번 — 이 세션의 세션 트리(이 세션이 주인인 묶음)를 그룹으로 */
async function groupOwnTree($: EngineInterface): Promise<void> {
  const s = await appSelf($)
  if (!s) return
  const tree = withTree(s.metas, await storeLinks($))
  const ids = [...subtreeOf(tree, s.selfId)].filter(id => id !== s.selfId && tree.get(id)?.isArchived !== true)
  await groupTree($, s.selfId, ids)
}

// ── 세션 정리(0.1.6 — 사용자 11-04 02:1x 「끝 신호 = 진행판 끝 줄」 · 「정리 = 보관 세션 몫 + 실측 자료」). 노트: register.md#sessionClean ──

/** 끝난 곁가지 — 이 세션의 세션 트리 아래(패널 세션 트리) 끝남 기록이 있는 살아 있는 세션, 늦게 끝난 차례. attached = 보관하면 같이 보관될 붙은 세션 수 */
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

/** 이 세션 위(패널 세션 트리)에서 가장 가까운 오케의 진행판 */
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
    await patchEndFile($, selfId, { ended: true, summary: [...summary].slice(0, 160).join(''), by: 'self', at: await $.clock.now() })
  }
  let said = L('진행판 끝 줄로 끝남을 적었습니다', 'Marked ended from the end line on the progress board')
  if ((await storeOn($, AUTO_UNPIN_KEY)) && (await pinWhys($)).get(selfId) === 'child') {
    if (await isBypass($)) {
      const r = await callApp($, 'ccd_sidebar', 'set_pinned', { session_id: 'self', pinned: false })
      if (r.ok) {
        await setPinWhy($, selfId, null)
        said += L(' · 저절로 붙인 고정을 풀었습니다', ' · unpinned what was pinned automatically')
      }
    } else {
      await askPinHelp($, selfId, { what: 'unpin', id: selfId, why: null })
      said += L(' · 고정 풀기는 위 bypass 세션에 맡겼습니다', ' · left unpinning to a Bypass session above')
    }
  }
  toast($, said, true)
  await update($, appTick, n => n + 1)
}

/** 이 세션 역할(패널 세션 트리 · 오케 표시로 — meta.md#roleOf) */
async function selfRole($: EngineInterface): Promise<{ selfId: string; role: SessionRole; up: string | null; tree: Map<string, SessionMeta> } | null> {
  const s = await sessionSelf($)
  if (!s) return null
  const links = await storeLinks($)
  const tree = withTree(s.metas, links)
  const up = tree.get(s.selfId)?.parent ?? null
  return { selfId: s.selfId, role: roleOf(s.selfId, tree, links.orche), up: up !== null && tree.get(up)?.isArchived === false ? up : null, tree }
}

/** 세션 관리 [정리] = 이 세션 입력칸에 정리 글(메인 · 오케면 앞에 세 줄), 하위 줄 ⋯ 「정리 부탁」 = 그 세션에 보낼 칸을 정리 글로 채워 연다(보내기 · 깨우는 값 카드는 보내기 그대로) */
async function cleanAct($: EngineInterface, id: string): Promise<AskResult | null> {
  if (id === (await selfKey($))) {
    const r = await selfRole($)
    const isLead = r !== null && (r.role === 'main' || r.role === 'orche')
    return ask(
      $,
      bothAsk(() => {
        const [head, ...rest] = CLEAN_ASK().split('\n')
        return isLead ? [head, ...CLEAN_TOP(), ...rest].join('\n') : CLEAN_ASK()
      }),
    )
  }
  await update($, panelUi, u => ({ ...u, open: null, sending: id, card: null, match: null, kidsAsk: null, draft: CLEAN_ASK() }))
  return null
}

async function mergeAct($: EngineInterface, id: string): Promise<void> {
  await update($, panelUi, u => ({ ...u, open: null, sending: id, card: null, match: null, kidsAsk: null, draft: MERGE_ASK() }))
}

async function reportAct($: EngineInterface): Promise<void> {
  const r = await selfRole($)
  if (!r) return
  if (r.role === 'solo') {
    toast($, L('위 세션이 없어 보고 꼴은 쓰지 않습니다', 'No session above, so no report form'))
    return
  }
  const upTitle = r.up ? (r.tree.get(r.up)?.title ?? r.up) : null
  const make = (): string => {
    const head = upTitle
      ? L(
          `지금까지를 정해진 꼴로 보고해 주세요(easy-session 「보고 꼴로」). 받는 곳: 위 「${shortTitle(upTitle)}」 — 이 차례 끝 답을 easy-session 이 보냅니다.`,
          `Report the work so far in the set form (easy-session 「Report form」). To: the session above, 「${shortTitle(upTitle)}」 — easy-session sends this turn's last answer.`,
        )
      : L('지금까지를 정해진 꼴로 보고해 주세요(easy-session 「보고 꼴로」). 받는 곳: 사용자(이 채팅).', 'Report the work so far in the set form (easy-session 「Report form」). To: the user (this chat).')
    const body = [head, ...REPORT_LINES()].join('\n')
    return r.up ? `${body}\n>>${L('위', 'up')}` : body
  }
  // 신호는 글 맨 앞이나 맨 끝이어야 읽힌다(meta.md#signalOf) — 쓰던 글 뒤에 이어 붙이므로 끝 줄에 둔다(withSignal 은 앞에 붙여 쓰던 글이 있으면 가운데 낀다)
  // 0.1.29 ③ F9: 신호는 >>위(바로 위) — 이름 신호는 입력창 보내기가 안 보낸다
  await ask($, bothAsk(make))
}

async function titleTidyAct($: EngineInterface): Promise<void> {
  const r = await selfRole($)
  if (!r) return
  await ask(
    $,
    bothAsk(() =>
      L(
        [
          '이 세션 제목을 역할 꼴로 다듬어 주세요(easy-session 「제목 정리」).',
          `꼴: ${TITLE_FORM[r.role]}. 메인 · 오케 같은 역할 표지는 제목에 넣지 않습니다.`,
          '바꾼 제목은 set_session_title 로 씁니다 — 이미 꼴에 맞으면 그대로 둡니다.',
        ].join('\n'),
        [
          "Tidy this session's title into its role's form (easy-session 「Tidy title」).",
          `Form: ${TITLE_FORM[r.role]}. Don't put role marks like main or orchestrator in the title.`,
          'Write the new title with set_session_title — if it already fits the form, leave it.',
        ].join('\n'),
      ),
    ),
  )
}

/** Remote Control 켜기(0.1.26 — 「현재 세션」 칸, 끄기와 같은 길) */
async function remoteOnAct($: EngineInterface, id: string): Promise<void> {
  if (await remoteByCommand($, id)) return
  const selfId = await selfAppId($)
  const ok = await appAct($, {
    ask: askAbout(id, selfId, n => `${n.name}의 Remote Control 을 켜 주세요.`, n => `Turn Remote Control on for ${n.name}.`),
    server: 'ccd_session_mgmt',
    tool: 'set_remote_control',
    args: { session_id: appSid(id, selfId), enabled: true },
    done: L('Remote Control 을 켰습니다', 'Turned Remote Control on'),
  })
  if (ok) await update($, panelUi, u => remoteMark(u, id, 'on'))
}

// 알림은 한 줄(보관 N · 건너뜀 K · 못 함 F). auto 면 패널에 단추가 없고(지시 글 하나에 보관이 여럿 들어가 판정기가 뒤엣것을 막을 수 있다), 눌러도 줄마다 하라고 알린다
async function archiveAllAct($: EngineInterface, ids: readonly string[], o: PreOpts = {}): Promise<void> {
  if (!(await isBypass($))) {
    toast($, L('auto 세션은 보관을 줄마다 합니다 — 지시 글 하나에 보관 하나', 'An auto session archives row by row — one archive per instruction'))
    return
  }
  if (!o.skipPre && (await preAsk($, 'tidy', ids))) return
  const selfId = await selfAppId($)
  const titles: string[] = []
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
    const r = await callApp($, 'ccd_session_mgmt', 'archive_session', { session_id: id, reason: L('easy-session 패널에서 보관', 'Archived from the easy-session panel') })
    if (r.ok) {
      done++
      const title = bareTitle(app.files.get(id)?.meta?.title ?? id)
      titles.push(title)
      const m = o.msgs?.get(id)
      if (m) {
        await patchEndFile($, id, { archivedAt: await $.clock.now() })
        log($, leftoverLine('archive', title, m))
      }
    } else failed++
  }
  if (titles.length > 0) log($, L(`정리: ${titles[0]}${titles.length > 1 ? ` 외 ${titles.length - 1}` : ''} — 고정 풀고 보관`, `Tidied: ${titles[0]}${titles.length > 1 ? ` and ${titles.length - 1} more` : ''} — unpinned and archived`))
  await update($, panelUi, u => ({ ...u, open: null }))
  toast(
    $,
    L(
      `끝남 ${ids.length} 가운데 ${done} 보관${skipped > 0 ? ` · 화면에 열려 있어 건너뜀 ${skipped}` : ''}${failed > 0 ? ` · 못 함 ${failed}` : ''}`,
      `Archived ${done} of ${ids.length} ended${skipped > 0 ? ` · skipped ${skipped} open on screen` : ''}${failed > 0 ? ` · failed ${failed}` : ''}`,
    ),
    done > 0 && failed === 0,
  )
  await redraw($)
}

/** [설정] 「정리」 칸의 남은 자료 — 마지막 셈. [설정]을 볼 때 10분에 한 번 센다(파일 4만 개 · 이 PC 3.6초라 그릴 때마다는 안 셈 — 0.1.25 에 [전체]에서 옮김) */
let cleanScan: CleanScan | null = null
const CLEAN_SCAN_MS = 10 * 60_000

async function scanScratch($: EngineInterface): Promise<void> {
  if (cleanScan?.running) return
  const now = await $.clock.now()
  cleanScan = { at: cleanScan?.at ?? null, running: true, items: cleanScan?.items ?? [], bytes: cleanScan?.bytes ?? 0, keepLive: 0, keepRef: 0, error: null }
  await update($, appTick, n => n + 1)
  try {
    const s = await appSelf($)
    const metaDir = s ? await findAppSessions($, s.selfId) : null
    if (!s || !metaDir) throw new Error(L('앱 세션 자료를 못 찾음', "Can't find the app's session records"))
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
      ? L('휴지통이 「바로 지움」으로 설정돼 있습니다', 'The Recycle Bin is set to delete files right away')
      : refused?.[1] === 'full'
        ? L(
            `휴지통에 이미 ${refused[2]}MB 가 있어 ${refused[4]}MB 를 더하면 최대 크기(${refused[3]}MB)를 넘습니다 — 넘으면 옛 항목이 영구히 지워집니다`,
            `The Recycle Bin already holds ${refused[2]}MB; adding ${refused[4]}MB goes over its maximum (${refused[3]}MB) — older items would be deleted for good`,
          )
        : refused?.[1] === 'os'
          ? L('휴지통 옮기기는 Windows 에서만 됩니다', 'Moving to the Recycle Bin works only on Windows')
          : L('휴지통 설정을 못 읽었습니다', "Couldn't read the Recycle Bin settings")
  if (refused) toast($, L(`휴지통으로 옮기지 않았습니다 — ${why}`, `Nothing moved to the Recycle Bin — ${why}`))
  else if (done)
    toast(
      $,
      L(`휴지통으로 옮겼습니다 — ${done[1]}개${Number(done[2]) > 0 ? ` · 못 옮긴 것 ${done[2]}개(쓰는 중일 수 있음)` : ''}`, `Moved ${done[1]} to the Recycle Bin${Number(done[2]) > 0 ? ` · couldn't move ${done[2]} (may be in use)` : ''}`),
      Number(done[2]) === 0,
    )
  else toast($, L(`휴지통으로 옮기지 못했습니다 — ${firstLine(out || String(ran.stderr ?? ''))}`, `Couldn't move to the Recycle Bin — ${firstLine(out || String(ran.stderr ?? ''))}`))
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

async function detachAct($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfAppId($)
  const ok = await appAct($, {
    ask: id === selfId
      ? bothAsk(() => L('이 세션을 맨 위로 떼어 내 주세요(detach_session "self").', 'Detach this session to the top level (detach_session "self").'))
      : askAbout(id, selfId, n => `${n.name}${n.eul} 떼어 내 주세요(detach_session).`, n => `Detach ${n.name} (detach_session).`),
    server: 'ccd_session_mgmt',
    tool: 'detach_session',
    args: { session_id: appSid(id, selfId) },
    done: id === selfId ? L('떼어 냈습니다 — 연 세션에 보고가 더는 안 갑니다', 'Detached — reports no longer go to the session that opened this one') : L('떼어 냈습니다 — 그 세션 보고가 더는 안 옵니다', 'Detached — its reports no longer come'),
  })
  if (ok) await $.store.set(`${OWNER_PREFIX}${id}`, TOP)
  await update($, panelUi, u => ({ ...u, open: null }))
  await redraw($)
}

async function setOwnerAct($: EngineInterface, id: string, value: string): Promise<boolean> {
  const key = `${OWNER_PREFIX}${id}`
  if (value === APP_OWNER) await $.store.delete(key)
  else if (value === TOP) await $.store.set(key, TOP)
  else {
    const s = await sessionSelf($)
    const tree = s ? withTree(s.metas, await storeLinks($)) : new Map<string, SessionMeta>()
    if (value === id || subtreeOf(tree, id).has(value)) {
      toast($, L('고리가 생겨 주인을 안 바꿨습니다', "That would make a loop, so the owner didn't change"))
      return false
    }
    await $.store.set(key, value)
  }
  await update($, appTick, n => n + 1)
  return true
}

async function adoptAct($: EngineInterface, id: string): Promise<void> {
  const selfId = await selfKey($)
  if (!selfId) return
  if (await setOwnerAct($, id, selfId)) {
    await groupTree($, selfId, [id])
    const name = shortTitle(app.files.get(id)?.meta?.title ?? id)
    toast($, L(`「${name}」${josa(name, '을', '를')} 이 세션 밑으로 붙였습니다`, `Put “${name}” under this session`), true)
  }
}

async function orcheAct($: EngineInterface, id: string, on: boolean): Promise<void> {
  if (on) await $.store.set(`${ORCHE_PREFIX}${id}`, true)
  else await $.store.delete(`${ORCHE_PREFIX}${id}`)
  await update($, appTick, n => n + 1)
  if (on && id === (await selfAppId($))) await groupOwnTree($)
}

async function handoffAct($: EngineInterface): Promise<void> {
  if (await selfKey($)) await ask($, bothAsk(HANDOFF_ASK))
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

async function afterToolOpen($: EngineInterface, k: string): Promise<void> {
  // 데스크톱 앱 밖 세션(엔진 세션 번호)도 읽는다 — 「정리 · 끝내기」 칸 Remote Control 스위치(0.1.29 ② F1)
  const id = await selfKey($, drawnSurface ?? undefined)
  if (k === 'mgr' && id) await checkRemote($, id)
  if (k === 'adv' && advisorCountOf(await useOf($), await advisorShare($)) > 0) await readAdvisorTimes($)
}

function toggleFold(folds: readonly string[], key: string): string[] {
  if (folds.includes(key)) return folds.filter(f => f !== key)
  const only = ['held:'].find(p => key.startsWith(p))
  return [...(only ? folds.filter(f => !f.startsWith(only)) : folds), key]
}

function panelActs($: EngineInterface): PanelActs {
  const set = (fn: (u: PanelUi) => PanelUi) => void update($, panelUi, fn)
  return {
    firstSetup: pick => void firstSetupAct($, pick).catch(err => log($, `처음 설정 실패 — ${String(err)}`)),
    view: async to => {
      if ((await read($, panelUi)).view !== to) await closeUpdateDrawer($)
      await update($, panelUi, u => ({ ...u, view: to, open: null, remote: null, remoteBad: null, ask: null, pre: null }))
      const id = await selfKey($, drawnSurface ?? undefined)
      if (to === 'self' && id) await checkRemote($, id)
    },
    // 펼 때만 「고정 · 보관」은 원격이 켜졌나 보고, 「어드바이저」는 기록을 바로 읽는다(설치판 어드바이저 칸을 펼 때와 같음). 역할 칩도 이 길(「역할 · 인계」 펴고 접기)
    tool: k => {
      void (async () => {
        let isOpening = false
        await update($, panelUi, u => {
          isOpening = u.tool !== k
          return { ...u, tool: isOpening ? k : null, open: null, sending: null, card: null, ask: null, pre: null, match: null, kidsAsk: null }
        })
        if (isOpening) await afterToolOpen($, k)
      })().catch(err => log($, `칸 고르기 실패 — ${String(err)}`))
    },
    openTool: k => {
      void (async () => {
        let isOpening = false
        await update($, panelUi, u => {
          isOpening = u.tool !== k
          return isOpening ? { ...u, tool: k, open: null, sending: null, card: null, ask: null, pre: null, match: null, kidsAsk: null } : u
        })
        if (isOpening) await afterToolOpen($, k)
      })().catch(err => log($, `칸 펴기 실패 — ${String(err)}`))
    },
    go: id => goApp($, id),
    more: async id => {
      const isOpening = (await read($, panelUi)).open !== id
      await update($, panelUi, u => ({ ...u, open: isOpening ? id : null, remote: null }))
      if (isOpening) await checkRemote($, id)
    },
    send: at => set(u => ({ ...u, sending: u.sending === at ? null : at, card: null, match: null, kidsAsk: null, sendKind: 'note' })),
    draft: text => set(u => ({ ...u, draft: text })),
    sendGo: (id, text) => void sendGo($, id, text),
    sendCancel: () => set(u => ({ ...u, sending: null, card: null, match: null, kidsAsk: null, sendKind: 'note' })),
    sendKind: value => set(u => ({ ...u, sendKind: value === 'ask' || value === 'talk' ? value : 'note' })),
    cardOpen: id => {
      set(u => ({ ...u, card: null }))
      void goApp($, id)
    },
    cardSend: async id => sendAct($, id, (await read($, panelUi)).draft),
    cardCancel: () => set(u => ({ ...u, card: null })),
    // on 을 주면 그 값으로(이미 그렇면 그대로). 묻던 카드는 칸을 바꿀 때 닫는다(tool — 0.1.26)
    fold: (key, on) => set(u => ({ ...u, folds: on === undefined || u.folds.includes(key) !== on ? toggleFold(u.folds, key) : u.folds })),
    ask: what => set(u => ({ ...u, ask: what })),
    pin: async (id, on) => void (await pinAct($, id, on)),
    finish: (id, on) => {
      notePress($, `finish:${on}`)
      return finishAct($, id, on)
    },
    archive: (id, on) => {
      notePress($, `archive:${on}`)
      return archiveAct($, id, on)
    },
    remoteOff: id => remoteOffAct($, id),
    remoteOn: id => remoteOnAct($, id),
    accept: keys => {
      set(u => (u.ask === 'rejectAll' ? { ...u, ask: null } : u))
      return acceptHeld($, keys)
    },
    reject: keys => {
      set(u => (u.ask === 'rejectAll' ? { ...u, ask: null } : u))
      return rejectHeld($, keys)
    },
    setOwner: (id, value) => void setOwnerAct($, id, value),
    orche: (id, on) => orcheAct($, id, on),
    detach: id => detachAct($, id),
    adopt: id => adoptAct($, id),
    handoff: () => handoffAct($),
    boardSet: path => void boardSet($, path),
    boardFill: () => boardFill($),
    pickDisplay: value => void setDisplay($, value),
    pickLang: value => void saveLang($, value === 'ko' || value === 'en' ? value : 'auto').catch(err => log($, `언어 고르기 실패 — ${String(err)}`)),
    pickQuick: (key, on) => void setQuickItem($, key, on),
    pickAdvisor: value => (isWorking ? refusePick($) : void setAdvisor($, value)),
    pickAutoPin: on => void setAutoPin($, on),
    pickAutoDetach: on => void setAutoDetach($, on),
    pickPeerRel: on => void setSwitch($, PEER_REL_KEY, on),
    pickMentionInfo: on => void setSwitch($, MENTION_KEY, on),
    pickMdLock: on => void setSwitch($, MD_LOCK_KEY, on),
    mdLockDir: path => void setMdLockDir($, path).catch(err => log($, `잠금 폴더 정하기 실패 — ${String(err)}`)),
    mdLockRelease: file => void mdLockReleaseAct($, file).catch(err => log($, `잠금 풀기 실패 — ${String(err)}`)),
    pickAutoUnpin: on => void setSwitch($, AUTO_UNPIN_KEY, on),
    pickAutoGroup: on => void setSwitch($, AUTO_GROUP_KEY, on).then(() => (on ? groupOwnTree($) : undefined)),
    pickFirstUltra: on => void setSwitch($, FIRST_ULTRA_KEY, on),
    pickSessionRules: on => void setRulesOn($, on),
    clean: async id => {
      const r = await cleanAct($, id)
      // 누른 자리에 「넣었습니다」 한 줄 — 20초 뒤 거둔다(접힘 값이라 다시 열어도 안 남게). 다시 눌러 뺐으면 바로 거둔다(0.1.10)
      if (r === 'filled') {
        await update($, panelUi, u => ({ ...u, folds: [...u.folds.filter(f => f !== 'clean-hint'), 'clean-hint'] }))
        $.clock.after(20_000, () => void update($, panelUi, u => ({ ...u, folds: u.folds.filter(f => f !== 'clean-hint') })).catch(() => {}))
      } else if (r === 'removed') await update($, panelUi, u => ({ ...u, folds: u.folds.filter(f => f !== 'clean-hint') }))
    },
    archiveAll: ids => archiveAllAct($, ids),
    pre: choice => preGo($, choice).catch(err => log($, `남은 메시지 처리 실패 — ${String(err)}`)),
    selfBypass: () => selfBypassAct($).catch(err => log($, `권한 무시로 바꾸기 실패 — ${String(err)}`)),
    matchLower: () => void matchLowerAct($).catch(err => log($, `내리고 보내기 실패 — ${String(err)}`)),
    matchUp: () => void matchUpAct($).catch(err => log($, `권한 무시로 올리고 보내기 실패 — ${String(err)}`)),
    matchCard: () => void read($, panelUi).then(u => (u.match ? matchCardAct($, u.match.id) : undefined)).catch(err => log($, `카드로 보내기 실패 — ${String(err)}`)),
    matchBack: () => set(u => ({ ...u, match: u.match ? { ...u.match, confirm: false } : null })),
    matchCancel: () => set(u => ({ ...u, match: null })),
    kidsAuto: () => void kidsAutoAct($).catch(err => log($, `하위 모두 자동으로 실패 — ${String(err)}`)),
    kidsAutoOk: () => void read($, panelUi).then(u => kidsAutoAct($, u.kidsAsk ?? [])).catch(err => log($, `하위 자동으로 내리기 실패 — ${String(err)}`)),
    kidsAutoNo: () => set(u => ({ ...u, kidsAsk: null })),
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
    upd: {
      toggle: () => void toggleUpdateDrawer($).catch(err => log($, `판 단추 실패 — ${String(err)}`)),
      check: () => void checkUpdate($).catch(err => log($, `업데이트 확인 실패 — ${String(err)}`)),
      apply: () => void applyUpdate($).catch(err => log($, `업데이트 실패 — ${String(err)}`)),
      output: () => void toggleUpdateOpen($, 'error').catch(() => {}),
      ask: () => void askUpdate($).catch(err => log($, `입력칸에 넣기 실패 — ${String(err)}`)),
    },
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

let lastSig = ''

let clearedFrom: string | null = null

/** 옮기는 자료 — 파일(자료 폴더 아래 · 열쇠 = 세션 번호)과 $.store 열쇠 앞머리. context/ · outbox/ · relay: 는 안 옮긴다(노트 register.md#clearMove) */
const MOVE_DIRS = ['sessions', 'reports', 'boards', 'advisor', 'sent', 'recv'] as const
const MOVE_KEYS = [OWNER_PREFIX, SUCC_PREFIX, ORCHE_PREFIX, REPORT_PREFIX, PIN_WHY_PREFIX, OWN_PANE_PREFIX] as const

async function moveCleared($: EngineInterface): Promise<void> {
  if (clearedFrom === null) return
  const to = await engineId($)
  const from = clearedFrom
  if (from === null || to === null || to === from) return
  clearedFrom = null
  const data = await dataDir($)
  for (const dir of MOVE_DIRS) {
    const text = await $.fs.read(`${data}/${dir}/${from}.json`).catch(() => null)
    if (text === null || (await $.fs.exists(`${data}/${dir}/${to}.json`).catch(() => true))) continue
    await $.fs.write(`${data}/${dir}/${to}.json`, text)
  }
  for (const key of await $.store.keys()) {
    const v = await $.store.get(key)
    const prefix = MOVE_KEYS.find(p => key.startsWith(p))
    if (prefix !== undefined && key === `${prefix}${from}`) {
      if ((await $.store.get(`${prefix}${to}`)) === undefined) await $.store.set(`${prefix}${to}`, v)
      await $.store.delete(key)
    } else if ((key.startsWith(OWNER_PREFIX) || key.startsWith(SUCC_PREFIX)) && v === from) await $.store.set(key, to)
  }
  await update($, appTick, n => n + 1)
}

/** 앱 메타 · 끝남 기록이 바뀌었거나 분이 넘어가면 appTick 을 올려 그리는 쪽을 다시 그리게 한다 */
async function bumpTick($: EngineInterface): Promise<void> {
  await ensureLang($).catch(() => {})
  const appId = await selfAppId($)
  const selfId = appId ?? (await selfKey($))
  if (!selfId) return
  if (!appId) await moveCleared($).catch(err => log($, `자료 옮기기 실패 — ${String(err)}`))
  if (appId) await runLowerQueue($, appId).catch(err => log($, `내리기 대기 실패 — ${String(err)}`))
  // 창에 안 띄운 세션은 그릴 것이 없어 건너뛴다 — 창에 붙으면 그리면서 새로 읽는다(0.1.3 물음 ⑥). 못 물으면 그대로 돈다
  const surfaces = await $.session.surfaces().catch(() => null)
  if (surfaces !== null && surfaces.length === 0) return
  void kickAdvisorTimes($).catch(err => log($, `advisor 기록 읽기 실패 — ${String(err)}`))
  if (appId) await takeFromQueue($, appId, await refreshApp($)).catch(err => log($, `앱 대기 칸 받기 실패 — ${String(err)}`))
  await takeOutboxCards($, selfId).catch(err => log($, `내보낸 칸 받기 실패 — ${String(err)}`))
  if (appId) void takePinAsks($, false).catch(err => log($, `고정 부탁 받기 실패 — ${String(err)}`))
  await refreshEnded($)
  await heldCounts($)
  let sig = String(Math.floor((await $.clock.now()) / 60_000))
  await readRegistry($)
  sig += registrySig()
  for (const [id, f] of app.files) sig += `|${id}:${f.mtimeMs}`
  for (const [id, f] of app.ended) sig += `|e${id}:${f.mtimeMs}`
  for (const [id, f] of heldCache) sig += `|h${id}:${f.mtimeMs}`
  // advisor 는 다른 세션이 바꿔도 이 세션 드롭다운이 따라오게(0.1.1 실측 — 비교 값에 없어 분이 바뀔 때만 따라왔다)
  sig += `|r${String(await reportDefault($))}|d${(await displayOf($)).value}|p${String(await autoPinOn($))}|x${String(await autoDetachOn($))}|a${await advisorOf($)}`
  sig += `|f${String(await needsFirstSetup($))}`
  sig += `|l${lang()}:${await langPick($)}`
  // 입력창 위 줄에 둘 것(다른 세션이 바꿔도 따라오게) · 답하는 중(패널 [설정] advisor 를 막고 풀게) — 0.1.4
  const quick = await quickItemsOf($)
  sig += `|q${[...quick].join(',')}|w${String(isWorking)}`
  if (quick.has('send')) sig += `|z${signalOf((await $.prompt.read().catch(() => null))?.text ?? '')?.word ?? ''}`
  for (const [id, on] of await reportSwitches($)) sig += `|r${id}:${String(on)}`
  // 오케 세션 트리 기록 · 진행판 · advisor 공용 파일 — 바뀌면 세션 트리 · 새 줄 수 · 금액을 다시 그린다(0.1.3)
  sig += linksSig(await storeLinks($))
  const b = await readBoard($, selfId)
  if (b) sig += `|b${(await $.fs.stat(b.path).catch(() => null))?.mtimeMs ?? 0}:${b.seen.length}`
  const share = await advisorShareFile($)
  if (share) sig += `|v${(await $.fs.stat(share).catch(() => null))?.mtimeMs ?? 0}`
  if (sig === lastSig) return
  lastSig = sig
  await update($, appTick, n => n + 1)
}


async function refreshGroup($: EngineInterface): Promise<void> {
  const group = await appGroup($).catch(() => null)
  await update($, selfGroup, () => group)
}

/** 앱 딥링크로 화면을 그 세션으로 옮긴다. & 가 cmd 에 잘리지 않게 rundll32 로 연다(Windows) */
async function go($: EngineInterface, node: NavNode): Promise<void> {
  const url = `claude://code/continue?session=${encodeURIComponent(node.sessionId)}&source=session_nav`
  try {
    const ran = await $.process.run(['rundll32.exe', 'url.dll,FileProtocolHandler', url], { timeoutMs: 10000 })
    if (ran.exitCode !== 0) toast($, L(`이동 실패(${ran.exitCode}): ${node.label}`, `Couldn't go there (${ran.exitCode}): ${node.label}`))
  } catch (err) {
    toast($, L(`이동 실패: ${String(err)}`, `Couldn't go there: ${String(err)}`))
  }
}

async function ownPaneKey($: EngineInterface): Promise<string | null> {
  if (await selfAppId($)) return null
  if (!(await engineServed($))) return null
  const id = await engineId($)
  return id ? `${OWN_PANE_PREFIX}${id}` : null
}

/** 이 세션에 트리 패널을 열어 둘지: 연 세션과 같은 그룹이면 따라 연다. 엔진 세션은 제 값만(노트 register.md#ownPane) */
async function wantsPane($: EngineInterface): Promise<boolean> {
  const own = await ownPaneKey($)
  if (own) return (await $.store.get(own).catch(() => undefined)) === true
  return paneFollows(await $.store.get(PANE_KEY), await read($, selfGroup))
}

/** 이 세션의 패널을 저장된 상태에 맞춘다. 타이머가 계속 불러 세션을 옮겨도 따라 열린다. isPerson = 사람이 연 길(togglePane — 키 달라고 함) */
async function syncPane($: EngineInterface, isPerson = false): Promise<void> {
  const want = await wantsPane($)
  const isShown = (await $.ui.panes()).some(pane => pane.id === PANE)
  if (!want) {
    if (isShown) await $.ui.close({ id: PANE })
    const wasOpen = await read($, isOpen)
    if (wasOpen) await update($, isOpen, () => false)
    if (isShown || wasOpen) await closeUpdateDrawer($)
    return
  }
  if (isShown && (await read($, isOpen))) return
  const surfaces = await $.session.surfaces()
  if (surfaces.length === 0) return
  await refreshGroup($)
  await update($, isOpen, () => true)
  await $.ui.open({ id: PANE, title: L('세션', 'Sessions'), ...(isPerson && surfaces.includes(TERMINAL_SURFACE) ? { focus: true as const } : {}) })
  void refreshUpdateInfo($).catch(() => {})
  // 「이 세션」 쪽(처음 값)의 원격 끄기 단추 — 열 때 한 번 본다
  const id = await selfAppId($)
  if (id && ((await read($, panelUi)).view ?? 'self') === 'self') await checkRemote($, id).catch(() => {})
}

/** 띠 버튼: 열려 있으면 닫고, 아니면 이 묶음으로 연다. 묶음을 아직 모르면 먼저 읽는다 — 안 그러면 눌러도 안 열린다 */
async function togglePane($: EngineInterface): Promise<void> {
  const own = await ownPaneKey($)
  if (own) {
    if (await wantsPane($)) await $.store.delete(own)
    else await $.store.set(own, true)
    await syncPane($, true)
    return
  }
  if ((await read($, selfGroup)) === null) await refreshGroup($)
  if (await wantsPane($)) await $.store.delete(PANE_KEY)
  else await $.store.set(PANE_KEY, { group: await read($, selfGroup) })
  await syncPane($, true)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    sessionStartAt = await $.clock.now().catch(() => null)
    firstDrawn = false
    resetPaneGuard()
    await seedSeenVersion($).catch(() => {})
    void refreshUpdateInfo($).catch(() => {})
    await refreshGroup($)
    // 다른 세션에서 열고 닫은 패널을 따라간다 · 노트 register.md#paneGuard — 화면이 붙었는데 안 그려진 패널을 스스로 풀기(0.1.31 H7 ⓑ)
    $.clock.every(1500, () => {
      void syncPane($).catch(() => {})
      void unstickPane($).catch(() => {})
    })
    // 다른 세션이 앱 메타를 바꾸면 새 패널 · 아래 줄을 다시 그린다(노트 register.md#bumpTick)
    $.clock.every(3000, () => {
      void bumpTick($).catch(() => {})
    })
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
  on('turn.start', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    if (clearedFrom !== null) await moveCleared($).catch(err => log($, `자료 옮기기 실패 — ${String(err)}`))
    if (e.agentId === undefined) {
      // 사람 글이 시작한 차례면 앞서 물은 곳이 이 차례에 통과한다(한 차례만)
      const rp = await read($, rulesPending)
      await update($, rulesPending, () => null)
      await update($, rulesTurn, t => ({ isHuman: rp?.isHuman === true, places: [], asked: rp?.isHuman ? [] : t.asked, ok: rp?.isHuman ? t.asked : [], allow: rp?.allow ?? [], cold: [] }))
      const isUltra = ultraTyped(e.text)
      if ((await read($, ultraTurn)) !== isUltra) await update($, ultraTurn, () => isUltra)
      const selfId = await selfAppId($).catch(() => null)
      const p = selfId ? await readPending($, selfId) : null
      if (selfId && p && p.turnId === null) await writePending($, selfId, { ...p, turnId: e.turnId }).catch(() => {})
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    await refreshGroup($)
    if (e.agentId === undefined) {
      await update($, rulesTurn, t => ({ ...t, places: [], ok: [], allow: [], cold: [] })).catch(() => {})
      if (await read($, ultraTurn)) await update($, ultraTurn, () => false)
      void finishRelay($, e).catch(err => log($, `끝 답 보내기 실패 — ${String(err)}`))
      await writeContextReport($, e.usage?.model ?? null).catch(err => log($, `컨텍스트 적기 실패 — ${String(err)}`))
      if (e.reason === 'answer' && !e.isAborted) await noteEnding($, e.answer ?? '').catch(err => log($, `끝난 듯 기록 실패 — ${String(err)}`))
      void autoReleaseLocks($).catch(err => log($, `md 잠금 저절로 풀기 실패 — ${String(err)}`))
      void takePinAsks($).catch(err => log($, `고정 부탁 받기 실패 — ${String(err)}`))
      // 메인 차례가 끝나면 advisor 그림은 손짓에서 쉬는 그림으로(횟수는 남는다)
      if ((await read($, advisorTurn)) !== null) await update($, advisorTurn, () => null)
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

  on('session.send', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    if (e.origin.kind !== 'model' || e.agentId !== undefined) return next(e)
    const selfId = await selfAppId($).catch(() => null)
    if (!selfId) {
      const r = await next(e)
      if (r.isDelivered) await noteModelSent($, e.to).catch(err => log($, `보낸 글 적기 실패 — ${String(err)}`))
      return r
    }
    const p = await readPending($, selfId)
    if (!p || e.to !== p.to) return next(e)
    if (p.way !== 'model') return { isDelivered: false, reason: RELAY_SELF_SEND() }
    const r = await next(e)
    if (r.isDelivered) await writePending($, selfId, { ...p, modelSent: true }).catch(() => {})
    return r
  })

  on('session.receive', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    const kind = e.origin.kind
    if (e.agentId === undefined && (kind === 'peer' || kind === 'peer-send-message')) await noteRecv($, e.text, e.origin).catch(err => log($, `받은 글 세기 실패 — ${String(err)}`))
    return next(e)
  })

  // ultrathink 단추 꼴: 입력창이 넣기 · 보내기 · 지우기 · 기록 불러오기로 바뀌면 낱말이 있나 다시 본다(노트 register.md#ultrathink)
  on('prompt.change', async ($, e, next) => {
    const isOn = ULTRA_RE.test(e.text)
    if ((await read($, ultraOn)) !== isOn) await update($, ultraOn, () => isOn)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    if (e.reason === 'clear' && !(await selfAppId($))) clearedFrom = e.sessionId
    return next(e)
  })

  // 사람이 패널을 닫으면 모든 세션에서 닫는다 — 엔진 세션은 제 패널만(노트 register.md#ownPane)
  on('ui.close', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    if (e.id === PANE && e.origin.kind === 'person') {
      await $.store.delete((await ownPaneKey($)) ?? PANE_KEY)
      await update($, isOpen, () => false)
      await closeUpdateDrawer($)
    }
    return next(e)
  }).catch(($, e, next) => next(e)) // 저장이 실패해도 닫기는 그대로 간다

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const t0 = await $.clock.now().catch(() => 0)
    const done = async <T,>(x: T): Promise<T> => {
      await noteFirstDraw($, t0, e.surface).catch(() => {})
      const t1 = await $.clock.now().catch(() => t0)
      lastPaneDrawAt = t1
      if (t1 - t0 > PANE_SLOW_MS) notePaneEvent($, { at: t1, kind: 'slow', surface: e.surface ?? null, ms: t1 - t0 })
      return x
    }
    const light = async (kind: 'error' | 'light', why: string) => {
      const ui = $.ui.resolve(e)
      const { Box, Text } = ui
      const cols = Math.max(24, Number.isFinite(e.props?.bodyColumns) ? e.props.bodyColumns : PANE_COLS_FALLBACK)
      const at = await $.clock.now().catch(() => t0)
      const detail = why.split('\n')[0]!.slice(0, 160)
      notePaneEvent($, { at, kind, surface: e.surface ?? null, detail }, `${kind}:${detail}`)
      paneRetry($, `${kind}:${detail}`, at)
      return done(
        <Box key="es-pane" flexDirection="column" width={cols}>
          <Box key="es-light-head">
            <Text bold>{L('세션', 'Sessions')}</Text>
          </Box>
          <Box key="es-light-wait" marginTop={0.3}>
            <Text color="subtle" size="footnote">
              {L('불러오는 중 — 곧 다시 그립니다', 'Loading — drawing again shortly')}
            </Text>
          </Box>
        </Box>,
      )
    }
    try {
      await ensureLang($).catch(() => {})
      const ui = $.ui.resolve(e)
      const { Box } = ui
      // 데스크톱 패널은 한글이 칸 계산보다 넓게 그려져 오른쪽 끝이 가려진다 — 폭의 1할가량을 비워 둔다. VS Code 는 칸 셈이 달라 비우지 않는다(노트 vscode.md 「전체」)
      const bodyCols = Number.isFinite(e.props.bodyColumns) ? e.props.bodyColumns : PANE_COLS_FALLBACK
      const pad = padsPane(e.surface) && e.surface !== TERMINAL_SURFACE ? Math.max(3, Math.round(bodyCols * 0.1)) : 0
      const cols = Math.max(24, bodyCols - pad)
      // 데스크톱에 앱 자료가 있으면 새 패널(노트 register.md#appSelf), VS Code · 터미널의 엔진 세션도 새 패널(0.1.28 — register.md#sessionSelf · 터미널은 ⑥ 결정 4), 그리는 「나」가 없으면 가벼운 그림(0.1.31 — register.md#paneGuard)
      {
        drawnSurface = e.surface
        await read($, appTick)
        // 옛 판이 남긴 화면 상태엔 새 칸(remote)이 없다 — 처음 값 위에 얹는다
        const pu = { ...PANEL_UI_START, ...(await read($, panelUi)) }
        const view = await loadPanelView($, pu, e.surface)
        if (view) {
          const acts = panelActs($)
          const look = panelLook(e.surface, e.props.placement, view.isApp !== false)
          const note = toastsStack(e.surface) ? await read($, noteLine) : null
          const { Text } = ui
          const width = look.fluid ? '100%' : cols
          const upd: UpdView = { state: await read($, updateInfo), isOpen: await read($, updDrawer), nowMs: await $.clock.now() }
          const draw = (v: PanelView, p: PanelUi) => (
            <Box key="es-pane" flexDirection="column" width={width}>
              {drawPanel(ui, { ...v, upd }, p, cols, acts, look)}
              {note ? (
                <Box key="es-note" marginTop={0.5} minWidth={0}>
                  <Text color="subtle" size="footnote">
                    {note}
                  </Text>
                </Box>
              ) : null}
            </Box>
          )
          const out = draw(view, pu)
          if (drawnSize(out) <= DRAW_CAP) return done(out)
          // 메뉴 · 보낼 칸을 닫고 무거운 접힘을 비운다 — 먼저 방금 편 것(접힘 목록 맨 끝)만 남기고, 그래도 넘으면 다 비운다. 맞는 상태를 저장하고 알림 한 줄,
          // 더 비울 것이 없거나 다 비워도 넘으면 쪽 고르기와 안내 줄만
          const isHeavy = (f: string) => HEAVY_FOLDS.some(h => f.startsWith(h))
          const last = pu.folds.filter(isHeavy).at(-1)
          const reset = { ...pu, open: null, sending: null, card: null, ask: null, pre: null, match: null, kidsAsk: null }
          // 0.1.26: 다 비워도 넘으면 편 칸을 닫는다(도구판 · 「지금」 줄만)
          const tries: PanelUi[] = [
            ...(last === undefined ? [] : [{ ...reset, folds: pu.folds.filter(f => !isHeavy(f) || f === last) }]),
            { ...reset, folds: pu.folds.filter(f => !isHeavy(f)) },
            { ...reset, folds: pu.folds.filter(f => !isHeavy(f)), tool: null },
          ]
          const isSame = (p: PanelUi) => p.folds.length === pu.folds.length && p.tool === pu.tool && pu.open === null && pu.sending === null && pu.card === null && pu.ask === null && !pu.pre && !pu.match && !pu.kidsAsk
          for (const light of tries) {
            if (isSame(light)) continue
            const lightView = await loadPanelView($, light, e.surface).catch(() => null)
            const next = lightView ? draw(lightView, light) : null
            if (!next || drawnSize(next) > DRAW_CAP) continue
            // 그리는 중엔 상태를 못 쓴다(엔진 — 「drawing is pure」, 시험에서 잼) — 저장 · 알림은 그린 뒤 타이머로. 그사이 접힘이 바뀌었으면 덮지 않는다
            const seen = JSON.stringify(pu.folds)
            $.clock.after(1, () => {
              void (async () => {
                let isSaved = false
                await update($, panelUi, u => {
                  isSaved = JSON.stringify(u.folds) === seen
                  return isSaved ? { ...u, open: null, sending: null, card: null, ask: null, pre: null, match: null, kidsAsk: null, folds: light.folds, tool: light.tool } : u
                })
                if (isSaved) toast($, light.tool === null && pu.tool !== null ? L('패널에 그릴 줄이 너무 많아 편 칸을 닫았습니다', 'Too many rows to draw in the panel, so the open tile was closed') : L('패널에 그릴 줄이 너무 많아 앞서 펼친 것을 접었습니다', 'Too many rows to draw in the panel, so what was unfolded earlier was folded'))
              })().catch(() => {})
            })
            return done(next)
          }
          return done(
            <Box key="es-pane" flexDirection="column" width={width}>
              {drawPanelBare(ui, pu, acts, L('패널에 그릴 것이 너무 많습니다 — 다른 쪽을 고르세요', 'Too much to draw in the panel — pick the other tab'), upd, look)}
            </Box>
          )
        }
      }
      return await light('light', 'no session to draw yet')
    } catch (err) {
      log($, `패널 그리기 실패 — ${String(err)}`)
      return light('error', String(err instanceof Error ? err.message : err))
    }
  })

  const isOwnPlugin = (plugin: string) => (ownRow !== null ? plugin === ownRow : /^easy-session(@|$)/.test(plugin))
  on('ui.press', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    if (toastsStack(e.surface) && isOwnPlugin(e.plugin) && (await read($, noteLine)) !== null) await update($, noteLine, () => null)
    return next(e)
  })
  on('ui.select', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    if (toastsStack(e.surface) && isOwnPlugin(e.plugin) && (await read($, noteLine)) !== null) await update($, noteLine, () => null)
    return next(e)
  })

  // 뒤집고(스위치가 든 값이 낡았어도 맞게) 새 props 를 바로 돌려준다. 이지 컴팩트 스위치(`sw-<키>`)는 건드리지 않고 넘긴다
  on('ui.message', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    if (!e.module.endsWith('switch.tsx') || !e.element.startsWith(QUICK_SWITCH)) return next(e)
    // 「고정 · 보관」 칸 상태 스위치(0.1.29 ② F1 — 노트 panel.md#manage): 동작을 하고 그 뒤 실제 값을 돌려준다(지시 글만 넣은 auto 세션은 그대로)
    if (e.element === MGR_SWITCH.pin || e.element === MGR_SWITCH.remote || e.element === MGR_SWITCH.end) return { props: await mgrSwitch($, e.element) }
    // 새 자식 세션 저절로 고정 · 떼어 내기(0.1.5 — 드롭다운에서 스위치로)
    if (e.element === AUTO_SWITCH.pin || e.element === AUTO_SWITCH.detach) {
      const isPin = e.element === AUTO_SWITCH.pin
      const isOn = !(await (isPin ? autoPinOn($) : autoDetachOn($)))
      await (isPin ? setAutoPin($, isOn) : setAutoDetach($, isOn))
      return { props: { on: isOn, disabled: false } }
    }
    // 끝나면 고정 풀기 · 사이드바 그룹으로(0.1.6) — 그룹은 켤 때 이 세션의 세션 트리를 한 번 맞춘다
    if (e.element === AUTO_SWITCH.unpin || e.element === AUTO_SWITCH.group) {
      const key = e.element === AUTO_SWITCH.unpin ? AUTO_UNPIN_KEY : AUTO_GROUP_KEY
      const isOn = !(await storeOn($, key))
      await setSwitch($, key, isOn)
      if (isOn && key === AUTO_GROUP_KEY) void groupOwnTree($).catch(() => {})
      return { props: { on: isOn, disabled: false } }
    }
    // 새 세션 첫 글에 ultrathink(0.1.27 — 노트 register.md#firstUltra)
    if (e.element === AUTO_SWITCH.ultra) {
      const isOn = !(await storeOn($, FIRST_ULTRA_KEY))
      await setSwitch($, FIRST_ULTRA_KEY, isOn)
      return { props: { on: isOn, disabled: false } }
    }
    // 세션 규칙(0.1.27 — 처음 값 켬, 노트 register.md#sendRules)
    if (e.element === RULES_SWITCH) {
      const isOn = !(await rulesOn($))
      await setRulesOn($, isOn)
      return { props: { on: isOn, disabled: false } }
    }
    if (e.element === MD_LOCK_SWITCH) {
      const isOn = !(await storeOn($, MD_LOCK_KEY))
      await setSwitch($, MD_LOCK_KEY, isOn)
      return { props: { on: isOn, disabled: false } }
    }
    // 글에 나온 세션 정보 붙이기(0.1.31 ① — 노트 register.md#mention)
    if (e.element === MENTION_SWITCH) {
      const isOn = !(await storeOn($, MENTION_KEY))
      await setSwitch($, MENTION_KEY, isOn)
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
    await ensureLang($).catch(() => {})
    isWorking = e.props.isWorking === true
    if (typeof e.plugin === 'string') ownRow = e.plugin
    const inner = await next(e)
    if (e.props.hasSurvey) return inner
    drawnSurface = e.surface
    await read($, appTick)
    const isPaneOpen = await read($, isOpen)
    const isAsking = await read($, fableAsk)
    const got = await loadQuickView($, e.surface).catch(() => null)
    if (!got) return inner
    const ui = $.ui.resolve(e)
    const { Box } = ui
    const acts = await quickActs($, got.q.self)
    const note = toastsStack(e.surface) && !isPaneOpen ? await read($, noteLine) : null
    return (
      <Box key="es-above" flexDirection="column" rowGap={0.5}>
        {drawQuickRow(ui, got.q, { ...acts, note }, { ...DESKTOP_LOOK, isApp: got.isApp, rainbowHex: rainbowAsHex(e.surface), textPress: pressesText(e.surface), isText: e.surface === TERMINAL_SURFACE })}
        {isAsking ? drawFableAsk(ui, await planOf($), fableActs($)) : null}
        <Box key="es-above-line" height={0.06} backgroundColor="promptBorder" />
        {inner}
      </Box>
    )
  })

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

  // 자식 보고: 끈 세션은 보고 덩이를 떼어 모으고 보고만 든 앱 턴은 막는다 — 노트 register.md#reports.
  // 화면: 고른 값을 글마다 한 줄로 붙인다(쓰지 않음이면 안 붙임) — 노트 register.md#displayLine
  on('prompt.submit', async ($, e, next) => {
    await ensureLang($).catch(() => {})
    if (clearedFrom !== null) await moveCleared($).catch(err => log($, `자료 옮기기 실패 — ${String(err)}`))
    let text = e.text
    if (!e.command && text.includes('you started (local_')) {
      const held = await holdReports($, e).catch(err => {
        log($, `자식 보고 가르기 실패 — ${String(err)}`)
        return null
      })
      if (held?.drop !== undefined) return { drop: held.drop }
      if (held) text = held.text
    }
    const kind = e.origin?.kind
    const relayLine = !e.command && (kind === 'composer' || kind === 'bridge') ? await relaySubmit($, e, text).catch(err => (log($, `보내기 신호 처리 실패 — ${String(err)}`), null)) : null
    const rules = !e.command ? await turnLines($, kind, text).catch(err => (log($, `차례 줄 실패 — ${String(err)}`), null)) : null
    if (!e.command) await noteTurnOrigin($, e, text, rules?.allow).catch(err => log($, `차례 기록 실패 — ${String(err)}`))
    const peerRel = !e.command && (kind === 'peer' || kind === 'peer-send-message') ? await peerSubmit($, e.origin, text).catch(err => (log($, `보낸 세션 관계 가리기 실패 — ${String(err)}`), null)) : null
    if (!e.command && (kind === 'peer' || kind === 'peer-send-message')) await noteRecv($, text, e.origin).catch(err => log($, `받은 글 세기 실패 — ${String(err)}`))
    const mention = !e.command && (kind === 'composer' || kind === 'bridge') ? await mentionSubmit($, text).catch(err => (log($, `세션 정보 줄 실패 — ${String(err)}`), null)) : null
    const line = displayLine(await displayOf($))
    const kindLine = !e.command && (kind === 'peer' || kind === 'peer-send-message') ? peerKindLine(text) : null
    const added = [relayLine, ...(rules?.lines ?? []), peerRel, kindLine, mention, line].filter((x): x is string => x !== null)
    return next(added.length === 0 ? { ...e, text } : { ...e, text, context: [...(e.context ?? []), ...added] })
  })

  // 도구 막기: 화면이 태블릿 · 폰이면 고르기 카드 · 그림 위젯을 거절하고 Claude 에게 글로 물으라고 돌려준다 — 노트 register.md#toolBlock
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    await ensureLang($).catch(() => {})
    const why = blockText(await displayOf($), 'AskUserQuestion')
    if (why !== null) return { deny: why }
    const r = await next(e)
    if (e.agentId === undefined && r.deny === undefined && !r.isError) await humanAnswered($).catch(err => log($, `보내기 확인 기록 실패 — ${String(err)}`))
    return r
  })

  // .catch = 훅이 던지면 막는다(닫힌 쪽 — 엔진은 실패한 훅을 건너뛰어 도구가 돈다, 공유 노트 hook-probe-0127 잼)
  on('tool.call', { tool: 'SendMessage' }, async ($, e, next) => {
    if (e.agentId !== undefined || isOwnCall(next)) return next(e)
    await ensureLang($).catch(() => {})
    const deny = await guardSend($, (e as unknown as { to?: unknown }).to, 'send', (e as unknown as { message?: unknown }).message, (e as unknown as { notify_when_idle?: unknown }).notify_when_idle)
    if (deny !== null) return { deny }
    return afterKind($, await next(e))
  }).catch(($, e, next) => guardCatch($, e, next as never) as never)
  on('tool.call', { tool: 'mcp__ccd_session_mgmt__send_message' }, async ($, e, next) => {
    if (e.agentId !== undefined || isOwnCall(next)) return next(e)
    await ensureLang($).catch(() => {})
    const deny = await guardSend($, (e as unknown as { session_id?: unknown }).session_id, 'mcp', (e as unknown as { message?: unknown }).message)
    if (deny !== null) return { deny }
    return afterKind($, await next(e))
  }).catch(($, e, next) => guardCatch($, e, next as never) as never)
  on('tool.call', { tool: 'mcp__visualize__show_widget' }, async ($, e, next) => {
    await ensureLang($).catch(() => {})
    const why = blockText(await displayOf($), 'mcp__visualize__show_widget')
    return why === null ? next(e) : { deny: why }
  })

  // 이 세션이 연 새 세션: 인계 대기 · 저절로 떼어 내기 · 저절로 고정(설정) — 세션 열기 결과 글의 새 id 로. 노트 register.md#newChild
  // 첫 글에 ultrathink(설정 — 0.1.27): 켬이면 보내기 전에 입력 prompt 맨 앞에 낱말(MCP 도구 입력 고쳐 쓰기 — 헤드리스로 서버까지 닿음을 잼, 노트 register.md#firstUltra)
  on('tool.call', { tool: 'mcp__ccd_session__start_session' }, async ($, e, next) => {
    await ensureLang($).catch(() => {})
    const ultra = withFirstUltra((e as unknown as { prompt?: unknown }).prompt)
    const isUltra = ultra !== null && (await storeOn($, FIRST_ULTRA_KEY).catch(() => false))
    const r = await next(isUltra ? ({ ...e, prompt: ultra } as typeof e) : e)
    if (r.deny !== undefined || r.isError) return r
    // 모델이 읽는 결과 글(text)에 새 id 가 있다 — core 가 아닌 답엔 text 가 없어 결과 값을 본다
    await newChild($, r.text ?? JSON.stringify(r.result ?? '')).catch(err => log($, `새 자식 세션 처리 실패 — ${String(err)}`))
    return r
  })
  // 하던 일을 새 세션으로 넘길 때(hand_off_to_session)도 같은 스위치로 넘기는 글(remaining_plan) 맨 앞에 낱말.
  // [인계] 단추는 start_session 길이라 위 훅이 맡는다. 노트 register.md#firstUltra
  on('tool.call', { tool: 'mcp__ccd_session__hand_off_to_session' }, async ($, e, next) => {
    await ensureLang($).catch(() => {})
    const ultra = withFirstUltra((e as unknown as { remaining_plan?: unknown }).remaining_plan)
    const isUltra = ultra !== null && (await storeOn($, FIRST_ULTRA_KEY).catch(() => false))
    return next(isUltra ? ({ ...e, remaining_plan: ultra } as typeof e) : e)
  })

  // 인계한 옛 주인을 Claude 가 보관할 때 — 붙은 자식을 먼저 떼어 남긴다(같이 보관되지 않게). 노트 register.md#handoff
  on('tool.call', { tool: 'mcp__ccd_session_mgmt__archive_session' }, async ($, e, next) => {
    await ensureLang($).catch(() => {})
    const sid = (e as unknown as { session_id?: unknown }).session_id
    const selfId = await selfAppId($).catch(() => null)
    const links = selfId === null ? null : await storeLinks($).catch(() => null)
    const isHanded = selfId !== null && (sid === 'self' || sid === selfId) && (links?.succ.has(selfId) ?? false)
    if (isHanded && (await isBypass($).catch(() => false))) {
      const failed = await detachKids($, selfId).catch(() => -1)
      if (failed !== 0) return { deny: L('easy-session: 이 세션에 붙은 세션을 다 떼지 못해 보관하지 않았습니다 — 보관하면 그 세션도 같이 보관됩니다. 사용자에게 알려 주세요.', "easy-session: couldn't detach every session attached to this one, so it wasn't archived — archiving would archive them too. Tell the user.") }
    } else if (isHanded && attachedKids(await refreshApp($), selfId).length > 0) {
      return { deny: L('easy-session: 먼저 붙은 세션을 detach_session 으로 떼세요 — 보관하면 그 세션도 같이 보관됩니다. 다 뗀 뒤 다시 보관하세요.', 'easy-session: first detach the attached sessions with detach_session — archiving would archive them too. Archive again once they are all detached.') }
    }
    // 뒤 주인이 옛 주인을 보관(0.1.9 — 11-04 개발 3차가 2차를 이 길로 보관해 붙은 채 남았다): 패널 [보관]과 같이 자기를 먼저 뗀다
    if (selfId !== null && typeof sid === 'string' && sid !== 'self' && sid !== selfId && links?.succ.get(sid) === selfId) {
      const why = (await isBypass($).catch(() => false))
        ? await leaveOldOwner($, sid, selfId).catch((err: unknown) => L(`이 세션을 못 떼어 보관하지 않았습니다 — ${firstLine(String(err))}`, `Couldn't detach this session, so it wasn't archived — ${firstLine(String(err))}`))
        : attachedKids(await refreshApp($), sid).includes(selfId)
          ? L('이 세션이 그 세션에 붙어 있어 같이 보관될 수 있습니다 — 먼저 detach_session("self") 로 이 세션을 떼고 다시 보관하세요', 'This session is attached to that one and could be archived with it — first detach this session with detach_session("self"), then archive again')
          : null
      if (why) return { deny: L(`easy-session: ${why}. 사용자에게 알려 주세요.`, `easy-session: ${why}. Tell the user.`) }
    }
    const out = await next(e)
    const archivedId = sid === 'self' ? selfId : typeof sid === 'string' ? sid : null
    if (!('deny' in out) || out.deny === undefined) void autoReleaseLocks($, archivedId).catch(err => log($, `md 잠금 저절로 풀기 실패 — ${String(err)}`))
    if ((!('deny' in out) || out.deny === undefined) && !isOwnCall(next) && archivedId !== null && archivedId !== selfId) {
      void (async () => {
        const row = (await leftoverRows($, 'archive', [archivedId]))[0]
        if (row && row.inN > 0) log($, L(`보관: ${bareTitle(row.title)} — 안 받은 글 ${row.inN} 그대로 둠`, `Archive: ${bareTitle(row.title)} — ${row.inN} received left as they are`))
      })().catch(() => {})
    }
    return out
  })

  // 오케가 Edit · Write 로 진행판을 고치면 그 사이 생긴 줄은 본 줄로 — 노트 register.md#board
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => (await ensureLang($).catch(() => {}), seenOwnEdit($, (e as unknown as { file_path?: unknown }).file_path, () => next(e))))
  on('tool.call', { tool: 'Write' }, async ($, e, next) => (await ensureLang($).catch(() => {}), seenOwnEdit($, (e as unknown as { file_path?: unknown }).file_path, () => next(e))))
}
