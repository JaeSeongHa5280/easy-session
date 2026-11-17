/**
 * 데스크톱 세션 패널(컨셉 A 줄 펼침 · 세로 선)과 입력창 위 한 줄 — 6판 꼴(uxi 확정안 A ~ I).
 * `$` 를 쓰지 않는다: 누름은 register.tsx 가 넘기는 acts 로 간다. 노트: docs/notes/panel.md
 */
import type { EngineInterface } from 'claude-code'

import type { AdvisorCall, CleanScan, EndedKid, Family, FamilyRow, HeldReport, PanelUi, PlanKind, SentRow, SentState, SessionMeta } from '../types'
import { advisorCharSvg, advisorCharWidth } from './advisor-char'
import type { AdvisorPose } from './advisor-char'
import { agoText, heldKey, stampText, statusText, whenText } from './meta'
import type { SessionRole } from './meta'
import { fitCells, textCh } from './tree'

type Ui = ReturnType<EngineInterface['ui']['resolve']>

/** advisor 그림 — advisor 가 켜졌을 때만(꺼짐이면 null). usd = 이지 컴팩트 공용 파일의 금액(없으면 null — 횟수만). 노트 panel.md#advisorChar */
export type AdvisorMark = { pose: AdvisorPose; count: number; usd: number | null; tip: string; isMoving: boolean }

/**
 * 「이 세션」 advisor 칸(0.1.13) — count 는 입력창 위 advisor 칸과 같은 값, tip 은 머리 마우스 올림 글(금액은 이지 컴팩트 값이 있을 때만),
 * calls = 기록에서 읽은 호출(아직 못 읽었으면 null), error = 못 읽은 까닭, isFresh = 다시 읽을 일이 안 남음. 노트 panel.md#advisorFold
 */
export type AdvisorLog = { count: number; tip: string; calls: readonly AdvisorCall[] | null; error: string | null; isFresh: boolean }

// 노트: panel.md#compactWins
const wakeUsd = (k: number): number => ((k - 45) * 8 + 45 * 0.2) / 1000
const compactUsd = (k: number): number => ((k - 45) * 4 + 45 * 0.2 + 12 * 20 + 15 * 0.2) / 1000
const nextUsd = (k: number): number => (k * 0.2) / 1000
const AFTER_NEXT = (60 * 0.2) / 1000
const money = (v: number): string => `$${v.toFixed(2)}`

/** 받는 세션 컨텍스트(천 토큰)로 컴팩트하고 보내는 쪽이 싼가 — 깨우는 값 카드를 띄울지 */
export function compactWins(k: number | undefined): boolean {
  return k !== undefined && compactUsd(k) < wakeUsd(k)
}

// 노트: panel.md#acceptCost — 수락 옆 어림: 요청 한 번이 지금 컨텍스트를 읽는 값(식었으면 다시 쓰는 값). 차례는 요청이 여러 번이라 몇 배 —
// 0.1.4 부터 「요청 한 번」을 앞에 밝힌다
export function acceptCost(tokens: number, isCold: boolean): string {
  const k = tokens / 1000
  const usd = isCold ? (Math.max(0, k - 45) * 8 + Math.min(k, 45) * 0.2) / 1000 : nextUsd(k)
  return `요청 한 번 ${(tokens / 10_000).toFixed(1).replace(/\.0$/, '')}만 토큰 · ${money(usd)}`
}

/** 「위 세션」 · 「다른 세션」 칸 보낼 곳 줄에서 연 보낼 칸의 `PanelUi.sending` 앞머리 — 같은 세션 줄이 다른 칸에도 있어 칸이 겹쳐 그려지지 않게. 세션 id 는 늘 `local_` 로 시작해 겹치지 않는다 */
export const COMPOSE_AT = 'to:'
/** 보낼 곳 줄 하나 — tag = 이 세션과의 관계(메인 · 연 세션 · 주인) */
export type SendRow = { id: string; tag: string; title: string }

/** 도구판 칸 열쇠(0.1.26 — 시안 5.1): 세션 메시지(위 세션 · 형제 세션 · 다른 세션) · 관리(하위 세션 · 진행판 · 역할 · 인계) · 도구(명령 · 어드바이저 · 현재 세션) */
export type ToolKey = 'msg' | 'col' | 'inq' | 'rep' | 'brd' | 'role' | 'cmd' | 'adv' | 'mgr'
/** 처음 편 칸 — 시안 5.1 처음 값(보는 세션을 바꾸면 「역할 · 인계」) */
export const TOOL_START: ToolKey = 'role'

/** 고르기 하나(드롭다운 값 · 목록) */
export type Choice = { value: string; options: readonly { value: string; label: string }[] }

/** 주인 고르기 재료 — value = 고른 값(app 이면 앱 관계대로), current = 지금 나무 위 세션(없으면 맨 위), isOpener = 그 세션이 이 세션을 앱에서 연 세션인가(노트 panel.md#ownerSelect) */
export type OwnerPick = { value: string; choices: readonly string[]; current: string | null; isOpener: boolean }

export type PanelView = {
  selfId: string
  now: number
  metas: ReadonlyMap<string, SessionMeta>
  /** 식은 세션의 컨텍스트(천 토큰) — 그 세션이 턴 끝에 적은 값만(없으면 값을 안 보인다) */
  ctxK: ReadonlyMap<string, number>
  /** 오케로 정한 세션(왕관) */
  orche: ReadonlySet<string>
  /** 이 세션 역할(0.1.26 — 관계 줄 역할 칩, meta.md#roleOf) · 메인 세션 제목(메인이 있고 이 세션이 아닐 때 — 「역할 · 인계」 메인 줄 까닭) */
  role: SessionRole
  mainTitle: string | null
  /** 위 세션(패널 나무 위 · 살아 있음) — 없으면 null. tag = 연 세션(앱에서 연 세션) · 주인(사람이 정했거나 인계로 넘어옴) */
  up: SendRow | null
  /** 메인(`>>메인` 과 같은 셈 — 노트 panel.md#compose) — 이 세션 · 위 세션이면 null(「다른 세션」 칸 보낼 곳) */
  mainRow: SendRow | null
  /** 이 세션이 앱에서 연 세션(앱 부모 = 이 세션) — 하위 줄 「붙임」 가름(그 밖 하위는 이지세션 기록으로 붙인 세션) */
  opened: ReadonlySet<string>
  /** 이 세션이 보낸 글 최근 것(앱 도착 기록) — 칸마다 받는 세션으로 가른다 */
  sent: readonly SentRow[]
  /** 이 세션 컨텍스트 차지 %(역할 · 인계 칸 한 줄) — 모르면 null */
  ctxPct: number | null
  /** 이 세션 권한 모드가 bypass 인가(그릴 때 값 — 누를 때는 register 가 다시 본다) */
  isBypass: boolean
  /** 「서브로 — 위 고름」 재료(0.1.26 — 단독 · 하위 없는 오케만, 아니면 null): 지금 값(app · 세션 id) · 고를 오케(메인 포함 · 이 세션 아래는 빠짐) */
  upPick: { value: string; choices: readonly string[] } | null
  /** 이 패널에서 뗄 수 있는 세션 — 이 세션이 연 붙은 세션과 붙어 있는 이 세션(앱 규칙) */
  canDetach: ReadonlySet<string>
  /** 이 세션에 모아 둔 메시지(받은 차례 순) */
  heldItems: readonly HeldReport[]
  /** 수락 옆 어림 재료 — 이 세션 컨텍스트 · 캐시가 식었나(모르면 null — 어림을 안 보임) */
  accept: { tokens: number; isCold: boolean } | null
  /** 오케의 진행판 칸 — 오케가 아니면 null, 경로를 안 정했으면 path null, 못 읽으면 fresh null */
  board: { path: string | null; fresh: readonly string[] | null } | null
  /** 곁가지 쪽 — 가장 가까운 위 오케의 진행판 이름 */
  boardHint: { name: string; owner: string } | null
  /** 들이기 후보(오케만) — 이 묶음 밖의 살아 있는 세션 */
  adopt: readonly FamilyRow[]
  /** [설정] 쪽 — 입력창 위 줄에 둘 것 · 화면 · advisor · 새 자식 세션 저절로 고정 · 저절로 떼어 내기 · 자식 보고. isWorking 이면 advisor 고르기를 막는다 */
  settings: { quick: ReadonlySet<QuickItem>; display: Choice; advisor: Choice; isWorking: boolean; autoPin: boolean; autoDetach: boolean; autoUnpin: boolean; autoGroup: boolean; reports: Choice; peerRel: boolean }
  /** 「이 세션」 쪽 — 이 세션 줄(상태 · 끝남), 형제 세션, 자식 */
  selfRow: FamilyRow | null
  siblings: readonly FamilyRow[]
  children: readonly FamilyRow[]
  /** 보관을 묻는 글 재료(0.1.5) — 앱에 붙은 살아 있는 자식 수(보관하면 같이 보관됨) · 인계한 옛 주인인가(그때만 먼저 떼어 남김) */
  selfAttached: number
  isHanded: boolean
  /** 할 일 「끝난 곁가지」(0.1.6) — 이 세션 나무 아래 끝남 기록이 있는 살아 있는 세션 */
  endedKids: readonly EndedKid[]
  /** [설정] 「정리」 칸 — 남은 자료 마지막 셈(null = 아직 안 셈) */
  clean: CleanScan | null
  /** 입력창에 ultrathink 낱말이 있는가(0.1.7) — 명령 칩 ultrathink 의 넣음 꼴(입력창 위 줄과 같음 — 노트 panel.md#ultraChip) */
  ultraOn: boolean
  /** 「이 세션」 advisor 칸(0.1.13) — 안 불렸으면 null(칸이 없다) */
  advisorLog: AdvisorLog | null
  /** [설정] 입력창 위 줄 미리보기 재료(0.1.25) — 입력창 위 줄과 같은 값 · [설정]을 볼 때만(아니면 null). 누름은 panel 이 빈 동작으로 바꾼다(previewOf) */
  quickPreview?: { q: QuickView; acts: QuickActs } | null
}

export type PanelActs = {
  /** 보는 쪽 고르기 — 「이 세션」을 고르면 이 세션 원격이 켜졌나 본다 */
  view: (to: PanelUi['view']) => void
  /** 도구판 칸 고르기(0.1.26) — 편 칸 하나만, 바꾸면 줄 손질 · 보낼 칸 · 묻는 글을 닫는다. 어드바이저 칸이면 기록을 바로 읽는다 */
  tool: (k: ToolKey) => void
  go: (id: string) => void
  /** ⋯ 메뉴 열고 닫기 — 열 때 그 세션 원격이 켜졌나 본다 */
  more: (id: string) => void
  /** 보낼 글 칸 열고 닫기 — 줄 id, 또는 COMPOSE_AT + id(「메시지 보내기」 칸에서) */
  send: (at: string) => void
  draft: (text: string) => void
  sendGo: (id: string, text: string) => void
  sendCancel: () => void
  cardOpen: (id: string) => void
  cardSend: (id: string) => void
  cardCancel: () => void
  /** 접힘 열고 닫기 — on 을 주면 그 값으로(진행판 「바꾸기」가 세션 관리 · 경로 칸을 같이 연다) */
  fold: (key: string, on?: boolean) => void
  /** 세션 관리 끝내기 · 보관 — 바로 아래 묻는 카드를 띄우고 닫는다(0.1.5) */
  ask: (what: PanelUi['ask']) => void
  // 앱 동작 — bypass 세션이면 mod 가 바로, 아니면 입력칸에 지시 글(노트 register.md#appAct)
  pin: (id: string, on: boolean) => Promise<void>
  /** 끝내기(끝남 표시 + 고정 풀기) · 끝남 풀기 */
  finish: (id: string, on: boolean) => Promise<void>
  /** 보관 · 보관 풀기 */
  archive: (id: string, on: boolean) => Promise<void>
  remoteOff: (id: string) => Promise<void>
  /** Remote Control 켜기(0.1.26 — 「현재 세션」 칸) */
  remoteOn: (id: string) => Promise<void>
  /** 모인 보고 · 받은 글 수락(이 세션에 보내 처리) · 거절(지움) — heldKey 하나 · 여럿(카드의 전체 — 그 보낸 세션 것), null 이면 전체 */
  accept: (keys: HeldPick) => Promise<void>
  reject: (keys: HeldPick) => Promise<void>
  /** 주인 바꾸기(app · top · 세션 id) · 오케 정하기 · 풀기 · 떼어 내기 · 들이기 · 인계 */
  setOwner: (id: string, value: string) => void
  orche: (id: string, on: boolean) => Promise<void>
  detach: (id: string) => Promise<void>
  adopt: (id: string) => Promise<void>
  handoff: () => Promise<void>
  /** 진행판 경로 정하기 · 새 줄을 입력칸에 */
  boardSet: (path: string) => void
  boardFill: () => Promise<void>
  pickDisplay: (value: string) => void
  /** 입력창 위 줄에 둘 것 켜고 끄기 — 스위치가 없는 표면의 드롭다운에서(스위치 누름은 register.tsx ui.message) */
  pickQuick: (key: QuickItem, on: boolean) => void
  /** advisor(모든 세션) — 입력창 위 줄과 같은 고르기, 답하는 중이면 안 바꾼다 */
  pickAdvisor: (value: string) => void
  pickAutoPin: (on: boolean) => void
  pickAutoDetach: (on: boolean) => void
  /** 끝나면 고정 풀기 · 사이드바 그룹으로(0.1.6) */
  pickAutoUnpin: (on: boolean) => void
  pickAutoGroup: (on: boolean) => void
  /** 보낸 세션 관계 알리기(0.1.20) — 노트 panel.md#peerRelSet */
  pickPeerRel: (on: boolean) => void
  /** 정리 — 이 세션이면 입력칸에 정리 글, 다른 세션이면 보낼 칸을 정리 글로 채워 연다 */
  clean: (id: string) => Promise<void>
  /** 끝난 하위 모두 보관 — bypass 만 한 번에(화면에 열린 세션 건너뜀 · 고정 풀고 보관 · 알림 한 줄), auto 면 줄마다(0.1.26 — register.md#archiveAll) */
  archiveAll: (ids: readonly string[]) => Promise<void>
  /** 일 합치기(0.1.26) — 그 하위의 보낼 칸을 합치기 글로 채워 연다(정리 부탁과 같은 길) */
  merge: (id: string) => Promise<void>
  /** 보고 꼴로(0.1.26) — 입력칸에 보고 꼴 글(위가 있으면 끝에 전달 신호, 없으면 채팅에) · 다시 누르면 뺀다 */
  report: () => Promise<void>
  /** 제목 정리(0.1.26) — 입력칸에 이 세션 역할 꼴 제목 정리 글 · 다시 누르면 뺀다 */
  titleTidy: () => Promise<void>
  /** [설정] 「정리」 — 남은 자료 세기 · 휴지통으로(묻는 카드 뒤) */
  cleanScan: () => Promise<void>
  cleanMove: () => Promise<void>
  pickReports: (value: string) => void
  /** ultrathink — 이 세션 입력창 맨 앞에 넣고 빼기 */
  ultrathink: () => Promise<void>
  /** /btw · /fork · /rewind — 입력창 맨 앞에 넣고 빼기(맨 앞 명령은 하나) — 노트 register.md#slashFill */
  slash: (cmd: SlashCmd) => Promise<void>
  /** /recap — 바로 돌린다(출력은 대화에 줄로) — 노트 register.md#recap */
  recap: () => Promise<void>
  /** 내보내기 — 앱 세션 메뉴 Export(다운로드 폴더에 zip) */
  exportSession: (id: string) => Promise<void>
}

/** 입력창 맨 앞에 넣는 명령 */
export type SlashCmd = 'btw' | 'fork' | 'rewind'

/** 수락 · 거절할 메시지 — heldKey 하나 · 여럿, null 이면 전체 */
export type HeldPick = string | readonly string[] | null

// 노트: panel.md#selfCmds — 명령 칩(0.1.5): 그림 + 원래 이름, 뜻(what)은 마우스 올림 한 줄
const SELF_CMDS = [
  { key: 'btw', label: '/btw', what: '하던 일을 안 끊고 따로 물음' },
  { key: 'fork', label: '/fork', what: '이 대화를 다 물려받은 에이전트에 일 맡김' },
  { key: 'rewind', label: '/rewind', what: '대화 · 코드를 앞 지점으로 되돌림' },
  { key: 'recap', label: '/recap', what: '지금까지 한 일을 한 줄로 요약' },
  { key: 'export', label: '내보내기', what: '대화를 zip 으로 다운로드 폴더에' },
] as const

/** 입력창 위 줄에 둘 것(0.1.4) — 세션 패널 단추는 늘 맨 앞이라 없다 */
export type QuickItem = 'pin' | 'ultra' | 'advisor' | 'send' | 'display' | (typeof SELF_CMDS)[number]['key']

// 노트: panel.md#quickRowSet — [설정] 「입력창 위 줄에 둘 것」 차례(줄에 있는 다섯 · 명령 다섯). 위 줄 차례는 drawQuickRow 가 따로 지킨다
export const QUICK_ITEMS: readonly { key: QuickItem; label: string }[] = [
  { key: 'pin', label: '고정' },
  { key: 'ultra', label: 'ultrathink' },
  { key: 'advisor', label: 'advisor' },
  { key: 'send', label: '전달' },
  { key: 'display', label: '화면' },
  ...SELF_CMDS.map(c => ({ key: c.key, label: c.label })),
]

/** [설정] 스위치의 key 앞머리 — 누름은 register.tsx ui.message 로 온다(이지 컴팩트 스위치 key `sw-` 와 안 겹치게) */
export const QUICK_SWITCH = 'es-sw-'

const SENT_TEXT: Record<SentState, string> = { sent: '보냄', delivered: '도착', read: '읽음', replied: '답함', undelivered: '안 감' }
const ON_OFF = [
  { value: 'on', label: '켬' },
  { value: 'off', label: '끔' },
] as const

/** 「[범위] …」 → 「범위」, 대괄호가 없으면 앞 14칸 */
export function shortTitle(title: string): string {
  const m = /^\[([^\]]+)\]/.exec(title)
  return m ? m[1]! : fitCells(title, 14)
}

/** 「[범위] 원래 제목 2차 — 묶음」 → 「원래 제목 2차 — 묶음」 — 앞 [범위]를 뗀 나머지(그것뿐이면 그대로). 카드 제목 · 이 세션 머리(0.1.5) */
export function bareTitle(title: string): string {
  return title.replace(/^\s*\[[^\]]*\]\s*/, '') || title
}

/** 마크다운 기호를 뗀 맨 글 한 줄 — 링크는 이름만, 굵게 · 코드 표시 · 줄 머리 기호(제목 · 인용 · 목록)를 뗀다 */
export function plainLine(line: string): string {
  return line
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*(?:#+\s+|>\s*|(?:[-*+]|\d+[.)])\s+)/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const DECIDE_RE = /^결정할 것\s*[:：]\s*(.*)$/
const LIST_RE = /^\s*(?:[-*+]|\d+[.)])\s+/
/** 요약 글자 상한 — 줄 끝은 그리는 쪽이 … 로 자르고, 이건 그리기 크기만 막는다 */
const GIST_MAX = 160

// 노트: panel.md#heldGist — 메시지 한 줄 요약(0.1.5): 「결정할 것:」 줄이 있고 「없음」이 아니면 그 뒤 글 + 바로 아래 목록 줄(「셋입니다.」처럼
// 짧은 머리는 목록이 있으면 뺌) · 「결정」 꼬리표, 없으면 첫 줄. 마크다운 기호는 뗀다
export function heldGist(text: string): { gist: string; isDecision: boolean } {
  const lines = text.split(/\r?\n/)
  const cut = (s: string) => ([...s].length > GIST_MAX ? `${[...s].slice(0, GIST_MAX).join('')}…` : s)
  const at = lines.findIndex(l => DECIDE_RE.test(plainLine(l)))
  const head = at >= 0 ? (DECIDE_RE.exec(plainLine(lines[at]!))?.[1] ?? '').trim() : ''
  if (at >= 0 && !head.startsWith('없음')) {
    const list: string[] = []
    for (const l of lines.slice(at + 1)) {
      if (l.trim() === '' && list.length === 0) continue
      if (!LIST_RE.test(l)) break
      list.push(plainLine(l))
    }
    const parts = list.length > 0 && [...head].length <= 8 ? list : [head, ...list]
    const gist = parts.filter(Boolean).join(' · ')
    if (gist) return { gist: cut(gist), isDecision: true }
  }
  return { gist: cut(lines.map(plainLine).find(Boolean) ?? ''), isDecision: false }
}

/** Markdown 부품에 넘기는 글 — 엔진은 제어 문자로 탭 · 줄바꿈만 받는다(\r 와 다른 제어 문자를 뗀다). 길면 앞만(그리기 크기) */
const MD_MAX = 20_000
export function mdText(text: string): string {
  const clean = text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '')
  return clean.length > MD_MAX ? `${clean.slice(0, MD_MAX)}\n\n… 글이 길어 앞 ${MD_MAX / 10_000}만 자만 보입니다. 수락하면 다 읽습니다.` : clean
}

/** 받침이 있으면 첫째(이 · 은), 없으면 둘째(가 · 는) — 한글이 아닌 끝은 둘째 */
export function josa(word: string, withFinal: string, without: string): string {
  const code = word.charCodeAt(word.length - 1)
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0 ? withFinal : without
}

// 노트: panel.md#shortKeys
export function shortKeys(ids: Iterable<string>): (id: string) => string {
  const cut = (id: string) => id.replace(/^local_/, '').slice(0, 8)
  const seen = new Map<string, number>()
  for (const id of ids) seen.set(cut(id), (seen.get(cut(id)) ?? 0) + 1)
  return id => (seen.get(cut(id)) === 1 ? cut(id) : id)
}

/** claude-opus-5-5 → Opus 5.5 */
function modelName(model: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(model)
  return m ? `${m[1]![0]!.toUpperCase()}${m[1]!.slice(1)} ${m[2]}.${m[3]}` : model
}

type Node = { row: FamilyRow; kids: Node[] }

/** 깊이 우선 줄(buildFamilies)을 나무로 */
function nest(rows: readonly FamilyRow[]): Node[] {
  const out: Node[] = []
  const stack: Node[] = []
  for (const row of rows) {
    const n: Node = { row, kids: [] }
    while (stack.length > row.depth) stack.pop()
    if (stack.length === 0) out.push(n)
    else stack[stack.length - 1]!.kids.push(n)
    stack.push(n)
  }
  return out
}

// 노트: panel.md#tri — 펼침 칩 칸 폭(칸): 칩이 없는 줄도 같은 폭을 비워 제목 줄을 맞춘다. 채운 칩 한 글자(▸ · ▾)는 사용자 앱에서 35.7px = 4.6칸
// (본문 14px · 단추 안 여백 12px 둘 · 1칸 7.7px)이라 5칸 — 4칸(0.1.21)이면 단추가 칸 폭에 눌려 세모 오른쪽이 깎인다
const TRI_W = 5
/** 자식 줄을 들이는 폭(칸) — 부모 칩 자리만큼 */
const INDENT = TRI_W
/** 「위 세션」 · 「다른 세션」 보낼 곳 줄 머리 폭(칸) — 「연 세션」이 드는 값 */
const SEND_TAG_W = 7
/** 「세션 도구」 쪽 목록(형제 세션 · 하위 세션 · 밑으로 붙이기 · 진행판 새 줄) 상한 */
const LIST_LIMIT = 10
// 노트: panel.md#heldCards — 그리는 메시지 상한(0.1.5 ★ — 0.1.4 까지 10). 보낸 세션마다 카드라 메시지 하나가 칸 하나만큼 커서,
// 오케 최악(보낸 세션 열 · 하나씩)에 7.5만 자 선을 넘었다(재기 — 크기 시험). 넘는 것은 「그 밖 N개」
const MSG_LIMIT = 8
/** 카드 바탕(0.1.5 — 어두운 테마 흰 5% · 밝은 테마 검정 3% 어림). 맞는 테마 키가 없어 중성 회색 — 노트 panel.md#card */
const CARD_BG = 'rgba(128,128,128,.08)'
// 노트: panel.md#toolBoard — 도구판(0.1.26): 묶음 머리 셋(정본 9절 「도구판 꼴 정함 2」 이름 그대로) · 칸 사이 1칸 · 칸 최소 폭 · 하위 줄 제목 칸 최소 폭(시안 140px ≈ 18칸) ·
// 「지금」 줄에 그리는 입력 필요 줄 상한
const TOOL_GROUPS: readonly (readonly [Tool['g'], string])[] = [
  ['msg', '세션 메시지'],
  ['mgmt', '관리'],
  ['tool', '도구'],
]
const TILE_GAP = 1
const TILE_MIN = 10
const KID_TITLE_MIN = 18
const NOW_WAIT_MAX = 3
// 노트: panel.md#toolBoard — 수 표를 칸 모서리 밖으로 미는 여백(줄 · 칸 — 그림 도구로 맞춤)
const CNT_SHIFT_Y = -0.75
const CNT_SHIFT_X = -0.9
// 노트: panel.md#kidRow — 「오래 쉼」 문턱(일): ★ 7일(정본 9절 「시안 5.1 확정」 ② — 시안엔 추천 없음, 앱 「Archive inactive sessions」 고르기 값 1 · 2 · 7 · 14 · 30일의 가운데)
export const IDLE_DAYS = 7
const DAY_MS = 24 * 3_600_000
/** 「지금」 줄 「오케로 바꿀까요?」를 [그대로]로 거둔 접힘 열쇠 */
const NOW_ORCHE_NO = 'now-orche-no'
// 노트: panel.md#advisorFold — 어드바이저 줄 이름표 최소 폭(칸) — 긴 쪽 「하던 일」이 드는 값
const ADV_LABEL_W = Math.ceil(textCh('하던 일'))
/** 도구판 칸 하나 — g = 묶음, sub = 흐린 한 줄, use = 이 역할 · 관계에서 쓰는가(아니면 흐림), cnt = 사람이 할 것 수(수 표), body = 편 칸 안 */
type Tool = { k: ToolKey; g: 'msg' | 'mgmt' | 'tool'; name: string; icon: (dim: boolean) => unknown; sub: string; use: boolean; cnt: number; body: () => unknown[] }

/** 칸 머리 ? — 마우스 올림 한 줄(tip) · 누르면 아래 펼치는 글(lines) */
type Help = { tip: string; lines: readonly string[] }
// 노트: panel.md#leftovers — 「남은 자료」 칸 풀이(0.1.6)
const LEFT_HELP: Help = {
  tip: '보관한 세션이 남긴 작업 파일 — 휴지통으로 옮김',
  lines: ['보관한 세션이 남긴 작업 파일(스크래치)입니다. 살아 있는 세션 것과 md 가 가리키는 것은 뺍니다. 휴지통으로 옮기므로 휴지통에서 되돌릴 수 있습니다. [설정]을 열 때 10분에 한 번 셉니다.'],
}

/** 크기 글 — 1GB 부터 소수 한 자리 GB, 그 아래는 MB */
export function sizeText(bytes: number): string {
  const mb = bytes / 1_048_576
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${Math.max(1, Math.round(mb)).toLocaleString('en-US')}MB`
}

const QUICK_HELP: Help = { tip: '켠 것만 입력창 위 줄에 보입니다', lines: ['켠 것만 입력창 위 줄에 보입니다. 모든 세션에 걸립니다.'] }
// 노트: panel.md#settings — 묶음 사이 여백(0.1.25 — 이지 컴팩트 appSection 약 40px, 그림 도구로 잼)
const SET_GAP = 3
// 노트: panel.md#settings — 미리보기 칸 바탕(이지 컴팩트 ui-common PREVIEW_WELL 과 같은 값 — 두 테마 다 보이는 반투명 회색)
const PREVIEW_WELL = 'rgba(128,128,128,0.10)'
const PV_HELP: Help = {
  tip: '스위치 · 값을 바꾸면 바로 바뀝니다',
  lines: ['지금 [설정] 값으로 입력창 위 줄이 어떻게 보이는지입니다. 스위치 · 값을 바꾸면 바로 바뀝니다. 미리보기 안 단추는 눌러도 아무 일도 안 합니다.'],
}
// 노트: panel.md#settings — [설정] 줄 풀이(0.1.25 — 줄 아래 흐린 설명을 ? 로): tip = 마우스 올림 한 줄 · lines = 누르면 줄 아래
const SET_HELP: Record<'display' | 'advisor' | 'autoPin' | 'autoUnpin' | 'autoGroup' | 'autoDetach' | 'reports' | 'peerRel', Help> = {
  display: { tip: '모든 세션의 Claude 답을 고른 기기에 맞춥니다', lines: ['모든 세션의 Claude 답을 고른 기기에 맞춥니다. 입력창 위 줄 「화면」과 같은 값입니다.'] },
  advisor: { tip: '모든 세션에 걸립니다 · 입력창 위 줄과 같은 값', lines: ['모든 세션에 걸리는 설정입니다. 입력창 위 줄과 같은 값입니다.'] },
  autoPin: { tip: '세션이 자식 세션을 열면 사이드바에 고정합니다', lines: ['세션이 자식 세션을 열면 사이드바에 고정합니다.'] },
  autoUnpin: { tip: '진행판에 끝 줄이 적히면 저절로 붙인 고정을 풉니다', lines: ['진행판에 끝 줄이 적히면 저절로 붙인 고정을 풉니다.'] },
  autoGroup: { tip: '주인 세션과 자식 세션을 사이드바에서 한 그룹으로 묶습니다', lines: ['주인 세션과 자식 세션을 사이드바에서 한 그룹으로 묶습니다.'] },
  autoDetach: { tip: '자식 세션을 열자마자 떼어 냅니다(bypass 세션만)', lines: ['켜면 자식 세션을 열자마자 떼어 냅니다. 그 세션 보고는 안 오고, 물음 · 끝은 진행판에 적습니다(bypass 세션만).'] },
  reports: { tip: '연 세션의 보고를 막아 「하위 세션」 칸에 모아 둡니다', lines: ['연 세션이 답을 끝내며 보내는 보고를 막아 [세션 도구] 「하위 세션」 칸에 모아 둡니다. 「앱 그대로」면 연 세션이 받아 차례가 돕니다.'] },
  peerRel: { tip: '보낸 세션이 어디인지 Claude 에게만 알립니다', lines: ['다른 세션 글을 받으면 보낸 세션이 위 · 아래 · 같은 나무 · 다른 나무 중 어디인지 Claude 에게만 알립니다.'] },
}

/** [설정] 새 자식 세션 스위치 key — 누름은 register.tsx ui.message 로 온다(입력창 위 줄 아홉과 같은 앞머리, 칸 이름과 안 겹치게) */
export const AUTO_SWITCH = { pin: `${QUICK_SWITCH}auto-pin`, detach: `${QUICK_SWITCH}auto-detach`, unpin: `${QUICK_SWITCH}auto-unpin`, group: `${QUICK_SWITCH}auto-group` } as const
/** [설정] 「보낸 세션 관계 알리기」 스위치 key(0.1.20) — 누름은 register.tsx ui.message 로 온다 */
export const PEER_SWITCH = `${QUICK_SWITCH}peer-rel`

/** 「20:08」 — 하루가 넘으면 앞에 달 · 날(whenText 의 앞쪽) */
const clockText = (at: number, now: number) => whenText(at, now).split(' · ')[0]!

/** advisor 칸 접힘 열쇠 · 「이전 N건」 접힘 열쇠 — 펼칠 때 register.tsx 가 기록을 다시 읽는다 */
export const ADV_FOLD = 'advisor'
const ADV_MORE = 'adv-more'
// 노트: panel.md#advisorFold — 처음 네 줄 · 「이전」을 펴도 스물네 줄까지(한 줄이 칸 셋 — 그리기 크기, register.md#sizeGuard)
const ADV_SHOW = 4
const ADV_MAX = 24

/** 토큰 글 — 천 아래는 그대로, 10만 아래는 소수 한 자리 「만」, 그 위는 정수 「만」(317만 · 9.4만 · 35만 · 1.8만) */
export function tokenText(n: number): string {
  if (n < 1000) return String(n)
  return n < 100_000 ? `${(n / 10_000).toFixed(1).replace(/\.0$/, '')}만` : `${Math.round(n / 10_000).toLocaleString('en-US')}만`
}

/** 「입력 35만 · 출력 1.8만」 */
export const tokenPair = (input: number, output: number) => `입력 ${tokenText(input)} · 출력 ${tokenText(output)}`

/** 「그 뒤」 글 — 도구는 이름마다 모아 「Bash ×3, get_session」 + 직후 첫 글 앞부분 */
export function afterLine(c: Pick<AdvisorCall, 'tools' | 'after'>): string {
  const by = new Map<string, number>()
  for (const t of c.tools) by.set(t, (by.get(t) ?? 0) + 1)
  const tools = [...by].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(', ')
  return [tools, c.after ?? ''].filter(x => x !== '').join(' · ')
}

// 노트: panel.md#drawPanel
export function drawPanel(ui: Ui, v: PanelView, pu: PanelUi, cols: number, acts: PanelActs) {
  const { Box, Text, Button, Select } = ui
  const InputEl = (ui as unknown as { Input?: (p: Record<string, unknown>) => unknown }).Input
  const self = v.metas.get(v.selfId)
  const folds = new Set(pu.folds)
  const k = shortKeys(v.metas.keys())

  // 노트: panel.md#toolBoard — 칸들이 같이 쓰는 값(0.1.26): 하위 = 패널 나무 바로 아래(살아 있음), 형제 = 같은 위 아래. 메인 · 오케만 하위 손질(canFix — 시안 5.1)
  const kids = v.children
  const sibs = v.siblings
  const waits = kids.filter(isWaiting)
  const canFix = v.role === 'main' || v.role === 'orche'
  const endedAt = new Map(v.endedKids.map(x => [x.id, x.at] as const))
  const endedAttached = new Map(v.endedKids.map(x => [x.id, x.attached] as const))
  // 노트: panel.md#heldCards — 모인 보고 · 받은 글을 보낸 세션의 관계로 가른다(최근 것 먼저): 하위 → 하위 줄 · 위 → 「위 세션」 · 형제 → 「형제 세션」 · 그 밖 → 「다른 세션」.
  // 하위 줄이 없는 보낸 세션(보관 · 나무 밖 · 다른 세션의 내보낸 칸)도 「다른 세션」에 보이고 센다 — 어떤 글도 안 보이는 데 남지 않게
  const held = [...v.heldItems].reverse()
  const kidIds = new Set(kids.map(r => r.id))
  const sibIds = new Set(sibs.map(r => r.id))
  const upId = v.up?.id ?? null
  const heldKid = held.filter(r => kidIds.has(r.from))
  const heldUp = held.filter(r => r.from === upId)
  const heldSib = held.filter(r => sibIds.has(r.from))
  const heldOther = held.filter(r => !kidIds.has(r.from) && r.from !== upId && !sibIds.has(r.from))
  // 「다른 세션」 보낸 글 = 위 · 하위 · 형제가 아닌 받는 세션(앱 도착 기록)
  const inqSent = v.sent.filter(s => s.to !== upId && !kidIds.has(s.to) && !sibIds.has(s.to))

  // 노트: panel.md#ownerSelect — 주인 고르기(⋯ 세 번째 칸 · 「이 세션」 주인 줄): 앱 관계대로 · 맨 위 · 살아 있는 세션(오케 먼저)
  const ownerSelect = (key: string, id: string, o: OwnerPick) => {
    const label = (x: string) => fitCells(v.metas.get(x)?.title ?? x, 34)
    // 고르지 않았으면(앱 관계대로) 지금 주인 제목이 보이게 — 같은 세션이 두 번 안 나오게 목록에선 뺀다
    const isApp = o.value === 'app'
    const appLabel = isApp ? (o.current ? label(o.current) : '맨 위(앱 관계)') : '앱 관계대로'
    const options = [
      { value: 'app', label: appLabel },
      { value: 'top', label: '맨 위(주인 없음)' },
      ...o.choices.filter(x => !(isApp && x === o.current)).map(x => ({ value: x, label: label(x) })),
    ]
    if (!options.some(x => x.value === o.value)) options.push({ value: o.value, label: label(o.value) })
    // 노트: panel.md#ownerSelect — 앱에서 연 세션을 「주인」이라 적지 않는다
    return <Select key={key} label={o.isOpener ? '연 세션' : '주인'} value={o.value} options={options} onSelect={(x: string) => acts.setOwner(id, x)} />
  }

  // 노트: panel.md#tri — 꼬리 접힘 줄(목록 「나머지 N」): 채운 칩 + 이름(글도 누름) + 흐린 수. el = 그리는 key 꼬리, foldKey = 상태 열쇠
  const tailRow = (el: string, foldKey: string, name: string, n: number) => (
    <Box key={`es-fold-${el}`} columnGap={0} alignItems="center" marginTop={0.4}>
      <Box width={TRI_W} flexShrink={0}>
        <Button key={`es-foldb-${el}`} variant="secondary" label={folds.has(foldKey) ? '▾' : '▸'} onPress={() => acts.fold(foldKey)} />
      </Box>
      <Button key={`es-foldt-${el}`} plain label={name} onPress={() => acts.fold(foldKey)} />
      <Text color="subtle">{String(n)}</Text>
    </Box>
  )

  const metaLine = (r: FamilyRow) => {
    const isBlocked = r.status === 'blocked' && !r.isEnded && !r.isArchived
    const state = r.isArchived ? '보관' : r.isEnded ? '끝남' : isBlocked ? '' : statusText(r.status)
    const rest = [state, agoText(r.lastAt, v.now)].filter(Boolean).join(' · ')
    const cost = v.ctxK.get(r.id)
    const isCold = r.isCold && !r.isEnded && !r.isArchived
    return (
      <Box key={`es-meta-${k(r.id)}`} columnGap={0.5} alignItems="center" minWidth={0}>
        <Text color="subtle" wrap="truncate-end">
          {isBlocked ? <Text color="warning">입력 필요</Text> : null}
          {isBlocked ? ` · ${rest}` : rest}
          {isCold ? ' ·' : ''}
        </Text>
        {isCold ? mark(ui, 'snowflake', '캐시 식음') : null}
        {isCold && cost !== undefined ? <Text color="subtle">{money(wakeUsd(cost))}</Text> : null}
      </Box>
    )
  }

  const needsLine = (r: FamilyRow) =>
    r.status === 'blocked' && r.needs && !r.isEnded && !r.isArchived ? (
      <Box key={`es-needs-${k(r.id)}`} minWidth={0}>
        <Text color="warning" wrap="truncate-end">
          {r.needs}
        </Text>
      </Box>
    ) : null

  // 노트: panel.md#tag — 표지(테두리 칸 글 — 누르지 않음): 끝남 · 입력 필요 · 붙임 · 「오케 몫」 등. tone = 주황 · 초록 · 흐림
  const tagBox = (key: string, text: string, tone?: 'warn' | 'ok') => (
    <Box key={key} borderStyle="single" borderColor={tone === 'warn' ? 'warning' : tone === 'ok' ? 'success' : 'promptBorder'} paddingX={0.4} paddingY={0} flexShrink={0}>
      <Text color={tone === 'warn' ? 'warning' : tone === 'ok' ? 'success' : 'subtle'} size="footnote">
        {text}
      </Text>
    </Box>
  )

  // 노트: panel.md#kidRow — 하위 줄 ⋯ 손질(0.1.26 — 시안 5.1 「손질 여섯」, 메인 · 오케만): 「오케 몫」 표지 + 보내기 · 정리 부탁 · 끝내기 · 일 합치기 · 보관 · 떼어 내기.
  // 단추 key 는 옛 ⋯ 목록 그대로(es-m-<이름>-<짧은 id>). 떼어 내기는 앱이 뗄 수 있는 세션만(canDetach — 이 세션이 연 세션)
  const kidFix = (r: FamilyRow) => {
    const item = (name: string, label: string, onPress: () => unknown) => <Button key={`es-m-${name}-${k(r.id)}`} variant="secondary" label={label} onPress={onPress} />
    return (
      <Box key={`es-fix-${k(r.id)}`} columnGap={0.5} rowGap={0.4} flexWrap="wrap" alignItems="center" marginTop={0.3} marginLeft={2.5} minWidth={0}>
        {tagBox(`es-fix-tag-${k(r.id)}`, '오케 몫')}
        {item('send', '보내기', () => acts.send(r.id))}
        {item('clean', '정리 부탁', () => acts.clean(r.id))}
        {item('end', r.isEnded ? '끝남 풀기' : '끝내기', () => acts.finish(r.id, !r.isEnded))}
        {item('merge', '일 합치기', () => acts.merge(r.id))}
        {item('arch', '보관', () => acts.archive(r.id, true))}
        {v.canDetach.has(r.id) ? withTip(ui, `es-m-detach-box-${k(r.id)}`, item('detach', '떼어 내기', () => acts.detach(r.id)), '되돌릴 수 없습니다 — 그 세션 보고가 더는 안 옵니다') : null}
      </Box>
    )
  }

  const sentList = (key: string, list: readonly SentRow[]) => (
    <Box key={key} flexDirection="column" marginTop={0.3}>
      {list.length === 0 ? (
        <Text color="subtle">보낸 글 없음</Text>
      ) : (
        list.map((s, i) => (
          <Box key={`${key}-${i}`} columnGap={1}>
            <Box key={`${key}-t${i}`} flexGrow={1} minWidth={0}>
              <Text color="subtle" wrap="truncate-end">
                {s.title}
              </Text>
            </Box>
            <Box key={`${key}-s${i}`} columnGap={1} flexShrink={0}>
              <Text color={s.state === 'replied' ? 'success' : s.state === 'undelivered' ? 'error' : 'inactive'}>{SENT_TEXT[s.state]}</Text>
              <Text color="subtle">{agoText(s.sentAt, v.now)}</Text>
            </Box>
          </Box>
        ))
      )}
    </Box>
  )

  // el = 그리는 key 꼬리(줄이면 짧은 id, 「메시지 보내기」 칸 줄이면 c + 짧은 id), id = 받는 세션. isBare = 글 칸만(줄 단추가 닫기를 맡고 보내기는 글 칸 단추 — 노트 panel.md#compose)
  const sendBox = (el: string, id: string, title: string, isBare = false) => (
    <Box key={`es-sendbox-${el}`} flexDirection="column" rowGap={0.5} marginTop={0.5}>
      {InputEl ? (
        <InputEl
          key={`es-draft-${el}`}
          rows={2}
          placeholder={`「${shortTitle(title)}」에 보낼 글`}
          value={pu.draft}
          submitLabel="보내기"
          onInput={(t: string) => acts.draft(t)}
          onSubmit={(t: string) => acts.sendGo(id, t)}
        />
      ) : null}
      {isBare ? null : (
        <Box key={`es-sendbtns-${el}`} columnGap={1} justifyContent="flex-end">
          <Button key={`es-sendgo-${el}`} variant="primary" label="보내기" onPress={() => acts.sendGo(id, pu.draft)} />
          <Button key={`es-sendno-${el}`} plain dimColor label="취소" onPress={() => acts.sendCancel()} />
        </Box>
      )}
    </Box>
  )

  // 깨우는 값 카드 — 정본 12절 3안 문구 그대로, 좁으면(46칸 미만) 「다음부터 한 번에」를 아래 줄로. 닫기는 머리 줄 오른쪽 ✕
  const wakeCard = (el: string, id: string, k1: number) => {
    const option = (key: string, name: string, now: string, next: string) =>
      cols < 46 ? (
        <Box key={key} flexDirection="column">
          <Text>{`${name} ${now}`}</Text>
          <Box key={`${key}-next`} marginLeft={2}>
            <Text color="subtle">{`다음부터 한 번에 ${next}`}</Text>
          </Box>
        </Box>
      ) : (
        <Box key={key} columnGap={1} alignItems="flex-start">
          <Box key={`${key}-name`} width={14} flexShrink={0}>
            <Text>{name}</Text>
          </Box>
          <Text>{`${now} · 다음부터 한 번에 ${next}`}</Text>
        </Box>
      )
    const meta = v.metas.get(id)
    return (
      <Box key={`es-card-${el}`} flexDirection="column" borderStyle="round" borderColor="promptBorder" paddingX={1} marginTop={0.5}>
        <Box key={`es-card-head-${el}`} columnGap={1} alignItems="center">
          {mark(ui, 'snowflake', '캐시 식음')}
          <Box key={`es-card-title-${el}`} flexGrow={1}>
            <Text bold>컴팩트하고 보내면 더 쌉니다</Text>
          </Box>
          <Button key={`es-card-x-${el}`} variant="secondary" dimColor label="✕" onPress={() => acts.cardCancel()} />
        </Box>
        <Text color="subtle" wrap="truncate-end">
          {`${meta?.title ?? id} · ${agoText(meta?.lastAt ?? null, v.now)} · ${k1}k${meta?.model ? ` · ${modelName(meta.model)}` : ''}`}
        </Text>
        {option(`es-card-as-${el}`, '그대로 보내면', money(wakeUsd(k1)), money(nextUsd(k1)))}
        {option(`es-card-cp-${el}`, '컴팩트하고 보내면', money(compactUsd(k1)), money(AFTER_NEXT))}
        <Box key={`es-card-btns-${el}`} columnGap={1} rowGap={0.5} flexWrap="wrap" justifyContent="flex-end" marginTop={0.5}>
          <Button key={`es-card-open-${el}`} variant="primary" label="세션 열기" onPress={() => acts.cardOpen(id)} />
          <Button key={`es-card-send-${el}`} label={`그대로 보내기 ${money(wakeUsd(k1))}`} onPress={() => acts.cardSend(id)} />
        </Box>
      </Box>
    )
  }

  /** 보낼 글 칸 또는 깨우는 값 카드(식은 세션에 보내려 할 때 — register 의 sendGo 가 card 를 세운다) */
  const sending = (el: string, id: string, title: string, isBare = false) => {
    const k1 = v.ctxK.get(id)
    return pu.card === id && k1 !== undefined ? wakeCard(el, id, k1) : sendBox(el, id, title, isBare)
  }

  // 노트: panel.md#kidRow — 줄 머리 역할 그림(0.1.26): 오케 표시가 있으면 왕관(흐림), 아니면 서브(가지 — 파랑)
  const rowMark = (r: FamilyRow) => roleMark(ui, r.isOrche ? 'orche' : 'sub')

  // 노트: panel.md#sibRow — 형제 줄(0.1.26 — 시안 5.1 「형제 줄 [보내기] · [가기]만」): 역할 그림 · 제목 · [보내기] · [가기], 아래 상태 · 때 · ❄ 깨우는 값(설치판 줄 둘째 줄 그대로).
  // ⋯ 메뉴는 없다(설치판의 고정 · 글 보기 · 내보내기 · 오케 · 주인 고르기는 형제에겐 안 씀). 단추 key 는 옛 ⋯ 목록 이름(es-m-send · es-m-go)
  const sibRow = (r: FamilyRow) => {
    const el = k(r.id)
    const isLive = !r.isEnded && !r.isArchived
    return (
      <Box key={`es-row-${el}`} flexDirection="column" marginTop={0.5} minWidth={0}>
        <Box key={`es-head-${el}`} columnGap={0.5} alignItems="center" minWidth={0}>
          {rowMark(r)}
          {r.isStarred ? pinMark(ui, r.pinWhy) : null}
          <Box flexGrow={1} flexShrink={1} minWidth={0}>
            <Text wrap="truncate-end" color={isDone(r) ? 'subtle' : undefined}>
              {bareTitle(r.title)}
            </Text>
          </Box>
          <Box columnGap={0.5} alignItems="center" flexShrink={0}>
            {isLive ? <Button key={`es-m-send-${el}`} variant="secondary" label={pu.sending === r.id ? '닫기' : '보내기'} onPress={() => acts.send(r.id)} /> : null}
            <Button key={`es-m-go-${el}`} plain label="가기" onPress={() => acts.go(r.id)} />
          </Box>
        </Box>
        {metaLine(r)}
        {needsLine(r)}
        {pu.sending === r.id && isLive ? sending(el, r.id, r.title) : null}
      </Box>
    )
  }

  // 노트: panel.md#kidRow — 하위 줄(0.1.26 — 시안 5.1): 역할 그림 · 제목 · 표지(상태 · 붙임) · [받기 N] · [보관](끝남 · 메인 · 오케) · [가기] · ⋯(메인 · 오케 — 손질).
  // 제목 칸 최소 폭을 두고 줄을 꺾어, 좁으면 표지 · 단추 덩이가 둘째 줄 오른쪽으로 간다. 붙인 줄(앱 부모가 이 세션이 아님)은 아래 흐린 한 줄.
  // ⋯ 를 펴면 손질 줄 + 그 세션 모인 보고(줄마다 수락 · 거절 · 본문 — 설치판 할 일 카드 몫을 잃지 않게)
  const kidRow = (r: FamilyRow) => {
    const el = k(r.id)
    const isOpen = pu.open === r.id
    const isLive = !r.isEnded && !r.isArchived
    const mine = heldKid.filter(x => x.from === r.id)
    const sentTo = v.sent.filter(s => s.to === r.id)
    // ⋯ 는 손질(메인 · 오케) 또는 그 세션 모인 보고 · 보낸 글이 있을 때 — 서브도 보고를 낱개로 읽고 거절한다(설치판 할 일 카드 몫)
    const hasMore = canFix || mine.length > 0 || sentTo.length > 0
    const endAt = endedAt.get(r.id)
    const state = r.isEnded
      ? tagBox(`es-kt-${el}`, endAt === undefined ? '끝남' : `끝남 ${clockText(endAt, v.now)}`, 'ok')
      : isWaiting(r)
        ? tagBox(`es-kt-${el}`, '입력 필요', 'warn')
        : r.status
          ? tagBox(`es-kt-${el}`, statusText(r.status))
          : null
    // 「N일 쉼」(0.1.26 — 시안 5.1 정할 것 3): 마지막 활동 뒤 쉰 날이 문턱(IDLE_DAYS) 이상 — 끝난 · 입력 필요 세션은 뺌(그 표지가 따로 있다).
    // 앱 메타엔 도는 중 값이 없어 끝남만 빼고 센다(문턱만큼 쉰 세션은 도는 중일 수 없다고 봄)
    const idleDays = r.lastAt === null ? 0 : Math.floor((v.now - r.lastAt) / DAY_MS)
    const idle = !r.isEnded && !isWaiting(r) && idleDays >= IDLE_DAYS ? tagBox(`es-kidle-${el}`, `${idleDays}일 쉼`, 'warn') : null
    // 앱이 연 세션이 아님 = 떼어 낸 세션(앱 lineageDetached — 이 세션이 열고 뗌) 또는 이지세션 기록으로 붙인 세션
    const notOpened = !v.opened.has(r.id)
    const how = r.isDetached ? '떼어 냄' : '붙임'
    const more = isOpen ? (
      <Button key={`es-more-${el}`} variant="secondary" label="⋯" onPress={() => acts.more(r.id)} />
    ) : (
      <Button key={`es-more-${el}`} plain dimColor label="⋯" onPress={() => acts.more(r.id)} />
    )
    return (
      <Box key={`es-row-${el}`} flexDirection="column" marginTop={0.5} minWidth={0}>
        <Box key={`es-head-${el}`} columnGap={0.5} rowGap={0.3} alignItems="center" flexWrap="wrap" minWidth={0}>
          <Box columnGap={0.5} alignItems="center" flexGrow={100} flexShrink={1} minWidth={Math.min(KID_TITLE_MIN, cols - 4)}>
            {rowMark(r)}
            {r.isStarred ? pinMark(ui, r.pinWhy) : null}
            <Box flexShrink={1} minWidth={0}>
              <Text wrap="truncate-end" color={isDone(r) ? 'subtle' : undefined}>
                {bareTitle(r.title)}
              </Text>
            </Box>
          </Box>
          <Box columnGap={0.5} alignItems="center" flexGrow={1} justifyContent="flex-end">
            {state}
            {idle}
            {notOpened ? tagBox(`es-kat-${el}`, how) : null}
            {mine.length > 0 ? <Button key={`es-take-${el}`} variant="secondary" label={`받기 ${mine.length}`} onPress={() => acts.accept(mine.map(heldKey))} /> : null}
            {r.isEnded && canFix ? <Button key={`es-end-arch-${el}`} variant="secondary" label="보관" onPress={() => void acts.archive(r.id, true)} /> : null}
            <Button key={`es-m-go-${el}`} plain label="가기" onPress={() => acts.go(r.id)} />
            {hasMore ? more : null}
          </Box>
        </Box>
        {needsLine(r)}
        {r.isEnded && (endedAttached.get(r.id) ?? 0) > 0 ? (
          <Box key={`es-katw-${el}`} marginLeft={2.5} minWidth={0}>
            <Text color="warning" size="footnote">{`붙은 세션 ${endedAttached.get(r.id)}개도 같이 보관됩니다`}</Text>
          </Box>
        ) : null}
        {notOpened ? (
          <Box key={`es-katl-${el}`} marginLeft={2.5} minWidth={0}>
            <Text color="subtle" size="footnote">
              {r.isDetached ? '떼어 내서 앱 보고는 안 옴 — 보고는 진행판 끝 줄로' : '보고는 진행판 끝 줄로 — 앱이 연 세션이 아니라 받기는 없음'}
            </Text>
          </Box>
        ) : null}
        {isOpen && canFix ? kidFix(r) : null}
        {isOpen && mine.length > 0 ? heldList(el, mine) : null}
        {isOpen && sentTo.length > 0 ? (
          <Box key={`es-kid-sent-${el}`} flexDirection="column" marginLeft={2.5} minWidth={0}>
            {sentList(`es-msgs-${el}`, sentTo)}
          </Box>
        ) : null}
        {pu.sending === r.id && isLive ? sending(el, r.id, r.title) : null}
      </Box>
    )
  }

  // 노트: panel.md#head — 세 쪽 공통 칸 머리(0.1.5): 그림 16px(글색 — 할 일은 주황) + 굵은 이름 + 흐린 수 + 오른쪽 ?(마우스 올림 한 줄 · 누르면 아래 펼침)
  const head = (name: string, icon: QuickIcon, label: string, o: { count?: string; isWarn?: boolean; help?: Help } = {}): unknown[] => [
    <Box key={`es-h-${name}`} columnGap={0.5} alignItems="center" minWidth={0}>
      {mark(ui, icon, label, o.isWarn ? WARN_LOOK : TEXT_LOOK)}
      <Box flexShrink={1} minWidth={0}>
        <Text bold color={o.isWarn ? 'warning' : undefined} wrap="truncate-end">
          {o.isWarn && o.count ? `${label} ${o.count}` : label}
        </Text>
      </Box>
      {o.count && !o.isWarn ? <Text color="subtle">{o.count}</Text> : null}
      <Box flexGrow={1} />
      {o.help ? pressBox(ui, `es-help-${name}`, { content: [mark(ui, 'help', '도움말', SUB_LOOK)], cover: 2, onPress: () => acts.fold(`help:${name}`), tip: o.help.tip, tipRight: true }) : null}
    </Box>,
    o.help && folds.has(`help:${name}`) ? (
      <Box key={`es-hw-${name}`} flexDirection="column" rowGap={0.2} marginTop={0.2}>
        {o.help.lines.map((line, i) => (
          <Text key={`es-hw-${name}${i}`} color="subtle">
            {line}
          </Text>
        ))}
      </Box>
    ) : null,
  ]

  // 노트: panel.md#card — 카드 = 바탕(CARD_BG) + 테두리 20%(promptBorder) 둥근 칸. 테두리 대비가 낮아(1.89) 칸은 바탕 · 머리 그림 · 굵은 머리 글로 가른다.
  // isList = 세션 줄 목록(줄마다 위 여백이 있어 카드 위 안 여백을 뺀다)
  const card = (key: string, children: unknown[], isList = false) => (
    <Box key={key} flexDirection="column" backgroundColor={CARD_BG} borderStyle="round" borderColor="promptBorder" paddingX={0.75} paddingY={0.4} {...(isList ? { paddingTop: 0 } : {})} marginTop={0.5}>
      {children}
    </Box>
  )

  // 노트: panel.md#card — 카드 안 줄 사이 가는 선
  const rline = (key: string) => <Box key={key} height={0.06} marginY={0.3} backgroundColor="promptBorder" />

  // 노트: panel.md#manage — 경고 색 단추(떼어 내기): 단추는 글 색을 못 받아 경고 색 테두리 칸 + 글 위에 덮개. 누르는 단추 key = key
  const dangerButton = (key: string, label: string, onPress: () => unknown, tip: string) =>
    pressBox(ui, key, {
      content: [<Text color="error">{label}</Text>],
      cover: coverCells(textCh(label) + 2),
      onPress,
      tip,
      box: { borderStyle: 'single', borderColor: 'error', paddingX: 1, paddingY: 0.25 },
    })

  // 목록 상한 — 넘으면 「나머지 N」(펼쳐도 남아 다시 접는다). 그리기 크기 대책(register.md#sizeGuard). key = 접힘 열쇠(sibs · kids)
  const capped = (list: readonly FamilyRow[], key: string, draw: (r: FamilyRow) => unknown): unknown[] => {
    const isAll = folds.has(key)
    if (list.length <= LIST_LIMIT) return list.map(draw)
    return [...(isAll ? list : list.slice(0, LIST_LIMIT)).map(draw), tailRow(key, key, '나머지', list.length - LIST_LIMIT)]
  }

  // 노트: panel.md#heldGist — ▸ 로 펼친 본문은 답 글처럼(Markdown 부품 — 링크 · 표 · 코드 칸), 왼쪽에 가는 세로 금. 한 번에 하나(크기 — register toggleFold)
  const heldBody = (r: HeldReport, el: string) => {
    const Md = (ui as unknown as { Markdown?: (p: { key?: string; text: string }) => unknown }).Markdown
    const text = mdText(r.text)
    return (
      <Box key={`es-held-t-${el}`} columnGap={0.75} marginLeft={1.5} marginTop={0.3} minWidth={0}>
        <Box width={0.15} flexShrink={0} backgroundColor="promptBorder" />
        <Box flexDirection="column" flexGrow={1} minWidth={0}>
          {Md ? <Md key={`es-held-md-${el}`} text={text} /> : <Text>{text}</Text>}
        </Box>
      </Box>
    )
  }

  // 노트: panel.md#heldCards — 메시지 항목 한 줄: ▸ · 「결정」 꼬리표 · 한 줄 요약(누르면 본문) · 흐린 시각 · [수락] [거절](줄 오른쪽 끝에 고정)
  const heldItem = (r: HeldReport) => {
    const key = heldKey(r)
    const el = `${k(r.from)}${String(r.at).slice(-6)}`
    const isOpen = folds.has(`held:${key}`)
    const g = heldGist(r.text)
    const left = [
      mark(ui, isOpen ? 'down' : 'right', isOpen ? '접기' : '펼치기', SUB_LOOK),
      g.isDecision ? (
        <Box borderStyle="single" borderColor="warning" paddingX={0.4} paddingY={0} flexShrink={0}>
          <Text color="warning" size="footnote">
            결정
          </Text>
        </Box>
      ) : null,
      <Box flexGrow={1} flexShrink={1} minWidth={0}>
        <Text wrap="truncate-end">{g.gist}</Text>
      </Box>,
    ]
    // 덮개는 요약 칸 안만(시각 · 단추 앞까지) — 안쪽 Box 가 넘침을 자르고, 폭 어림도 그 앞에서 멈춘다
    const cover = Math.max(6, Math.min(Math.ceil(textCh(g.gist) + (g.isDecision ? 7 : 3)), cols - 22))
    return (
      <Box key={`es-held-${el}`} flexDirection="column" marginTop={0.3}>
        <Box columnGap={0.5} alignItems="center" minWidth={0}>
          {pressBox(ui, `es-held-fb-${el}`, { content: left, cover, onPress: () => acts.fold(`held:${key}`), grow: true })}
          <Box columnGap={0.5} alignItems="center" flexShrink={0}>
            <Text color="subtle" size="footnote">
              {clockText(r.at, v.now)}
            </Text>
            <Button key={`es-acc-${el}`} variant="secondary" label="수락" onPress={() => acts.accept(key)} />
            <Button key={`es-rej-${el}`} plain dimColor label="거절" onPress={() => acts.reject(key)} />
          </Box>
        </Box>
        {isOpen ? heldBody(r, el) : null}
      </Box>
    )
  }

  // 노트: panel.md#heldCards — 메시지 카드 하나 = 보낸 세션 하나. shown = 그리는 항목(최근 10개 안), all = 그 세션 것 전부(카드의 전체 수락 · 삭제 —
  // 시안대로 둘부터). 수락 어림은 마지막 메시지 카드 아래 한 번(요청 한 번 값은 어느 메시지든 같다)
  const msgCard = (from: string, shown: readonly HeldReport[], all: readonly HeldReport[], isLast: boolean) => {
    const el = k(from)
    const keys = all.map(heldKey)
    const cost = v.accept ? acceptCost(v.accept.tokens, v.accept.isCold) : null
    return card(`es-mc-${el}`, [
      <Box columnGap={0.5} alignItems="center" minWidth={0}>
        {mark(ui, 'message', '메시지', TEXT_LOOK)}
        <Box flexShrink={1} minWidth={0}>
          <Text bold wrap="truncate-end">
            {bareTitle(v.metas.get(from)?.title ?? shown[0]?.title ?? from)}
          </Text>
        </Box>
        <Text color="subtle">{`보고 ${all.length}`}</Text>
        <Box flexGrow={1} />
        {all.length > 1 ? (
          <Box columnGap={0.5} alignItems="center" flexShrink={0}>
            <Button key={`es-acc-all-${el}`} variant="secondary" label="전체 수락" onPress={() => acts.accept(keys)} />
            <Button key={`es-rej-all-${el}`} variant="secondary" label="전체 삭제" onPress={() => acts.reject(keys)} />
          </Box>
        ) : null}
      </Box>,
      <Box height={0.06} marginY={0.3} backgroundColor="promptBorder" />,
      ...shown.map(heldItem),
      isLast && cost ? (
        <Box key="es-held-cost" columnGap={0.5} alignItems="center" marginTop={0.4}>
          {v.accept?.isCold ? mark(ui, 'snowflake', '캐시 식음') : null}
          <Text color="subtle" size="footnote">{`수락하면 ${cost}`}</Text>
        </Box>
      ) : null,
    ])
  }

  // 노트: panel.md#boardRow — 진행판 카드(메인 · 오케 — 「진행판」 칸 안, 0.1.26): 파일 이름 · 새 줄 수 · [넣기] = 입력칸에 · ▸ 보기 = 새 줄 펼침 · [바꾸기] = 경로 칸.
  // 못 읽으면 주황 「진행판 못 읽음」 + [바꾸기]
  const boardCard = (path: string, fresh: readonly string[] | null) => {
    const isOpen = folds.has('board-lines')
    return card('es-board', [
      <Box columnGap={0.5} alignItems="center" minWidth={0}>
        {mark(ui, 'notebook', '진행판', TEXT_LOOK)}
        {fresh === null ? (
          <Text bold color="warning">
            진행판 못 읽음
          </Text>
        ) : (
          <Text bold>{fresh.length > 0 ? `새 줄 ${fresh.length}` : '새 줄 없음'}</Text>
        )}
        <Box flexShrink={1} minWidth={0}>
          <Text color="subtle" wrap="truncate-end">
            {fileName(path)}
          </Text>
        </Box>
        <Box flexGrow={1} />
        {fresh === null ? (
          <Button key="es-board-fix" variant="secondary" label="바꾸기" onPress={() => acts.fold('board-edit', true)} />
        ) : (
          <Box columnGap={0.5} alignItems="center" flexShrink={0}>
            {fresh.length > 0 ? <Button key="es-board-new" variant="secondary" label="넣기" onPress={() => void acts.boardFill()} /> : null}
            {fresh.length > 0
              ? pressBox(ui, 'es-board-foldb', {
                  content: [
                    mark(ui, isOpen ? 'down' : 'right', isOpen ? '접기' : '펼치기', SUB_LOOK),
                    <Text color="subtle">
                      보기
                    </Text>,
                  ],
                  // 덮개는 그림 + 글 폭으로(고정 5칸이면 칸보다 넓어 글 위에 「…」 — 0.1.26 그림 도구로 잼)
                  cover: coverCells(QUICK_ROW_PX / 7.71 + 0.5 + textCh('보기')),
                  onPress: () => acts.fold('board-lines'),
                })
              : null}
            <Button key="es-board-edit" plain dimColor label="바꾸기" onPress={() => acts.fold('board-edit')} />
          </Box>
        )}
      </Box>,
      ...(isOpen && fresh
        ? fresh.slice(0, LIST_LIMIT).map((line, i) => (
            <Box key={`es-board-l${i}`} marginTop={0.2} minWidth={0}>
              <Text color="subtle" wrap="truncate-end">
                {line.replace(/^- /, '')}
              </Text>
            </Box>
          ))
        : []),
    ])
  }

  // 노트: panel.md#heldCards — 모인 보고 · 받은 글 카드(0.1.26 — 설치판 할 일 칸 메시지 카드를 칸마다 나눔): 보낸 세션마다 카드 하나, 최근 MSG_LIMIT 개만 그린다
  // (50개를 다 펴면 10만 자를 넘어 패널이 통째로 안 그려진다 — 0.1.3 시험에서 잼). 수락 어림은 마지막 카드 아래 한 번
  const heldCards = (key: string, list: readonly HeldReport[]): unknown[] => {
    if (list.length === 0) return []
    const shown = list.slice(0, MSG_LIMIT)
    const senders = [...new Set(shown.map(r => r.from))]
    return [
      ...senders.map((from, i) =>
        msgCard(
          from,
          shown.filter(r => r.from === from),
          list.filter(r => r.from === from),
          i === senders.length - 1,
        ),
      ),
      list.length > MSG_LIMIT ? (
        <Box key={`${key}-rest`} marginTop={0.4}>
          <Text color="subtle">{`그 밖 ${list.length - MSG_LIMIT}개(오래된 것) — 위를 처리하면 이어서 보입니다. 카드의 전체 수락 · 전체 삭제는 그 세션 것 모두에 걸립니다`}</Text>
        </Box>
      ) : null,
    ]
  }

  // 노트: panel.md#kidRow — 하위 줄 ⋯ 아래 그 세션 모인 보고: 줄마다 요약 · 수락 · 거절(본문은 ▸) · 둘부터 [전체 삭제] · 수락 어림 한 줄
  const heldList = (el: string, list: readonly HeldReport[]) => {
    const cost = v.accept ? acceptCost(v.accept.tokens, v.accept.isCold) : null
    const shown = list.slice(0, MSG_LIMIT)
    return (
      <Box key={`es-mc-${el}`} flexDirection="column" marginLeft={2.5} marginTop={0.2} minWidth={0}>
        {shown.map(heldItem)}
        <Box key={`es-mc-foot-${el}`} columnGap={0.5} alignItems="center" marginTop={0.4} minWidth={0}>
          {v.accept?.isCold ? mark(ui, 'snowflake', '캐시 식음') : null}
          <Box flexGrow={1} minWidth={0}>
            <Text color="subtle" size="footnote" wrap="truncate-end">
              {cost ? `수락하면 ${cost}` : ''}
            </Text>
          </Box>
          {list.length > 1 ? <Button key={`es-rej-all-${el}`} plain dimColor label="전체 삭제" onPress={() => acts.reject(list.map(heldKey))} /> : null}
        </Box>
        {list.length > MSG_LIMIT ? (
          <Text key={`es-mc-rest-${el}`} color="subtle" size="footnote">{`그 밖 ${list.length - MSG_LIMIT}개(오래된 것) — 위를 처리하면 이어서 보입니다`}</Text>
        ) : null}
      </Box>
    )
  }

  // 노트: panel.md#nowBox — 「지금」 줄(0.1.26 — 설치판 할 일 칸을 갈음, 시안 5.1): 사람이 할 것만 · 처리하면 사라짐. 입력 필요 하위 [열기] · 모인 보고(하위) ·
  // 받은 글(위 · 형제 · 다른 세션) · 진행판 새 줄(메인 · 오케) — 줄마다 [보기]는 그 칸을 편다. 할 것이 없으면 줄이 없다
  const nowBox = () => {
    // isWrap = 글을 줄 끝에서 자르지 않고 꺾는다(묻는 줄 — 잘리면 물음이 안 보인다, 380 그림으로 봄)
    const line = (key: string, icon: QuickIcon, text: string, btn: unknown, side?: unknown, isWrap = false) => (
      <Box key={key} columnGap={0.5} alignItems="center" minWidth={0} marginTop={0.15}>
        {mark(ui, icon, text, WARN_LOOK)}
        <Box flexGrow={1} flexShrink={1} minWidth={0}>
          {isWrap ? <Text>{text}</Text> : <Text wrap="truncate-end">{text}</Text>}
        </Box>
        {side ?? null}
        {btn}
      </Box>
    )
    const see = (key: string, to: ToolKey) => <Button key={key} variant="secondary" label="보기" onPress={() => acts.tool(to)} />
    // 입력 필요 하위: 때 · ❄ 깨우는 값(설치판 할 일 카드의 머리 오른쪽 그대로)
    const waitSide = (r: FamilyRow) => {
      const cost = v.ctxK.get(r.id)
      const isCold = r.isCold && !r.isEnded && !r.isArchived
      return (
        <Box columnGap={0.5} alignItems="center" flexShrink={0}>
          <Text color="subtle" size="footnote">
            {agoText(r.lastAt, v.now)}
          </Text>
          {isCold ? mark(ui, 'snowflake', '캐시 식음') : null}
          {isCold && cost !== undefined ? (
            <Text color="subtle" size="footnote">
              {money(wakeUsd(cost))}
            </Text>
          ) : null}
        </Box>
      )
    }
    const kidFrom = new Set(heldKid.map(r => r.from)).size
    const b = v.board
    // 노트: panel.md#nowBox — 서브가 세션을 열면 「오케로 바꿀까요?」(정본 9절 결정 20 · 시안 5.1): [오케로] = 오케 표시 · [그대로] = 이 패널에서 거둠(접힘 값 — 다시 열면 또 묻는다)
    const openedNow = kids.filter(r => v.opened.has(r.id) && !r.isEnded).length
    const askOrche =
      v.role === 'sub' && openedNow > 0 && !folds.has(NOW_ORCHE_NO)
        ? line(
            'es-now-orche',
            'branch',
            `하위 세션 ${openedNow}개가 생김 — 오케로 바꿀까요?`,
            <Button key="es-now-orche-b" variant="secondary" label="오케로" onPress={() => acts.orche(v.selfId, true)} />,
            <Button key="es-now-orche-no" plain dimColor label="그대로" onPress={() => acts.fold(NOW_ORCHE_NO, true)} />,
            true,
          )
        : null
    const items = [
      askOrche,
      ...waits
        .slice(0, NOW_WAIT_MAX)
        .map(r => line(`es-wait-${k(r.id)}`, 'ask', `입력 필요 — ${bareTitle(r.title)}`, <Button key={`es-wait-go-${k(r.id)}`} variant="secondary" label="열기" onPress={() => acts.go(r.id)} />, waitSide(r))),
      waits.length > NOW_WAIT_MAX ? line('es-wait-rest', 'ask', `입력 필요 그 밖 ${waits.length - NOW_WAIT_MAX}개`, see('es-wait-rest-b', 'rep')) : null,
      heldKid.length > 0 ? line('es-now-rep', 'inbox', `모인 보고 ${heldKid.length} — 하위 ${kidFrom}개에서`, see('es-now-rep-b', 'rep')) : null,
      heldUp.length > 0 ? line('es-now-msg', 'inbox', `받은 글 ${heldUp.length} — 위 세션에서`, see('es-now-msg-b', 'msg')) : null,
      heldSib.length > 0 ? line('es-now-col', 'inbox', `받은 글 ${heldSib.length} — 형제 세션에서`, see('es-now-col-b', 'col')) : null,
      heldOther.length > 0 ? line('es-now-inq', 'inbox', `받은 글 ${heldOther.length} — 다른 세션에서`, see('es-now-inq-b', 'inq')) : null,
      b && b.path !== null && (b.fresh === null || b.fresh.length > 0)
        ? line('es-now-brd', 'notebook', b.fresh === null ? '진행판 못 읽음' : `진행판 새 줄 ${b.fresh.length}`, see('es-now-brd-b', 'brd'))
        : null,
    ].filter(Boolean)
    if (items.length === 0) return null
    return (
      <Box key="es-now" flexDirection="column" borderStyle="round" borderColor="warning" paddingX={0.75} paddingY={0.3} marginTop={0.5} minWidth={0}>
        {items}
      </Box>
    )
  }

  // 노트: panel.md#selfCmds — 명령 칩: 테두리 20% 칸 + 그림 16px + 원래 이름, 마우스 올림 한 줄. 칸 오른쪽에 걸리는 칩은 그 줄을 오른쪽에 붙인다(패널 밖으로 안 잘리게)
  const chips = () => {
    const press = (c: (typeof SELF_CMDS)[number]) => (c.key === 'recap' ? acts.recap() : c.key === 'export' ? acts.exportSession(v.selfId) : acts.slash(c.key))
    const list: { name: string; icon: QuickIcon; label: string; tip: string; onPress: () => unknown; word?: unknown }[] = [
      { name: 'ultra', icon: 'brain', label: ULTRA_WORD, tip: ULTRA_TIP, onPress: () => acts.ultrathink(), word: ultraWord(ui, v.ultraOn) },
      ...SELF_CMDS.map(c => ({ name: c.key, icon: CMD_ICONS[c.key], label: c.label, tip: c.key === 'recap' || c.key === 'export' ? `${c.what} — 바로 돎` : c.what, onPress: () => press(c) })),
    ]
    let x = 0
    return list.map(c => {
      const cover = Math.ceil((QUICK_ROW_PX + 6 + 12) / 8.5 + textCh(c.label))
      if (x > 0 && x + cover > cols) x = 0
      const tipRight = x + textCh(c.tip) + 2 > cols
      x += cover + 1
      return pressBox(ui, `es-s-${c.name}`, {
        content: [
          mark(ui, c.icon, c.label, TEXT_LOOK),
          c.word ?? (
            <Text wrap="truncate-end">
              {c.label}
            </Text>
          ),
        ],
        cover: coverCells(QUICK_ROW_PX / 7.71 + 0.5 + textCh(c.label)),
        onPress: c.onPress,
        tip: c.tip,
        tipRight,
        box: { borderStyle: 'single', borderColor: 'promptBorder', paddingX: 0.5, paddingY: 0.25, hover: { backgroundColor: 'promptBorderShimmer' } },
      })
    })
  }

  // 노트: panel.md#selfView — 이 세션 머리(0.1.5 · 0.1.26): 제목 줄(터미널 그림 · 제목 — [범위] 뗌 · 고정 · 떼어 냄 · 때) + 관계 줄(역할 칩 · 위 · 하위 · 형제 · 문의).
  // 역할 칩은 표시만이고 누르면 「역할 · 인계」 칸을 편다(시안 5.1 화면 꼴 넷 ④). 왕관은 칩으로 옮겼다
  const selfHead = () => {
    if (!self) return null
    const role = ROLE_NAME[v.role]
    const rel = [v.up ? `위 ${fitCells(bareTitle(v.up.title), 16)}` : '위 없음', `하위 ${kids.length}`, `형제 ${sibs.length}`, `문의 ${inqSent.length + heldOther.length}`].join(' · ')
    return (
      <Box key="es-self" flexDirection="column">
        <Box key="es-self-title" columnGap={0.5} alignItems="center" minWidth={0}>
          {mark(ui, 'terminal', '세션', TEXT_LOOK)}
          <Box flexShrink={1} minWidth={0}>
            <Text bold wrap="truncate-end">{bareTitle(self.title)}</Text>
          </Box>
          {/* 고정 이유는 줄 자료에서 셈한 값(0.1.25 — [전체] 이 세션 줄과 같게) */}
          {self.isStarred ? pinMark(ui, v.selfRow?.pinWhy ?? null) : null}
          {self.detached ? mark(ui, 'unlink', '떼어 냄 — 앱 보고 안 옴') : null}
          <Box flexGrow={1} />
          <Text color="subtle" size="footnote">
            {agoText(self.lastAt, v.now)}
          </Text>
        </Box>
        <Box key="es-rel" columnGap={1} rowGap={0.3} alignItems="center" flexWrap="wrap" marginTop={0.4} minWidth={0}>
          {pressBox(ui, 'es-role-chip', {
            content: [roleMark(ui, v.role), <Text bold>{role}</Text>],
            cover: coverCells(QUICK_ROW_PX / 7.71 + 0.5 + textCh(role)),
            onPress: () => acts.tool('role'),
            tip: '역할 · 인계 칸을 폅니다',
            box: { borderStyle: 'round', borderColor: 'promptBorder', paddingX: 0.75, paddingY: 0.1, hover: { backgroundColor: 'promptBorderShimmer' } },
          })}
          <Box flexShrink={1} minWidth={0}>
            <Text color="subtle" size="footnote" wrap="truncate-end">
              {rel}
            </Text>
          </Box>
        </Box>
      </Box>
    )
  }

  // 노트: panel.md#advisorFold — 호출 한 번: 때(하위 에이전트면 표지) · 오른쪽 토큰, 하던 일(호출 직전 글 꼬리) · 그 뒤(직후 도구 · 첫 글). 없는 줄은 안 그린다
  const advisorRow = (c: AdvisorCall, i: number) => {
    const after = afterLine(c)
    // 노트: panel.md#advisorFold — 이름표 칸 = 최소 폭 · 한 줄(0.1.26 — 정본 「시안 5.1 확정」 ② · 11-17 제보): 0.1.25 까지 폭 3.8칸 고정이라
    // 「하던 / 일」 · 「그 / 뒤」로 꺾였다. 글자가 커지면 칸이 따라 넓어진다(최소 폭은 두 이름표의 글 열을 맞추는 값)
    const line = (name: string, label: string, text: string) => (
      <Box key={`es-adv-${name}${i}`} columnGap={0.5} alignItems="flex-start" marginTop={0.1} minWidth={0}>
        <Box minWidth={ADV_LABEL_W} flexShrink={0}>
          <Text color="subtle" size="footnote" wrap="truncate-end">
            {label}
          </Text>
        </Box>
        <Box flexShrink={1} minWidth={0}>
          <Text size="footnote">{text}</Text>
        </Box>
      </Box>
    )
    return (
      <Box key={`es-adv-r${i}`} flexDirection="column" marginTop={0.5} minWidth={0}>
        <Box columnGap={0.5} alignItems="center" minWidth={0}>
          <Text>{stampText(c.at)}</Text>
          {c.isAgent ? (
            <Text color="subtle" size="footnote">
              하위 에이전트
            </Text>
          ) : null}
          {c.kind.includes('error') ? (
            <Text color="warning" size="footnote">
              실패
            </Text>
          ) : null}
          <Box flexGrow={1} />
          {c.input !== null && c.output !== null ? (
            <Text color="subtle" size="footnote">
              {tokenPair(c.input, c.output)}
            </Text>
          ) : null}
        </Box>
        {c.doing ? line('d', '하던 일', c.doing) : null}
        {after ? line('a', '그 뒤', after) : null}
      </Box>
    )
  }

  // 노트: panel.md#advisorFold — 「어드바이저」 칸 안(0.1.13 → 0.1.26 도구판 칸): 호출 시점만 보인다. 머리 수는 입력창 위 advisor 칸과 같은 값, 안 불렸으면 그 말 한 줄
  const advBody = (): unknown[] => {
    const a = v.advisorLog
    if (!a) return [subLine('es-adv-none', '이 세션에서 아직 안 불렸습니다 — 불리면 호출 시점이 여기 남습니다.')]
    const calls = a.calls ?? []
    const inputs = calls.reduce((n, c) => n + (c.input ?? 0), 0)
    const outputs = calls.reduce((n, c) => n + (c.output ?? 0), 0)
    // 최근 것이 위. 「이전」을 펴도 ADV_MAX 줄까지 — 그 앞은 수만 말한다
    const recent = [...calls].reverse()
    const isMore = folds.has(ADV_MORE)
    const shown = recent.slice(0, isMore ? ADV_MAX : ADV_SHOW)
    const hidden = recent.length - shown.length
    const notes: string[] = []
    if (a.calls === null) notes.push(a.error ? `기록을 못 읽었습니다 — ${a.error}` : '기록을 읽는 중…')
    if (isMore && hidden > 0) notes.push(`그 앞 ${hidden}건은 여기 안 그립니다`)
    if (a.calls !== null && a.isFresh && a.calls.length !== a.count) notes.push(`기록에서 찾은 호출은 ${a.calls.length}건입니다`)
    return [
      withTip(
        ui,
        'es-adv-sum',
        <Text color="subtle" size="footnote">
          {[`모두 ${a.count}번`, calls.length > 0 ? tokenPair(inputs, outputs) : null].filter(Boolean).join(' · ')}
        </Text>,
        a.tip,
      ),
      card(
        'es-adv-list',
        [
          ...shown.map((c, i) => advisorRow(c, i)),
          !isMore && hidden > 0 ? (
            <Box key="es-adv-more" marginTop={0.4}>
              <Button key="es-adv-moreb" plain dimColor label={`▸ 이전 ${hidden}건 더 보기`} onPress={() => acts.fold(ADV_MORE)} />
            </Box>
          ) : null,
          isMore && recent.length > ADV_SHOW ? (
            <Box key="es-adv-more" marginTop={0.4}>
              <Button key="es-adv-moreb" plain dimColor label="▾ 이전 것 접기" onPress={() => acts.fold(ADV_MORE)} />
            </Box>
          ) : null,
          ...notes.map((text, i) => (
            <Box key={`es-adv-n${i}`} marginTop={0.3}>
              <Text color="subtle" size="footnote">
                {text}
              </Text>
            </Box>
          )),
        ],
        true,
      ),
    ]
  }

  // 노트: panel.md#manage — 묻는 글은 실제 동작대로: 보관하면 앱에 붙은 자식도 같이 보관된다(인계한 옛 주인만 먼저 떼어 남김 — register.md#handoff),
  // 고정된 세션은 고정을 먼저 푼다(앱이 막음)
  const askCard = (what: 'end' | 'archive') => {
    const isStarred = self?.isStarred === true
    const n = v.selfAttached
    const kids = n === 0 ? '' : v.isHanded ? ` 붙은 세션 ${n}개는 먼저 떼어 남깁니다.` : ` 붙은 세션 ${n}개도 같이 보관됩니다.`
    const line =
      what === 'end'
        ? `끝남으로 표시할까요?${isStarred ? ' 고정도 풉니다.' : ''}`
        : `${isStarred ? '고정을 풀고 보관할까요?' : '보관할까요?'} 사이드바에서 빠집니다.${kids}`
    // 세션 관리 카드 안이라 카드를 또 두르지 않는다(0.1.21) — 닫기 줄 바로 아래 글 + 단추
    return (
      <Box key="es-ask" flexDirection="column" marginTop={0.4}>
        <Text>{line}</Text>
        <Box columnGap={1} alignItems="center" marginTop={0.3}>
          <Button
            key="es-ask-ok"
            variant="secondary"
            label={what === 'end' ? '끝내기' : '보관'}
            onPress={() => {
              acts.ask(null)
              void (what === 'end' ? acts.finish(v.selfId, true) : acts.archive(v.selfId, true))
            }}
          />
          <Button key="es-ask-no" plain dimColor label="취소" onPress={() => acts.ask(null)} />
        </Box>
      </Box>
    )
  }

  // 노트: panel.md#adoptSection — 밑으로 붙이기(메인 · 오케 — 0.1.26 정본 이름, 옛 「들이기」): 이 묶음 밖 세션을 이 세션 밑으로 — 「하위 세션」 칸 손질
  const adoptList = () => (
    <Box key="es-adopt" flexDirection="column" marginTop={0.4}>
      <Text color="subtle">밑으로 붙일 세션</Text>
      {v.adopt.slice(0, LIST_LIMIT).map(r => (
        <Box key={`es-adopt-${k(r.id)}`} columnGap={1} alignItems="center" marginTop={0.3} minWidth={0}>
          <Box flexGrow={1} minWidth={0}>
            <Text color="subtle" wrap="truncate-end">
              {r.title}
            </Text>
          </Box>
          <Button key={`es-adopt-go-${k(r.id)}`} dimColor label="붙이기" onPress={() => acts.adopt(r.id)} />
        </Box>
      ))}
    </Box>
  )

  // 진행판 경로 칸(오케) — 세션 관리 [진행판 정하기 · 바꾸기] · 할 일 카드 「못 읽음」 [바꾸기]
  const boardInput = (path: string | null) => (
    <Box key="es-board-set" flexDirection="column" rowGap={0.4} marginTop={0.5}>
      <Text color="subtle">진행판 — 하위 세션이 물음 · 끝을 적는 md(새 줄 수를 「지금」 줄 · 진행판 칸에 보입니다)</Text>
      {InputEl ? (
        <InputEl
          key="es-board-input"
          placeholder="진행판 md 경로를 붙여 넣고 Enter"
          value={path ?? ''}
          submitLabel="정하기"
          onSubmit={(t: string) => acts.boardSet(t)}
        />
      ) : null}
      <Box>
        <Button key="es-board-cancelb" plain dimColor label="그대로 두기" onPress={() => acts.fold('board-edit')} />
      </Box>
    </Box>
  )

  // 노트: panel.md#manage — 「현재 세션」 칸(0.1.26 — 시안 5.1 「이 세션 손질만 · 권한 모드 줄 없음」, 0.1.21 세션 관리 카드에서 옮김): 고정 · Remote Control 끄기(켜졌을 때) · 정리 ·
  // 끝내기 · 보관(바로 아래 묻는 글) · 떼어 내기(경고 색 — 될 때만). 오케 · 인계는 「역할 · 인계」, 들이기는 「하위 세션」 [밑으로 붙이기], 진행판 정하기는 「진행판」 칸
  const mgrBody = (): unknown[] => {
    if (!self) return []
    const sr = v.selfRow
    const canDetach = v.canDetach.has(v.selfId)
    return [
      <Box key="es-mgr-btns" columnGap={1} rowGap={0.5} flexWrap="wrap" alignItems="center" marginTop={0.3} minWidth={0}>
        <Button key="es-s-pin" variant="secondary" label={self.isStarred ? '고정 풀기' : '고정'} onPress={() => acts.pin(v.selfId, !self.isStarred)} />
        {pu.remote === v.selfId ? (
          <Button key="es-s-remote" variant="secondary" label="Remote Control 끄기" onPress={() => acts.remoteOff(v.selfId)} />
        ) : (
          <Button key="es-s-remote-on" variant="secondary" label="Remote Control" onPress={() => acts.remoteOn(v.selfId)} />
        )}
        <Button key="es-s-clean" variant="secondary" label="정리" onPress={() => void acts.clean(v.selfId)} />
        <Button key="es-s-title" variant="secondary" label="제목 정리" onPress={() => void acts.titleTidy()} />
        <Button
          key="es-s-end"
          variant="secondary"
          label={sr?.isEnded ? '끝남 풀기' : '끝내기'}
          onPress={() => (sr?.isEnded ? void acts.finish(v.selfId, false) : acts.ask(pu.ask === 'end' ? null : 'end'))}
        />
        <Button key="es-s-arch" variant="secondary" label="보관" onPress={() => acts.ask(pu.ask === 'archive' ? null : 'archive')} />
        {canDetach ? dangerButton('es-s-detach', '떼어 내기', () => acts.detach(v.selfId), '되돌릴 수 없습니다 — 연 세션에 보고가 더는 안 갑니다') : null}
      </Box>,
      folds.has('clean-hint') ? (
        <Box key="es-clean-hint" marginTop={0.3}>
          <Text color="subtle">{canFix ? '입력칸에 정리 글을 넣었습니다 — 앞에 「하위 세션 → 일 → 보고」 세 줄 · 다시 누르면 뺍니다' : '입력칸에 정리 글을 넣었습니다 — 보내면 처리합니다 · 다시 누르면 뺍니다'}</Text>
        </Box>
      ) : null,
      pu.ask ? askCard(pu.ask) : null,
      subLine(
        'es-mgr-note',
        `[정리] · [제목 정리]는 입력칸에 지시 글을 넣습니다(${canFix ? '메인 · 오케 [정리]는 앞에 「하위 세션 → 일 → 보고」 세 줄' : '다시 누르면 뺌'}).${canDetach ? ' 떼어 내기는 되돌릴 수 없습니다.' : ''} 역할 · 위 · 하위 세션 손질은 각 칸에서.`,
      ),
    ]
  }

  // 노트: panel.md#roleTool — 「역할 · 인계」 칸(0.1.26 — 시안 5.1): 인계(같은 역할로 다음 차 — 입력칸에 지시 글) · 바꾸기(이 세션 역할만 — 오케 표시 켜고 끄기 · 떼어 내기).
  // 안 되는 줄은 흐린 줄 + 까닭 한 줄(정본 9절 결정 4). 메인 = 위 없는 오케가 하나뿐일 때 그 세션이라(meta.md#roleOf) 메인은 바꾸기로 안 내린다(결정 2)
  const roleBody = (): unknown[] => {
    if (!self) return []
    const role = v.role
    const no = (key: string, label: string, why: string) => (
      <Box key={key} columnGap={1} alignItems="center" marginTop={0.3} minWidth={0}>
        {mark(ui, 'circleX', label, SUB_LOOK)}
        {/* 이름표는 한 줄 — 줄면 380 · 480 폭에서 「오케 풀 / 기」처럼 낱말 중간에서 꺾였다(어드바이저 줄 이름표와 같은 길, 까닭 글만 꺾임) */}
        <Box flexShrink={0}>
          <Text color="subtle">{label}</Text>
        </Box>
        <Box flexShrink={1} minWidth={0}>
          <Text color="subtle" size="footnote">
            {why}
          </Text>
        </Box>
      </Box>
    )
    const canDetach = v.canDetach.has(v.selfId)
    const buttons: unknown[] = []
    const nos: unknown[] = []
    if (role === 'main') nos.push(no('es-r-no-main', '다른 역할로', '메인이 비게 되어 안 됨 — 메인 인계로 넘기고 끝냄'))
    if (role === 'orche') {
      if (kids.length > 0) nos.push(no('es-r-no-unorche', '오케 풀기', `하위 ${kids.length} 가 아직 있음 — 다 끝난 뒤에(아니면 오케 인계)`))
      else buttons.push(<Button key="es-s-orche" variant="secondary" label="오케 풀기" onPress={() => acts.orche(v.selfId, false)} />)
    }
    if (role === 'sub' || role === 'solo') buttons.push(<Button key="es-s-orche" variant="secondary" label="오케로" onPress={() => acts.orche(v.selfId, true)} />)
    if (role === 'sub' && canDetach) {
      buttons.push(withTip(ui, 'es-r-solo-box', <Button key="es-r-solo" variant="secondary" label="단독으로 — 떼어 내기" onPress={() => acts.detach(v.selfId)} />, '되돌릴 수 없습니다 — 연 세션에 보고가 더는 안 갑니다'))
    }
    // 노트: panel.md#roleTool — 서브로 — 위 고름(단독만 — register 가 값을 줄 때): 오케 · 메인 가운데 고르면 그 세션 밑으로(저장소만 — 앱 부모가 아니라 보고는 진행판 끝 줄 · 보내기로)
    const up = v.upPick
    if (up && up.choices.length > 0) {
      const { Select } = ui
      const options = [{ value: 'app', label: '위 세션 고르기' }, ...up.choices.map(id => ({ value: id, label: fitCells(bareTitle(v.metas.get(id)?.title ?? id), 28) }))]
      buttons.push(<Select key="es-r-up" label="서브로" value={up.value} options={options} onSelect={(x: string) => (x === 'app' ? undefined : acts.setOwner(v.selfId, x))} />)
    }
    if (role !== 'main') nos.push(no('es-r-no-tomain', '메인으로', v.mainTitle ? `메인은 「${fitCells(bareTitle(v.mainTitle), 20)}」 — 메인 인계로만` : '위 없는 오케가 하나뿐이면 그 세션이 메인입니다'))
    return [
      subLine('es-role-hand-t', '인계 — 같은 역할로 다음 차를 엶 · 이 세션은 끝남'),
      <Box key="es-role-hand" columnGap={1} alignItems="center" flexWrap="wrap" marginTop={0.3} minWidth={0}>
        <Button key="es-s-handoff" variant="secondary" label={`${ROLE_NAME[role]} 인계`} onPress={() => acts.handoff()} />
        <Text color="subtle" size="footnote">
          입력칸에 지시 글을 넣습니다
        </Text>
      </Box>,
      subLine('es-role-chg-t', '바꾸기 — 이 세션 역할만(같은 일 · 이름만 바뀔 때)'),
      buttons.length > 0 ? (
        <Box key="es-role-chg" columnGap={1} rowGap={0.5} alignItems="center" flexWrap="wrap" marginTop={0.3} minWidth={0}>
          {buttons}
        </Box>
      ) : null,
      ...nos,
    ]
  }

  // 노트: panel.md#compose — 보낼 곳 줄(0.1.19 메시지 보내기 칸 줄 → 0.1.26 「위 세션」 · 「다른 세션」 칸): 흐린 관계 · 제목 · [보내기], 펴면 바로 아래 글 칸(깨우는 값 카드 길 그대로).
  // 그 밖 세션은 입력창 >>이름(0.1.25 — [전체] 찾기를 뺌)
  const sendLine = (r: SendRow) => {
    const at = `${COMPOSE_AT}${r.id}`
    const el = k(r.id)
    const isWriting = pu.sending === at
    return (
      <Box key={`es-sendto-${el}`} flexDirection="column" minWidth={0}>
        <Box key={`es-sendto-h-${el}`} columnGap={1} alignItems="center" minWidth={0}>
          <Box key={`es-sendto-t-${el}`} width={SEND_TAG_W} flexShrink={0}>
            <Text color="subtle">{r.tag}</Text>
          </Box>
          <Box key={`es-sendto-n-${el}`} flexGrow={1} flexShrink={1} minWidth={0}>
            <Text wrap="truncate-end">{bareTitle(r.title)}</Text>
          </Box>
          <Button key={`es-sendto-b-${el}`} variant="secondary" label={isWriting ? '닫기' : '보내기'} onPress={() => acts.send(at)} />
        </Box>
        {isWriting ? sending(`c${el}`, r.id, r.title, true) : null}
      </Box>
    )
  }

  // 노트: panel.md#toolBoard — 칸 안 흐린 한 줄 · 작은 머리(시안 .sec)
  const subLine = (key: string, text: string) => (
    <Box key={key} marginTop={0.4} minWidth={0}>
      <Text color="subtle" size="footnote">
        {text}
      </Text>
    </Box>
  )

  // 노트: panel.md#toolBoard — 보낸 글 묶음(앱 도착 기록 — 보냄 · 도착 · 읽음 · 답함 · 안 감): 작은 머리 + 줄(sentList). 없으면 머리 아래 「보낸 글 없음」
  const sentBlock = (key: string, label: string, list: readonly SentRow[]) => (
    <Box key={key} flexDirection="column" minWidth={0}>
      {subLine(`${key}-h`, label)}
      {sentList(`${key}-l`, list)}
    </Box>
  )

  // 노트: panel.md#toolBoard — 「위 세션」 칸: 위 줄 [보내기] · 보낸 글(앱 도착 기록) · 위에서 받은 글. 위가 없는 메인 · 맨 위 오케는 칸을 흐리지 않고 「보고는 사용자에게」(시안 5.1 정할 것 1),
  // 단독은 흐린 칸에 한 줄
  const msgBody = (): unknown[] => {
    if (v.role === 'solo') return [subLine('es-msg-none', '위가 없어 쓸 일이 없습니다 — 다른 세션과는 「다른 세션」 칸으로.')]
    // 노트: panel.md#reportForm — [보고 꼴로](0.1.26 — 정본 「시안 5.1 확정」 ②): 다섯 칸 보고 글을 입력칸에. 위가 있으면 끝에 전달 신호(차례 끝 답이 위로), 없으면 채팅에
    const reportRow = (label: string) => (
      <Box key="es-msg-report-row" columnGap={1} rowGap={0.4} alignItems="center" flexWrap="wrap" marginTop={0.5} minWidth={0}>
        <Button key="es-msg-report" variant="secondary" label={label} onPress={() => void acts.report()} />
        <Box flexShrink={1} minWidth={0}>
          <Text color="subtle" size="footnote">
            끝난 것 · 하는 중 · 막힌 것 · 기다리는 결정 · 다음
          </Text>
        </Box>
      </Box>
    )
    if (!v.up) {
      return [
        <Box key="es-msg-top" marginTop={0.3} minWidth={0}>
          <Text>위 없음 — 보고는 사용자에게(채팅)</Text>
        </Box>,
        reportRow('보고 꼴로 — 채팅에'),
        subLine('es-msg-other', '다른 세션과는 「다른 세션」 칸으로.'),
      ]
    }
    const up = v.up
    return [
      card('es-msg-up', [sendLine(up)]),
      reportRow('보고 꼴로'),
      sentBlock('es-msg-sent', '보낸 글 — 보냄 → 도착 → 읽음 → 답함', v.sent.filter(s => s.to === up.id)),
      ...heldCards('es-msg-held', heldUp),
    ]
  }

  // 노트: panel.md#toolBoard — 「형제 세션」 칸: 줄마다 [보내기] · [가기](sibRow) · 형제에게서 받은 글
  const colBody = (): unknown[] => {
    if (sibs.length === 0) return [subLine('es-col-none', '같은 위 밑 형제가 없습니다.')]
    const sentSib = v.sent.filter(s => sibIds.has(s.to))
    return [
      card('es-sibs', capped(sibs, 'sibs', sibRow), true),
      sentSib.length > 0 ? sentBlock('es-col-sent', '보낸 글 — 보냄 → 도착 → 읽음 → 답함', sentSib) : null,
      ...heldCards('es-col-held', heldSib),
    ]
  }

  // 노트: panel.md#toolBoard — 「다른 세션」 칸: 메인(위가 아닐 때) [보내기] · 보낸 글(위 · 하위 · 형제 밖) · 그 밖에서 받은 글 · 입력창 >>이름 안내
  const inqBody = (): unknown[] => [
    v.mainRow ? card('es-inq-main', [sendLine(v.mainRow)]) : null,
    sentBlock('es-inq-sent', '보낸 글 — 보냄 → 도착 → 읽음 → 답함', inqSent),
    ...heldCards('es-inq-held', heldOther),
    subLine('es-send-find', '다른 세션은 입력창에 >>이름'),
  ]

  // 노트: panel.md#kidRow — 「하위 세션」 칸(시안 5.1 repDetail): 머리 수 줄 · 하위 줄(kidRow) · 받는 법 한 줄([설정] 값) · 메인 · 오케면 손질 머리 「오케 몫」 + [모두 보관] · [밑으로 붙이기],
  // 서브 · 단독이면 손질 대신 한 줄. 하위가 없어도 메인 · 오케는 [밑으로 붙이기]를 둔다(설치판 들이기가 하위 없을 때도 있었다)
  const repBody = (): unknown[] => {
    const ended = kids.filter(r => r.isEnded)
    const out: unknown[] = []
    if (kids.length === 0) out.push(subLine('es-rep-none', '하위 세션이 없습니다.'))
    else {
      out.push(subLine('es-rep-sum', [`하위 ${kids.length}`, heldKid.length > 0 ? `모인 보고 ${heldKid.length}` : null, ended.length > 0 ? `끝남 ${ended.length}` : null].filter(Boolean).join(' · ')))
      out.push(card('es-kids', capped(kids, 'kids', kidRow), true))
      out.push(subLine('es-rep-recv', `받는 법 — ${v.settings.reports.value === 'app' ? '앱 그대로' : '모아 둠'} · 바꾸기는 [설정] 「자식 보고」`))
    }
    if (canFix) {
      out.push(
        <Box key="es-rep-fix" columnGap={0.5} rowGap={0.4} alignItems="center" flexWrap="wrap" marginTop={0.6} minWidth={0}>
          <Text color="subtle" size="footnote">
            손질
          </Text>
          {tagBox('es-rep-fix-tag', '오케 몫')}
          <Text color="subtle" size="footnote">
            줄마다 ⋯ · 여기
          </Text>
        </Box>,
        <Box key="es-rep-fixb" columnGap={1} rowGap={0.5} alignItems="center" flexWrap="wrap" marginTop={0.3} minWidth={0}>
          {/* 노트: panel.md#kidRow — [모두 보관](끝난 하위 둘부터): bypass 만 — auto 는 지시 글 하나에 보관이 여럿 들어가 판정기가 뒤엣것을 막을 수 있어(정본 10절 「지시 글은 동작 하나에 하나」) 줄마다 [보관] */}
          {ended.length > 1 ? (
            v.isBypass ? (
              <Button key="es-ended-all" variant="secondary" label="모두 보관" onPress={() => void acts.archiveAll(ended.map(r => r.id))} />
            ) : (
              tagBox('es-ended-auto', 'auto — 보관은 줄마다', 'warn')
            )
          ) : null}
          {v.adopt.length > 0 ? <Button key="es-adopt-b" variant="secondary" label={`밑으로 붙이기 ${folds.has('adopt') ? '▾' : '▸'}`} onPress={() => acts.fold('adopt')} /> : null}
        </Box>,
        v.adopt.length > 0 && folds.has('adopt') ? adoptList() : null,
      )
    } else if (kids.length > 0) out.push(subLine('es-rep-sub', '하위 세션 손질은 메인 · 오케만 — 오케로 바꾸면 손질이 생깁니다.'))
    return out
  }

  // 노트: panel.md#boardRow — 「진행판」 칸: 메인 · 오케 = 진행판 카드(경로 · 새 줄 · [넣기] · 보기 · [바꾸기]) 또는 「자리가 없습니다」 + [자리 정하기], 서브 = 위 진행판 이름,
  // 단독 = 흐린 칸에 한 줄
  const brdBody = (): unknown[] => {
    const b = v.board
    if (b) {
      return [
        b.path === null ? (
          <Box key="es-board-none" columnGap={1} alignItems="center" marginTop={0.3} minWidth={0}>
            <Box flexGrow={1} minWidth={0}>
              <Text color="warning">진행판 자리가 없습니다</Text>
            </Box>
            <Button key="es-board-edit" variant="secondary" label="자리 정하기" onPress={() => acts.fold('board-edit')} />
          </Box>
        ) : (
          boardCard(b.path, b.fresh)
        ),
        folds.has('board-edit') ? boardInput(b.path) : null,
      ]
    }
    if (v.role === 'solo') return [subLine('es-board-solo', '위도 아래도 없어 쓸 진행판이 없습니다.')]
    return [
      v.boardHint ? (
        <Box key="es-board-up" columnGap={0.5} alignItems="center" marginTop={0.3} minWidth={0}>
          {mark(ui, 'notebook', '진행판', TEXT_LOOK)}
          <Box flexShrink={1} minWidth={0}>
            <Text wrap="truncate-end">{`위 것 — ${v.boardHint.name}`}</Text>
          </Box>
          <Box flexShrink={1} minWidth={0}>
            <Text color="subtle" size="footnote" wrap="truncate-end">{`${fitCells(bareTitle(v.boardHint.owner), 24)}의 진행판`}</Text>
          </Box>
        </Box>
      ) : (
        subLine('es-board-noup', '위에 진행판이 없습니다.')
      ),
      subLine('es-board-how', '물음 · 끝은 위 진행판에 적습니다 — Claude 가 씁니다.'),
    ]
  }

  // 노트: panel.md#selfCmds — 「명령」 칸: 명령 칩(설치판 이 세션 칸 칩 그대로) + 명령으로 되는 것 한 줄(정본 9절 「울트라띵크 작업 줄 표시 · 명령 단추와 메시지 단추」 답)
  const cmdBody = (): unknown[] => [
    <Box key="es-self-chips" columnGap={0.5} rowGap={0.5} flexWrap="wrap" alignItems="center" marginTop={0.4}>
      {chips()}
    </Box>,
    subLine('es-cmd-note', '지금 지점에서 가르는 포크 · 곁 질문은 명령과 같습니다. 앞 지점에서 가르기 · 되돌리기는 메시지 단추가 바로 갑니다.'),
  ]

  // 노트: panel.md#toolBoard — 도구판(0.1.26 — 시안 5.1 화면 꼴 넷 ①): 묶음 머리 셋 아래 칸 셋씩 · 누른 칸 하나만 폄 · 안 쓰는 칸 흐림.
  // 칸 = 테두리 칸 안 그림 + 굵은 이름 + 흐린 한 줄, 칸 전체가 덮개 단추 하나(es-t-<칸>). 칸 폭은 칸 수로 셈한다(엔진 Box 에 flexBasis 가 없다)
  const tileW = Math.max(TILE_MIN, Math.floor((cols - 2 * TILE_GAP) / 3))
  const tile = (t: Tool) => {
    const isOn = pu.tool === t.k
    const dim = !t.use
    return (
      <Box
        key={`es-t-${t.k}-box`}
        flexDirection="column"
        width={tileW}
        flexShrink={0}
        minWidth={0}
        borderStyle="round"
        borderColor={isOn ? 'suggestion' : dim ? 'promptBorderShimmer' : 'promptBorder'}
        {...(dim ? {} : { backgroundColor: CARD_BG })}
        paddingX={0.75}
        paddingY={0.35}
      >
        <Box columnGap={0.5} alignItems="center" minWidth={0}>
          {t.icon(dim)}
          <Box flexShrink={1} minWidth={0}>
            <Text bold size="footnote" wrap="truncate-end" {...(dim ? { color: 'subtle', dimColor: true } : {})}>
              {t.name}
            </Text>
          </Box>
        </Box>
        <Box minWidth={0}>
          <Text color="subtle" size="caption" wrap="truncate-end" {...(dim ? { dimColor: true } : {})}>
            {t.sub}
          </Text>
        </Box>
        <Box position="absolute" top={0} left={0} right={0} bottom={0} alignItems="stretch">
          <Button key={`es-t-${t.k}`} label={COVER.repeat(coverCells(tileW - 0.5))} plain dimColor onPress={() => acts.tool(t.k)} />
        </Box>
        {/* 노트: panel.md#toolBoard — 수 표(0.1.26): 칸 오른쪽 위 모서리에 걸친 주황 둥근 칸 · 글은 inverseText(어두운 테마 = 어두운 글 · 밝은 테마 = 흰 글).
            절대 위치는 정수 칸만 받아(엔진) 모서리 위치(0, 0)에서 음수 여백으로 밖으로 민다 — 덮개 뒤라 칸 이름을 안 가린다 */}
        {t.cnt > 0 ? (
          <Box key={`es-t-${t.k}-cnt`} position="absolute" top={0} right={0} marginTop={CNT_SHIFT_Y} marginRight={CNT_SHIFT_X} borderStyle="round" borderColor="warning" backgroundColor="warning" paddingX={0.45} paddingY={0}>
            <Text bold size="caption" color="inverseText">
              {String(t.cnt)}
            </Text>
          </Box>
        ) : null}
      </Box>
    )
  }
  const board = (list: readonly Tool[]) => (
    <Box key="es-tools" flexDirection="column" marginTop={0.6} minWidth={0}>
      {TOOL_GROUPS.map(([g, name], i) => (
        <Box key={`es-tg-${g}`} flexDirection="column" marginTop={i === 0 ? 0 : 0.5} minWidth={0}>
          <Box key={`es-tg-h-${g}`} marginBottom={0.25}>
            <Text bold size="caption" color="subtle">
              {name}
            </Text>
          </Box>
          <Box key={`es-tg-r-${g}`} columnGap={TILE_GAP} minWidth={0}>
            {list.filter(t => t.g === g).map(tile)}
          </Box>
        </Box>
      ))}
    </Box>
  )

  // 노트: panel.md#toolBoard — 편 칸: 가는 선 아래 머리(그림 + 굵은 이름, 안 쓰는 칸이면 「— 이 역할에선 안 씀」) + 칸 안
  const detail = (t: Tool) => (
    <Box key={`es-d-${t.k}`} flexDirection="column" marginTop={0.75} minWidth={0}>
      <Box height={0.06} marginBottom={0.6} backgroundColor="promptBorder" />
      <Box key={`es-dh-${t.k}`} columnGap={0.5} alignItems="center" minWidth={0}>
        {t.icon(false)}
        <Text bold>{t.name}</Text>
        {t.use ? null : (
          <Text color="subtle" size="footnote">
            — 이 역할에선 안 씀
          </Text>
        )}
      </Box>
      {t.body()}
    </Box>
  )

  // 노트: panel.md#toolBoard — 칸 아홉(정본 9절 「시안 5.1 확정」 칸 이름 그대로): 흐린 한 줄 · 안 쓰는 칸 · 할 것 수(cnt)
  const toolsOf = (): Tool[] => {
    const icon =
      (name: QuickIcon, look: IconLook = TEXT_LOOK) =>
      (dim: boolean) =>
        mark(ui, name, '', dim ? { ...look, alpha: 0.45 } : look)
    const Svg = (ui as unknown as { Svg?: CharSvgEl }).Svg
    const advIcon = () => (Svg ? <Svg source={advisorCharSvg(QUICK_ROW_PX, 'on', false)} alt="어드바이저" width={advisorCharWidth(QUICK_ROW_PX, 'on')} height={QUICK_ROW_PX} /> : null)
    const b = v.board
    const upId = v.up?.id ?? null
    const upSent = upId === null ? 0 : v.sent.filter(s => s.to === upId).length
    const brdSub = b
      ? b.path === null
        ? '자리 없음'
        : b.fresh === null
          ? '못 읽음'
          : `새 줄 ${b.fresh.length}`
      : v.role === 'solo'
        ? '없음'
        : v.boardHint
          ? `위 것 · ${v.boardHint.name}`
          : '위 진행판 없음'
    const a = v.advisorLog
    return [
      { k: 'msg', g: 'msg', name: '위 세션', icon: icon('send'), sub: v.up ? `보낸 ${upSent} · 받은 ${heldUp.length}` : v.role === 'solo' ? '위 없음' : '보고는 사용자에게', use: v.role !== 'solo', cnt: heldUp.length, body: msgBody },
      { k: 'col', g: 'msg', name: '형제 세션', icon: icon('sitemap'), sub: sibs.length > 0 ? `${sibs.length}개` : '없음', use: sibs.length > 0, cnt: heldSib.length, body: colBody },
      { k: 'inq', g: 'msg', name: '다른 세션', icon: icon('ask'), sub: `받은 ${heldOther.length} · 보낸 ${inqSent.length}`, use: true, cnt: heldOther.length, body: inqBody },
      {
        k: 'rep',
        g: 'mgmt',
        name: '하위 세션',
        icon: icon('clipboard'),
        sub: kids.length > 0 ? `${kids.length}개${heldKid.length > 0 ? ` · 모인 ${heldKid.length}` : ''}` : '없음',
        use: kids.length > 0,
        cnt: waits.length + heldKid.length,
        body: repBody,
      },
      { k: 'brd', g: 'mgmt', name: '진행판', icon: icon('notebook'), sub: brdSub, use: v.role !== 'solo', cnt: b && b.path !== null ? (b.fresh === null ? 1 : b.fresh.length) : 0, body: brdBody },
      {
        k: 'role',
        g: 'mgmt',
        name: '역할 · 인계',
        icon: icon('transfer', { ...ROLE_LOOK[v.role], px: QUICK_ROW_PX }),
        sub: [ROLE_NAME[v.role], v.up ? `위 ${fitCells(bareTitle(v.up.title), 10)}` : '위 없음', v.ctxPct !== null ? `${v.ctxPct}%` : null].filter(Boolean).join(' · '),
        use: true,
        cnt: 0,
        body: roleBody,
      },
      { k: 'cmd', g: 'tool', name: '명령', icon: icon('terminal'), sub: 'ultrathink · /btw …', use: true, cnt: 0, body: cmdBody },
      { k: 'adv', g: 'tool', name: '어드바이저', icon: advIcon, sub: a ? `모두 ${a.count}번` : '안 불림', use: true, cnt: 0, body: advBody },
      { k: 'mgr', g: 'tool', name: '현재 세션', icon: icon('settings'), sub: '고정 · 정리 · 보관', use: true, cnt: 0, body: mgrBody },
    ]
  }

  // 노트: panel.md#selfView — 「세션 도구」 쪽 차례(0.1.26 — 시안 5.1): 제목 · 관계 줄 → 「지금」 줄(할 것이 있을 때만) → 도구판 → 편 칸 하나
  const selfView = () => {
    if (!self) return null
    const list = toolsOf()
    const open = list.find(t => t.k === pu.tool) ?? null
    return (
      <Box key="es-selfview" flexDirection="column">
        {selfHead()}
        {nowBox()}
        {board(list)}
        {open ? detail(open) : null}
      </Box>
    )
  }

  // 노트: panel.md#settings — 입력창 위 줄 미리보기(0.1.25 — 사용자 「설정중 입력창이면 변경에 대한 견본도 같이」 · 이지 컴팩트 previewFrame 꼴): 옅은 회색 바탕 칸 안에
  // 이름표 칩 「미리보기 · 입력창 위」 + ?, 지금 입력창 위 줄(drawQuickRow — 같은 값 · 누름은 빈 동작), 아래 「입력창」 자리
  const previewRow = (): unknown[] => {
    const p = v.quickPreview
    if (!p) return []
    return [
      <Box key="es-set-pv" flexDirection="column" rowGap={0.5} borderStyle="round" borderColor={PREVIEW_WELL} backgroundColor={PREVIEW_WELL} paddingX={0.75} paddingY={0.4} marginBottom={0.4} minWidth={0}>
        <Box key="es-set-pv-label" columnGap={0.5} alignItems="center" alignSelf="flex-start">
          <Box key="es-set-pv-chip" borderStyle="round" borderColor="background" backgroundColor="background" paddingX={1} paddingY={0} flexShrink={0}>
            <Text color="suggestion">미리보기 · 입력창 위</Text>
          </Box>
          {pressBox(ui, 'es-help-pv', { content: [mark(ui, 'help', '도움말', SUB_LOOK)], cover: 2, onPress: () => acts.fold('help:pv'), tip: PV_HELP.tip })}
        </Box>
        {folds.has('help:pv') ? (
          <Box key="es-hw-pv" flexDirection="column">
            {PV_HELP.lines.map((line, i) => (
              <Text key={`es-hw-pv${i}`} color="subtle">
                {line}
              </Text>
            ))}
          </Box>
        ) : null}
        {drawQuickRow(ui, p.q, previewOf(p.acts))}
        <Box key="es-set-pv-input" borderStyle="round" borderColor="promptBorder" paddingX={1} justifyContent="center">
          <Text color="subtle">입력창</Text>
        </Box>
      </Box>,
    ]
  }

  // 노트: panel.md#settings — [설정] 쪽(0.1.25 — 사용자 11-16 「이지 컴팩트 참고」 · 세부 넷 카드 「확정」): 묶음 머리(그림 + 굵은 이름)는 카드 밖, 안 내용은 카드 하나 —
  // 「각 안쪽 내용이 그쪽 옵션이라고 구분이되어야됨」. 줄 = 이름 · ?(마우스 올림 한 줄 · 누르면 줄 아래 펼침) · 부품은 줄 오른쪽 끝, 줄 사이 가는 선
  const setRow = (name: string, key: string, label: string, control: unknown, help?: Help): unknown[] => [
    <Box key={key} columnGap={0.5} alignItems="center" minWidth={0} paddingY={0.15}>
      <Box flexShrink={1} minWidth={0}>
        <Text wrap="truncate-end">{label}</Text>
      </Box>
      {help ? pressBox(ui, `es-help-${name}`, { content: [mark(ui, 'help', '도움말', SUB_LOOK)], cover: 2, onPress: () => acts.fold(`help:${name}`), tip: help.tip }) : null}
      <Box flexGrow={1} />
      {control}
    </Box>,
    help && folds.has(`help:${name}`) ? (
      <Box key={`es-hw-${name}`} flexDirection="column" rowGap={0.2} marginBottom={0.3}>
        {help.lines.map((line, i) => (
          <Text key={`es-hw-${name}${i}`} color="subtle">
            {line}
          </Text>
        ))}
      </Box>
    ) : null,
  ]
  /** 줄 묶음 사이 가는 선 — el = 선 key 꼬리 */
  const withLines = (el: string, list: unknown[][]): unknown[] => list.flatMap((r, i) => [i > 0 ? rline(`es-set-l-${el}${i}`) : null, ...r])
  // 노트: panel.md#settings — 묶음 = 머리(카드 밖) + 카드(안 내용). 묶음 사이 여백은 이지 컴팩트 appSection 값(약 40px — 그림 도구로 잼)
  const setGroup = (key: string, name: string, icon: QuickIcon, label: string, body: unknown[], help?: Help) => (
    <Box key={key} flexDirection="column" marginTop={key === 'es-set-quick' ? 0 : SET_GAP}>
      {head(name, icon, label, help ? { help } : {})}
      {card(`${key}-card`, body)}
    </Box>
  )
  const sub = (key: string, text: string, isFirst = false) => (
    <Box key={key} marginTop={isFirst ? 0 : 0.6} marginBottom={0.1}>
      <Text color="subtle" size="footnote">
        {text}
      </Text>
    </Box>
  )
  // 노트: panel.md#quickRowSet — 「입력창 위 줄에 둘 것」: 줄에 있는 다섯(칸) · 명령 다섯(명령) 두 덩이, 줄마다 이름 · 스위치(오른쪽 끝). 카드 맨 위는 입력창 위 줄 미리보기(previewRow)
  const quickRow = (it: (typeof QUICK_ITEMS)[number]) =>
    setRow(`q-${it.key}`, `es-set-q-${it.key}`, it.label, onOff(ui, `${QUICK_SWITCH}${it.key}`, v.settings.quick.has(it.key), on => acts.pickQuick(it.key, on)))
  const quickBody = (): unknown[] => [
    ...previewRow(),
    sub('es-set-sub-cells', '칸', true),
    ...withLines('c', QUICK_ITEMS.slice(0, 5).map(quickRow)),
    sub('es-set-sub-cmds', '명령'),
    ...withLines('m', QUICK_ITEMS.slice(5).map(quickRow)),
  ]
  // 노트: panel.md#settings — advisor 는 위 줄에서 끄면 바꿀 곳이 없어 여기에도(0.1.4). 답하는 중엔 위 줄처럼 누를 수 없는 칸 · fable 은 주황 테두리
  const advisorPick = () => {
    const a = v.settings.advisor
    if (v.settings.isWorking) return lockedPick(ui, 'es-set-advisor-lock', '', a.value, a.value === 'fable')
    const pick = <Select key="es-set-advisor" value={a.value} options={a.options} onSelect={(x: string) => acts.pickAdvisor(x)} />
    return a.value === 'fable' ? (
      <Box key="es-set-advisor-warn" borderStyle="round" borderColor="warning">
        {pick}
      </Box>
    ) : (
      pick
    )
  }
  const sw = (key: string, isOn: boolean, onSet: (on: boolean) => void) => onOff(ui, key, isOn, onSet)
  // 노트: panel.md#leftovers — 「정리」 카드의 남은 자료(0.1.6 시안 proposal15 → 0.1.25 [전체]에서 옮김): 이름 · ? · 오른쪽 [휴지통으로](세는 중 · 옮기는 중 · 없음은 그 자리 글),
  // 아래 ▸ 수 · 크기 줄을 누르면 목록(큰 것 셋 · 그 밖 · 뺀 것), [휴지통으로]는 바로 아래 묻는 카드(채운 [휴지통으로] · 글만 [취소])
  const leftovers = (): unknown[] => {
    const c = v.clean
    const items = c?.items ?? []
    const busy = c?.moving ? '옮기는 중…' : !c || c.running ? '세는 중…' : null
    const right = busy ? (
      <Text color="subtle" size="footnote">
        {busy}
      </Text>
    ) : items.length > 0 ? (
      <Button key="es-left-trash" plain dimColor label="휴지통으로" onPress={() => acts.ask(pu.ask === 'trash' ? null : 'trash')} />
    ) : (
      <Text color="subtle" size="footnote">
        {c?.error ? '못 셈' : '옮길 것 없음'}
      </Text>
    )
    const top = setRow('left', 'es-set-left', '남은 자료', right, LEFT_HELP)
    if (!c || (items.length === 0 && !c.moving)) return top
    const isOpen = folds.has('clean-list')
    const big = items.slice(0, 3)
    const rest = items.slice(3)
    const restBytes = rest.reduce((a, x) => a + x.bytes, 0)
    return [
      ...top,
      <Box key="es-left" flexDirection="column" minWidth={0}>
        <Box columnGap={0.5} alignItems="center" minWidth={0}>
          {pressBox(ui, 'es-left-fold', {
            content: [mark(ui, isOpen ? 'down' : 'right', isOpen ? '접기' : '펼치기', SUB_LOOK), <Text wrap="truncate-end">{`보관한 세션 스크래치 ${items.length}개 · ${sizeText(c.bytes)}`}</Text>],
            cover: Math.min(cols - 16, 34),
            onPress: () => acts.fold('clean-list'),
            grow: true,
          })}
        </Box>
        {isOpen ? (
          <Box key="es-left-list" flexDirection="column" marginLeft={1.5} marginTop={0.3}>
            {big.map((x, i) => (
              <Box key={`es-left-${i}`} columnGap={0.5} alignItems="center" minWidth={0}>
                <Box flexGrow={1} flexShrink={1} minWidth={0}>
                  <Text wrap="truncate-end">{bareTitle(x.title)}</Text>
                </Box>
                <Text color="subtle" size="footnote">{`${sizeText(x.bytes)} · ${x.days === 0 ? '오늘' : `${x.days}일`}`}</Text>
              </Box>
            ))}
            {rest.length > 0 ? <Text color="subtle">{`그 밖 ${rest.length}개 · ${sizeText(restBytes)}`}</Text> : null}
            {c.keepLive + c.keepRef > 0 ? <Text color="subtle">{`뺀 것: 살아 있는 세션 ${c.keepLive}개 · md 가 가리키는 ${c.keepRef}개`}</Text> : null}
          </Box>
        ) : null}
        {pu.ask === 'trash' && !busy ? (
          <Box key="es-ask-trash" flexDirection="column" marginTop={0.4}>
            <Text>{`보관한 세션의 남은 자료 ${items.length}개(${sizeText(c.bytes)})를 휴지통으로 옮길까요? 휴지통에서 되돌릴 수 있습니다.`}</Text>
            <Box columnGap={1} alignItems="center" marginTop={0.3}>
              <Button
                key="es-ask-trash-ok"
                variant="secondary"
                label="휴지통으로"
                onPress={() => {
                  acts.ask(null)
                  void acts.cleanMove()
                }}
              />
              <Button key="es-ask-trash-no" plain dimColor label="취소" onPress={() => acts.ask(null)} />
            </Box>
          </Box>
        ) : null}
      </Box>,
    ]
  }
  // 노트: panel.md#settings — 묶음 차례: 입력창 위 줄에 둘 것 · 화면 · advisor · 새 자식 세션(스위치 넷 → 자식 보고 드롭다운) · 메시지 · 정리(0.1.25)
  const settingsView = () => (
    <Box key="es-setview" flexDirection="column">
      {setGroup('es-set-quick', 'quick', 'bar', '입력창 위 줄에 둘 것', quickBody(), QUICK_HELP)}
      {setGroup(
        'es-set-reply',
        'reply',
        'adjust',
        '화면 · advisor',
        withLines('r', [
          setRow(
            'display',
            'es-set-display-row',
            '화면',
            <Select key="es-set-display" value={v.settings.display.value} options={v.settings.display.options} onSelect={(x: string) => acts.pickDisplay(x)} />,
            SET_HELP.display,
          ),
          setRow('advisor', 'es-set-advisor-row', 'advisor', advisorPick(), SET_HELP.advisor),
        ]),
      )}
      {setGroup(
        'es-set-kids',
        'kids-set',
        'branch',
        '새 자식 세션',
        withLines('k', [
          setRow('autopin', 'es-set-autopin', '저절로 고정', sw(AUTO_SWITCH.pin, v.settings.autoPin, on => acts.pickAutoPin(on)), SET_HELP.autoPin),
          setRow('autounpin', 'es-set-autounpin', '끝나면 고정 풀기', sw(AUTO_SWITCH.unpin, v.settings.autoUnpin, on => acts.pickAutoUnpin(on)), SET_HELP.autoUnpin),
          setRow('autogroup', 'es-set-autogroup', '사이드바 그룹으로 묶기', sw(AUTO_SWITCH.group, v.settings.autoGroup, on => acts.pickAutoGroup(on)), SET_HELP.autoGroup),
          setRow('autodetach', 'es-set-autodetach', '저절로 떼어 내기', sw(AUTO_SWITCH.detach, v.settings.autoDetach, on => acts.pickAutoDetach(on)), SET_HELP.autoDetach),
          setRow(
            'reports',
            'es-set-reports-row',
            '자식 보고',
            <Select key="es-set-reports" value={v.settings.reports.value} options={v.settings.reports.options} onSelect={(x: string) => acts.pickReports(x)} />,
            SET_HELP.reports,
          ),
        ]),
      )}
      {/* 노트: panel.md#peerRelSet — 「메시지」 묶음: 받는 글 관계 줄 스위치(0.1.20, 처음 값 꺼짐) */}
      {setGroup('es-set-msg', 'msg-set', 'message', '메시지', setRow('peerrel', 'es-set-peerrel', '보낸 세션 관계 알리기', sw(PEER_SWITCH, v.settings.peerRel, on => acts.pickPeerRel(on)), SET_HELP.peerRel))}
      {setGroup('es-set-clean', 'clean-set', 'trash', '정리', leftovers())}
    </Box>
  )

  // 0.1.25 에서 [전체]를 뺐다 — 옛 저장 값 'all' 도 첫 탭으로 그린다(노트 panel.md#segButton)
  const body = pu.view === 'settings' ? settingsView() : selfView()
  return (
    <Box key="es-panel" flexDirection="column">
      {segRow(ui, pu, acts)}
      {body}
    </Box>
  )
}

// 노트: panel.md#segButton — 맨 위 쪽 고르기 [세션 도구] [설정](0.1.25 — [전체]를 뺌 · 첫 탭 이름 사용자 11-16 「세션 도구」). 옛 저장 값 'all' 은 첫 탭
function segRow(ui: Ui, pu: PanelUi, acts: PanelActs) {
  const { Box } = ui
  const isSet = pu.view === 'settings'
  return (
    <Box key="es-seg" columnGap={1} alignItems="center" marginBottom={0.5}>
      {segButton(ui, 'es-view-self', '세션 도구', !isSet, () => acts.view('self'))}
      {segButton(ui, 'es-view-set', '설정', isSet, () => acts.view('settings'))}
    </Box>
  )
}

// 노트: panel.md#drawPanel — 크기 안전망의 마지막 꼴(register.md#sizeGuard): 쪽 고르기와 안내 한 줄만(넘친 채로 내면 쪽 고르기까지 사라진다)
export function drawPanelBare(ui: Ui, pu: PanelUi, acts: PanelActs, text: string) {
  const { Box, Text } = ui
  return (
    <Box key="es-panel" flexDirection="column">
      {segRow(ui, pu, acts)}
      <Text color="warning">{text}</Text>
    </Box>
  )
}

export type QuickView = { self: SessionMeta }

// 노트: panel.md#sendCell — 「전달」 드롭다운 값(그 밖은 세션 id)
export const SEND_NONE = 'none'
export const SEND_MAIN = 'main'
export const SEND_MISS = 'miss'

/** 입력창 위 「전달」 칸 — 노트 panel.md#sendCell. canText: null = ➤ 자리만 비움 · false = 흐림 · true = 누름 */
export type SendActs = Choice & {
  pick: (value: string) => void
  state: 'idle' | 'on' | 'bad'
  tip: string
  canText: boolean | null
  textOnly: () => Promise<void>
}

export type QuickActs = {
  /** 이 세션 고정 · 고정 풀기(앱 사이드바) */
  pin: () => Promise<void>
  /** 오른쪽 세션 패널 — 열려 있나 · 열고 닫기 */
  pane: { isShown: boolean; toggle: () => Promise<void> }
  /** 화면(모든 세션) — 노트 register.md#displayLine */
  display: Choice & { pick: (value: string) => void }
  /** ultrathink — 입력창 맨 앞에 넣고 빼기(이 세션 다음 글) — 노트 register.md#ultrathink */
  ultrathink: () => Promise<void>
  /** 입력창 글에 ultrathink 낱말이 있는가 — 단추 꼴(테두리 + 무지개 글) */
  ultraOn: boolean
  /** [설정]에서 켠 것(모든 세션) — 세션 패널 단추 말고는 켠 것만 그린다(0.1.4) — 노트 register.md#quickItems */
  items: ReadonlySet<QuickItem>
  /** 전달 — [설정]에서 끄면 null(입력창 위 줄에 안 그림) — 노트 panel.md#sendCell */
  send: SendActs | null
  /** /btw · /fork · /rewind — 입력창 맨 앞에 넣고 빼기 — 노트 register.md#slashFill */
  slash: (cmd: SlashCmd) => Promise<void>
  /** /recap — 바로 돌린다 — 노트 register.md#recap */
  recap: () => Promise<void>
  /** 내보내기 — 이 세션 대화를 zip 으로(앱 도구) */
  exportSession: () => Promise<void>
  /** advisor(모든 세션 설정) — fable 은 고르면 띠 안 확인 카드부터(`drawFableAsk`) — 노트 register.md#advisor. mark = 드롭다운 뒤 그림 · 횟수 */
  advisor: Choice & { pick: (value: string) => void; mark: AdvisorMark | null }
  /** 이 세션이 답하는 중 — 고르기(advisor · 화면)를 막는다(노트 panel.md#lockedPick) */
  isWorking: boolean
  /** [설정] 미리보기(0.1.25) — 고르기(advisor · 화면 · 전달)는 누를 수 없는 칸, 누름은 previewOf 가 빈 동작으로(노트 panel.md#settings) */
  isPreview?: boolean
}

// 노트: panel.md#quickIcons
const QUICK_ICON_HEX = '#898781'
const QUICK_ICON_PX = 14
const QUICK_ROW_PX = 16
const QUICK_ICONS = {
  send: '<path d="M10 14l11 -11"/><path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5"/>',
  panel: '<path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M15 4l0 16"/>',
  panelOpen:
    '<path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M15 4l0 16"/><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-3z" fill="currentColor" stroke="none"/>',
  pin: '<path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4"/><path d="M9 15l-4.5 4.5"/><path d="M14.5 4l5.5 5.5"/>',
  snowflake:
    '<path d="M10 4l2 1l2 -1"/><path d="M12 2v6.5l3 1.72"/><path d="M17.928 6.268l.134 2.232l1.866 1.232"/><path d="M20.66 7l-5.629 3.25l.01 3.458"/><path d="M19.928 14.268l-1.866 1.232l-.134 2.232"/><path d="M20.66 17l-5.629 -3.25l-2.99 1.738"/><path d="M14 20l-2 -1l-2 1"/><path d="M12 22v-6.5l-3 -1.72"/><path d="M6.072 17.732l-.134 -2.232l-1.866 -1.232"/><path d="M3.34 17l5.629 -3.25l-.01 -3.458"/><path d="M4.072 9.732l1.866 -1.232l.134 -2.232"/><path d="M3.34 7l5.629 3.25l2.99 -1.738"/>',
  // 오케 나무 판(10-31 고름 — Tabler crown · unlink)
  crown: '<path d="M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4z"/>',
  unlink:
    '<path d="M17 22v-2"/><path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .463"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.53 -.463"/><path d="M20 17h2"/><path d="M2 7h2"/><path d="M7 2v2"/>',
  // 패널 다시 짜기(0.1.5 — 사용자 11-04 「다 이대로」, Tabler 3.19.0 원본 경로): 칸 머리 · 카드 · 명령 칩 · ? · 펼침 · 열기 · ✓
  inbox: '<path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M4 13h3l3 3h4l3 -3h3"/>',
  message: '<path d="M8 9h8"/><path d="M8 13h6"/><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z"/>',
  ask: '<path d="M8 9h8"/><path d="M8 13h6"/><path d="M14 18h-1l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v4.5"/><path d="M19 22v.01"/><path d="M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483"/>',
  notebook: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-11a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1m3 0v18"/><path d="M13 8l2 0"/><path d="M13 12l2 0"/>',
  terminal: '<path d="M8 9l3 3l-3 3"/><path d="M13 15l3 0"/><path d="M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/>',
  settings:
    '<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
  sitemap:
    '<path d="M3 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/><path d="M15 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/><path d="M6 15v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1"/><path d="M12 9l0 3"/>',
  bar: '<path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"/><path d="M4 15l16 0"/>',
  adjust:
    '<path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M6 4v4"/><path d="M6 12v8"/><path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M12 4v10"/><path d="M12 18v2"/><path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M18 4v1"/><path d="M18 9v11"/>',
  branch:
    '<path d="M7 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M7 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M7 8l0 8"/><path d="M9 18h6a2 2 0 0 0 2 -2v-5"/><path d="M14 14l3 -3l3 3"/>',
  // ultrathink(0.1.7 — 사용자 11-04 「뇌」, 시안 proposal16 · Tabler 3.19.0 brain 원본 경로 — 0.1.5 의 bulb 를 갈음)
  brain:
    '<path d="M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8"/><path d="M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8"/><path d="M17.5 16a3.5 3.5 0 0 0 0 -7h-.5"/><path d="M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0"/><path d="M6.5 16a3.5 3.5 0 0 1 0 -7h.5"/><path d="M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10"/>',
  btw: '<path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1"/>',
  fork: '<path d="M12 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M7 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M7 8v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2 -2v-2"/><path d="M12 12l0 4"/>',
  rewind: '<path d="M9 14l-4 -4l4 -4"/><path d="M5 10h11a4 4 0 1 1 0 8h-1"/>',
  recap:
    '<path d="M13 5h8"/><path d="M13 9h5"/><path d="M13 15h8"/><path d="M13 19h5"/><path d="M3 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/><path d="M3 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/>',
  export: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/>',
  help: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 16v.01"/><path d="M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483"/>',
  go: '<path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/>',
  right: '<path d="M9 6l6 6l-6 6"/>',
  down: '<path d="M6 9l6 6l6 -6"/>',
  check: '<path d="M5 12l5 5l10 -10"/>',
  // 세션 정리(0.1.6 — 시안 proposal15 확정): 끝난 곁가지 · 남은 자료
  done: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 12l2 2l4 -4"/>',
  trash:
    '<path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>',
  // 도구판 칸 · 역할 표지(0.1.26 — 시안 5.1 「그림 고르기」 ★ = 칸마다 첫 후보, Tabler 원본 경로): 역할 · 인계 transfer · 하위 세션 clipboard-text · 단독 user ·
  // 안 되는 줄 circle-x. 다른 세션 message-question = 위 ask, 형제 세션 sitemap · 서브 git-branch(branch) · 명령 terminal-2(terminal)는 설치판 그림
  transfer: '<path d="M20 10h-16l5.5 -6"/><path d="M4 14h16l-5.5 6"/>',
  clipboard:
    '<path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"/><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/><path d="M9 12h6"/><path d="M9 16h6"/>',
  user: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>',
  circleX: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M10 10l4 4m0 -4l-4 4"/>',
} as const
type QuickIcon = keyof typeof QUICK_ICONS
type SvgEl = (props: { key?: string; source: string; alt: string; width?: number; height?: number }) => unknown

/** 그림 선 색 · 채움 · 크기 · 진하기(currentColor 를 흐리게) */
type IconLook = { hex?: string; fill?: boolean; px?: number; alpha?: number }
// 노트: panel.md#quickIcons
const PINNED_LOOK: IconLook = { hex: '#d83860', fill: true }
// 노트: panel.md#pinWhy — 고정 이유(0.1.6): 곁가지 고정만 빈 선 핀(같은 빨강 — 대비 어두운 3.21 ~ 3.90 · 밝은 3.86 ~ 4.40), 이유는 마우스 올림 글
const KID_PIN_LOOK: IconLook = { hex: '#d83860' }
const PIN_TIP = { owner: '고정 — 주인(인계 때 새 주인에게 옮김)', child: '고정 — 곁가지(끝나면 저절로 풂)', user: '고정 — 사람이 고정(손대지 않음)' } as const
function pinMark(ui: Ui, why: FamilyRow['pinWhy']) {
  return mark(ui, 'pin', PIN_TIP[why ?? 'user'], why === 'child' ? KID_PIN_LOOK : PINNED_LOOK)
}
// 노트: panel.md#quickIcons — 왕관은 시안 그대로 금빛(밝은 바탕에서도 보이게 한 단 짙게)
const CROWN_LOOK: IconLook = { hex: '#b8860b' }
// 노트: panel.md#roleChip — 역할 이름 · 표지(0.1.26 — 시안 5.1 ROLE): 메인 = 금빛 왕관 · 오케 = 흐린 왕관 · 서브 = 파란 가지 · 단독 = 흐린 사람.
// 파랑은 Svg 에 테마 키가 안 가서 두 테마 바탕에서 다 3:1 을 넘는 한 값(어두운 #1a1a19 약 4.6 · 밝은 #fcfcfb 약 3.9 — 셈)
export const ROLE_NAME: Record<SessionRole, string> = { main: '메인', orche: '오케', sub: '서브', solo: '단독' }
const ROLE_ICON: Record<SessionRole, QuickIcon> = { main: 'crown', orche: 'crown', sub: 'branch', solo: 'user' }
const ROLE_LOOK: Record<SessionRole, IconLook> = { main: CROWN_LOOK, orche: { hex: QUICK_ICON_HEX }, sub: { hex: '#3d85d8' }, solo: { hex: QUICK_ICON_HEX } }
function roleMark(ui: Ui, role: SessionRole) {
  return mark(ui, ROLE_ICON[role], ROLE_NAME[role], { ...ROLE_LOOK[role], px: QUICK_ROW_PX })
}
// 노트: panel.md#quickIcons — 입력창 위 그림 단추는 그 자리 글색 75%(앱이 Svg 뿌리에 글색을 넣는다 — 뿌리에 color 를 안 둔다)
const ROW_LOOK: IconLook = { hex: 'currentColor', px: QUICK_ROW_PX, alpha: 0.75 }
// 노트: panel.md#quickIcons — 패널 그림(0.1.5): 칸 머리 · 카드 · 칩은 글색 16px, 펼침 · ? · ✓ 는 표지 회색 16px,
// 「내 응답 필요」 주황은 Svg 에 테마 키가 안 가서 두 테마의 패널 · 카드 바탕에서 다 3:1 을 넘는 한 값(11-04 잼 — 어두운 5.05 · 4.62, 밝은 3.39 · 3.11)
const TEXT_LOOK: IconLook = { hex: 'currentColor', px: QUICK_ROW_PX }
const SUB_LOOK: IconLook = { px: QUICK_ROW_PX }
const WARN_LOOK: IconLook = { hex: '#c27902', px: QUICK_ROW_PX }
const CMD_ICONS: Record<(typeof SELF_CMDS)[number]['key'], QuickIcon> = { btw: 'btw', fork: 'fork', rewind: 'rewind', recap: 'recap', export: 'export' }

/** 입력을 기다리는 줄(보관 · 끝남 뺌) — 「지금」 줄 입력 필요 · 하위 줄 표지 */
const isWaiting = (r: FamilyRow) => r.status === 'blocked' && !r.isEnded && !r.isArchived
/** 끝난 줄 — 끝남 기록 또는 앱 상태 완료(줄 머리 ✓) */
const isDone = (r: FamilyRow) => r.isEnded || r.status === 'completed'
const fileName = (p: string) => p.replace(/\\/g, '/').split('/').at(-1) ?? p

function quickIconSvg(name: QuickIcon, look: IconLook = {}): string {
  const hex = look.hex ?? QUICK_ICON_HEX
  const px = look.px ?? QUICK_ICON_PX
  const alpha = look.alpha === undefined ? '' : ` stroke-opacity="${look.alpha}" fill-opacity="${look.alpha}"`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="${look.fill ? hex : 'none'}" stroke="${hex}"${alpha} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${QUICK_ICONS[name]}</svg>`
}

/** 누르지 않는 표지 그림(줄의 고정 · 식음 · 칸 머리) — Svg 가 없는 표면엔 안 그린다. 크기는 look.px(없으면 14px) */
function mark(ui: Ui, icon: QuickIcon, alt: string, look?: IconLook) {
  const Svg = (ui as unknown as { Svg?: SvgEl }).Svg
  const px = look?.px ?? QUICK_ICON_PX
  return Svg ? <Svg source={quickIconSvg(icon, look)} alt={alt} width={px} height={px} /> : null
}

/** pressBox 재료 — content = 겹쳐 누를 그림 · 글, cover = 덮개 빈칸 수(넘쳐도 안쪽 Box 가 자른다), grow = 줄 남은 폭을 채움, box = 안쪽 칸 꼴 */
type PressOpts = {
  content: unknown[]
  cover: number
  onPress: () => unknown
  tip?: string
  tipRight?: boolean
  /** 마우스 올림 줄을 칸 아래에(입력창 위 줄 — 그 위엔 그릴 자리가 없다) */
  tipDown?: boolean
  grow?: boolean
  /** 덮개 단추를 안 그린다 — [설정] 미리보기(0.1.25, 누를 것이 없다) */
  noCover?: boolean
  box?: { borderStyle?: string; borderColor?: string; paddingX?: number; paddingY?: number; marginLeft?: number; hover?: { backgroundColor?: string } }
}

// 노트: panel.md#pressBox — 그림 · 글 묶음 위에 투명 단추를 겹쳐 하나로 누른다(Button 안엔 Svg 가 못 들어간다 — 엔진). 누르는 단추 key = key.
// 덮개 폭을 셀 수 있는 칸(칩 · ? · 보기)은 keyed Box 한 겹(입력창 위 iconButton 꼴 — 덮개는 내림으로 칸 안에), 줄 남은 폭을 채우는 칸(grow — 요약 줄 ·
// 세션 관리 머리)만 안쪽 Box 가 넘침을 자른다(덮개가 옆 단추를 덮지 않게). 마우스 올림 줄은 바깥 keyed Box 몫(안쪽에서 자르면 같이 잘린다). 그리기 크기 — 0.1.5 재기
function pressBox(ui: Ui, key: string, o: PressOpts) {
  const { Box, Button, Text } = ui
  const cover = o.noCover ? null : (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} alignItems="stretch">
      <Button key={key} label={COVER.repeat(Math.max(1, Math.floor(o.cover)))} plain dimColor onPress={() => void o.onPress()} />
    </Box>
  )
  // 마우스 올림 줄은 칸 위(top -1) — absolute 는 앞에 그린 것 위에만 그려져(엔진 타입) 아래에 띄우면 다음 줄 · 칸에 가려진다(selfCmds 절 6.2.1판 까닭)
  const tip = o.tip ? (
    <Box position="absolute" top={o.tipDown ? 1 : -1} {...(o.tipRight ? { right: 0 } : { left: 0 })} display="none" hover={{ display: 'flex' }} backgroundColor="userMessageBackground" paddingX={1}>
      <Text wrap="truncate-end">{o.tip}</Text>
    </Box>
  ) : null
  if (!o.grow) {
    return (
      <Box key={`${key}-box`} columnGap={0.5} alignItems="center" flexShrink={0} {...o.box}>
        {o.content}
        {cover}
        {tip}
      </Box>
    )
  }
  return (
    <Box key={`${key}-box`} flexGrow={1} flexShrink={1} minWidth={0}>
      <Box columnGap={0.5} alignItems="center" overflow="hidden" flexGrow={1} minWidth={0} {...o.box}>
        {o.content}
        {cover}
      </Box>
      {tip}
    </Box>
  )
}

// 노트: panel.md#cover — 겹친 투명 단추를 칸 전체로(0.1.2 실측 고칠 것): 덮개 Box 를 위 · 아래 · 양옆 0 으로 펼치고(높이를 안 주면 그 사이를
// 채움 — 엔진 타입) 빈칸(U+2800) 수를 칸 안 폭에 맞춘다. 칸 한 칸 약 12px · 글자 한 칸 약 8.5px(README-engine 실측)
const COVER = '⠀'
// 노트: panel.md#cover — 폭 w 칸(1ch)짜리 자리에 넘치지 않게 드는 덮개 빈칸 수. 사용자 앱 값으로 다시 잼(0.1.21 뒤): 빈칸 한 글자 9.11px = 1.18칸 ·
// 1칸 7.71px · 글 단추 안 여백 6px 둘 = 1.56칸 → 덮개 폭(칸) = 1.18n + 1.56 ≤ w. 넘치면 단추가 글 끝에 「…」 을 그려 칸 끝에 비친다.
// 0.1.21 의 「9할 − 2」는 옛 값(빈칸 1.08칸)으로 맞춰 20칸 넘는 자리에서 넘쳤다. 옛 값 환경에서는 이 식이 덜 덮는 쪽이라 안 넘친다
const coverCells = (w: number): number => Math.max(1, Math.floor(w * 0.845 - 1.4))
/** 그림 단추 칸 안 폭 — 그림 16px + 안 여백 0.5칸 둘 */
const ICON_COVER = Math.ceil((QUICK_ROW_PX + 12) / 8.5)

// 노트: panel.md#iconButton — 늘 보이는 테두리 칸(테두리를 줘야 모서리가 둥글다) · 바탕은 마우스 올림 때만 · 그림 16px 글색 75%
function iconButton(ui: Ui, key: string, icon: QuickIcon, name: string, onPress: () => void | Promise<void>, look?: IconLook, isStill = false) {
  const { Box, Button, Text } = ui
  const Svg = (ui as unknown as { Svg?: SvgEl }).Svg
  if (!Svg) return <Button key={key} label={name} onPress={onPress} />
  return (
    <Box key={key} borderStyle="single" borderColor="promptBorder" paddingX={0.5} paddingY={0.4} marginLeft={ROW_LEAD} hover={{ backgroundColor: 'promptBorderShimmer' }}>
      <Svg source={quickIconSvg(icon, { ...ROW_LOOK, ...look })} alt={name} width={QUICK_ROW_PX} height={QUICK_ROW_PX} />
      {isStill ? null : (
        <Box position="absolute" top={0} left={0} right={0} bottom={0} alignItems="stretch">
          <Button key={`${key}-p`} label={COVER.repeat(ICON_COVER)} plain dimColor onPress={onPress} />
        </Box>
      )}
      <Box position="absolute" top={1} left={0} display="none" hover={{ display: 'flex' }} backgroundColor="userMessageBackground" paddingX={1}>
        <Text wrap="truncate-end">{name}</Text>
      </Box>
    </Box>
  )
}

// 노트: panel.md#paneButton — 세션 패널 단추(0.1.4 사용자 확정 A): 그림 16px 글색 100% + 글 「세션 패널」 · 테두리 subtle(앱 흐린 글 색 — 칸 경계
// 3:1 을 넘음, 옆 고정 칸은 20% 그대로). 늘 맨 앞 · 고를 것에 없음. 덮개는 그림 + 사이 + 글 + 안 여백 폭
const PANE_LABEL = '세션 패널'
const PANE_COVER = Math.ceil((QUICK_ROW_PX + 6 + 12) / 8.5 + textCh(PANE_LABEL))

function paneButton(ui: Ui, isShown: boolean, onPress: () => void | Promise<void>, isStill = false) {
  const { Box, Button, Text } = ui
  const Svg = (ui as unknown as { Svg?: SvgEl }).Svg
  const name = isShown ? '세션 패널 닫기' : '세션 패널 열기'
  if (!Svg) return <Button key="es-q-panel" label={PANE_LABEL} onPress={onPress} />
  return (
    <Box key="es-q-panel" borderStyle="single" borderColor="subtle" columnGap={0.5} alignItems="center" paddingX={0.5} paddingY={0.4} hover={{ backgroundColor: 'promptBorderShimmer' }}>
      <Svg source={quickIconSvg(isShown ? 'panelOpen' : 'panel', { hex: 'currentColor', px: QUICK_ROW_PX })} alt={name} width={QUICK_ROW_PX} height={QUICK_ROW_PX} />
      <Text>{PANE_LABEL}</Text>
      {isStill ? null : (
        <Box position="absolute" top={0} left={0} right={0} bottom={0} alignItems="stretch">
          <Button key="es-q-panel-p" label={COVER.repeat(PANE_COVER)} plain dimColor onPress={onPress} />
        </Box>
      )}
      <Box position="absolute" top={1} left={0} display="none" hover={{ display: 'flex' }} backgroundColor="userMessageBackground" paddingX={1}>
        <Text wrap="truncate-end">{name}</Text>
      </Box>
    </Box>
  )
}

// 노트: panel.md#onOff — 켜고 끄기: 데스크톱은 이지 컴팩트와 같은 스위치(Client switch.tsx — 누름은 register.tsx ui.message 로),
// Client 가 없는 표면은 켬 · 끔 드롭다운(확정안 I). module 은 이 파일 기준 글자 그대로(엔진이 소스에서 읽는다)

function onOff(ui: Ui, key: string, isOn: boolean, onSet: (on: boolean) => void) {
  if ('Client' in ui) return <ui.Client key={key} module="./switch.tsx" props={{ on: isOn, disabled: false }} width={5} height={1} />
  const { Select } = ui
  return <Select key={key} value={isOn ? 'on' : 'off'} options={ON_OFF} onSelect={(x: string) => onSet(x === 'on')} />
}

// 노트: panel.md#segButton
const SEG_ON_EDGE = 'rgba(128,128,128,0.5)'

// 노트: panel.md#segButton
function segButton(ui: Ui, key: string, label: string, isOn: boolean, onPress: () => void | Promise<void>) {
  const { Box, Button } = ui
  if (!isOn) return <Button key={key} label={label} plain dimColor onPress={onPress} />
  return (
    <Box key={`${key}-on`} borderStyle="round" borderColor={SEG_ON_EDGE} paddingX={0} paddingY={0}>
      <Button key={key} label={label} variant="secondary" onPress={onPress} />
    </Box>
  )
}

// 노트: panel.md#ultraChip — 엔진이 터미널 입력창에서 이 낱말에 칠하는 무지개 키(엔진 순서 그대로)
const ULTRA_WORD = 'ultrathink'
const RAINBOW = ['rainbow_red', 'rainbow_orange', 'rainbow_yellow', 'rainbow_green', 'rainbow_blue', 'rainbow_indigo', 'rainbow_violet'] as const

// 노트: panel.md#ultraChip — 마우스 올림 한 줄(0.1.7 — 입력창 위 줄 · 패널 칩 같은 글): 앞 마디는 앱 입력창 글
// 「Sending this word asks for deeper reasoning on this message」의 뜻, 뒤 둘은 하는 일
const ULTRA_TIP = '더 깊이 추론하게 함 · 입력창 맨 앞에 넣음 · 다시 누르면 뺌'

// 노트: panel.md#ultraChip — 낱말: 평소엔 또렷한 글, 입력창에 넣었으면 글자마다 무지개(0.1.7 부터 두 자리 같음 — 테두리는 늘 같다)
function ultraWord(ui: Ui, isOn: boolean) {
  const { Text } = ui
  if (!isOn) return <Text>{ULTRA_WORD}</Text>
  return (
    <Text>
      {[...ULTRA_WORD].map((ch, i) => (
        <Text key={`es-u${i}`} color={RAINBOW[i % RAINBOW.length]}>
          {ch}
        </Text>
      ))}
    </Text>
  )
}

// 노트: panel.md#drawQuickRow — 입력창 위 줄 칸 사이(0.1.7): 줄 간격 0.5칸 + 칸마다 앞 여백 0.5칸 = 1칸(0.1.6 까지와 같음).
// advisor 묶음만 앞 여백을 1칸으로(1.5칸 띄움), 그 뒤 숫자는 앞 여백 없이 0.5칸으로 붙인다
const ROW_LEAD = 0.5

// 노트: panel.md#ultraChip — 입력창 위 줄 칩(0.1.7 — 사용자 11-04 「맞춤」, 시안 proposal16): 패널 명령 칩과 같은 꼴(그림 16px 글색 +
// 이름 · 20% 테두리 · 바탕은 마우스 올림 때만). 높이는 옆 세션 패널 · 고정 칸과 같게 안 여백 위아래 0.4, 마우스 올림 줄은 칸 아래
function rowChip(ui: Ui, key: string, icon: QuickIcon, label: string, onPress: () => unknown, tip: string, word?: unknown, isStill = false) {
  const { Button, Text } = ui
  if (!(ui as unknown as { Svg?: SvgEl }).Svg) return <Button key={key} label={label} onPress={() => void onPress()} />
  return pressBox(ui, key, {
    content: [mark(ui, icon, label, TEXT_LOOK), word ?? <Text>{label}</Text>],
    cover: Math.ceil((QUICK_ROW_PX + 6 + 12) / 8.5 + textCh(label)),
    onPress,
    tip,
    tipDown: true,
    noCover: isStill,
    box: { borderStyle: 'single', borderColor: 'promptBorder', paddingX: 0.5, paddingY: 0.4, marginLeft: ROW_LEAD, hover: { backgroundColor: 'promptBorderShimmer' } },
  })
}

type CharSvgEl = (props: { source: string; alt: string; width: number; height: number; isInteractive?: true }) => unknown

// 노트: panel.md#advisorChar — advisor 묶음 맨 앞 그림(0.1.7 — 「그림 + 이름 + 값」 꼴, 사용자 11-04 「A 붙여 묶음」). 누르지 않는 표지 — 이름은 마우스 올림
function advisorFigure(ui: Ui, key: string, m: AdvisorMark) {
  const { Box, Text } = ui
  const Svg = (ui as unknown as { Svg?: CharSvgEl }).Svg
  if (!Svg) return null
  return (
    <Box key={key} alignItems="center" flexShrink={0}>
      <Svg
        source={advisorCharSvg(QUICK_ROW_PX, m.pose, m.isMoving)}
        alt={m.tip}
        width={advisorCharWidth(QUICK_ROW_PX, m.pose)}
        height={QUICK_ROW_PX}
        {...(m.isMoving ? { isInteractive: true as const } : {})}
      />
      <Box position="absolute" top={1} left={0} display="none" hover={{ display: 'flex' }} backgroundColor="userMessageBackground" paddingX={1}>
        <Text wrap="truncate-end">{m.tip}</Text>
      </Box>
    </Box>
  )
}

/** 드롭다운 뒤 숫자 글 「N번 · $X」 — 무엇의 값인지는 바로 앞 「advisor」가, 이 세션 몫인 것은 띠 자리가 말한다(0.1.7 뒤 사용자 「이 세션」 뺌 — 노트 panel.md#advisorChar) */
export const advisorCountText = (m: Pick<AdvisorMark, 'count' | 'usd'>) => `${m.count}번${m.usd !== null ? ` · $${m.usd.toFixed(2)}` : ''}`

// 노트: panel.md#advisorChar — 드롭다운 뒤 숫자(0.1.7): 띠의 따로 선 칸이라 좁은 창에선 이것만 먼저 다음 줄로 간다(드롭다운은 첫 줄에). 이름은 마우스 올림
function advisorCount(ui: Ui, key: string, m: AdvisorMark) {
  const { Box, Text } = ui
  return (
    <Box key={key} alignItems="center" flexShrink={0}>
      <Text color="subtle">{advisorCountText(m)}</Text>
      <Box position="absolute" top={1} left={0} display="none" hover={{ display: 'flex' }} backgroundColor="userMessageBackground" paddingX={1}>
        <Text wrap="truncate-end">{m.tip}</Text>
      </Box>
    </Box>
  )
}

// 노트: panel.md#lockedPick — 답하는 중 고르기 자리: 드롭다운 대신 누를 수 없는 칸(Select 엔 못 고름 속성이 없다)
const LOCKED_TIP = '답이 끝난 뒤 바꿀 수 있습니다'

// 노트: panel.md#lockedPick
function lockedPick(ui: Ui, key: string, label: string, value: string, isWarn = false) {
  const { Box, Text } = ui
  return (
    <Box key={key} columnGap={1} alignItems="center">
      <Text color="subtle">{label}</Text>
      <Box key={`${key}-v`} borderStyle="single" borderColor="promptBorderShimmer" paddingX={0.75} paddingY={0}>
        <Text {...(isWarn ? { color: 'warning' } : { dimColor: true })}>{value}</Text>
      </Box>
    </Box>
  )
}

/** 마우스를 올리면 아래에 한 줄 설명(입력창 위 줄 · 왼쪽부터 놓인 것) */
function withTip(ui: Ui, key: string, child: unknown, tip: string) {
  const { Box, Text } = ui
  return (
    <Box key={key}>
      {child}
      <Box position="absolute" top={1} left={0} display="none" hover={{ display: 'flex' }} backgroundColor="userMessageBackground" paddingX={1}>
        <Text wrap="truncate-end">{tip}</Text>
      </Box>
    </Box>
  )
}

// 노트: panel.md#drawQuickRow — 명령 마우스 올림 글: 넣는 셋은 「… · 다시 누르면 뺌」, 누르면 바로 도는 /recap · 내보내기는 앞에 「바로」(0.1.4)
const cmdTip = (c: (typeof SELF_CMDS)[number]) => (c.key === 'recap' || c.key === 'export' ? `바로 ${c.what}` : `${c.what} · 다시 누르면 뺌`)

const SEND_LABEL = '전달'
/** 값 칸 · ➤ 자리 폭(칸) · 값 글 자리(px) — 값이 바뀌어도, 고르는 순간에도 옆이 안 움직이게. 노트 panel.md#sendCell */
const SEND_VALUE_W = 15.4
const SEND_SLOT_W = 2.5
const SEND_VALUE_PX = 78
const PAD_PX = 8.46
const labelPx = (s: string): number => [...s].reduce((n, c) => n + (c === ' ' ? 3.5 : c.charCodeAt(0) > 0x2e80 ? 13 : 7), 0)

// 노트: panel.md#sendCell — 값 칸 폭은 고정이고 그보다 긴 글은 앱이 …로 줄인다. 짧은 글만 빈칸(U+2800)으로 채워 칸 모양을 맞춘다 — 넘치면 빈칸 뒤에 …가 붙으니 내림
export function sendPad(label: string): string {
  return label + COVER.repeat(Math.max(0, Math.floor((SEND_VALUE_PX - labelPx(label)) / PAD_PX)))
}

// 노트: panel.md#sendCell — 입력창 위 「전달」(0.1.17 — 사용자 「분잡고 보기 힘듬」 · 「좌측에 같이 붙어있어서」, 시안 카드 「확정 · ➤ 단추 둠」). 어느 상태든 같은 자리 · 같은 폭, 테두리 색만 바뀐다.
// 0.1.19: 앱은 고르는 순간 목록 글을 값 칸에 바로 넣는다 — 칸이 글 폭대로 늘면 띠가 두 줄이 됐다 돌아온다. 앞글을 칸 밖 글로 빼고 값 칸 폭을 고정한다
function sendCell(ui: Ui, s: SendActs) {
  const { Box, Text, Select } = ui
  return (
    <Box key="es-q-send-row" columnGap={0.5} alignItems="center" flexShrink={0} marginLeft={ROW_LEAD}>
      <Box key="es-q-send-box" columnGap={0.5} flexShrink={0} alignItems="center" borderStyle="single" borderColor={s.state === 'on' ? 'suggestion' : s.state === 'bad' ? 'warning' : 'rgba(0,0,0,0)'} paddingX={0.5} paddingY={0.1}>
        <Box key="es-q-send-cap" flexShrink={0}>
          <Text color="subtle">{SEND_LABEL}</Text>
        </Box>
        <Box key="es-q-send-val" width={SEND_VALUE_W} flexShrink={0} alignItems="center">
          <Select key="es-q-send" value={s.value} options={s.options} onSelect={v => s.pick(v)} />
        </Box>
        <Box position="absolute" top={1} right={0} display="none" hover={{ display: 'flex' }} backgroundColor="userMessageBackground" paddingX={1}>
          <Text wrap="truncate-end">{s.tip}</Text>
        </Box>
      </Box>
      <Box key="es-q-send-slot" width={SEND_SLOT_W} alignItems="center" flexShrink={0}>
        {s.canText === true
          ? pressBox(ui, 'es-q-send-text', {
              content: [mark(ui, 'send', '입력 글만 바로 보내기', TEXT_LOOK)],
              cover: 3,
              onPress: s.textOnly,
              tip: '입력 글만 바로 보냅니다 · Claude 는 답하지 않습니다',
              tipDown: true,
              tipRight: true,
              box: { borderStyle: 'single', borderColor: 'promptBorder', paddingX: 0.25, paddingY: 0.25, hover: { backgroundColor: 'promptBorderShimmer' } },
            })
          : null}
        {s.canText === false ? (
          <Box key="es-q-send-text-d" borderStyle="single" borderColor="promptBorderShimmer" paddingX={0.25} paddingY={0.25}>
            {mark(ui, 'send', '보낼 글이 없습니다', { px: QUICK_ROW_PX, alpha: 0.5 })}
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

// 노트: panel.md#drawQuickRow — 입력창 위 한 줄(세션 패널 · 고정 · ultrathink · 명령 · advisor 묶음 + 숫자 · 전달 · 화면). 0.1.4 부터 세션 패널 말고는 [설정]에서 켠 것만.
// 0.1.7: ultrathink · 명령은 패널 칩과 같은 칩(`rowChip`), advisor 는 그림 · 드롭다운 한 묶음 + 뒤에 붙인 숫자
export function drawQuickRow(ui: Ui, q: QuickView, acts: QuickActs) {
  const { Box, Text, Select } = ui
  const has = (item: QuickItem) => acts.items.has(item)
  const advisor = (
    <Select key="es-q-advisor" label="advisor" value={acts.advisor.value} options={acts.advisor.options} onSelect={v => acts.advisor.pick(v)} />
  )
  const cmdPress = (key: (typeof SELF_CMDS)[number]['key']) => (key === 'recap' ? acts.recap() : key === 'export' ? acts.exportSession() : acts.slash(key))
  const mk = acts.advisor.mark
  // 노트: panel.md#advisorChar — advisor 칸(0.1.9 — 사용자 11-04 「여기도 묶던가 해줘」): 그림 · 드롭다운 · 숫자를 한 테두리 칸에, fable 이면 그 칸이 주황 둥근 테두리
  const isFable = acts.advisor.value === 'fable' && !acts.isWorking
  // 미리보기(0.1.25)는 답하는 중과 같은 누를 수 없는 칸 — 엔진 드롭다운엔 막는 속성이 없고, 고르면 다시 그릴 때까지 고른 값이 남는다
  const isLocked = acts.isWorking || acts.isPreview === true
  // 미리보기엔 덮개 단추가 없다 — 누를 것이 없고, 띠 크기에 맞춘 덮개가 패널 글꼴에선 칩보다 넓다(그림 도구로 잼)
  const isStill = acts.isPreview === true
  const lockTip = (what: string) => (acts.isPreview ? `미리보기 — 아래 「${what}」에서 바꿉니다` : LOCKED_TIP)
  return (
    <Box key="es-quick" columnGap={ROW_LEAD} rowGap={0.5} alignItems="center" flexWrap="wrap">
      {paneButton(ui, acts.pane.isShown, acts.pane.toggle, isStill)}
      {has('pin') ? iconButton(ui, 'es-q-pin', 'pin', q.self.isStarred ? '고정 풀기' : '고정', acts.pin, q.self.isStarred ? { ...PINNED_LOOK, alpha: undefined } : undefined, isStill) : null}
      {has('ultra') ? rowChip(ui, 'es-q-ultra', 'brain', ULTRA_WORD, acts.ultrathink, ULTRA_TIP, ultraWord(ui, acts.ultraOn), isStill) : null}
      {SELF_CMDS.filter(c => has(c.key)).map(c => rowChip(ui, `es-q-${c.key}`, CMD_ICONS[c.key], c.label, () => cmdPress(c.key), cmdTip(c), undefined, isStill))}
      {has('advisor') ? (
        <Box
          key="es-q-adv"
          columnGap={0.5}
          alignItems="center"
          flexShrink={0}
          marginLeft={2 * ROW_LEAD}
          borderStyle={isFable ? 'round' : 'single'}
          borderColor={isFable ? 'warning' : 'promptBorder'}
          paddingX={0.5}
          paddingY={0.1}
        >
          {mk ? advisorFigure(ui, 'es-q-adv-mark', mk) : null}
          {withTip(
            ui,
            'es-q-advisor-box',
            isLocked ? lockedPick(ui, 'es-q-advisor-lock', 'advisor', acts.advisor.value, acts.advisor.value === 'fable') : advisor,
            isLocked ? lockTip('advisor') : '모든 세션에 걸리는 설정입니다',
          )}
          {mk && mk.count > 0 ? advisorCount(ui, 'es-q-adv-count', mk) : null}
        </Box>
      ) : null}
      {has('display') || acts.send ? <Box key="es-q-gap" flexGrow={1} /> : null}
      {acts.send ? (acts.isPreview ? lockedPick(ui, 'es-q-send-lock', SEND_LABEL, acts.send.options.find(o => o.value === acts.send?.value)?.label.trim() ?? '없음') : sendCell(ui, acts.send)) : null}
      {has('display') ? (
        <Box key="es-display-box" marginLeft={ROW_LEAD}>
          {isLocked ? (
            lockedPick(ui, 'es-display-lock', '화면', acts.display.options.find(o => o.value === acts.display.value)?.label ?? acts.display.value)
          ) : (
            <Select key="es-display" label="화면" value={acts.display.value} options={acts.display.options} onSelect={v => acts.display.pick(v)} />
          )}
          <Box position="absolute" top={1} right={0} display="none" hover={{ display: 'flex' }} backgroundColor="userMessageBackground" paddingX={1}>
            <Text wrap="truncate-end">{isLocked ? lockTip('화면') : '모든 세션의 Claude 답을 고른 기기에 맞춥니다'}</Text>
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}

// 노트: panel.md#settings — [설정] 미리보기용 손잡이(0.1.25): 입력창 위 줄과 같은 값에 누름 열 개(고정 · 세션 패널 · ultrathink · 명령 · /recap · 내보내기 ·
// advisor · 화면 · 전달 고르기 · 글만 보내기)를 빈 동작으로 — 미리보기에서 눌러도 아무 일도 안 한다(시험 panel.test 「미리보기」)
const NOOP = async (): Promise<void> => {}
export function previewOf(a: QuickActs): QuickActs {
  return {
    ...a,
    isPreview: true,
    pin: NOOP,
    pane: { isShown: a.pane.isShown, toggle: NOOP },
    ultrathink: NOOP,
    slash: NOOP,
    recap: NOOP,
    exportSession: NOOP,
    display: { ...a.display, pick: () => {} },
    advisor: { ...a.advisor, pick: () => {} },
    send: a.send ? { ...a.send, pick: () => {}, textOnly: NOOP } : null,
  }
}

// 노트: panel.md#drawFableAsk
const FABLE_TITLE = 'advisor 를 fable 로 켤까요?'
const FABLE_LEAD = '모든 세션의 기본값이 fable 로 바뀝니다. advisor 가 이미 켜진 대화는 /clear · /compact 전까지 지금 모델 그대로입니다. 불릴 때마다 Fable 5.1 이 돌아 같은 양이면 '
const FABLE_COST: Record<PlanKind | 'unknown', string> = {
  sub: '5시간 사용량을 Opus 5.5 의 약 4.5배로 씁니다.',
  rate: '요금이 Opus 5.5 의 2.5배 듭니다(정가 100만 토큰당 입력 $10 · 출력 $50).',
  unknown: '구독은 5시간 사용량을 Opus 5.5 의 약 4.5배로 쓰고, API 요금으로 쓰면 요금이 2.5배 듭니다.',
}

/** fable 확인 카드에서 누르는 것 — 켜기 · 닫기 */
export type FableActs = { confirm: () => Promise<void>; dismiss: () => Promise<void> }

// 노트: panel.md#drawFableAsk — advisor 를 fable 로 고르면 빠른 줄 아래 확인 카드(시안 proposal10 A 띠 카드)
export function drawFableAsk(ui: Ui, plan: PlanKind | null, acts: FableActs) {
  const { Box, Text, Button } = ui
  return (
    <Box key="es-fable" flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1}>
      <Box key="es-fable-head" columnGap={1} alignItems="center">
        <Box key="es-fable-title" flexGrow={1}>
          <Text bold>{FABLE_TITLE}</Text>
        </Box>
        <Button key="es-fable-x" variant="secondary" dimColor label="✕" onPress={acts.dismiss} />
      </Box>
      <Box key="es-fable-body">
        <Text>{`${FABLE_LEAD}${FABLE_COST[plan ?? 'unknown']}`}</Text>
      </Box>
      <Box key="es-fable-btns" justifyContent="flex-end">
        <Button key="es-fable-on" variant="primary" label="켜기" onPress={acts.confirm} />
      </Box>
    </Box>
  )
}
