/**
 * 데스크톱 세션 패널(컨셉 A 줄 펼침 · 세로 선)과 입력창 위 한 줄 — 6판 꼴(uxi 확정안 A ~ I).
 * `$` 를 쓰지 않는다: 누름은 register.tsx 가 넘기는 acts 로 간다. 노트: docs/notes/panel.md
 */
import type { EngineInterface } from 'claude-code'

import type { AdvisorCall, ChangeGroup, CleanScan, EndedKid, Family, FamilyRow, HeldReport, MatchAsk, OpenRow, PanelUi, PlanKind, PreAsk, SentRow, SentState, SessionMeta, UpdateState } from '../types'
import { advisorCharSvg, advisorCharWidth } from './advisor-char'
import type { AdvisorPose } from './advisor-char'
import { agoText, heldKey, modeName, stampText, statusText, topicMark, whenText, withIra } from './meta'
import type { SessionRole } from './meta'
import { L, lang, plural } from './i18n'
import { fitCells, textCh } from './tree'

type Ui = ReturnType<EngineInterface['ui']['resolve']>

/** advisor 그림 — advisor 가 켜졌을 때만(꺼짐이면 null). usd = 이지 컴팩트 공용 파일의 금액(없으면 null — 횟수만). 노트 panel.md#advisorChar */
export type AdvisorMark = { pose: AdvisorPose; count: number; usd: number | null; tip: string; isMoving: boolean }

/**
 * 「이 세션」 advisor 칸(0.1.13) — count 는 입력창 위 advisor 칸과 같은 값, tip 은 머리 마우스 올림 글(금액은 이지 컴팩트 값이 있을 때만),
 * calls = 기록에서 읽은 호출(아직 못 읽었으면 null), error = 못 읽은 까닭, isFresh = 다시 읽을 일이 안 남음. 노트 panel.md#advisorFold
 */
export type AdvisorLog = { count: number; tip: string; calls: readonly AdvisorCall[] | null; error: string | null; isFresh: boolean }

const wakeUsd = (k: number): number => ((k - 45) * 8 + 45 * 0.2) / 1000
const compactUsd = (k: number): number => ((k - 45) * 4 + 45 * 0.2 + 12 * 20 + 15 * 0.2) / 1000
const nextUsd = (k: number): number => (k * 0.2) / 1000
const AFTER_NEXT = (60 * 0.2) / 1000
const money = (v: number): string => `$${v.toFixed(2)}`

/** 받는 세션 컨텍스트(천 토큰)로 컴팩트하고 보내는 쪽이 싼가 — 깨우는 값 카드를 띄울지 */
export function compactWins(k: number | undefined): boolean {
  return k !== undefined && compactUsd(k) < wakeUsd(k)
}

// 0.1.4 부터 「요청 한 번」을 앞에 밝힌다
export function acceptCost(tokens: number, isCold: boolean): string {
  const k = tokens / 1000
  const usd = isCold ? (Math.max(0, k - 45) * 8 + Math.min(k, 45) * 0.2) / 1000 : nextUsd(k)
  return L(`요청 한 번 ${(tokens / 10_000).toFixed(1).replace(/\.0$/, '')}만 토큰 · ${money(usd)}`, `1 request · ${tokenText(tokens)} tokens · ${money(usd)}`)
}

/** 「위 세션」 · 「다른 세션」 칸 보낼 곳 줄에서 연 보낼 칸의 `PanelUi.sending` 앞머리 — 같은 세션 줄이 다른 칸에도 있어 칸이 겹쳐 그려지지 않게. 세션 id 는 늘 `local_` 로 시작해 겹치지 않는다 */
export const COMPOSE_AT = 'to:'
/** 보낼 곳 줄 하나 — tag = 이 세션과의 관계(메인 · 연 세션 · 주인) */
export type SendRow = { id: string; tag: string; title: string }

/** 도구판 칸 열쇠(0.1.26 — 시안 5.1 · 0.1.27 시안 6판 차례): 이 세션(명령 · 어드바이저 · 고정 · 보관) · 세션 메시지(위 세션 · 형제 세션 · 다른 세션) · 관리(하위 세션 · 진행판 · 역할 · 인계) */
export type ToolKey = 'msg' | 'col' | 'inq' | 'rep' | 'brd' | 'role' | 'cmd' | 'adv' | 'mgr'
/** 처음 편 칸 — 없음(0.1.27 시안 6판 ★ 「처음 펴 둘 칸 없음」: 아홉 칸만 보이고 칸 · 역할 칩을 누르면 그 줄 아래 카드로 편다). 노트 panel.md#toolBoard */
export const TOOL_START: ToolKey | null = null
/**
 * 사용자 확정 전 추천 이름 둘(0.1.27 시안 6판 「맨 위 묶음 이름」 · 「셋째 칸 이름」 — ★ 없음): 바꾸려면 여기 한 곳만 고친다.
 * selfGroup = 맨 위 묶음 머리 · mgr = 그 묶음 셋째 칸(열쇠 mgr — 옛 이름 「현재 세션」) · mgrSub = 그 칸 아랫줄. 노트 panel.md#toolBoard
 */
export const TOOL_NAMES = {
  get selfGroup() {
    return L('이 세션', 'This session')
  },
  get mgr() {
    return L('고정 · 보관', 'Archive')
  },
  get mgrSub() {
    return L('정리 · 끝내기 · 원격', 'Tidy · end · remote')
  },
  get mgrOff() {
    return L('정리 · 끝내기', 'Tidy up')
  },
  get mgrOffSub() {
    return L('제목 정리 · 원격 …', 'Title · remote …')
  },
}

/**
 * 표면마다 다른 꼴(0.1.28 — register 가 vscode.tsx 로 셈해 넘긴다, 처음 값 = 데스크톱): isApp = 데스크톱 앱 도구를 부를 수 있나(아니면 앱 몫 칸 · 줄을
 * 넓은 자리는 흐리게 + 까닭, 좁은 칸은 뺀다) · isNarrow = 좁은 칸(VS Code 입력창 위 inline — 칸을 한 줄씩 접은 글 목록, 그림 없음) · hasSwitch = 켬 · 끔 스위치(Client)를 그리나(아니면 드롭다운) ·
 * rainbowHex = ultrathink 무지개를 색 키 대신 hex 로(VS Code 는 무지개 키를 안 칠함) · textPress = 덮개 단추 대신 보이는 글을 단추로(VS Code — absolute 를 안 그림) ·
 * fluid = 칸 폭을 칸 수 대신 남은 폭 나누기로(VS Code — 칸 셈이 둘) · isText = 글 화면(터미널 — 결정 4: 그림 · 덮개 · 드롭다운 · 스위치 없이,
 * 칸은 글 단추 목록 · 고르기는 가로 단추). 노트 panel.md#PanelLook
 */
export type PanelLook = { isApp: boolean; isNarrow: boolean; hasSwitch: boolean; rainbowHex: boolean; textPress?: boolean; fluid?: boolean; isText?: boolean }
export const DESKTOP_LOOK: PanelLook = { isApp: true, isNarrow: false, hasSwitch: true, rainbowHex: false }

type TextPressUi = { textPress?: true; textUi?: true }
const isTextPress = (ui: Ui): boolean => (ui as unknown as TextPressUi).textPress === true
const withTextPress = (ui: Ui): Ui => ({ ...(ui as object), textPress: true }) as unknown as Ui
/** 글 화면 표지가 붙은 부품 표인가(textUi 절) */
const isTextUi = (ui: Ui): boolean => (ui as unknown as TextPressUi).textUi === true
type PickProps = { key?: string; label?: string; value?: string; options: readonly { value: string; label?: string }[]; onSelect: (value: string) => void }
// (고른 것 앞 ✓ · 단추 key = <드롭다운 key>-<값> — 이지 컴팩트 choiceControl 꼴). 엔진 h 는 함수 꼬리표를 그 props 로 부른다(엔진 타입 ElementConstructor)
const withTextUi = (ui: Ui): Ui => {
  const base = withTextPress(noSvg(ui))
  const { Box, Button, Text } = base
  const Select = (p: PickProps) => (
    <Box key={p.key} columnGap={1} alignItems="center" flexWrap="wrap" minWidth={0}>
      {p.label ? <Text color="subtle">{p.label}</Text> : null}
      {p.options.map(o => (
        <Button key={`${p.key}-${o.value}`} label={o.value === p.value ? `✓ ${o.label ?? o.value}` : (o.label ?? o.value)} onPress={() => p.onSelect(o.value)} />
      ))}
    </Box>
  )
  return { ...(base as object), Select, textUi: true } as unknown as Ui
}
/** 그린 원소의 꼴 이름(엔진 원소 { type, props }) — 아니면 null */
const elType = (x: unknown): string | null => (typeof x === 'object' && x !== null && typeof (x as { type?: unknown }).type === 'string' ? (x as { type: string }).type : null)
/** 원소 안 글만 이어 붙임(단추 이름이 필요할 때) */
const plainOf = (x: unknown): string => {
  if (typeof x === 'string' || typeof x === 'number') return String(x)
  if (Array.isArray(x)) return x.map(plainOf).join('')
  if (typeof x === 'object' && x !== null) return plainOf((x as { props?: { children?: unknown } }).props?.children)
  return ''
}

/** 고르기 하나(드롭다운 값 · 목록) */
export type Choice = { value: string; options: readonly { value: string; label: string }[] }

/** 주인 고르기 재료 — value = 고른 값(app 이면 앱 관계대로), current = 지금 세션 트리 위 세션(없으면 맨 위), isOpener = 그 세션이 이 세션을 앱에서 연 세션인가(노트 panel.md#ownerSelect) */
export type OwnerPick = { value: string; choices: readonly string[]; current: string | null; isOpener: boolean }

/** [설정] 「md 잠금」 묶음(0.1.29 ④ F2 — 노트 panel.md#mdLock). rows null = 스위치 꺼짐(안 읽음) · error = 폴더를 못 읽음 */
export type MdLockRow = { file: string; target: string; owner: string; intent: string | null; left: string }
export type MdLockView = { on: boolean; dir: string; rows: readonly MdLockRow[] | null; expired: number; error: string | null }

export type PanelView = {
  selfId: string
  /** 데스크톱 앱 도구를 부를 수 있나(0.1.28 — register.md#canUseApp) — 꼴 값 PanelLook.isApp 의 재료. 없으면 됨 */
  isApp?: boolean
  /** 「다른 세션」 칸 지금 열린 세션(0.1.28 — register.md#openLists): openDesk = 데스크톱 세션(엔진 세션 패널만 · 세션 트리 차례) · openOut = 데스크톱 앱 밖 세션(VS Code · 터미널) */
  openDesk: readonly OpenRow[]
  openOut: readonly OpenRow[]
  now: number
  metas: ReadonlyMap<string, SessionMeta>
  /** 식은 세션의 컨텍스트(천 토큰) — 그 세션이 턴 끝에 적은 값만(없으면 값을 안 보인다) */
  ctxK: ReadonlyMap<string, number>
  /** 오케로 정한 세션(왕관) */
  orche: ReadonlySet<string>
  /** 이 세션 역할(0.1.26 — 관계 줄 역할 칩, meta.md#roleOf) · 메인 세션 제목(메인이 있고 이 세션이 아닐 때 — 「역할 · 인계」 메인 줄 까닭) */
  role: SessionRole
  mainTitle: string | null
  /** 위 세션(패널 세션 트리 위 · 살아 있음) — 없으면 null. tag = 앞 차수(이 세션이 인계받은 세션 — 세션 트리 ②) · 연 세션(앱에서 연 세션) · 주인(사람이 정했거나 인계로 넘어옴) */
  up: SendRow | null
  /** 이 세션이 보낸 보고 가운데 위 세션 받은 칸(모아 둠)에 아직 남은 것 수 — 「위 세션」 칸 「모아 둠」 줄(0.1.32). 노트 panel.md#upHeld */
  upHeld?: number
  /** 이 세션을 인계받은 뒤 차수가 이 세션 아래에 있을 때(세션 트리 ② — 둘 다 살아 있고 앱 자식) 그 id — 하위 줄 「뒤 차수」 표지. 없으면 null */
  heir: string | null
  /** 메인(`>>메인` 과 같은 셈 — 노트 panel.md#compose) — 이 세션 · 위 세션이면 null(「위 세션」 칸 메인 줄 — 0.1.29 ③ ⓓ) */
  mainRow: SendRow | null
  /** 이 세션이 앱에서 연 세션(앱 부모 = 이 세션) — 하위 줄 「붙임」 가름(그 밖 하위는 이지세션 기록으로 붙인 세션) */
  opened: ReadonlySet<string>
  /** 끝난 듯(0.1.31 ②) — 그 세션 마지막 답 끝 두 줄이 모두 「없음」(끝남 기록은 아님 — 사람이 [끝내기]로 확정). 노트 register.md#ending */
  ending?: ReadonlySet<string>
  /** 이 세션이 보낸 글 최근 것(앱 도착 기록) — 칸마다 받는 세션으로 가른다 */
  sent: readonly SentRow[]
  /**
   * 칸 아랫줄 「보낸 N · 받은 N」 재료(0.1.27 — 시안 6판 6): sentN = 받는 세션마다 이 세션이 보낸 글 수(이 세션 앱 메타 peerReceipts 전부),
   * recv = 보낸 세션마다 이 세션이 받은 글 수(다른 세션들의 peerReceipts 가운데 받는 곳이 이 세션인 것). 노트 panel.md#toolBoard
   */
  sentN: ReadonlyMap<string, number>
  recv: ReadonlyMap<string, number>
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
  settings: { quick: ReadonlySet<QuickItem>; display: Choice; advisor: Choice; isWorking: boolean; autoPin: boolean; autoDetach: boolean; autoUnpin: boolean; autoGroup: boolean; firstUltra: boolean; reports: Choice; peerRel: boolean; sessionRules: boolean; mentionInfo?: boolean; mdLock?: MdLockView; lang?: LangView }
  /** 「이 세션」 쪽 — 이 세션 줄(상태 · 끝남), 형제 세션, 자식 */
  selfRow: FamilyRow | null
  siblings: readonly FamilyRow[]
  children: readonly FamilyRow[]
  /** 하위 줄마다 그 아래(손자 이하) 줄 — 0.1.29 ③ ⓒ 줄 펼치기(meta.md#relatives `belowRows`). 없으면 빈 */
  below?: ReadonlyMap<string, readonly FamilyRow[]>
  /** 보관을 묻는 글 재료(0.1.5) — 앱에 붙은 살아 있는 자식 수(보관하면 같이 보관됨) · 인계한 옛 주인인가(그때만 먼저 떼어 남김) */
  selfAttached: number
  isHanded: boolean
  /** 할 일 「끝난 곁가지」(0.1.6) — 이 세션의 세션 트리 아래 끝남 기록이 있는 살아 있는 세션 */
  endedKids: readonly EndedKid[]
  /** [설정] 「정리」 칸 — 남은 자료 마지막 셈(null = 아직 안 셈) */
  clean: CleanScan | null
  /** 입력창에 ultrathink 낱말이 있는가(0.1.7) — 명령 칩 ultrathink 의 넣음 꼴(입력창 위 줄과 같음 — 노트 panel.md#ultraChip) */
  ultraOn: boolean
  /** 「이 세션」 advisor 칸(0.1.13) — 안 불렸으면 null(칸이 없다) */
  advisorLog: AdvisorLog | null
  /** [설정] 입력창 위 줄 미리보기 재료(0.1.25) — 입력창 위 줄과 같은 값 · [설정]을 볼 때만(아니면 null). 누름은 panel 이 빈 동작으로 바꾼다(previewOf) */
  quickPreview?: { q: QuickView; acts: QuickActs } | null
  /** 판 단추 · 서랍(0.1.29 — register 가 그릴 때 얹음, 없으면 판 단추 없음). 노트 panel.md#updateButton */
  upd?: UpdView | null
  /** 처음 한 번 묻는 카드를 띄울까(0.1.29 ② F3 — 새 자식 세션 설정 · 자식 보고 저장값이 하나도 없고 아직 안 답함). 노트 panel.md#firstSetup */
  firstSetup?: boolean
}

/** 판 단추 · 서랍 재료(0.1.29) — state = 판 · 확인 상태(register.md#refreshUpdateInfo), isOpen = 서랍을 폈나, nowMs = 「마지막 확인 N일 전」 셈 */
export type UpdView = { state: UpdateState; isOpen: boolean; nowMs: number }

/** 판 단추 · 서랍 누름(0.1.29) — 서랍 펴고 접기 · [업데이트 확인] · [업데이트] · 명령 출력 펴기 · [입력칸에 넣기] */
export type UpdActs = { toggle: () => void; check: () => void; apply: () => void; output: () => void; ask: () => void }

export type PanelActs = {
  /** 처음 한 번 묻는 카드 답(0.1.29 ② F3) — rec = 추천대로 켜기 · app = 앱 그대로. 어느 쪽이든 다시 안 뜬다 */
  firstSetup?: (pick: 'rec' | 'app') => void
  /** 보는 쪽 고르기 — 「이 세션」을 고르면 이 세션 원격이 켜졌나 본다 */
  view: (to: PanelUi['view']) => void
  /** 도구판 칸 펴고 접기(0.1.27 — 펼친 칸을 다시 누르면 접힘) — 편 칸 하나만, 바꾸거나 접으면 줄 손질 · 보낼 칸 · 묻는 글을 닫는다. 펼 때 어드바이저 칸이면 기록을 바로 읽는다 */
  tool: (k: ToolKey) => void
  /** 칸 펴기만(0.1.27 — 「지금」 줄 [보기]): 이미 펴져 있으면 그대로 */
  openTool: (k: ToolKey) => void
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
  /** [설정] 「언어 · Language」(0.1.29 ⑤ — auto · ko · en, 모든 세션 공용). 노트 panel.md#langRow */
  pickLang?: (value: string) => void
  /** 입력창 위 줄에 둘 것 켜고 끄기 — 스위치가 없는 표면의 드롭다운에서(스위치 누름은 register.tsx ui.message) */
  pickQuick: (key: QuickItem, on: boolean) => void
  /** advisor(모든 세션) — 입력창 위 줄과 같은 고르기, 답하는 중이면 안 바꾼다 */
  pickAdvisor: (value: string) => void
  pickAutoPin: (on: boolean) => void
  pickAutoDetach: (on: boolean) => void
  /** 끝나면 고정 풀기 · 사이드바 그룹으로(0.1.6) */
  pickAutoUnpin: (on: boolean) => void
  pickAutoGroup: (on: boolean) => void
  /** 새 세션 첫 글에 ultrathink(0.1.27) — 노트 register.md#firstUltra */
  pickFirstUltra: (on: boolean) => void
  /** 보낸 세션 관계 알리기(0.1.20) — 노트 panel.md#peerRelSet */
  pickPeerRel: (on: boolean) => void
  /** 글에 나온 세션 정보 붙이기(0.1.31 ①) — 노트 register.md#mention */
  pickMentionInfo?: (on: boolean) => void
  /** md 잠금(0.1.29 ④ F2): 스위치 · 잠금 폴더 자리 · [풀기](파일 이름) */
  pickMdLock?: (on: boolean) => void
  mdLockDir?: (path: string) => void
  mdLockRelease?: (file: string) => void
  /** 세션 규칙(0.1.27 — 보내기 확인 · 차례 줄 · 말로 하기 힌트) — 노트 register.md#sendRules */
  pickSessionRules: (on: boolean) => void
  /** 정리 — 이 세션이면 입력칸에 정리 글, 다른 세션이면 보낼 칸을 정리 글로 채워 연다 */
  clean: (id: string) => Promise<void>
  /** 끝난 하위 모두 보관 — bypass 만 한 번에(화면에 열린 세션 건너뜀 · 고정 풀고 보관 · 알림 한 줄), auto 면 줄마다(0.1.26 — register.md#archiveAll) */
  archiveAll: (ids: readonly string[]) => Promise<void>
  /** 보관 · 끝내기 전 남은 메시지 카드(0.1.31 ⑧) — take 받고 · drop 지우고 · keep 남기고(붙은 세션만이면 같이 보관) · null 닫기. 노트 register.md#leftover */
  pre?: (choice: 'take' | 'drop' | 'keep' | null) => Promise<void>
  /** 「끝난 하위 정리」 [이 세션을 권한 무시로](0.1.31 ⑦ · 8b) — 바로 부르기 → 안 되면 입력칸 지시 글. 노트 register.md#selfBypass */
  selfBypass?: () => Promise<unknown>
  /** 0.1.31 8b ⓐ 보낼 칸 자리 고르기(받는 쪽 권한 무시 · plan — panel.md#matchCard): 받는 세션을 자동으로 내리고 보내기(남의 세션이면 한 번 더 묻기 · 일하는 중이면 차례 끝 뒤) · 이 세션을 권한 무시로 올리고 보내기 · 카드로 보내기 · 묻기에서 뒤로 · 닫기. 노트 register.md#modeMatch */
  matchLower?: () => void
  matchUp?: () => void
  matchCard?: () => void
  matchBack?: () => void
  matchCancel?: () => void
  /** 0.1.31 8b ⓑ [하위 모두 자동으로](메인 · 오케 — 권한 모드 줄 오른쪽) · 트리로만 묶인 하위 묻기 카드 [내리기] · [그대로 두기]. 노트 register.md#kidsAuto */
  kidsAuto?: () => void
  kidsAutoOk?: () => void
  kidsAutoNo?: () => void
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
  /** 판 단추 · 서랍(0.1.29) — 노트 panel.md#updateButton */
  upd: UpdActs
}

/** 입력창 맨 앞에 넣는 명령 */
export type SlashCmd = 'btw' | 'fork' | 'rewind'

/** 수락 · 거절할 메시지 — heldKey 하나 · 여럿, null 이면 전체 */
export type HeldPick = string | readonly string[] | null

const SELF_CMDS = [
  {
    key: 'btw',
    label: '/btw',
    get what() {
      return L('하던 일을 안 끊고 따로 물음', 'Ask aside without stopping the work')
    },
  },
  {
    key: 'fork',
    label: '/fork',
    get what() {
      return L('이 대화를 다 물려받은 에이전트에 일 맡김', 'Hand a task to an agent that gets this whole conversation')
    },
  },
  {
    key: 'rewind',
    label: '/rewind',
    get what() {
      return L('대화 · 코드를 앞 지점으로 되돌림', 'Roll the conversation and code back to an earlier point')
    },
  },
  {
    key: 'recap',
    label: '/recap',
    get what() {
      return L('지금까지 한 일을 한 줄로 요약', 'Sum up the work so far in one line')
    },
  },
  {
    key: 'export',
    get label() {
      return L('내보내기', 'Export')
    },
    get what() {
      return L('대화를 zip 으로 다운로드 폴더에', 'Save the conversation as a zip in Downloads')
    },
  },
] as const

// 터미널 · VS Code 는 엔진 뜻(위 what — VS Code 는 추정). 가름은 표면 꼴 값(글 화면 · 글로 누르는 표면)
const FORK_DESK = () => L('이 대화를 새 세션으로 갈라 이어 감', 'Fork this conversation into a new session')
const cmdWhat = (c: (typeof SELF_CMDS)[number], look: PanelLook): string => (c.key === 'fork' && !look.isText && !look.textPress ? FORK_DESK() : c.what)

/** 입력창 위 줄에 둘 것(0.1.4) — 세션 패널 단추는 늘 맨 앞이라 없다 */
export type QuickItem = 'pin' | 'ultra' | 'advisor' | 'send' | 'display' | (typeof SELF_CMDS)[number]['key']

export const QUICK_ITEMS: readonly { key: QuickItem; label: string }[] = [
  {
    key: 'pin',
    get label() {
      return L('고정', 'Pin')
    },
  },
  { key: 'ultra', label: 'ultrathink' },
  { key: 'advisor', label: 'advisor' },
  {
    key: 'send',
    get label() {
      return L('전달', 'Forward')
    },
  },
  {
    key: 'display',
    get label() {
      return L('화면', 'Screen')
    },
  },
  ...SELF_CMDS.map(c => ({
    key: c.key,
    get label() {
      return c.label
    },
  })),
]

/** [설정] 스위치의 key 앞머리 — 누름은 register.tsx ui.message 로 온다(이지 컴팩트 스위치 key `sw-` 와 안 겹치게) */
export const QUICK_SWITCH = 'es-sw-'

const SENT_TEXT: Record<SentState, string> = {
  get sent() {
    return L('보냄', 'Sent')
  },
  get delivered() {
    return L('도착', 'Arrived')
  },
  get read() {
    return L('읽음', 'Read')
  },
  get replied() {
    return L('답함', 'Replied')
  },
  get undelivered() {
    return L('안 감', 'Not delivered')
  },
}
const ON_OFF = [
  {
    value: 'on',
    get label() {
      return L('켬', 'On')
    },
  },
  {
    value: 'off',
    get label() {
      return L('끔', 'Off')
    },
  },
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
  return clean.length > MD_MAX ? `${clean.slice(0, MD_MAX)}\n\n${L(`… 글이 길어 앞 ${MD_MAX / 10_000}만 자만 보입니다. 수락하면 다 읽습니다.`, `… Long text — only the first ${(MD_MAX / 1000).toLocaleString('en-US')}k characters show. Accepting reads it all.`)}` : clean
}

/** 받침이 있으면 첫째(이 · 은), 없으면 둘째(가 · 는) — 한글이 아닌 끝은 둘째 */
export function josa(word: string, withFinal: string, without: string): string {
  const code = word.charCodeAt(word.length - 1)
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0 ? withFinal : without
}

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

/** 깊이 우선 줄(buildFamilies)을 세션 트리로 */
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

// (본문 14px · 단추 안 여백 12px 둘 · 1칸 7.7px)이라 5칸 — 4칸(0.1.21)이면 단추가 칸 폭에 눌려 세모 오른쪽이 깎인다
const TRI_W = 5
/** 자식 줄을 들이는 폭(칸) — 부모 칩 자리만큼 */
const INDENT = TRI_W
/** 「세션 도구」 쪽 목록(형제 세션 · 하위 세션 · 밑으로 붙이기 · 진행판 새 줄) 상한 */
const LIST_LIMIT = 10
/** 하위 줄 아래(손자 이하) 펼침 접힘 열쇠(0.1.29 ③ ⓒ) — `under:<하위 id>` · 그 상한 풀기 `under-all:<하위 id>`. 크기 안전망이 비우는 무거운 접힘(register HEAVY_FOLDS) */
export const UNDER_FOLD = 'under:'
export const UNDER_ALL_FOLD = 'under-all:'
// 오케 최악(보낸 세션 열 · 하나씩)에 7.5만 자 선을 넘었다(재기 — 크기 시험). 넘는 것은 「그 밖 N개」
const MSG_LIMIT = 8
/** 카드 바탕(0.1.5 — 어두운 테마 흰 5% · 밝은 테마 검정 3% 어림). 맞는 테마 키가 없어 중성 회색 — 노트 panel.md#card */
const CARD_BG = 'rgba(128,128,128,.08)'
// 칸 최소 폭 · 하위 줄 제목 칸 최소 폭(시안 140px ≈ 18칸) · 「지금」 줄에 그리는 입력 필요 줄 상한
const TOOL_GROUPS = (): readonly (readonly [Tool['g'], string])[] => [
  ['tool', TOOL_NAMES.selfGroup],
  ['msg', L('세션 메시지', 'Session messages')],
  ['mgmt', L('관리', 'Manage')],
]
// 펼친 카드 위 8px · 카드 안 여백 위 4 · 아래 6 · 옆 8px(0.1.26 은 10 · 5 · 7px — 진단 12 S1 · S2 「딱딱 붙어 있음」)
const GROUP_GAP = 1.2
const HEAD_GAP = 0.3
const TILE_PAD_Y = 0.5
// 칸 안 옆 여백(칸) — 0.1.26 은 0.75(시안 6px). 0.1.27 꺾쇠가 이름 자리를 줄여 0.5(약 4px)로 — 368px 그림 도구로 잼(노트 panel.md#toolBoard)
const TILE_PAD_X = 0.5
const CARD_TOP = 0.4
// 줄 최소 높이(36px = 단추 28 + 위아래 4)
const LABEL_W = 8.5
const ROW_MIN_H = 1.8
const TILE_GAP = 1
const TILE_MIN = 10
const KID_TITLE_MIN = 18
const NOW_WAIT_MAX = 3
const CNT_SHIFT_Y = -0.75
const CNT_SHIFT_X = -0.9
// 그 밖 0.95칸, 최소 폭은 칸 안(content-box — 안 여백 · 테는 밖) = 그림 16px + 사이 0.35 + 단추(글 + 안 여백과 테 약 18px)
const isWideCh = (c: number): boolean => (c >= 0x1100 && c <= 0x11ff) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xff60)
const fluidCh = (text: string): number => [...text].reduce((n, c) => n + (/[\s·›˅.,:;'"()|/-]/.test(c) ? 0.65 : isWideCh(c.codePointAt(0)!) ? 1.9 : 0.95), 0)
const FLUID_TILE_CH = 16 / 7.01 + 0.35
const FLUID_BUTTON_CH = 18 / 7.01
// 칸 사이 줄(꺾였을 때 — 줄)
const FLUID_ROW_GAP = 0.35
export const IDLE_DAYS = 7
const DAY_MS = 24 * 3_600_000
/** 「지금」 줄 「오케로 바꿀까요?」를 [그대로]로 거둔 접힘 열쇠 */
const NOW_ORCHE_NO = 'now-orche-no'
const ADV_LABEL_W = () => Math.ceil(textCh(L('하던 일', 'Before')))
/** 도구판 칸 하나 — g = 묶음, sub = 흐린 한 줄, use = 이 역할 · 관계에서 쓰는가(아니면 흐림), cnt = 사람이 할 것 수(수 표), body = 펼친 카드 안(덩이마다 — 덩이 사이 가는 선),
 * appOnly = 데스크톱 앱에서만 되는 칸인데 이 세션은 앱 도구를 못 부름(0.1.28 — 넓은 자리는 흐리고 안 눌림, 좁은 칸은 뺌) */
type Tool = { k: ToolKey; g: 'msg' | 'mgmt' | 'tool'; name: string; icon: (dim: boolean) => unknown; sub: string; use: boolean; cnt: number; body: () => unknown[][]; appOnly?: boolean }

const APP_ONLY = () => L('데스크톱 앱에서만', 'Desktop app only')
const APP_ONLY_WHY = () => L('흐린 칸 — 데스크톱 앱 밖에서 연 세션이라 위 · 형제 · 하위 세션이 없습니다', 'Dimmed tiles — this session was opened outside the desktop app, so it has no sessions above, beside or below')
const APP_ONLY_MGR = () => L('고정 · 보관 · 떼어 내기', 'Pin · archive · detach')
const APP_ONLY_SET = () => L('데스크톱 앱에서만 — 여기서 바꿔도 데스크톱 세션에 적용됩니다', 'Desktop app only — changing it here applies to desktop sessions')
const OPEN_DESK = () => L('데스크톱', 'Desktop')
const OPEN_OUT_HEAD = () => L('데스크톱 앱 밖 · 지금 열린 세션', 'Outside the desktop app · open now')

/** 그림(Svg)을 뺀 부품 표 — 좁은 칸은 글만(0.1.28 결정 3, 노트 panel.md#narrowView). mark · iconButton · paneButton · rowChip 이 글로 물러선다 */
const noSvg = (ui: Ui): Ui => ({ ...(ui as object), Svg: undefined }) as unknown as Ui

/** 칸 머리 ? — 마우스 올림 한 줄(tip) · 누르면 아래 펼치는 글(lines) */
type Help = { tip: string; lines: readonly string[] }
const LEFT_HELP: Help = {
  get tip() {
    return L('보관한 세션이 남긴 작업 파일 — 휴지통으로 옮김', 'Work files archived sessions left — moves them to the Recycle Bin')
  },
  get lines() {
    return [
      L(
        '보관한 세션이 남긴 작업 파일(스크래치)입니다. 살아 있는 세션 것과 md 가 가리키는 것은 뺍니다. 휴지통으로 옮기므로 휴지통에서 되돌릴 수 있습니다. [설정]을 열 때 10분에 한 번 셉니다.',
        'Work files (scratch) that archived sessions left. Ones of live sessions and ones a .md file points to are left out. They go to the Recycle Bin, so you can restore them there. Counted when you open Settings, at most every 10 minutes.',
      ),
    ]
  },
}

/** 크기 글 — 1GB 부터 소수 한 자리 GB, 그 아래는 MB */
export function sizeText(bytes: number): string {
  const mb = bytes / 1_048_576
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${Math.max(1, Math.round(mb)).toLocaleString('en-US')}MB`
}

const QUICK_HELP: Help = {
  get tip() {
    return L('켠 것만 입력창 위 줄에 보입니다', 'Only what is on shows on the line above the input')
  },
  get lines() {
    return [L('켠 것만 입력창 위 줄에 보입니다. 모든 세션에 걸립니다.', 'Only what is on shows on the line above the input. Applies to every session.')]
  },
}
const SET_GAP = 3
const PREVIEW_WELL = 'rgba(128,128,128,0.10)'
const PV_HELP: Help = {
  get tip() {
    return L('스위치 · 값을 바꾸면 바로 바뀝니다', 'Changes as soon as you flip a switch or a value')
  },
  get lines() {
    return [
      L(
        '지금 [설정] 값으로 입력창 위 줄이 어떻게 보이는지입니다. 스위치 · 값을 바꾸면 바로 바뀝니다. 미리보기 안 단추는 눌러도 아무 일도 안 합니다.',
        'How the line above the input looks with the current settings. It changes as soon as you flip a switch or a value. The buttons in the preview do nothing.',
      ),
    ]
  },
}
const KPV_HELP: Help = {
  get tip() {
    return L('스위치 · 값을 바꾸면 바로 바뀝니다', 'Changes as soon as you flip a switch or a value')
  },
  get lines() {
    return [
      L(
        '부모 세션이 자식 둘(끝난 자식 A · 새로 연 자식 B)을 열었을 때 지금 값으로 사이드바가 어떻게 보이는지입니다. 스위치 · 값을 바꾸면 바로 바뀝니다.',
        'How the sidebar looks with the current values when a parent session has opened two children (A, done, and B, just opened). It changes as soon as you flip a switch or a value.',
      ),
    ]
  },
}
const MD_LOCK_HELP: Help = {
  get tip() {
    return L('잠금 폴더의 md 잠금을 보고 풀기', 'See and release the .md locks in the lock folder')
  },
  get lines() {
    return [
      L(
        '잠금 폴더(처음 값 Claude 설정 폴더의 locks)의 잠금 파일을 읽어 대상 · 주인 세션 · 할 일 · 남은 시간을 보입니다. 끄면 안 읽습니다.',
        "Reads the lock files in the lock folder (at first, locks in Claude's config folder) and shows each target, owner session, task and time left. Off, it reads nothing.",
      ),
      L(
        '[풀기]는 파일을 지우지 않고 끝 시각을 지금으로 고쳐 씁니다. 주인 세션이 보관됐거나 끝남 표시가 있으면 차례 끝에 저절로 풉니다.',
        'Release keeps the file and rewrites its end time to now. When the owner session is archived or marked ended, the lock is released at the end of a turn.',
      ),
    ]
  },
}

const SET_HELP: Record<'display' | 'advisor' | 'autoPin' | 'autoUnpin' | 'autoGroup' | 'autoDetach' | 'firstUltra' | 'reports' | 'peerRel' | 'sessionRules' | 'mentionInfo', Help> = {
  get mentionInfo() {
    return {
      tip: L('내 글에 다른 세션 제목이 나오면 그 세션 정보를 Claude 에게만 한 줄 붙입니다', 'When your message names another session, gives Claude alone one line about that session'),
      lines: [
        L(
          '보낸 글에 다른 세션의 제목 · [범위]를 뗀 제목 · 짧은 이름이 들어 있으면 그 세션의 id · 권한 모드 · 도는 중인지 · 위 · 아래 · 상태 · 끝남을 한 줄로 붙입니다(최근 셋까지). 세션을 찾는 도구 호출이 없어집니다.',
          "When your message has another session's title, its title without the [scope] or its short name, gives Claude one line with that session's id, permission mode, whether it is running, the sessions above and below, its status and whether it ended (up to three, most recent first). Claude no longer needs a tool call to find it.",
        ),
      ],
    }
  },
  get display() {
    return {
      tip: L('모든 세션의 Claude 답을 고른 기기에 맞춥니다', "Fits Claude's answers in every session to the device you pick"),
      lines: [L('모든 세션의 Claude 답을 고른 기기에 맞춥니다. 입력창 위 줄 「화면」과 같은 값입니다.', "Fits Claude's answers in every session to the device you pick. The same value as Screen on the line above the input.")],
    }
  },
  get advisor() {
    return {
      tip: L('이 세션에 걸립니다 · 입력창 위 줄과 같은 값', 'Applies to this session · same value as on the line above the input'),
      lines: [
        L(
          '이 세션에 걸리는 설정입니다. 입력창 위 줄과 같은 값입니다. 모든 세션의 기본값은 입력칸에 /advisor <모델> 을 직접 쳐야 바뀝니다.',
          "A setting for this session. The same value as on the line above the input. To change every session's default, type /advisor <model> in the input yourself.",
        ),
      ],
    }
  },
  get autoPin() {
    return { tip: L('세션이 자식 세션을 열면 사이드바에 고정합니다', 'When a session opens a child session, pins it in the sidebar'), lines: [L('세션이 자식 세션을 열면 사이드바에 고정합니다.', 'When a session opens a child session, pins it in the sidebar.')] }
  },
  get autoUnpin() {
    return {
      tip: L('진행판에 끝 줄이 적히면 저절로 붙인 고정을 풉니다', 'Unpins what was pinned automatically once its end line is on the progress board'),
      lines: [L('진행판에 끝 줄이 적히면 저절로 붙인 고정을 풉니다.', 'Unpins what was pinned automatically once its end line is on the progress board.')],
    }
  },
  get autoGroup() {
    return {
      tip: L('주인 세션과 자식 세션을 사이드바에서 한 그룹으로 묶습니다', 'Puts the owner session and its child sessions in one sidebar group'),
      lines: [L('주인 세션과 자식 세션을 사이드바에서 한 그룹으로 묶습니다.', 'Puts the owner session and its child sessions in one sidebar group.')],
    }
  },
  get autoDetach() {
    return {
      tip: L('자식 세션을 열자마자 떼어 냅니다(bypass 세션만)', 'Detaches a child session as soon as it opens (Bypass sessions only)'),
      lines: [
        L(
          '켜면 자식 세션을 열자마자 떼어 냅니다. 그 세션 보고는 안 오고, 물음 · 끝은 진행판에 적습니다(bypass 세션만).',
          'On, a child session is detached as soon as it opens. Its reports no longer come up; questions and the end go on the progress board (Bypass sessions only).',
        ),
      ],
    }
  },
  get firstUltra() {
    return {
      tip: L('이 세션이 새 세션을 열 때 첫 글 맨 앞에 ultrathink 를 넣습니다', "Puts ultrathink at the start of a new session's first message when this session opens one"),
      lines: [
        L('이 세션이 새 세션을 열 때 첫 글 맨 앞에 ultrathink 를 넣습니다.', "Puts ultrathink at the start of a new session's first message when this session opens one."),
        L('하던 일을 새 세션으로 넘길 때도 넘기는 글 맨 앞에 넣습니다.', 'Also at the start of the text when it hands its work over to a new session.'),
      ],
    }
  },
  get reports() {
    return {
      tip: L('연 세션의 보고를 막아 「하위 세션」 칸에 모아 둡니다', 'Holds the reports of sessions you opened in the Below tile'),
      lines: [
        L(
          '연 세션이 답을 끝내며 보내는 보고를 막아 [세션 도구] 「하위 세션」 칸에 모아 둡니다. 「앱 그대로」면 연 세션이 받아 차례가 돕니다.',
          "Stops the report a session you opened sends when it ends an answer and holds it in Session tools → Below. With The app's way, the opener gets it and runs a turn.",
        ),
      ],
    }
  },
  get peerRel() {
    return {
      tip: L('보낸 세션이 어디인지 Claude 에게만 알립니다', 'Tells only Claude where the sending session is'),
      lines: [
        L(
          '다른 세션 글을 받으면 보낸 세션이 위 · 아래 · 같은 트리 · 다른 트리 중 어디인지 Claude 에게만 알립니다.',
          'When a message from another session arrives, tells only Claude whether the sender is above, below, in the same tree or in another tree.',
        ),
      ],
    }
  },
  get sessionRules() {
    return {
      tip: L('다른 세션에 보내기 전에 규칙을 확인하고, 글을 보낼 때마다 Claude 에게 규칙을 알려 줍니다', 'Checks the rules before sending to another session, and gives Claude the rules with each message you send'),
      lines: [
        L(
          '끝났거나 보관된 세션에 보내기와, 한 번 대답하는 동안 세 번째 다른 세션에 보내기를 막고 Claude 가 먼저 사용자에게 묻게 합니다. 사용자가 답한 뒤의 같은 보내기는 통과합니다.',
          'Stops sending to an ended or archived session, and to a third different session during one answer, so Claude asks you first. The same send after you answer goes through.',
        ),
        L(
          '사용자가 글을 보낼 때마다 Claude 에게만 규칙 안내(이어받은 세션의 첫 대답 · 조율하는 세션이 할 일 · 지시는 한 단계 아래로)와 말로 인계 · 열기 · 위로 보내기 안내를 붙입니다. 모든 세션에 걸립니다.',
          'With each message you send, Claude alone gets rule notes (the first answer of a handed-over session, what a coordinating session does, instructions one level down) and hints for handing over, opening and sending up in plain words. Applies to every session.',
        ),
      ],
    }
  },
}

/** [설정] 「보낸 세션 관계 알리기」 풀이 덧줄 — VS Code · 터미널(0.1.29 ② G2) */
const PEER_APP_ONLY = () => `${APP_ONLY_SET()}.`

/** [설정] 새 자식 세션 스위치 key — 누름은 register.tsx ui.message 로 온다(입력창 위 줄 아홉과 같은 앞머리, 칸 이름과 안 겹치게) */
export const AUTO_SWITCH = { pin: `${QUICK_SWITCH}auto-pin`, detach: `${QUICK_SWITCH}auto-detach`, unpin: `${QUICK_SWITCH}auto-unpin`, group: `${QUICK_SWITCH}auto-group`, ultra: `${QUICK_SWITCH}first-ultra` } as const
/** 「고정 · 보관」 칸 상태 스위치 key(0.1.29 ② F1 — 고정 · Remote Control · 끝남 표시) — 누름은 register.tsx ui.message 로 온다. 노트 panel.md#manage */
export const MGR_SWITCH = { pin: `${QUICK_SWITCH}mgr-pin`, remote: `${QUICK_SWITCH}mgr-remote`, end: `${QUICK_SWITCH}mgr-end` } as const
/** [설정] 「보낸 세션 관계 알리기」 스위치 key(0.1.20) — 누름은 register.tsx ui.message 로 온다 */
export const PEER_SWITCH = `${QUICK_SWITCH}peer-rel`
/** [설정] 「글에 나온 세션 정보 붙이기」 스위치 key(0.1.31 ①) — 누름은 register.tsx ui.message 로 온다 */
export const MENTION_SWITCH = `${QUICK_SWITCH}mention-info`
/** [설정] 「md 잠금 보기 · 풀기」 스위치(0.1.29 ④ F2) */
export const MD_LOCK_SWITCH = `${QUICK_SWITCH}md-lock`
/** [설정] 「세션 규칙(보내기 확인 · 차례 줄)」 스위치 key(0.1.27) — 누름은 register.tsx ui.message 로 온다. 노트 register.md#sendRules */
export const RULES_SWITCH = `${QUICK_SWITCH}session-rules`
/** 세션 규칙 스위치 이름 — 임시(0.1.27 명세: 확정은 사용자 · 2차가 이름 짝과 같이 여쭘) */
export const RULES_NAME = () => L('세션 규칙(보내기 확인 · Claude 안내)', 'Session rules (send check · notes)')

/** [설정] 「언어 · Language」 재료(0.1.29 ⑤) — value = 저장값(auto · ko · en), auto = 자동이 지금 고른 언어(모르면 null — 「자동」만) */
export type LangView = { value: 'auto' | 'ko' | 'en'; auto: 'ko' | 'en' | null }
const langOptions = (lv: LangView): { value: string; label: string }[] => {
  const autoName = lv.auto === 'ko' ? '한국어' : lv.auto === 'en' ? 'English' : null
  return [
    { value: 'auto', label: autoName ? L(`자동(${autoName})`, `Auto (${autoName})`) : L('자동', 'Auto') },
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
  ]
}
const LANG_HELP = (): Help => ({
  tip: L('패널 · 입력창 위 줄 · Claude 에게 붙이는 글의 언어 — 모든 세션에 걸립니다', 'Language of the panel, the line above the input and the lines added for Claude — applies to every session'),
  lines: [
    L(
      '자동이면 Claude Code 설정의 language, 없으면 데스크톱 앱 언어, 없으면 OS 언어를 따릅니다(30초마다 다시 봄). 세션 제목 꼴(「N차」)과 진행판 끝 줄(「끝:」)은 언어와 상관없이 그대로입니다.',
      "Auto follows Claude Code's language setting, then the desktop app's language, then your OS language (checked every 30 seconds). Session title forms (N차) and the progress board end line (끝:) stay as they are in either language.",
    ),
  ],
})

/** 「20:08」 — 하루가 넘으면 앞에 달 · 날(whenText 의 앞쪽) */
const clockText = (at: number, now: number) => whenText(at, now).split(' · ')[0]!

/** advisor 칸 접힘 열쇠 · 「이전 N건」 접힘 열쇠 — 펼칠 때 register.tsx 가 기록을 다시 읽는다 */
export const ADV_FOLD = 'advisor'
const ADV_MORE = 'adv-more'
const ADV_SHOW = 4
const ADV_MAX = 24

/** 토큰 글 — 천 아래는 그대로, 10만 아래는 소수 한 자리 「만」, 그 위는 정수 「만」(317만 · 9.4만 · 35만 · 1.8만) */
export function tokenText(n: number): string {
  if (n < 1000) return String(n)
  if (lang() === 'en') return n < 1_000_000 ? `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k` : `${(n / 1_000_000).toFixed(n < 10_000_000 ? 2 : 1).replace(/\.?0+$/, '')}M`
  return n < 100_000 ? `${(n / 10_000).toFixed(1).replace(/\.0$/, '')}만` : `${Math.round(n / 10_000).toLocaleString('en-US')}만`
}

/** 「입력 35만 · 출력 1.8만」 */
export const tokenPair = (input: number, output: number) => L(`입력 ${tokenText(input)} · 출력 ${tokenText(output)}`, `in ${tokenText(input)} · out ${tokenText(output)}`)

/** 「그 뒤」 글 — 도구는 이름마다 모아 「Bash ×3, get_session」 + 직후 첫 글 앞부분 */
export function afterLine(c: Pick<AdvisorCall, 'tools' | 'after'>): string {
  const by = new Map<string, number>()
  for (const t of c.tools) by.set(t, (by.get(t) ?? 0) + 1)
  const tools = [...by].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(', ')
  return [tools, c.after ?? ''].filter(x => x !== '').join(' · ')
}

export function drawPanel(ui: Ui, v: PanelView, pu: PanelUi, cols: number, acts: PanelActs, look: PanelLook = DESKTOP_LOOK) {
  if (look.isNarrow) ui = noSvg(ui)
  if (look.isText) ui = withTextUi(ui)
  else if (look.textPress) ui = withTextPress(ui)
  const { Box, Text, Button, Select } = ui
  const InputEl = (ui as unknown as { Input?: (p: Record<string, unknown>) => unknown }).Input
  const self = v.metas.get(v.selfId)
  const folds = new Set(pu.folds)
  const k = shortKeys(v.metas.keys())

  const kids = v.children
  const sibs = v.siblings
  const waits = kids.filter(isWaiting)
  const canFix = v.role === 'main' || v.role === 'orche'
  const endedAt = new Map(v.endedKids.map(x => [x.id, x.at] as const))
  const endedAttached = new Map(v.endedKids.map(x => [x.id, x.attached] as const))
  // 하위 줄이 없는 보낸 세션(보관 · 세션 트리 밖 · 다른 세션의 내보낸 칸)도 「다른 세션」에 보이고 센다 — 어떤 글도 안 보이는 데 남지 않게
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

  const ownerSelect = (key: string, id: string, o: OwnerPick) => {
    const label = (x: string) => fitCells(v.metas.get(x)?.title ?? x, 34)
    // 고르지 않았으면(앱 관계대로) 지금 주인 제목이 보이게 — 같은 세션이 두 번 안 나오게 목록에선 뺀다
    const isApp = o.value === 'app'
    const appLabel = isApp ? (o.current ? label(o.current) : L('맨 위(앱 관계)', 'Top (app links)')) : L('앱 관계대로', 'As in the app')
    const options = [
      { value: 'app', label: appLabel },
      { value: 'top', label: L('맨 위(주인 없음)', 'Top (no owner)') },
      ...o.choices.filter(x => !(isApp && x === o.current)).map(x => ({ value: x, label: label(x) })),
    ]
    if (!options.some(x => x.value === o.value)) options.push({ value: o.value, label: label(o.value) })
    return <Select key={key} label={o.isOpener ? L('연 세션', 'Opened by') : L('주인', 'Owner')} value={o.value} options={options} onSelect={(x: string) => acts.setOwner(id, x)} />
  }

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
    const state = r.isArchived ? L('보관', 'Archived') : r.isEnded ? L('끝남', 'Ended') : isBlocked ? '' : statusText(r.status)
    const rest = [state, agoText(r.lastAt, v.now)].filter(Boolean).join(' · ')
    const cost = v.ctxK.get(r.id)
    const isCold = r.isCold && !r.isEnded && !r.isArchived
    return (
      <Box key={`es-meta-${k(r.id)}`} columnGap={0.5} alignItems="center" minWidth={0}>
        <Text color="subtle" wrap="truncate-end">
          {isBlocked ? <Text color="warning">{L('입력 필요', 'Needs input')}</Text> : null}
          {isBlocked ? ` · ${rest}` : rest}
          {isCold ? ' ·' : ''}
        </Text>
        {isCold ? mark(ui, 'snowflake', L('캐시 식음', 'Cold')) : null}
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

  const tagBox = (key: string, text: string, tone?: 'warn' | 'ok') => (
    <Box key={key} borderStyle="single" borderColor={tone === 'warn' ? 'warning' : tone === 'ok' ? 'success' : 'promptBorder'} paddingX={0.4} paddingY={0} flexShrink={0}>
      <Text color={tone === 'warn' ? 'warning' : tone === 'ok' ? 'success' : 'subtle'} size="footnote">
        {text}
      </Text>
    </Box>
  )

  // 「마무리」 줄([끝내기] 회색 하나 · 보관 글 단추 · 떼어 내기 경고 단추). 단추 key 는 옛 ⋯ 목록 그대로(es-m-<이름>-<짧은 id>). 떼어 내기는 앱이 뗄 수 있는 세션만(canDetach)
  const kidFix = (r: FamilyRow) => {
    const el = k(r.id)
    const item = (name: string, label: string, onPress: () => unknown) => linkButton(`es-m-${name}-${el}`, label, onPress)
    const fixRow = (key: string, name: string, parts: unknown[]) => (
      <Box key={key} columnGap={1} rowGap={0.4} flexWrap="wrap" alignItems="center" minWidth={0}>
        <Box width={FIX_LABEL_W} flexShrink={0}>
          <Text color="subtle" size="footnote">
            {name}
          </Text>
        </Box>
        {parts}
      </Box>
    )
    return (
      <Box key={`es-fix-${el}`} flexDirection="column" rowGap={0.3} marginTop={0.3} marginLeft={2.5} minWidth={0}>
        {fixRow(`es-fix-msg-${el}`, L('메시지', 'Messages'), [item('send', L('보내기', 'Send'), () => acts.send(r.id)), item('clean', L('정리 부탁', 'Ask to clean up'), () => acts.clean(r.id)), item('merge', L('일 합치기', 'Merge work'), () => acts.merge(r.id))])}
        {fixRow(`es-fix-end-${el}`, L('마무리', 'Wrap up'), [
          <Button key={`es-m-end-${el}`} variant="secondary" label={r.isEnded ? L('끝남 풀기', 'Unmark ended') : L('끝내기', 'End')} onPress={() => acts.finish(r.id, !r.isEnded)} />,
          item('arch', L('보관', 'Archive'), () => acts.archive(r.id, true)),
          v.canDetach.has(r.id) ? dangerButton(`es-m-detach-${el}`, L('떼어 내기', 'Detach'), () => acts.detach(r.id), L('되돌릴 수 없습니다 — 그 세션 보고가 더는 안 옵니다', "Can't be undone — its reports stop coming")) : null,
        ])}
      </Box>
    )
  }

  const sentList = (key: string, list: readonly SentRow[]) => (
    <Box key={key} flexDirection="column" flexGrow={1} minWidth={0}>
      {list.length === 0 ? (
        <Text color="subtle">{L('보낸 글 없음', 'Nothing sent')}</Text>
      ) : (
        list.map((s, i) => (
          <Box key={`${key}-${i}`} columnGap={1}>
            <Box key={`${key}-t${i}`} flexGrow={1} minWidth={0}>
              <Text color="subtle" wrap="truncate-end">
                {s.title}
              </Text>
            </Box>
            <Box key={`${key}-s${i}`} columnGap={1} flexShrink={0}>
              {/* 노트: panel.md#preCard — 받는 곳이 보관됐으면 「받는 곳 보관됨」(0.1.31 ⑧) */}
              {v.metas.get(s.to)?.isArchived ? tagBox(`${key}-a${i}`, L('받는 곳 보관됨', 'Receiver archived'), 'warn') : null}
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
          placeholder={L(`「${shortTitle(title)}」에 보낼 글`, `Message to “${shortTitle(title)}”`)}
          value={pu.draft}
          submitLabel={L('보내기', 'Send')}
          onInput={(t: string) => acts.draft(t)}
          onSubmit={(t: string) => acts.sendGo(id, t)}
        />
      ) : null}
      {isBare ? null : (
        <Box key={`es-sendbtns-${el}`} columnGap={1} justifyContent="flex-end">
          <Button key={`es-sendgo-${el}`} variant="primary" label={L('보내기', 'Send')} onPress={() => acts.sendGo(id, pu.draft)} />
          <Button key={`es-sendno-${el}`} plain dimColor label={L('취소', 'Cancel')} onPress={() => acts.sendCancel()} />
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
            <Text color="subtle">{L(`다음부터 한 번에 ${next}`, `then ${next} each`)}</Text>
          </Box>
        </Box>
      ) : (
        <Box key={key} columnGap={1} alignItems="flex-start">
          <Box key={`${key}-name`} width={14} flexShrink={0}>
            <Text>{name}</Text>
          </Box>
          <Text>{L(`${now} · 다음부터 한 번에 ${next}`, `${now} · then ${next} each`)}</Text>
        </Box>
      )
    const meta = v.metas.get(id)
    return (
      <Box key={`es-card-${el}`} flexDirection="column" borderStyle="round" borderColor="promptBorder" paddingX={1} marginTop={0.5}>
        <Box key={`es-card-head-${el}`} columnGap={1} alignItems="center">
          {mark(ui, 'snowflake', L('캐시 식음', 'Cold'))}
          <Box key={`es-card-title-${el}`} flexGrow={1}>
            <Text bold>{L('컴팩트하고 보내면 더 쌉니다', 'Compacting first is cheaper')}</Text>
          </Box>
          <Button key={`es-card-x-${el}`} variant="secondary" dimColor label="✕" onPress={() => acts.cardCancel()} />
        </Box>
        <Text color="subtle" wrap="truncate-end">
          {`${meta?.title ?? id} · ${agoText(meta?.lastAt ?? null, v.now)} · ${k1}k${meta?.model ? ` · ${modelName(meta.model)}` : ''}`}
        </Text>
        {option(`es-card-as-${el}`, L('그대로 보내면', 'Send now'), money(wakeUsd(k1)), money(nextUsd(k1)))}
        {option(`es-card-cp-${el}`, L('컴팩트하고 보내면', 'Compact first'), money(compactUsd(k1)), money(AFTER_NEXT))}
        <Box key={`es-card-btns-${el}`} columnGap={1} rowGap={0.5} flexWrap="wrap" justifyContent="flex-end" marginTop={0.5}>
          <Button key={`es-card-open-${el}`} variant="primary" label={L('세션 열기', 'Open session')} onPress={() => acts.cardOpen(id)} />
          <Button key={`es-card-send-${el}`} label={L(`그대로 보내기 ${money(wakeUsd(k1))}`, `Send now ${money(wakeUsd(k1))}`)} onPress={() => acts.cardSend(id)} />
        </Box>
      </Box>
    )
  }

  // 내리기는 받는 쪽이 권한 무시일 때만(plan 을 자동으로 바꾸면 올리기 — 승인 카드) · 일하는 중이면 [끝나면 내리고 보내기] · 남의 세션은 한 번 더 묻는 줄
  const matchCard = (el: string, m: MatchAsk, title: string) => {
    const name = bareTitle(title)
    const to = modeName(m.toMode) ?? m.toMode
    const from = modeName(m.fromMode) ?? m.fromMode
    const canLower = m.toMode === 'bypassPermissions'
    const lowerFirst = canLower && m.isOwnKid
    const later = L('끝나면 내리고 보내기', 'Lower when done, then send')
    const lower = <Button key={`es-match-lower-${el}`} variant={lowerFirst ? 'primary' : undefined} label={m.busy ? later : L('받는 세션을 자동으로 내리고 보내기', 'Lower it to Auto, then send')} onPress={() => acts.matchLower?.()} />
    const card = <Button key={`es-match-card-${el}`} variant={lowerFirst ? undefined : 'primary'} label={L('카드로 보내기', 'Send as a card')} onPress={() => acts.matchCard?.()} />
    const up = <Button key={`es-match-up-${el}`} label={L('이 세션을 권한 무시로 올리기', 'Raise this session to Bypass')} onPress={() => acts.matchUp?.()} />
    return (
      <Box key={`es-match-${el}`} flexDirection="column" borderStyle="round" borderColor="promptBorder" paddingX={1} marginTop={0.5}>
        <Box key={`es-match-head-${el}`} columnGap={1} alignItems="flex-start">
          <Box key={`es-match-title-${el}`} flexGrow={1} flexShrink={1} minWidth={0}>
            <Text wrap="wrap">{L(`「${name}」${topicMark(name)} ${to}이고 이 세션은 ${withIra(from)} Claude 가 보내면 앱이 붙잡아 몇 분 뒤 버립니다`, `“${name}” is in ${to} and this session is in ${from}, so a send from Claude would be held and dropped after a few minutes`)}</Text>
          </Box>
          <Button key={`es-match-x-${el}`} variant="secondary" dimColor label="✕" onPress={() => acts.matchCancel?.()} />
        </Box>
        {m.confirm ? (
          <Box key={`es-match-ask-${el}`} flexDirection="column" marginTop={0.5}>
            <Text wrap="wrap">{L(`「${name}」${topicMark(name)} 이 세션이 연 하위가 아니라 내리기 전에 앱이 한 번 더 물을 수 있습니다. 자동으로 내릴까요?`, `“${name}” isn't a session this one opened, so the app may ask again before lowering it. Lower it to Auto?`)}</Text>
            <Box key={`es-match-ask-btns-${el}`} columnGap={1} rowGap={0.5} flexWrap="wrap" justifyContent="flex-end" marginTop={0.5}>
              <Button key={`es-match-ok-${el}`} variant="primary" label={m.busy ? later : L('내리고 보내기', 'Lower and send')} onPress={() => acts.matchLower?.()} />
              <Button key={`es-match-back-${el}`} label={L('뒤로', 'Back')} onPress={() => acts.matchBack?.()} />
            </Box>
          </Box>
        ) : (
          <Box key={`es-match-btns-${el}`} columnGap={1} rowGap={0.5} flexWrap="wrap" justifyContent="flex-end" marginTop={0.5}>
            {lowerFirst ? [lower, card, up] : canLower ? [card, lower, up] : [card, up]}
          </Box>
        )}
      </Box>
    )
  }

  /** 보낼 글 칸 또는 깨우는 값 카드(식은 세션에 보내려 할 때 — register 의 sendGo 가 card 를 세운다) */
  const sending = (el: string, id: string, title: string, isBare = false) => {
    const k1 = v.ctxK.get(id)
    if (pu.match?.id === id) return matchCard(el, pu.match, title)
    return pu.card === id && k1 !== undefined ? wakeCard(el, id, k1) : sendBox(el, id, title, isBare)
  }

  const rowMark = (r: FamilyRow) => roleMark(ui, r.isOrche ? 'orche' : 'sub')

  // ⋯ 메뉴는 없다(설치판의 고정 · 글 보기 · 내보내기 · 오케 · 주인 고르기는 형제에겐 안 씀). 단추 key 는 옛 ⋯ 목록 이름(es-m-send · es-m-go).
  // 0.1.27(시안 6판 3): [가기]는 채운 단추(글 단추는 글로 보였다 — 진단 13 T2) · 줄 위 여백은 카드 줄 꼴(위아래 0.2)
  const sibRow = (r: FamilyRow) => {
    const el = k(r.id)
    const isLive = !r.isEnded && !r.isArchived
    return (
      <Box key={`es-row-${el}`} flexDirection="column" paddingY={0.2} minWidth={0}>
        <Box key={`es-head-${el}`} columnGap={0.5} alignItems="center" minWidth={0}>
          {rowMark(r)}
          {r.isStarred ? pinMark(ui, r.pinWhy) : null}
          <Box flexGrow={1} flexShrink={1} minWidth={0}>
            <Text wrap="truncate-end" color={isDone(r) ? 'subtle' : undefined}>
              {bareTitle(r.title)}
            </Text>
          </Box>
          <Box columnGap={0.5} alignItems="center" flexShrink={0}>
            {isLive ? <Button key={`es-m-send-${el}`} variant="secondary" label={pu.sending === r.id ? L('닫기', 'Close') : L('보내기', 'Send')} onPress={() => acts.send(r.id)} /> : null}
            {isLive ? <Button key={`es-m-go-${el}`} plain label={L('가기', 'Go')} onPress={() => acts.go(r.id)} /> : <Button key={`es-m-go-${el}`} variant="secondary" label={L('가기', 'Go')} onPress={() => acts.go(r.id)} />}
          </Box>
        </Box>
        {metaLine(r)}
        {needsLine(r)}
        {pu.sending === r.id && isLive ? sending(el, r.id, r.title) : null}
      </Box>
    )
  }

  // 펴면 그 줄 밑에 깊이만큼 들인 가벼운 줄(★ 표지 · [가기]만 — 손질 · 보관 · 수락은 그 위 세션 칸에서: 지시는 한 단계씩 · 줄 크기), 상한 LIST_LIMIT + 「나머지 N」
  const underLine = (r: FamilyRow, el: string) => {
    const isOpen = folds.has(`${UNDER_FOLD}${r.id}`)
    return (
      <Box key={`es-kund-${el}`} columnGap={0.5} alignItems="center" marginLeft={2.5} minWidth={0}>
        <Button key={`es-kund-b-${el}`} plain label={L(`${isOpen ? CHEVRON.open : CHEVRON.closed} 아래 ${r.kids}`, `${isOpen ? CHEVRON.open : CHEVRON.closed} ${r.kids} below`)} onPress={() => acts.fold(`${UNDER_FOLD}${r.id}`)} />
        {r.waiting > 0 ? (
          <Text color="warning" size="footnote">
            {L(`입력 필요 ${r.waiting}`, `${r.waiting} need input`)}
          </Text>
        ) : null}
      </Box>
    )
  }
  const deepRow = (d: FamilyRow) => {
    const el = k(d.id)
    const state = d.isEnded ? tagBox(`es-kdt-${el}`, L('끝남', 'Ended'), 'ok') : isWaiting(d) ? tagBox(`es-kdt-${el}`, L('입력 필요', 'Needs input'), 'warn') : d.status ? tagBox(`es-kdt-${el}`, statusText(d.status)) : null
    return (
      <Box key={`es-kd-${el}`} columnGap={0.5} alignItems="center" paddingY={0.15} marginLeft={(d.depth - 1) * 2} minWidth={0}>
        <Box flexShrink={0}>
          <Text color="subtle">└</Text>
        </Box>
        {rowMark(d)}
        <Box flexGrow={1} flexShrink={1} minWidth={0}>
          <Text wrap="truncate-end" color={isDone(d) ? 'subtle' : undefined}>
            {bareTitle(d.title)}
          </Text>
        </Box>
        {state}
        <Button key={`es-kd-go-${el}`} variant="secondary" label={L('가기', 'Go')} onPress={() => acts.go(d.id)} />
      </Box>
    )
  }
  const underList = (r: FamilyRow, el: string) => {
    const rows = v.below?.get(r.id) ?? []
    const all = `${UNDER_ALL_FOLD}${r.id}`
    return (
      <Box key={`es-kunl-${el}`} flexDirection="column" marginLeft={2.5} minWidth={0}>
        {(folds.has(all) ? rows : rows.slice(0, LIST_LIMIT)).map(deepRow)}
        {rows.length > LIST_LIMIT ? tailRow(`ua-${el}`, all, L('나머지', 'More'), rows.length - LIST_LIMIT) : null}
      </Box>
    )
  }

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
    const isEnding = !r.isEnded && !r.isArchived && v.ending?.has(r.id) === true
    const state = r.isEnded
      ? tagBox(`es-kt-${el}`, endAt === undefined ? L('끝남', 'Ended') : L(`끝남 ${clockText(endAt, v.now)}`, `Ended ${clockText(endAt, v.now)}`), 'ok')
      : isEnding
        ? withTip(ui, `es-kend-tip-${el}`, tagBox(`es-kt-${el}`, L('끝난 듯', 'Looks done')), L('마지막 답 끝 두 줄이 모두 없음', 'The last answer ended with nothing remaining and nothing to decide'))
        : isWaiting(r)
          ? tagBox(`es-kt-${el}`, L('입력 필요', 'Needs input'), 'warn')
          : r.status
            ? tagBox(`es-kt-${el}`, statusText(r.status))
            : null
    // 「N일 쉼」(0.1.26 — 시안 5.1 정할 것 3): 마지막 활동 뒤 쉰 날이 문턱(IDLE_DAYS) 이상 — 끝난 · 입력 필요 세션은 뺌(그 표지가 따로 있다).
    // 앱 메타엔 도는 중 값이 없어 끝남만 빼고 센다(문턱만큼 쉰 세션은 도는 중일 수 없다고 봄)
    const idleDays = r.lastAt === null ? 0 : Math.floor((v.now - r.lastAt) / DAY_MS)
    const idle = !r.isEnded && !isWaiting(r) && idleDays >= IDLE_DAYS ? tagBox(`es-kidle-${el}`, L(`${idleDays}일 쉼`, `Idle ${idleDays}d`), 'warn') : null
    // 앱이 연 세션이 아님 = 떼어 낸 세션(앱 lineageDetached — 이 세션이 열고 뗌) 또는 이지세션 기록으로 붙인 세션
    const notOpened = !v.opened.has(r.id)
    const how = r.isDetached ? L('떼어 냄', 'Detached') : L('붙임', 'Attached')
    const more = isOpen ? (
      <Button key={`es-more-${el}`} variant="secondary" label="⋯" onPress={() => acts.more(r.id)} />
    ) : (
      <Button key={`es-more-${el}`} plain dimColor label="⋯" onPress={() => acts.more(r.id)} />
    )
    return (
      <Box key={`es-row-${el}`} flexDirection="column" paddingY={0.2} minWidth={0}>
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
            {v.heir === r.id ? tagBox(`es-kheir-${el}`, L('다음 차수', 'Next round')) : null}
            {notOpened ? tagBox(`es-kat-${el}`, how) : null}
            {/* 노트: panel.md#kidRow — 0.1.32 J2 안 A: 회색 단추는 그 줄의 주 동작 하나(끝난 듯 → 끝내기 · 끝남 → 보관 · 그 밖 → 가기), 나머지는 글 단추 */}
            {isEnding ? <Button key={`es-kend-${el}`} variant="secondary" label={L('끝내기', 'End')} onPress={() => acts.finish(r.id, true)} /> : null}
            {r.isEnded && canFix ? <Button key={`es-end-arch-${el}`} variant="secondary" label={L('보관', 'Archive')} onPress={() => void acts.archive(r.id, true)} /> : null}
            {isEnding || (r.isEnded && canFix) ? <Button key={`es-m-go-${el}`} plain label={L('가기', 'Go')} onPress={() => acts.go(r.id)} /> : <Button key={`es-m-go-${el}`} variant="secondary" label={L('가기', 'Go')} onPress={() => acts.go(r.id)} />}
            {hasMore ? more : null}
          </Box>
        </Box>
        {/* 노트: panel.md#kidRow — 0.1.31 ⑦ 아랫줄 맨 앞 권한 모드 낱말(앱 메뉴 이름) · 마지막 활동 */}
        {r.mode || mine.length > 0 ? (
          <Box key={`es-kmode-${el}`} columnGap={1} alignItems="center" marginLeft={2.5} minWidth={0}>
            {r.mode ? (
              <Box flexShrink={1} minWidth={0}>
                <Text color="subtle" size="footnote" wrap="truncate-end">
                  {`${modeName(r.mode)}${r.lastAt !== null ? ` · ${clockText(r.lastAt, v.now)}` : ''}`}
                </Text>
              </Box>
            ) : null}
            {/* 노트: panel.md#kidRow — 0.1.32 J2 안 A: 받은 글 수는 글 단추 — 누르면 줄을 펴 글마다 수락 · 거절 · [전체 수락](0.1.31 「수락 N」 회색 단추를 갈음) */}
            {mine.length > 0 ? <Button key={`es-take-${el}`} plain label={L(`받은 글 ${mine.length} ${isOpen ? CHEVRON.open : CHEVRON.closed}`, `${mine.length} received ${isOpen ? CHEVRON.open : CHEVRON.closed}`)} onPress={() => acts.more(r.id)} /> : null}
          </Box>
        ) : null}
        {needsLine(r)}
        {r.kids > 0 ? underLine(r, el) : null}
        {r.kids > 0 && folds.has(`${UNDER_FOLD}${r.id}`) ? underList(r, el) : null}
        {r.isEnded && (endedAttached.get(r.id) ?? 0) > 0 ? (
          <Box key={`es-katw-${el}`} marginLeft={2.5} minWidth={0}>
            <Text color="warning" size="footnote">{L(`붙은 세션 ${endedAttached.get(r.id)}개도 같이 보관됩니다`, `${plural(endedAttached.get(r.id) ?? 0, 'attached session')} will be archived with it`)}</Text>
          </Box>
        ) : null}
        {notOpened ? (
          <Box key={`es-katl-${el}`} marginLeft={2.5} minWidth={0}>
            <Text color="subtle" size="footnote">
              {r.isDetached ? L('떼어 내서 앱 보고는 안 옴 — 보고는 진행판 끝 줄로', 'Detached, so no app reports — it reports with an end line on the progress board') : L('앱이 열지 않은 세션이라 앱 보고는 안 옴 — 보고는 진행판 끝 줄로', "Not opened by the app, so no app reports — it reports with an end line on the progress board")}
            </Text>
          </Box>
        ) : null}
        {isOpen && canFix ? kidFix(r) : null}
        {isOpen && mine.length > 0 ? heldList(el, mine) : null}
        {isOpen && sentTo.length > 0 ? (
          <Box key={`es-kid-sent-${el}`} flexDirection="column" marginLeft={2.5} marginTop={0.3} minWidth={0}>
            {sentList(`es-msgs-${el}`, sentTo)}
          </Box>
        ) : null}
        {pu.sending === r.id && isLive ? sending(el, r.id, r.title) : null}
        {/* 노트: panel.md#preCard — 0.1.32 J3: 보관 · 끝내기 전 남은 메시지 카드는 누른 줄 밑 */}
        {pu.pre && pu.pre.act !== 'tidy' && pu.pre.ids[0] === r.id ? preCard(pu.pre) : null}
      </Box>
    )
  }

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
      {o.help ? pressBox(ui, `es-help-${name}`, { content: [mark(ui, 'help', L('도움말', 'Help'), SUB_LOOK)], cover: 2, onPress: () => acts.fold(`help:${name}`), tip: o.help.tip, tipRight: true }) : null}
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

  // isList = 세션 줄 목록(줄마다 위 여백이 있어 카드 위 안 여백을 뺀다)
  const card = (key: string, children: unknown[], isList = false) =>
    look.isText ? (
      <Box key={key} flexDirection="column" marginLeft={2}>
        {children as never}
      </Box>
    ) : (
      <Box key={key} flexDirection="column" backgroundColor={CARD_BG} borderStyle="round" borderColor="promptBorder" paddingX={0.75} paddingY={0.4} {...(isList ? { paddingTop: 0 } : {})} marginTop={0.5}>
        {children}
      </Box>
    )

  const rline = (key: string) => <Box key={key} height={0.06} marginY={0.3} backgroundColor="promptBorder" />

  // ? 는 [설정] setRow 와 같은 부품(pressBox · 마우스 올림 한 줄 · 누르면 줄 아래 풀이) — 이름표가 있는 줄은 이름표 바로 옆, 이름표 없는 줄(세션 줄 · 칩)은 줄 끝.
  // 열쇠 = 접힘 help:<칸>:<줄>(크기 안전망이 비우는 무거운 접힘 help: 와 같은 앞머리), 단추 key = es-help-<칸>-<줄>
  type RowHelp = { id: string; help: Help }
  const helpKey = (id: string) => id.replace(/:/g, '-')
  // 인자 이름을 h 로 두지 않는다 — JSX 가 h(…) 로 바뀌어(tsconfig jsxFactory) 그 인자를 부른다
  const helpMark = (rh: RowHelp) =>
    pressBox(ui, `es-help-${helpKey(rh.id)}`, { content: [mark(ui, 'help', L('도움말', 'Help'), SUB_LOOK)], cover: 2, onPress: () => acts.fold(`help:${rh.id}`), tip: rh.help.tip, tipRight: true })
  const helpLines = (rh: RowHelp | undefined) =>
    rh && folds.has(`help:${rh.id}`) ? (
      <Box key={`es-hw-${helpKey(rh.id)}`} flexDirection="column" rowGap={0.2} paddingBottom={0.3} minWidth={0}>
        {rh.help.lines.map((line, i) => (
          <Text key={`es-hw-${helpKey(rh.id)}${i}`} color="subtle" size="footnote">
            {line}
          </Text>
        ))}
      </Box>
    ) : null
  /** 카드 줄 하나 — label null 이면 이름표 칸 없이 내용이 줄을 다 쓴다(세션 줄 · 칩) */
  const rowSize = look.isText ? {} : { minHeight: ROW_MIN_H, paddingY: 0.2 }
  const cardRow = (key: string, label: string | null, content: unknown, help?: RowHelp): unknown[] => [
    <Box key={key} columnGap={1} alignItems="center" minWidth={0} {...rowSize}>
      {label !== null ? (
        <Box key={`${key}-lb`} minWidth={LABEL_W} flexShrink={0} columnGap={look.isText ? 1 : 0.3} alignItems="center">
          <Box flexShrink={0}>
            <Text color="subtle" size="footnote">
              {label}
            </Text>
          </Box>
          {help ? helpMark(help) : null}
        </Box>
      ) : null}
      <Box flexGrow={1} flexShrink={1} minWidth={0} columnGap={1} rowGap={0.4} flexWrap="wrap" alignItems="center">
        {content}
      </Box>
      {label === null && help ? helpMark(help) : null}
    </Box>,
    helpLines(help),
  ]
  /** 카드 줄의 흐린 작은 글(값 · 없음) */
  const subText = (text: string, color: 'subtle' | 'warning' = 'subtle') => (
    <Text color={color} size="footnote">
      {text}
    </Text>
  )
  /** 카드 줄의 제목 칸(줄 남은 폭을 채우고 넘치면 … ) */
  const titleCell = (text: string) => (
    <Box flexGrow={1} flexShrink={1} minWidth={0}>
      <Text wrap="truncate-end">{text}</Text>
    </Box>
  )

  const dangerButton = (key: string, label: string, onPress: () => unknown, tip: string) =>
    pressBox(ui, key, {
      content: [<Text color="error">{label}</Text>],
      cover: coverCells(textCh(label) + 2),
      onPress,
      tip,
      box: { borderStyle: 'single', borderColor: 'error', paddingX: 1, paddingY: 0.25 },
    })

  // 줄마다 되풀이되는 [가기]는 흰 글 단추(plain — 덮개 꼴은 줄마다 약 300 자라 최악 경우가 그리기 선을 넘었다)
  const linkButton = (key: string, label: string, onPress: () => unknown) => pressBox(ui, key, { content: [<Text color="suggestion">{label}</Text>], cover: coverCells(textCh(label) + 1), onPress, box: { paddingX: 1 } })

  const FIX_LABEL_W = Math.ceil(Math.max(textCh(L('메시지', 'Messages')), textCh(L('마무리', 'Wrap up')))) + 1

  // 목록 상한 — 넘으면 「나머지 N」(펼쳐도 남아 다시 접는다). 그리기 크기 대책(register.md#sizeGuard). key = 접힘 열쇠(sibs · kids)
  const capped = (list: readonly FamilyRow[], key: string, draw: (r: FamilyRow) => unknown): unknown[] => {
    const isAll = folds.has(key)
    if (list.length <= LIST_LIMIT) return list.map(draw)
    return [...(isAll ? list : list.slice(0, LIST_LIMIT)).map(draw), tailRow(key, key, L('나머지', 'More'), list.length - LIST_LIMIT)]
  }

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

  const heldItem = (r: HeldReport) => {
    const key = heldKey(r)
    const el = `${k(r.from)}${String(r.at).slice(-6)}`
    const isOpen = folds.has(`held:${key}`)
    const g = heldGist(r.text)
    const left = [
      mark(ui, isOpen ? 'down' : 'right', isOpen ? L('접기', 'Hide') : L('펼치기', 'Show'), SUB_LOOK),
      g.isDecision ? (
        <Box borderStyle="single" borderColor="warning" paddingX={0.4} paddingY={0} flexShrink={0}>
          <Text color="warning" size="footnote">
            {L('결정', 'Decision')}
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
            <Button key={`es-acc-${el}`} variant="secondary" label={L('수락', 'Accept')} onPress={() => acts.accept(key)} />
            <Button key={`es-rej-${el}`} plain dimColor label={L('거절', 'Reject')} onPress={() => acts.reject(key)} />
          </Box>
        </Box>
        {isOpen ? heldBody(r, el) : null}
      </Box>
    )
  }

  // 시안대로 둘부터). 수락 어림은 마지막 덩이 아래 한 번(요청 한 번 값은 어느 메시지든 같다).
  // 0.1.27(시안 6판 「카드 속 카드는 빼고 줄로」): 칸 카드 안 덩이 — 둘레 카드 없이 머리 줄 + 항목 줄, 덩이 사이는 칸 카드의 가는 선
  const msgCard = (from: string, shown: readonly HeldReport[], all: readonly HeldReport[], isLast: boolean) => {
    const el = k(from)
    const keys = all.map(heldKey)
    const cost = v.accept ? acceptCost(v.accept.tokens, v.accept.isCold) : null
    return (
      <Box key={`es-mc-${el}`} flexDirection="column" paddingY={0.2} minWidth={0}>
        <Box columnGap={0.5} alignItems="center" minWidth={0}>
          {mark(ui, 'message', L('메시지', 'Message'), TEXT_LOOK)}
          <Box flexShrink={1} minWidth={0}>
            <Text bold wrap="truncate-end">
              {bareTitle(v.metas.get(from)?.title ?? shown[0]?.title ?? from)}
            </Text>
          </Box>
          {/* 노트: panel.md#preCard — 보낸 세션이 보관됐으면 머리에 「보관됨」(0.1.31 ⑧ — [남기고 보관]한 글) */}
          {v.metas.get(from)?.isArchived ? tagBox(`es-mc-arch-${el}`, L('보관됨', 'Archived')) : null}
          <Text color="subtle">{L(`받은 글 ${all.length}`, `${all.length} received`)}</Text>
          <Box flexGrow={1} />
          {/* 단추 둘은 머리 줄의 직접 자식(감싼 상자 없이 — 같은 간격 · 정렬, 빈 칸 상자가 오른쪽으로 민다). 0.1.31 8c 맨 위 줄 몫을 0.1.3 최악 경우 그리기 한도 안에서 마련 */}
          {all.length > 1 ? <Button key={`es-acc-all-${el}`} variant="secondary" label={L('전체 수락', 'Accept all')} onPress={() => acts.accept(keys)} /> : null}
          {all.length > 1 ? <Button key={`es-rej-all-${el}`} plain dimColor label={L('전체 거절', 'Reject all')} onPress={() => acts.reject(keys)} /> : null}
        </Box>
        {shown.map(heldItem)}
        {isLast && cost ? (
          <Box key="es-held-cost" columnGap={0.5} alignItems="center" marginTop={0.4}>
            {v.accept?.isCold ? mark(ui, 'snowflake', L('캐시 식음', 'Cold')) : null}
            <Text color="subtle" size="footnote">{L(`수락하면 ${cost}`, `Accept: ${cost}`)}</Text>
          </Box>
        ) : null}
      </Box>
    )
  }

  // 「새 줄」 수 · [넣기] = 입력칸에 · ▸ 보기 = 새 줄 펼침. 못 읽으면 「새 줄」 주황 「못 읽음」 · [바꾸기]는 채운 단추(es-board-fix)
  const boardRows = (path: string, fresh: readonly string[] | null, help: RowHelp): unknown[] => {
    const isOpen = folds.has('board-lines')
    return [
      <Box key="es-board" flexDirection="column" minWidth={0}>
        {cardRow(
          'es-board-path',
          L('파일', 'File'),
          <Box columnGap={1} alignItems="center" flexGrow={1} minWidth={0}>
            {mark(ui, 'notebook', L('진행판', 'Progress board'), TEXT_LOOK)}
            {titleCell(fileName(path))}
            {fresh === null ? (
              <Button key="es-board-fix" variant="secondary" label={L('바꾸기', 'Change')} onPress={() => acts.fold('board-edit', true)} />
            ) : (
              <Button key="es-board-edit" plain dimColor label={L('바꾸기', 'Change')} onPress={() => acts.fold('board-edit')} />
            )}
          </Box>,
          help,
        )}
        {rline('es-board-l')}
        {cardRow('es-board-fresh', L('새 줄', 'New lines'), [
          fresh === null ? (
            <Text key="es-board-n" bold color="warning">
              {L('못 읽음', "Can't read")}
            </Text>
          ) : (
            <Text key="es-board-n" bold>
              {fresh.length > 0 ? String(fresh.length) : L('없음', 'None')}
            </Text>
          ),
          fresh && fresh.length > 0 ? <Button key="es-board-new" variant="secondary" label={L('넣기', 'Add')} onPress={() => void acts.boardFill()} /> : null,
          fresh && fresh.length > 0
            ? pressBox(ui, 'es-board-foldb', {
                content: [
                  mark(ui, isOpen ? 'down' : 'right', isOpen ? L('접기', 'Hide') : L('펼치기', 'Show'), SUB_LOOK),
                  <Text color="subtle">
                    {L('보기', 'View')}
                  </Text>,
                ],
                // 덮개는 그림 + 글 폭으로(고정 5칸이면 칸보다 넓어 글 위에 「…」 — 0.1.26 그림 도구로 잼)
                cover: coverCells(QUICK_ROW_PX / 7.71 + 0.5 + textCh(L('보기', 'View'))),
                onPress: () => acts.fold('board-lines'),
              })
            : null,
        ])}
        {isOpen && fresh
          ? fresh.slice(0, LIST_LIMIT).map((line, i) => (
              <Box key={`es-board-l${i}`} marginTop={0.2} minWidth={0}>
                <Text color="subtle" wrap="truncate-end">
                  {line.replace(/^- /, '')}
                </Text>
              </Box>
            ))
          : null}
      </Box>,
    ]
  }

  // (50개를 다 펴면 10만 자를 넘어 패널이 통째로 안 그려진다 — 0.1.3 시험에서 잼). 수락 어림은 마지막 카드 아래 한 번
  // 0.1.27: 칸 카드 안 덩이 목록(보낸 세션마다 한 덩이 — 덩이 사이는 칸 카드의 가는 선). 「그 밖 N개」는 마지막 덩이 아래
  // 보낸 세션이 둘 이상일 때만(하나면 덩이 머리 [전체 수락] · [전체 거절]과 같아서). 묻는 상태는 PanelUi.ask 'rejectAll'(칸은 한 번에 하나만 펴짐)
  const heldAll = (key: string, list: readonly HeldReport[]): unknown[][] => {
    const n = new Set(list.map(r => r.from)).size
    if (n < 2) return []
    const keys = list.map(heldKey)
    const isAsking = pu.ask === 'rejectAll'
    // 가벼운 한 줄(칸 줄 틀 없이) — 0.1.3 최악 경우(모아 둔 메시지 50 · 본문 펼침)가 그리기 한도 8만 바로 아래라 줄 하나도 무겁다(시험으로 잼)
    const rows: unknown[][] = [
      [
        <Box key={`${key}-all`} columnGap={1} rowGap={0.4} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
          <Text bold>{L(`보낸 세션 ${n} · 글 ${list.length}`, `${plural(n, 'sender')} · ${plural(list.length, 'message')}`)}</Text>
          <Button key={`${key}-acc-every`} variant="secondary" label={L('모두 수락', 'Accept everything')} onPress={() => acts.accept(keys)} />
          <Button key={`${key}-rej-every`} plain dimColor label={L('모두 거절', 'Reject everything')} onPress={() => acts.ask(isAsking ? null : 'rejectAll')} />
        </Box>,
      ],
    ]
    if (isAsking)
      rows.push([
        <Box key={`${key}-rej-ask`} flexDirection="column" borderStyle="round" borderColor="promptBorder" paddingX={1} marginTop={0.3}>
          <Text wrap="wrap">{L(`글 ${list.length}개를 지웁니다 — 되돌릴 수 없음`, `Deletes ${plural(list.length, 'message')} — can't be undone`)}</Text>
          <Box key={`${key}-rej-ask-btns`} columnGap={1} rowGap={0.5} flexWrap="wrap" justifyContent="flex-end" marginTop={0.4}>
            <Button
              key={`${key}-rej-ok`}
              variant="primary"
              label={L('지우기', 'Delete')}
              onPress={() => {
                acts.ask(null)
                return acts.reject(keys)
              }}
            />
            <Button key={`${key}-rej-no`} label={L('취소', 'Cancel')} onPress={() => acts.ask(null)} />
          </Box>
        </Box>,
      ])
    return rows
  }

  const heldCards = (key: string, list: readonly HeldReport[]): unknown[][] => {
    if (list.length === 0) return []
    const shown = list.slice(0, MSG_LIMIT)
    const senders = [...new Set(shown.map(r => r.from))]
    return [...heldAll(key, list), ...senders.map((from, i) => [
      msgCard(
        from,
        shown.filter(r => r.from === from),
        list.filter(r => r.from === from),
        i === senders.length - 1,
      ),
      i === senders.length - 1 && list.length > MSG_LIMIT ? (
        <Box key={`${key}-rest`} marginTop={0.4} paddingBottom={0.2}>
          <Text color="subtle" size="footnote">{L(`그 밖 ${list.length - MSG_LIMIT}개(오래된 것) — 위를 처리하면 이어서 보입니다. 전체 수락 · 전체 거절은 그 세션 것 모두에 걸립니다`, `${list.length - MSG_LIMIT} more (older) show next · Accept all · Reject all include them`)}</Text>
        </Box>
      ) : null,
    ])]
  }

  const heldList = (el: string, list: readonly HeldReport[]) => {
    const cost = v.accept ? acceptCost(v.accept.tokens, v.accept.isCold) : null
    const shown = list.slice(0, MSG_LIMIT)
    return (
      <Box key={`es-mc-${el}`} flexDirection="column" marginLeft={2.5} marginTop={0.2} minWidth={0}>
        {shown.map(heldItem)}
        <Box key={`es-mc-foot-${el}`} columnGap={0.5} alignItems="center" marginTop={0.4} minWidth={0}>
          {v.accept?.isCold ? mark(ui, 'snowflake', L('캐시 식음', 'Cold')) : null}
          <Box flexGrow={1} minWidth={0}>
            <Text color="subtle" size="footnote">
              {cost ? L(`수락하면 ${cost}`, `Accept: ${cost}`) : ''}
            </Text>
          </Box>
          {list.length > 1 ? <Button key={`es-kacc-all-${el}`} variant="secondary" label={L('전체 수락', 'Accept all')} onPress={() => acts.accept(list.map(heldKey))} /> : null}
          {list.length > 1 ? <Button key={`es-rej-all-${el}`} plain dimColor label={L('전체 거절', 'Reject all')} onPress={() => acts.reject(list.map(heldKey))} /> : null}
        </Box>
        {list.length > MSG_LIMIT ? (
          <Text key={`es-mc-rest-${el}`} color="subtle" size="footnote">{L(`그 밖 ${list.length - MSG_LIMIT}개(오래된 것) — 위를 처리하면 이어서 보입니다`, `${list.length - MSG_LIMIT} more (older) — they show once you handle the ones above`)}</Text>
        ) : null}
      </Box>
    )
  }

  // 받은 글(위 · 형제 · 다른 세션) · 진행판 새 줄(메인 · 오케) — 줄마다 [보기]는 그 칸을 편다. 할 것이 없으면 줄이 없다
  const nowBox = (isNarrow = false) => {
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
    const see = (key: string, to: ToolKey) => <Button key={key} variant="secondary" label={L('보기', 'View')} onPress={() => acts.openTool(to)} />
    // 입력 필요 하위: 때 · ❄ 깨우는 값(설치판 할 일 카드의 머리 오른쪽 그대로)
    const waitSide = (r: FamilyRow) => {
      const cost = v.ctxK.get(r.id)
      const isCold = r.isCold && !r.isEnded && !r.isArchived
      return (
        <Box columnGap={0.5} alignItems="center" flexShrink={0}>
          <Text color="subtle" size="footnote">
            {agoText(r.lastAt, v.now)}
          </Text>
          {isCold ? mark(ui, 'snowflake', L('캐시 식음', 'Cold')) : null}
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
    // 0.1.31 H1: 맨 위 단독(solo — 세션 트리 위가 없음)이 자식을 열어도 묻는다. 0.1.32 J1: 맨 위는 바꾸면 메인이라 「메인 세션으로 바꿀까요?」 · [메인으로](하는 일은 같은 오케 표시 — roleOf 그대로)
    const openedNow = kids.filter(r => v.opened.has(r.id) && !r.isEnded && r.id !== v.heir).length
    const askOrche =
      (v.role === 'sub' || v.role === 'solo') && openedNow > 0 && !folds.has(NOW_ORCHE_NO)
        ? line(
            'es-now-orche',
            'branch',
            v.role === 'solo'
              ? L(`하위 세션 ${openedNow}개가 생김 — 메인 세션으로 바꿀까요?`, `${plural(openedNow, 'session')} opened below — make this the main session?`)
              : L(`하위 세션 ${openedNow}개가 생김 — 오케로 바꿀까요?`, `${plural(openedNow, 'session')} opened below — make this an orchestrator?`),
            <Button key="es-now-orche-b" variant="secondary" label={v.role === 'solo' ? L('메인으로', 'Make main') : L('오케로', 'Make orchestrator')} onPress={() => acts.orche(v.selfId, true)} />,
            <Button key="es-now-orche-no" plain dimColor label={L('그대로', 'Keep')} onPress={() => acts.fold(NOW_ORCHE_NO, true)} />,
            true,
          )
        : null
    const items = [
      askOrche,
      ...waits
        .slice(0, NOW_WAIT_MAX)
        .map(r => line(`es-wait-${k(r.id)}`, 'ask', L(`입력 필요 — ${bareTitle(r.title)}`, `Needs input — ${bareTitle(r.title)}`), <Button key={`es-wait-go-${k(r.id)}`} variant="secondary" label={L('열기', 'Open')} onPress={() => acts.go(r.id)} />, waitSide(r))),
      waits.length > NOW_WAIT_MAX ? line('es-wait-rest', 'ask', L(`입력 필요 그 밖 ${waits.length - NOW_WAIT_MAX}개`, `${waits.length - NOW_WAIT_MAX} more need input`), see('es-wait-rest-b', 'rep')) : null,
      heldKid.length > 0 ? line('es-now-rep', 'inbox', L(`모인 보고 ${heldKid.length} — 하위 ${kidFrom}개에서`, `${plural(heldKid.length, 'held report')} from ${kidFrom} below`), see('es-now-rep-b', 'rep')) : null,
      heldUp.length > 0 ? line('es-now-msg', 'inbox', L(`받은 글 ${heldUp.length} — 위 세션에서`, `${heldUp.length} received — from the session above`), see('es-now-msg-b', 'msg')) : null,
      heldSib.length > 0 ? line('es-now-col', 'inbox', L(`받은 글 ${heldSib.length} — 형제 세션에서`, `${heldSib.length} received — from siblings`), see('es-now-col-b', 'col')) : null,
      heldOther.length > 0 ? line('es-now-inq', 'inbox', L(`받은 글 ${heldOther.length} — 다른 세션에서`, `${heldOther.length} received — from other sessions`), see('es-now-inq-b', 'inq')) : null,
      b && b.path !== null && (b.fresh === null || b.fresh.length > 0)
        ? line('es-now-brd', 'notebook', b.fresh === null ? L('진행판 못 읽음', "Can't read the progress board") : L(`진행판 새 줄 ${b.fresh.length}`, `Board: ${plural(b.fresh.length, 'new line')}`), see('es-now-brd-b', 'brd'))
        : null,
    ].filter(Boolean)
    if (items.length === 0) return null
    if (isNarrow) {
      return (
        <Box key="es-now" flexDirection="column" minWidth={0}>
          {items}
        </Box>
      )
    }
    return (
      <Box key="es-now" flexDirection="column" borderStyle="round" borderColor="warning" paddingX={0.75} paddingY={0.3} marginTop={0.5} minWidth={0}>
        {items}
      </Box>
    )
  }

  const chips = () => {
    const press = (c: (typeof SELF_CMDS)[number]) => (c.key === 'recap' ? acts.recap() : c.key === 'export' ? acts.exportSession(v.selfId) : acts.slash(c.key))
    const list: { name: string; icon: QuickIcon; label: string; tip: string; onPress: () => unknown; word?: unknown }[] = [
      { name: 'ultra', icon: 'brain', label: ULTRA_WORD, tip: ULTRA_TIP(), onPress: () => acts.ultrathink(), word: ultraWord(ui, v.ultraOn, look.rainbowHex) },
      ...SELF_CMDS.map(c => ({ name: c.key, icon: CMD_ICONS[c.key], label: c.label, tip: c.key === 'recap' || c.key === 'export' ? L(`${c.what} — 바로 돎`, `${c.what} — runs right away`) : cmdWhat(c, look), onPress: () => press(c) })),
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
        isOn: c.name === 'ultra' && v.ultraOn,
        box: { borderStyle: 'single', borderColor: 'promptBorder', paddingX: 0.5, paddingY: 0.25, hover: { backgroundColor: 'promptBorderShimmer' } },
      })
    })
  }

  // 0.1.27(시안 6판 7 · 진단 12 N5): 하위 · 형제 · 문의 수는 칸 아랫줄에만(같은 값 두 곳을 없앰). 때는 줄지 않는다(좁으면 「1분 / 전」 두 줄로 꺾였다 — 진단 13 T5).
  // 역할 칩을 누르면 「역할 · 인계」 카드를 펴고 다시 누르면 접는다(acts.tool 토글 — 0.1.26 은 처음 편 칸이 역할 · 인계라 눌러도 안 바뀌어 보였다, 진단 13 T4)
  const selfHead = () => {
    if (!self) return null
    const role = ROLE_NAME[v.role]
    const rel = v.up ? L(`위 · ${bareTitle(v.up.title)}`, `Above · ${bareTitle(v.up.title)}`) : look.isApp ? L('위 없음', 'Nothing above') : ''
    return (
      <Box key="es-self" flexDirection="column">
        <Box key="es-self-title" columnGap={0.5} alignItems="center" minWidth={0}>
          {mark(ui, 'terminal', L('세션', 'Session'), TEXT_LOOK)}
          <Box flexShrink={1} minWidth={0}>
            <Text bold wrap="truncate-end">{bareTitle(self.title)}</Text>
          </Box>
          {/* 고정 이유는 줄 자료에서 셈한 값(0.1.25 — [전체] 이 세션 줄과 같게) */}
          {self.isStarred ? pinMark(ui, v.selfRow?.pinWhy ?? null) : null}
          {self.detached ? mark(ui, 'unlink', L('떼어 냄 — 앱 보고 안 옴', 'Detached — no app reports')) : null}
          <Box flexGrow={1} />
          <Box key="es-self-when" flexShrink={0}>
            <Text color="subtle" size="footnote">
              {agoText(self.lastAt, v.now)}
            </Text>
          </Box>
        </Box>
        <Box key="es-rel" columnGap={1} alignItems="center" marginTop={0.4} minWidth={0}>
          {pressBox(ui, 'es-role-chip', {
            content: [roleMark(ui, v.role), <Text bold>{role}</Text>],
            cover: coverCells(QUICK_ROW_PX / 7.71 + 0.5 + textCh(role)),
            onPress: () => acts.tool('role'),
            tip: pu.tool === 'role' ? L('역할 · 인계 카드를 접습니다', 'Folds role · handover') : L('역할 · 인계 카드를 폅니다', 'Opens role · handover'),
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

  const advisorRow = (c: AdvisorCall, i: number) => {
    const after = afterLine(c)
    // 「하던 / 일」 · 「그 / 뒤」로 꺾였다. 글자가 커지면 칸이 따라 넓어진다(최소 폭은 두 이름표의 글 열을 맞추는 값)
    const line = (name: string, label: string, text: string) => (
      <Box key={`es-adv-${name}${i}`} columnGap={0.5} alignItems="flex-start" marginTop={0.1} minWidth={0}>
        <Box minWidth={ADV_LABEL_W()} flexShrink={0}>
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
      <Box key={`es-adv-r${i}`} flexDirection="column" paddingY={0.3} minWidth={0}>
        <Box columnGap={0.5} alignItems="center" minWidth={0}>
          <Text>{stampText(c.at)}</Text>
          {c.isAgent ? (
            <Text color="subtle" size="footnote">
              {L('하위 에이전트', 'Subagent')}
            </Text>
          ) : null}
          {c.kind.includes('error') ? (
            <Text color="warning" size="footnote">
              {L('실패', 'Failed')}
            </Text>
          ) : null}
          <Box flexGrow={1} />
          {c.input !== null && c.output !== null ? (
            <Text color="subtle" size="footnote">
              {tokenPair(c.input, c.output)}
            </Text>
          ) : null}
        </Box>
        {c.doing ? line('d', L('하던 일', 'Before'), c.doing) : null}
        {after ? line('a', L('그 뒤', 'After'), after) : null}
      </Box>
    )
  }

  // 0.1.27: 머리 줄(요약 · ?) 아래 호출 줄을 덩이로(안쪽 카드를 뺌 — 덩이 사이 가는 선)
  const ADV_HELP: Help = {
    tip: L('부른 때 · 하던 일 · 그 뒤만 보입니다', 'Shows only when it was called, what came before and what came after'),
    lines: [
      L('advisor 를 부른 때 · 하던 일 · 그 뒤만 보입니다(조언 내용은 안 보임).', "Shows only when the advisor was called, what Claude was doing before and what it did after (the advice itself isn't shown)."),
      L('수는 입력창 위 advisor 칸과 같은 값입니다(하위 에이전트 포함).', 'The count is the same as on the advisor cell above the input (subagents included).'),
    ],
  }
  const advBody = (): unknown[][] => {
    const a = v.advisorLog
    const help = { id: 'adv:sum', help: ADV_HELP }
    if (!a) return [cardRow('es-adv-none', null, subText(L('아직 안 불렸습니다 — 불리면 호출 시점이 여기 남습니다.', 'Not called yet — each call will be listed here.')), help)]
    const calls = a.calls ?? []
    const inputs = calls.reduce((n, c) => n + (c.input ?? 0), 0)
    const outputs = calls.reduce((n, c) => n + (c.output ?? 0), 0)
    // 최근 것이 위. 「이전」을 펴도 ADV_MAX 줄까지 — 그 앞은 수만 말한다
    const recent = [...calls].reverse()
    const isMore = folds.has(ADV_MORE)
    const shown = recent.slice(0, isMore ? ADV_MAX : ADV_SHOW)
    const hidden = recent.length - shown.length
    const notes: string[] = []
    if (a.calls === null) notes.push(a.error ? L(`기록을 못 읽었습니다 — ${a.error}`, `Couldn't read the transcript — ${a.error}`) : L('기록을 읽는 중…', 'Reading the transcript…'))
    if (isMore && hidden > 0) notes.push(L(`그 앞 ${hidden}건은 여기 안 그립니다`, `${plural(hidden, 'earlier call')} not drawn here`))
    if (a.calls !== null && a.isFresh && a.calls.length !== a.count) notes.push(L(`기록에서 찾은 호출은 ${a.calls.length}건입니다`, `${plural(a.calls.length, 'call')} found in the transcript`))
    const tail = [
      !isMore && hidden > 0 ? (
        <Box key="es-adv-more" paddingY={0.2}>
          <Button key="es-adv-moreb" plain dimColor label={L(`▸ 이전 ${hidden}건 더 보기`, `▸ Show ${hidden} earlier`)} onPress={() => acts.fold(ADV_MORE)} />
        </Box>
      ) : null,
      isMore && recent.length > ADV_SHOW ? (
        <Box key="es-adv-more" paddingY={0.2}>
          <Button key="es-adv-moreb" plain dimColor label={L('▾ 이전 것 접기', '▾ Fold earlier')} onPress={() => acts.fold(ADV_MORE)} />
        </Box>
      ) : null,
      ...notes.map((text, i) => (
        <Box key={`es-adv-n${i}`} paddingY={0.2}>
          <Text color="subtle" size="footnote">
            {text}
          </Text>
        </Box>
      )),
    ].filter(Boolean)
    return [
      cardRow(
        'es-adv-head',
        null,
        withTip(
          ui,
          'es-adv-sum',
          <Text color="subtle" size="footnote">
            {[L(`모두 ${a.count}번`, `${plural(a.count, 'call')} in all`), calls.length > 0 ? tokenPair(inputs, outputs) : null].filter(Boolean).join(' · ')}
          </Text>,
          a.tip,
        ),
        help,
      ),
      ...shown.map((c, i) => [advisorRow(c, i)]),
      ...(tail.length > 0 ? [tail] : []),
    ]
  }

  // 고정된 세션은 고정을 먼저 푼다(앱이 막음)
  const askCard = (what: 'end' | 'archive') => {
    const isStarred = self?.isStarred === true
    const n = v.selfAttached
    const kids = n === 0 ? '' : v.isHanded ? L(` 붙은 세션 ${n}개는 먼저 떼어 남깁니다.`, ` ${plural(n, 'attached session')} will be detached first and kept.`) : L(` 붙은 세션 ${n}개도 같이 보관됩니다.`, ` ${plural(n, 'attached session')} will be archived too.`)
    const line =
      what === 'end'
        ? L(`끝남으로 표시할까요?${isStarred ? ' 고정도 풉니다.' : ''}`, `Mark this session ended?${isStarred ? ' It also unpins it.' : ''}`)
        : L(`${isStarred ? '고정을 풀고 보관할까요?' : '보관할까요?'} 사이드바에서 빠집니다.${kids}`, `${isStarred ? 'Unpin and archive?' : 'Archive?'} It leaves the sidebar.${kids}`)
    // 세션 관리 카드 안이라 카드를 또 두르지 않는다(0.1.21) — 닫기 줄 바로 아래 글 + 단추
    return (
      <Box key="es-ask" flexDirection="column" marginTop={0.4}>
        <Text>{line}</Text>
        <Box columnGap={1} alignItems="center" marginTop={0.3}>
          <Button
            key="es-ask-ok"
            variant="secondary"
            label={what === 'end' ? L('끝내기', 'End') : L('보관', 'Archive')}
            onPress={() => {
              acts.ask(null)
              void (what === 'end' ? acts.finish(v.selfId, true) : acts.archive(v.selfId, true))
            }}
          />
          <Button key="es-ask-no" plain dimColor label={L('취소', 'Cancel')} onPress={() => acts.ask(null)} />
        </Box>
      </Box>
    )
  }

  // 안 받은 글이 있으면 [받고 · 지우고 · 남기고 <동작>], 없으면 단추 하나(붙은 세션만이면 [같이 보관]). 보낸 글 · 붙은 세션 수는 누를 때 register 가 담은 것
  const preCard = (pre: PreAsk) => {
    const isTidy = pre.act === 'tidy'
    const act = pre.act === 'finish' ? L('끝내기', 'end') : L('보관', 'archive')
    const rows = pre.rows.map(r => ({ ...r, inN: v.heldItems.filter(x => x.from === r.id).length }))
    const one = rows[0]
    const head = isTidy ? L(`끝난 하위 ${pre.ids.length} 보관 전에`, `Before archiving ${plural(pre.ids.length, 'ended session')} below`) : L(`${pre.act === 'finish' ? '끝내기' : '보관'} 전에 — ${bareTitle(one?.title ?? '')}`, `Before you ${act} — ${bareTitle(one?.title ?? '')}`)
    const hasIn = rows.some(r => r.inN > 0)
    const msgRows = rows.filter(r => r.inN > 0 || r.outN > 0)
    const line = (key: string, text: string, tone?: 'warning') => (
      <Box key={key} minWidth={0}>
        <Text color={tone ?? 'subtle'} size="footnote">
          {`· ${text}`}
        </Text>
      </Box>
    )
    const lines = isTidy
      ? [
          ...(msgRows.length > 0 ? [line('es-pre-sum', L(`${pre.ids.length} 중 ${msgRows.length} 세션에 남은 메시지가 있습니다`, `${msgRows.length} of ${pre.ids.length} have messages left`))] : []),
          ...rows.flatMap(r => [
            ...(r.inN > 0 ? [line(`es-pre-in-${k(r.id)}`, L(`${bareTitle(r.title)} 안 받은 글 ${r.inN}`, `${bareTitle(r.title)}: ${r.inN} not taken`))] : []),
            ...(r.outN > 0 ? [line(`es-pre-out-${k(r.id)}`, L(`${bareTitle(r.title)} 안 읽힌 보낸 글 ${r.outN}`, `${bareTitle(r.title)}: ${r.outN} sent unread`))] : []),
            ...(r.attached > 0 ? [line(`es-pre-att-${k(r.id)}`, L(`${bareTitle(r.title)} 붙은 세션 ${r.attached}개 — 먼저 떼거나 같이 보관할지 정해 주세요`, `${bareTitle(r.title)}: ${plural(r.attached, 'attached session')} — detach first, or archive together`), 'warning')] : []),
          ]),
        ]
      : [
          ...(one && one.inN > 0 ? [line('es-pre-in', L(`그 세션이 보낸 글 ${one.inN}개를 아직 안 받았습니다`, `${plural(one.inN, 'message')} from it not taken yet`))] : []),
          ...(one && one.outN > 0 ? [line('es-pre-out', L(`그 세션에 보낸 글 ${one.outN}개가 아직 안 읽혔습니다`, `${plural(one.outN, 'message')} you sent it not read yet`))] : []),
        ]
    const plainLabel = isTidy ? (pre.rows.some(r => r.attached > 0) ? L('같이 보관', 'Archive together') : L('모두 보관', 'Archive all')) : pre.act === 'finish' ? L('끝내기', 'End') : L('보관', 'Archive')
    const label =(verb: string, en: string) => (isTidy ? L(`${verb} 모두 ${act}`, `${en} and ${act} all`) : L(`${verb} ${act}`, `${en} and ${act}`))
    const go = (choice: 'take' | 'drop' | 'keep') => () => void acts.pre?.(choice)
    const buttons = hasIn
      ? [
          <Button key="es-pre-take" variant="primary" label={label('받고', 'Take')} onPress={go('take')} />,
          linkButton('es-pre-drop', label('지우고', 'Delete'), go('drop')),
          linkButton('es-pre-keep', label('남기고', 'Keep'), go('keep')),
        ]
      : [<Button key="es-pre-keep" variant="secondary" label={plainLabel} onPress={go('keep')} />]
    return (
      <Box key="es-pre" flexDirection="column" rowGap={0.2} borderStyle="single" borderColor="promptBorder" paddingX={0.6} paddingY={0.3} marginBottom={0.4} minWidth={0}>
        <Box key="es-pre-h" columnGap={1} alignItems="center" minWidth={0}>
          <Box flexGrow={1} flexShrink={1} minWidth={0}>
            <Text bold>{head}</Text>
          </Box>
          <Button key="es-pre-x" plain dimColor label="✕" onPress={() => void acts.pre?.(null)} />
        </Box>
        {lines}
        <Box key="es-pre-b" columnGap={1} rowGap={0.4} flexWrap="wrap" alignItems="center" marginTop={0.2} minWidth={0}>
          {buttons}
        </Box>
        {hasIn ? (
          <Box key="es-pre-note" minWidth={0}>
            <Text color="subtle" size="footnote">
              {L('안 받은 글 = 모아 둔 보고 + 카드로 온 글', 'Not taken = held reports + cards left for this session')}
            </Text>
          </Box>
        ) : null}
      </Box>
    )
  }

  const kidModes = (list: readonly FamilyRow[]): string | null => {
    const order = ['auto', 'bypassPermissions', 'default', 'acceptEdits', 'plan', 'dontAsk']
    const n = new Map<string, number>()
    for (const r of list) if (r.mode) n.set(r.mode, (n.get(r.mode) ?? 0) + 1)
    if (n.size === 0) return null
    const keys = [...n.keys()].sort((a, b) => (order.indexOf(a) < 0 ? 99 : order.indexOf(a)) - (order.indexOf(b) < 0 ? 99 : order.indexOf(b)))
    return keys.map(m => `${modeName(m)} ${n.get(m)}`).join(' · ')
  }

  const kidsAskCard = (ids: readonly string[]) => {
    const names = ids.slice(0, 3).map(id => `「${bareTitle(v.metas.get(id)?.title ?? id)}」`).join(' · ')
    const more = ids.length > 3 ? L(` 외 ${ids.length - 3}`, ` and ${ids.length - 3} more`) : ''
    return (
      <Box key="es-kids-ask" flexDirection="column" borderStyle="round" borderColor="promptBorder" paddingX={1} marginTop={0.5}>
        <Text wrap="wrap">{L(`트리로만 묶인 하위 ${ids.length}개(${names}${more})는 이 세션이 연 세션이 아니라 앱이 먼저 물을 수 있습니다. 자동으로 내릴까요?`, `${plural(ids.length, 'session')} below only by tree (${names}${more}) weren't opened by this session, so the app may ask first. Lower them to Auto?`)}</Text>
        <Box key="es-kids-ask-btns" columnGap={1} rowGap={0.5} flexWrap="wrap" justifyContent="flex-end" marginTop={0.5}>
          <Button key="es-kids-ask-ok" variant="primary" label={L('내리기', 'Lower')} onPress={() => acts.kidsAutoOk?.()} />
          <Button key="es-kids-ask-no" label={L('그대로 두기', 'Leave as is')} onPress={() => acts.kidsAutoNo?.()} />
        </Box>
      </Box>
    )
  }

  // 「이 세션이 바로 합니다 …」 한 줄. 그 밖 모드면 「<모드>이라 바로 못 합니다」 + [이 세션을 권한 무시로] · [Claude 에게 줄마다 맡기기] + 흐린 작은 글 셋
  const tidyBox = (ended: readonly FamilyRow[]) => {
    const selfMode = v.metas.get(v.selfId)?.mode ?? null
    const name = modeName(selfMode) ?? L('이 모드', 'this mode')
    const small = (key: string, text: string) => (
      <Box key={key} minWidth={0}>
        <Text color="subtle" size="footnote">
          {text}
        </Text>
      </Box>
    )
    return (
      <Box key="es-tidy" flexDirection="column" rowGap={0.2} borderStyle="single" borderColor="promptBorder" paddingX={0.6} paddingY={0.3} marginTop={0.3} minWidth={0}>
        <Box key="es-tidy-h" columnGap={1} alignItems="center" minWidth={0}>
          <Box flexGrow={1} flexShrink={1} minWidth={0}>
            <Text bold wrap="truncate-end">
              {L(`끝난 하위 정리 ${ended.length}`, `Tidy ended ${ended.length}`)}
            </Text>
          </Box>
          {v.isBypass ? <Button key="es-ended-all" variant="secondary" label={L('정리', 'Tidy')} onPress={() => void acts.archiveAll(ended.map(r => r.id))} /> : null}
        </Box>
        {v.isBypass ? (
          small('es-tidy-now', L('이 세션이 바로 합니다 — 고정 풀기 · 보관 · Claude 안 거침(토큰 0)', 'This session does it directly — unpin · archive · no Claude turn (0 tokens)'))
        ) : (
          <Box key="es-tidy-ask" flexDirection="column" rowGap={0.2} minWidth={0}>
            <Box minWidth={0}>
              <Text color="warning" size="footnote">
                {L(`${name}${josa(name, '이라', '라')} 바로 못 합니다`, `In ${name} mode it can't do this directly`)}
              </Text>
            </Box>
            <Box key="es-tidy-b" columnGap={1} rowGap={0.4} flexWrap="wrap" alignItems="center" marginTop={0.2} minWidth={0}>
              <Button key="es-tidy-bypass" variant="secondary" label={L('이 세션을 권한 무시로', 'Switch this session to Bypass')} onPress={() => void acts.selfBypass?.()} />
              {linkButton('es-tidy-claude', L('Claude 에게 줄마다 맡기기', 'Ask Claude row by row'), () => void acts.archive(ended[0]!.id, true))}
            </Box>
            {small('es-tidy-s1', L('앞 단추는 앱 승인 카드 한 번 · 그 뒤로 이 세션은 검사 없이 실행', "The first shows the app's approval card once · after that this session runs without checks"))}
            {small('es-tidy-s2', L('줄마다 맡기면 보관 하나에 차례 하나 — 토큰이 듭니다', 'Row by row is one turn per archive — it costs tokens'))}
            {small('es-tidy-s3', L('붙은 하위가 있으면 같이 보관되지 않게 먼저 묻습니다', 'If one has sessions attached, it asks first so they are not archived along'))}
          </Box>
        )}
      </Box>
    )
  }

  const adoptList = () => (
    <Box key="es-adopt" flexDirection="column" marginTop={0.4}>
      <Text color="subtle">{L('밑으로 붙일 세션', 'Sessions to put under this one')}</Text>
      {v.adopt.slice(0, LIST_LIMIT).map(r => (
        <Box key={`es-adopt-${k(r.id)}`} columnGap={1} alignItems="center" marginTop={0.3} minWidth={0}>
          <Box flexGrow={1} minWidth={0}>
            <Text color="subtle" wrap="truncate-end">
              {r.title}
            </Text>
          </Box>
          <Button key={`es-adopt-go-${k(r.id)}`} dimColor label={L('붙이기', 'Put under')} onPress={() => acts.adopt(r.id)} />
        </Box>
      ))}
    </Box>
  )

  // 진행판 경로 칸(오케) — 세션 관리 [진행판 정하기 · 바꾸기] · 할 일 카드 「못 읽음」 [바꾸기]
  const boardInput = (path: string | null) => (
    <Box key="es-board-set" flexDirection="column" rowGap={0.4} marginTop={0.5}>
      <Text color="subtle">{L('진행판 — 하위 세션이 물음 · 끝을 적는 md(새 줄 수를 「지금」 줄 · 진행판 칸에 보입니다)', 'Progress board — the .md where sessions below write questions and their end (new lines show in Now and on the Board tile)')}</Text>
      {InputEl ? (
        <InputEl
          key="es-board-input"
          placeholder={L('진행판 md 경로를 붙여 넣고 Enter', 'Paste the progress board .md path, then Enter')}
          value={path ?? ''}
          submitLabel={L('정하기', 'Set')}
          onSubmit={(t: string) => acts.boardSet(t)}
        />
      ) : null}
      <Box>
        <Button key="es-board-cancelb" plain dimColor label={L('그대로 두기', 'Leave as is')} onPress={() => acts.fold('board-edit')} />
      </Box>
    </Box>
  )

  // 0.1.27(시안 6판 3): 하는 일로 세 줄 — 표시(고정 · Remote Control) · 정리(정리 · 제목 정리) · 닫기(끝내기 · 보관 — 바로 아래 묻는 글 · 떼어 내기 경고 색, 될 때만).
  // 단추 아래 늘 있던 풀이(0.1.26 es-mgr-note)는 「표시」 옆 ? 로. 오케 · 인계는 「역할 · 인계」, 들이기는 「하위 세션」 [밑으로 붙이기], 진행판 정하기는 「진행판」 칸
  // 고정 · Remote Control · 끝남 표시([설정]과 같은 onOff — key MGR_SWITCH, 누름은 register.tsx ui.message). 원격을 못 읽으면 흐림 + 「상태 못 읽음」,
  // 끝남을 켜면 바로 끝내지 않고 묻는 카드(끄기는 바로)
  // 흐린 까닭(note)은 이름 아래 줄 — 이름 옆에 두면 368 폭에서 「Remote Control」이 잘렸다(그림 o-mgr-bad-368)
  const swLine = (key: string, label: string, control: unknown, note?: string) => (
    <Box key={key} columnGap={0.5} alignItems="center" minWidth={0}>
      <Box flexDirection="column" flexShrink={1} minWidth={0}>
        <Text wrap="truncate-end">{label}</Text>
        {note ? (
          <Text key={`${key}-note`} color="subtle" size="footnote">
            {note}
          </Text>
        ) : null}
      </Box>
      <Box flexGrow={1} />
      {control}
    </Box>
  )
  const remoteLine = () => {
    const isBad = pu.remoteBad === v.selfId && pu.remote !== v.selfId
    const isOn = pu.remote === v.selfId
    // 고르기 · 글 화면은 지금 값을 다시 골라도 부른다 — 같은 값이면 아무것도 안 함(엔진 /remote-control 은 켜고 끄기를 뒤집어서)
    const pick = (on: boolean) => (on === isOn ? undefined : on ? acts.remoteOn(v.selfId) : acts.remoteOff(v.selfId))
    return swLine('es-mgr-sw-remote', 'Remote Control', onOff(ui, MGR_SWITCH.remote, isOn, pick, look.hasSwitch, isBad), isBad ? L('상태 못 읽음', "Can't read the state") : undefined)
  }
  const endLine = () => {
    const isEnded = v.selfRow?.isEnded === true
    const pick = (on: boolean) => (on === isEnded ? undefined : on ? acts.ask(pu.ask === 'end' ? null : 'end') : void acts.finish(v.selfId, false))
    return swLine('es-mgr-sw-end', L('끝남 표시', 'Ended'), onOff(ui, MGR_SWITCH.end, isEnded, pick, look.hasSwitch))
  }
  const switches = (lines: unknown[]) => (
    <Box key="es-mgr-sws" flexDirection="column" rowGap={look.isText ? 0 : 0.3} flexGrow={1} minWidth={0}>
      {lines}
    </Box>
  )
  const MGR_SW_HELP = L('고정 · Remote Control · 끝남 표시는 지금 상태입니다 — 바꾸면 바로 하고, 끝남 표시를 켤 때만 한 번 묻습니다.', 'Pin, Remote Control and Ended show the current state — flipping one acts right away; turning Ended on asks once.')
  const MGR_SW_HELP_OFF = L('Remote Control · 끝남 표시는 지금 상태입니다 — 바꾸면 바로 하고, 끝남 표시를 켤 때만 한 번 묻습니다.', 'Remote Control and Ended show the current state — flipping one acts right away; turning Ended on asks once.')
  const TIDY_HELP_TIP = L('스위치는 지금 상태 · [정리] · [제목 정리]는 입력칸에 지시 글', 'Switches show the state · Clean up and Tidy title put an instruction in the prompt box')
  const TIDY_HELP_LINE = L('[정리] · [제목 정리]는 입력칸에 지시 글을 넣습니다 · 다시 누르면 뺍니다.', 'Clean up and Tidy title put an instruction in the prompt box · press again to take it out.')
  const CLEAN_HINT = canFix
    ? L('입력칸에 정리 글을 넣었습니다 — 앞에 「하위 세션 → 일 → 보고」 세 줄 · 다시 누르면 뺍니다', 'Put the clean-up text in the prompt box — led by three lines: sessions below → work → report · press again to take it out')
    : L('입력칸에 정리 글을 넣었습니다 — 보내면 처리합니다 · 다시 누르면 뺍니다', 'Put the clean-up text in the prompt box — it runs when you send it · press again to take it out')
  const mgrBody = (): unknown[][] => {
    if (!self) return []
    if (!look.isApp) return mgrOffBody()
    const canDetach = v.canDetach.has(v.selfId)
    const help: Help = {
      tip: TIDY_HELP_TIP,
      lines: [
        MGR_SW_HELP,
        TIDY_HELP_LINE,
        ...(canDetach ? [L('떼어 내기는 되돌릴 수 없습니다.', "Detach can't be undone.")] : []),
      ],
    }
    return [
      [
        ...cardRow(
          'es-mgr-show',
          L('표시', 'Show'),
          switches([swLine('es-mgr-sw-pin', L('고정', 'Pin'), onOff(ui, MGR_SWITCH.pin, self.isStarred, on => (on === self.isStarred ? undefined : acts.pin(v.selfId, on)), look.hasSwitch)), remoteLine(), endLine()]),
          { id: 'mgr:show', help },
        ),
        pu.ask === 'end' ? askCard('end') : null,
      ],
      [
        ...cardRow('es-mgr-tidy', L('정리', 'Clean up'), [
          <Button key="es-s-clean" variant="secondary" label={L('정리', 'Clean up')} onPress={() => void acts.clean(v.selfId)} />,
          linkButton('es-s-title', L('제목 정리', 'Tidy title'), () => void acts.titleTidy()),
        ]),
        folds.has('clean-hint') ? (
          <Box key="es-clean-hint" paddingBottom={0.3}>
            <Text color="subtle" size="footnote">
              {CLEAN_HINT}
            </Text>
          </Box>
        ) : null,
      ],
      [
        ...cardRow('es-mgr-close', L('닫기', 'Close'), [
          <Button key="es-s-arch" variant="secondary" label={L('보관', 'Archive')} onPress={() => acts.ask(pu.ask === 'archive' ? null : 'archive')} />,
          canDetach ? dangerButton('es-s-detach', L('떼어 내기', 'Detach'), () => acts.detach(v.selfId), L('되돌릴 수 없습니다 — 연 세션에 보고가 더는 안 갑니다', "Can't be undone — reports stop going to the session that opened this one")) : null,
        ]),
        pu.ask === 'archive' ? askCard('archive') : null,
      ],
    ]
  }

  // 고정 · 보관 · 떼어 내기는 넓은 자리에선 흐린 줄 + 까닭 한 줄, 좁은 칸에선 뺀다(결정 1)
  const mgrOffBody = (): unknown[][] => {
    const help: Help = { tip: TIDY_HELP_TIP, lines: [MGR_SW_HELP_OFF, TIDY_HELP_LINE] }
    return [
      [
        ...cardRow('es-mgr-show', L('표시', 'Show'), switches([remoteLine(), endLine()]), { id: 'mgr:show', help }),
        pu.ask === 'end' ? askCard('end') : null,
      ],
      [
        ...cardRow('es-mgr-tidy', L('정리', 'Clean up'), [
          <Button key="es-s-clean" variant="secondary" label={L('정리', 'Clean up')} onPress={() => void acts.clean(v.selfId)} />,
          linkButton('es-s-title', L('제목 정리', 'Tidy title'), () => void acts.titleTidy()),
        ]),
        folds.has('clean-hint') ? (
          <Box key="es-clean-hint" paddingBottom={0.3}>
            <Text color="subtle" size="footnote">
              {CLEAN_HINT}
            </Text>
          </Box>
        ) : null,
      ],
      look.isNarrow
        ? []
        : cardRow(
            'es-mgr-no',
            L('안 됨', 'Not now'),
            <Box key="es-mgr-no-line" columnGap={1} alignItems="center" flexGrow={1} minWidth={0}>
              {mark(ui, 'circleX', APP_ONLY_MGR(), SUB_LOOK)}
              <Box flexShrink={0}>
                <Text color="subtle">{APP_ONLY_MGR()}</Text>
              </Box>
              <Box flexShrink={1} minWidth={0}>
                <Text color="subtle" size="footnote">
                  {APP_ONLY()}
                </Text>
              </Box>
            </Box>,
          ),
    ].filter(s => s.length > 0)
  }

  // 안 되는 줄은 흐린 줄 + 까닭 한 줄(정본 9절 결정 4). 메인 = 세션 트리 맨 위 오케(meta.md#roleOf — 0.1.29 ③ A5). 하위가 있는 메인은 바꾸기로 안 내린다(결정 2) —
  // 하위가 없는 메인은 [오케 풀기](단독으로 — 맨 위 단독이 [오케로] 를 누르면 늘 메인이 되어 되돌릴 길이 없어서 ★)
  // 0.1.27(시안 6판 3): 줄 셋 — 인계 · 바꾸기 · 안 됨(흐린 x 원 + 이름 + 까닭). 0.1.26 의 흐린 머리 줄 둘(인계 — … · 바꾸기 — …)과 「입력칸에 지시 글을 넣습니다」는 「인계」 옆 ? 로
  const ROLE_HELP: Help = {
    tip: L('인계 — 같은 역할로 다음 차를 열고 끝남', 'Hand over — open the next round in the same role, then end'),
    lines: [
      L('인계 — 같은 역할로 다음 차를 열고 끝남. [인계]는 입력칸에 지시 글을 넣습니다.', 'Hand over — open the next round in the same role, then end. Hand over puts an instruction in the prompt box.'),
      L('바꾸기 — 역할만(같은 일 · 이름만 바뀔 때).', 'Change — the role only (same work, only the name changes).'),
    ],
  }
  const roleBody = (): unknown[][] => {
    if (!self) return []
    const role = v.role
    const no = (key: string, label: string, why: string) => (
      <Box key={key} columnGap={1} alignItems="center" minWidth={0}>
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
    if (role === 'main' && kids.length > 0) nos.push(no('es-r-no-main', L('다른 역할로', 'Other role'), L(`하위 ${kids.length}개가 있어 메인이 비게 되어 안 됨 — 메인 인계로 넘기고 끝냄`, `${kids.length} below would lose their main — hand the main over`)))
    if (role === 'main' && kids.length === 0) buttons.push(<Button key="es-s-orche" variant="secondary" label={L('오케 풀기', 'Step down')} onPress={() => acts.orche(v.selfId, false)} />)
    if (role === 'orche') {
      if (kids.length > 0) nos.push(no('es-r-no-unorche', L('오케 풀기', 'Step down'), L(`하위 ${kids.length}개가 아직 있음 — 다 끝난 뒤에(아니면 오케 인계)`, `${kids.length} below still open — after they end, or hand over`)))
      else buttons.push(<Button key="es-s-orche" variant="secondary" label={L('오케 풀기', 'Step down')} onPress={() => acts.orche(v.selfId, false)} />)
    }
    // 0.1.32 J1: 맨 위 단독은 오케로 바꾸면 곧 메인이라 [메인으로](0.1.31 의 [오케로] 옆 흐린 줄 「맨 위라 메인이 됩니다」는 단추가 말해 뺌)
    if (role === 'sub' || role === 'solo') buttons.push(<Button key="es-s-orche" variant="secondary" label={role === 'solo' ? L('메인으로', 'Make main') : L('오케로', 'Make orchestrator')} onPress={() => acts.orche(v.selfId, true)} />)
    if (role === 'sub' && canDetach) {
      buttons.push(withTip(ui, 'es-r-solo-box', <Button key="es-r-solo" variant="secondary" label={L('단독으로 — 떼어 내기', 'Solo — detach')} onPress={() => acts.detach(v.selfId)} />, L('되돌릴 수 없습니다 — 연 세션에 보고가 더는 안 갑니다', "Can't be undone — reports stop going to the session that opened this one")))
    }
    const up = v.upPick
    if (up && up.choices.length > 0) {
      const { Select } = ui
      const options = [{ value: 'app', label: L('위 세션 고르기', 'Pick the session above') }, ...up.choices.map(id => ({ value: id, label: fitCells(bareTitle(v.metas.get(id)?.title ?? id), 28) }))]
      buttons.push(<Select key="es-r-up" label={L('서브로', 'Sub of')} value={up.value} options={options} onSelect={(x: string) => (x === 'app' ? undefined : acts.setOwner(v.selfId, x))} />)
    }
    // 맨 위 단독은 [메인으로](오케 표시)가 곧 메인이라 「메인으로」 안 됨 줄이 없다
    if (role === 'sub' || role === 'orche') nos.push(no('es-r-no-tomain', L('메인으로', 'Make main'), v.mainTitle ? L(`메인은 「${fitCells(bareTitle(v.mainTitle), 20)}」 — 메인 인계로만`, `The main is “${fitCells(bareTitle(v.mainTitle), 20)}” — only by handing the main over`) : L('이 세션 트리에 메인이 없습니다 — 맨 위 세션이 오케면 메인', 'This session tree has no main — the top session is main when it is an orchestrator')))
    return [
      cardRow('es-role-hand', L('인계', 'Handover'), <Button key="es-s-handoff" variant="secondary" label={L(`${ROLE_NAME[role]} 인계`, `Hand over (${ROLE_NAME[role].toLowerCase()})`)} onPress={() => acts.handoff()} />, { id: 'role:hand', help: ROLE_HELP }),
      buttons.length > 0 ? cardRow('es-role-chg', L('바꾸기', 'Change'), buttons) : [],
      nos.length > 0
        ? cardRow(
            'es-role-no',
            L('안 됨', 'Not now'),
            <Box flexDirection="column" rowGap={0.3} flexGrow={1} minWidth={0}>
              {nos}
            </Box>,
          )
        : [],
    ].filter(s => s.length > 0)
  }

  // 펴면 바로 아래 글 칸(깨우는 값 카드 길 그대로). canGo = [가기]도(0.1.29 ③ ⓓ 「위 세션」 칸 메인 줄)
  const sendLine = (r: SendRow, help?: RowHelp, canGo = false): unknown[] => {
    const at = `${COMPOSE_AT}${r.id}`
    const el = k(r.id)
    const isWriting = pu.sending === at
    return [
      ...cardRow(
        `es-sendto-${el}`,
        r.tag,
        <Box columnGap={1} alignItems="center" flexGrow={1} minWidth={0}>
          {titleCell(bareTitle(r.title))}
          <Button key={`es-sendto-b-${el}`} variant="secondary" label={isWriting ? L('닫기', 'Close') : L('보내기', 'Send')} onPress={() => acts.send(at)} />
          {canGo ? <Button key={`es-sendto-go-${el}`} plain label={L('가기', 'Go')} onPress={() => acts.go(r.id)} /> : null}
        </Box>,
        help,
      ),
      isWriting ? sending(`c${el}`, r.id, r.title, true) : null,
    ]
  }

  const SENT_HELP_LINE = L('보낸 글은 보냄 → 도착 → 읽음 → 답함으로 보입니다(앱 도착 기록).', "Sent messages show Sent → Arrived → Read → Replied (from the app's delivery record).")
  const sentRow = (key: string, list: readonly SentRow[], help?: RowHelp) => cardRow(key, L('보낸 글', 'Sent'), list.length === 0 ? subText(L('없음', 'None')) : sentList(`${key}-l`, list), help)

  // 「보고는 사용자에게」(시안 5.1 정할 것 1), 단독은 흐린 칸에 한 줄. 0.1.27: 줄 꼴 — 이름표 「앞 차수」(세션 트리 ②) · 「연 세션」 · 「주인」(위 줄) · 「보고」 · 「보낸 글」, 풀이는 위 줄 이름표 옆 ?
  const MSG_HELP_LINES = [L('[보고 꼴로]는 끝난 것 · 하는 중 · 막힌 것 · 기다리는 결정 · 다음 다섯 칸을 입력칸에 넣습니다.', 'Report form puts five parts in the prompt box: done, in progress, blocked, decisions waiting, next.'), SENT_HELP_LINE]
  const MAIN_HELP_LINE = L('메인 = 이 세션 트리 맨 위 오케 — 입력창 「전달」 · >>메인 과 같은 세션입니다.', 'Main = the orchestrator at the top of this session tree — the same session as Forward and >>main on the line above the input.')
  const msgBody = (): unknown[][] => {
    if (v.role === 'solo') return [cardRow('es-msg-none', L('위', 'Above'), subText(L('위가 없어 쓸 일이 없습니다 — 다른 세션과는 「다른 세션」 칸으로.', 'Nothing above, so nothing to use here — for other sessions, use the Others tile.')))]
    const reportRow = (label: string) => cardRow('es-msg-report-row', L('보고', 'Report'), <Button key="es-msg-report" variant="secondary" label={label} onPress={() => void acts.report()} />)
    if (!v.up) {
      const help: RowHelp = { id: 'msg:top', help: { tip: L('보고는 사용자에게(채팅)', 'Reports go to you (in the chat)'), lines: [MSG_HELP_LINES[0]!, L('다른 세션과는 「다른 세션」 칸으로.', 'For other sessions, use the Others tile.')] } }
      return [cardRow('es-msg-top', L('위', 'Above'), <Text>{L('없음 — 보고는 사용자에게(채팅)', 'None — reports go to you (in the chat)')}</Text>, help), ...(v.mainRow ? [sendLine(v.mainRow, undefined, true)] : []), reportRow(L('보고 꼴로 — 채팅에', 'Report form — in the chat'))]
    }
    const up = v.up
    const main = v.mainRow
    return [
      sendLine(up, { id: 'msg:up', help: { tip: L('[보고 꼴로] · 보낸 글 풀이', 'About Report form and Sent'), lines: main ? [...MSG_HELP_LINES, MAIN_HELP_LINE] : MSG_HELP_LINES } }),
      ...(main ? [sendLine(main, undefined, true)] : []),
      reportRow(L('보고 꼴로', 'Report form')),
      sentRow('es-msg-sent', v.sent.filter(s => s.to === up.id)),
      ...((v.upHeld ?? 0) > 0 ? [cardRow('es-msg-upheld', L('모아 둠', 'Held'), subText(L(`내 보고 ${v.upHeld}개 — 위 세션이 아직 안 받았습니다`, `${plural(v.upHeld ?? 0, 'report')} of mine not taken yet by the session above`), 'warning'))] : []),
      ...heldCards('es-msg-held', heldUp),
    ]
  }

  const COL_HELP: Help = { tip: L('형제 = 같은 위 세션 밑의 세션', 'Siblings: same session above'), lines: [L('형제 = 같은 위 세션 밑의 세션입니다.', 'Siblings are the sessions under the same session above.'), SENT_HELP_LINE] }
  const colBody = (): unknown[][] => {
    if (sibs.length === 0) return [cardRow('es-col-none', null, subText(L('같은 위 밑 형제가 없습니다.', 'No siblings under the same session above.')))]
    const sentSib = v.sent.filter(s => sibIds.has(s.to))
    return [
      [
        <Box key="es-sibs" flexDirection="column" minWidth={0}>
          {capped(sibs, 'sibs', sibRow)}
        </Box>,
      ],
      sentRow('es-col-sent', sentSib, { id: 'col:sent', help: COL_HELP }),
      ...heldCards('es-col-held', heldSib),
    ]
  }

  const INQ_HELP: Help = {
    tip: L('다른 세션 = 위 · 하위 · 형제 밖', 'Other sessions = outside above, below and siblings'),
    lines: [L('다른 세션 = 위 · 하위 · 형제 밖의 세션입니다(메인 줄은 「위 세션」 칸).', 'Other sessions are the ones outside above, below and siblings (the main row is in the Above tile).'), SENT_HELP_LINE],
  }
  // [보내기]는 위 · 형제 줄과 같은 보낼 칸(sendLine 길)
  const openRow = (r: OpenRow, label: string, showTag: boolean): unknown[] => {
    const at = `${COMPOSE_AT}${r.id}`
    const el = k(r.id)
    const isWriting = pu.sending === at
    return [
      ...cardRow(
        `es-open-${el}`,
        label,
        <Box columnGap={1} alignItems="center" flexGrow={1} minWidth={0}>
          {r.depth > 0 ? (
            <Box flexShrink={0} marginLeft={(r.depth - 1) * 2}>
              <Text color="subtle">└</Text>
            </Box>
          ) : null}
          {titleCell(bareTitle(r.title))}
          {showTag && r.tag ? (
            <Box flexShrink={0}>
              <Text color="subtle" size="footnote">
                {r.tag}
              </Text>
            </Box>
          ) : null}
          <Button key={`es-open-b-${el}`} variant="secondary" label={isWriting ? L('닫기', 'Close') : L('보내기', 'Send')} onPress={() => acts.send(at)} />
          {r.canGo ? <Button key={`es-open-go-${el}`} plain label={L('가기', 'Go')} onPress={() => acts.go(r.id)} /> : null}
        </Box>,
      ),
      isWriting ? sending(`o${el}`, r.id, r.title, true) : null,
    ]
  }
  const openDesk = (): unknown[][] => (v.openDesk.length === 0 ? [] : [v.openDesk.flatMap((r, i) => openRow(r, i === 0 ? OPEN_DESK() : '', true))])
  const openOut = (): unknown[][] =>
    v.openOut.length === 0
      ? []
      : [
          [
            <Box key="es-open-out-head" paddingY={0.2} minWidth={0}>
              <Text color="subtle" size="footnote">
                {OPEN_OUT_HEAD()}
              </Text>
            </Box>,
            ...v.openOut.flatMap((r, i) => openRow(r, i > 0 && v.openOut[i - 1]!.tag === r.tag ? '' : (r.tag ?? ''), false)),
          ],
        ]
  const inqBody = (): unknown[][] => [
    ...openDesk(),
    ...openOut(),
    sentRow('es-inq-sent', inqSent, { id: 'inq:sent', help: INQ_HELP }),
    ...heldCards('es-inq-held', heldOther),
    // 0.1.29 ③ F9: 입력창 >>이름 은 안 보낸다 — 데스크톱 앱 세션 패널엔 다른 세션 트리 세션 [보내기] 줄이 없어(결정 6) Claude 에게 맡기는 길을 적는다
    cardRow('es-send-find', L('그 밖', 'Others'), subText(L('입력창 >>위 · >>메인 은 위로만 — 그 밖 세션은 Claude 에게 보내 달라고 하세요', '>>up and >>main in the prompt send only upward — for any other session, ask Claude to send it'))),
  ]

  // 서브 · 단독의 「손질은 메인 · 오케만」은 「받는 법」 옆 ? 로. 하위가 없어도 메인 · 오케는 [밑으로 붙이기]를 둔다(설치판 들이기가 하위 없을 때도 있었다)
  const repBody = (): unknown[][] => {
    const ended = kids.filter(r => r.isEnded)
    const fixLine = canFix ? L('손질은 줄마다 ⋯ 이나 「손질」 줄에서 합니다(오케 세션에서만).', 'Manage with ⋯ on each row or on the Manage row (orchestrator sessions only).') : L('하위 세션 손질은 메인 · 오케만 — 오케로 바꾸면 손질이 생깁니다.', 'Only main and orchestrator sessions manage the sessions below — make this an orchestrator to get those tools.')
    const recvHelp: RowHelp = { id: 'rep:recv', help: { tip: L('받는 법 바꾸기는 [설정] 「자식 보고」', 'Change how reports come in Settings → Child reports'), lines: [L('받는 법 바꾸기는 [설정] 「자식 보고」.', 'Change how reports come in Settings → Child reports.'), fixLine] } }
    const out: unknown[][] = []
    // 그 줄이 「나머지」에 접혀 안 그려지면 칸 맨 위(0.1.31 자리)
    const pre = pu.pre
    const drawnKids = kids.length <= LIST_LIMIT || folds.has('kids') ? kids : kids.slice(0, LIST_LIMIT)
    const preAtTidy = pre?.act === 'tidy' && canFix && ended.length > 0
    const preAtRow = pre !== null && pre !== undefined && pre.act !== 'tidy' && drawnKids.some(r => r.id === pre.ids[0])
    if (pre && !preAtTidy && !preAtRow) out.push([preCard(pre)])
    const modeLine = kidModes(kids)
    const canAuto = canFix && kids.some(r => !r.isEnded && !r.isArchived && r.mode === 'bypassPermissions')
    if (modeLine !== null)
      out.push(
        cardRow(
          'es-rep-mode',
          L('권한 모드', 'Modes'),
          [
            <Box key="es-rep-mode-tx" flexGrow={1} flexShrink={1} minWidth={0}>
              <Text key="es-rep-mode-t">{modeLine}</Text>
            </Box>,
            canAuto ? <Button key="es-kids-auto" variant="secondary" label={L('하위 모두 자동으로', 'All below to Auto')} onPress={() => acts.kidsAuto?.()} /> : null,
          ],
        ),
      )
    if (pu.kidsAsk && pu.kidsAsk.length > 0) out.push([kidsAskCard(pu.kidsAsk)])
    if (kids.length === 0) out.push(cardRow('es-rep-none', null, subText(L('하위 세션이 없습니다.', 'No sessions below.'))))
    else {
      out.push([
        <Box key="es-kids" flexDirection="column" minWidth={0}>
          {capped(kids, 'kids', kidRow)}
        </Box>,
      ])
      out.push(cardRow('es-rep-recv', L('받는 법', 'Receive'), <Text>{v.settings.reports.value === 'app' ? L('앱 그대로', "The app's way") : L('모아 둠', 'Held in the panel')}</Text>, recvHelp))
    }
    if (canFix && ended.length > 0) out.push([tidyBox(ended), preAtTidy && pre ? preCard(pre) : null])
    if (canFix) {
      out.push([
        ...cardRow(
          'es-rep-fix',
          L('손질', 'Manage'),
          [
            tagBox('es-rep-fix-tag', L('오케 몫', 'Orchestrator')),
            v.adopt.length > 0 ? <Button key="es-adopt-b" variant="secondary" label={L(`밑으로 붙이기 ${folds.has('adopt') ? '▾' : '▸'}`, `Put under this one ${folds.has('adopt') ? '▾' : '▸'}`)} onPress={() => acts.fold('adopt')} /> : null,
          ],
          kids.length === 0 ? { id: 'rep:fix', help: { tip: L('손질은 줄마다 ⋯ · 이 줄에서', 'Manage with ⋯ on each row · on this row'), lines: [fixLine] } } : undefined,
        ),
        v.adopt.length > 0 && folds.has('adopt') ? adoptList() : null,
      ])
    }
    return out
  }

  // 단독 = 흐린 칸에 한 줄. 물음 · 끝을 적는 곳 풀이(0.1.26 흐린 줄)는 ? 로
  const brdBody = (): unknown[][] => {
    const b = v.board
    if (b) {
      const help: RowHelp = { id: 'brd:own', help: { tip: L('하위 세션이 물음 · 끝을 적는 md', 'The .md where sessions below write questions and their end'), lines: [L('진행판 — 하위 세션이 물음 · 끝을 적는 md(새 줄 수를 「지금」 줄 · 진행판 칸에 보입니다).', 'Progress board — the .md where sessions below write questions and their end (new lines show in Now and on the Board tile).')] } }
      const edit = folds.has('board-edit') ? boardInput(b.path) : null
      if (b.path === null) {
        return [
          [
            ...cardRow(
              'es-board-none',
              L('파일', 'File'),
              <Box columnGap={1} alignItems="center" flexGrow={1} minWidth={0}>
                <Box flexGrow={1} flexShrink={1} minWidth={0}>
                  <Text color="warning">{L('진행판 자리가 없습니다', 'No progress board set')}</Text>
                </Box>
                <Button key="es-board-edit" variant="secondary" label={L('자리 정하기', 'Set file')} onPress={() => acts.fold('board-edit')} />
              </Box>,
              help,
            ),
            edit,
          ],
        ]
      }
      return [[...boardRows(b.path, b.fresh, help), edit]]
    }
    if (v.role === 'solo') return [cardRow('es-board-solo', null, subText(L('위도 아래도 없어 쓸 진행판이 없습니다.', 'Nothing above or below, so no progress board to use.')))]
    const help: RowHelp = { id: 'brd:up', help: { tip: L('물음 · 끝은 위 진행판에 적습니다', 'Questions and the end go on the progress board above'), lines: [L('물음 · 끝은 위 진행판에 적습니다 — Claude 가 씁니다.', 'Questions and the end go on the progress board above — Claude writes them.')] } }
    return [
      cardRow(
        'es-board-up',
        L('위 세션 것', 'Above'),
        v.boardHint ? (
          <Box columnGap={0.5} alignItems="center" flexGrow={1} minWidth={0}>
            {mark(ui, 'notebook', L('진행판', 'Progress board'), TEXT_LOOK)}
            <Box flexShrink={1} minWidth={0}>
              <Text wrap="truncate-end">{v.boardHint.name}</Text>
            </Box>
            <Box flexShrink={1} minWidth={0}>
              <Text color="subtle" size="footnote" wrap="truncate-end">{L(`${fitCells(bareTitle(v.boardHint.owner), 24)}의 진행판`, `board of ${fitCells(bareTitle(v.boardHint.owner), 24)}`)}</Text>
            </Box>
          </Box>
        ) : (
          subText(L('위에 진행판이 없습니다.', 'No progress board above.'))
        ),
        help,
      ),
    ]
  }

  const CMD_HELP: Help = {
    tip: L('포크 · 곁 질문 · 되돌리기와 명령', 'Forks, side questions, rewinds and commands'),
    lines: [L('/fork · /btw 는 지금 지점에서 씁니다.', '/fork and /btw work from the current point.'), L('앞 지점에서 가르기 · 되돌리기는 채팅 메시지의 단추로 바로 됩니다.', "Forking or rewinding from an earlier point works right from a chat message's buttons.")],
  }
  const cmdBody = (): unknown[][] => [
    cardRow(
      'es-cmd-row',
      null,
      <Box key="es-self-chips" columnGap={0.5} rowGap={0.5} flexWrap="wrap" alignItems="center" flexGrow={1} minWidth={0}>
        {chips()}
      </Box>,
      { id: 'cmd:chips', help: CMD_HELP },
    ),
  ]

  // 칸 = 테두리 칸 안 그림 + 굵은 이름 + 꺾쇠 + 흐린 한 줄, 칸 전체가 덮개 단추 하나(es-t-<칸>). 칸 폭은 칸 수로 셈한다(엔진 Box 에 flexBasis 가 없다)
  const tileW = Math.max(TILE_MIN, Math.round(((cols - 2 * TILE_GAP) / 3) * 100) / 100)
  // 그 표면은 단추 글이 안 줄어(웹뷰 단추 nowrap) 칸마다 최소 폭(min — 칸)을 주고, 셋이 안 들면 줄이 꺾인다
  const tileSize = (min: number) => (look.fluid ? { width: '0%', flexGrow: 1, flexShrink: 1, minWidth: Math.ceil(min * 10) / 10 } : { width: tileW, flexShrink: 0, minWidth: 0 })
  const cntCh = (t: Tool) => (t.cnt > 0 ? 0.35 + fluidCh(String(t.cnt)) : 0)
  const tile = (t: Tool) => {
    const isOn = pu.tool === t.k
    const dim = !t.use
    if (t.appOnly) {
      return (
        <Box key={`es-t-${t.k}-box`} flexDirection="column" {...tileSize(FLUID_TILE_CH + fluidCh(t.name))} borderStyle="round" borderColor="promptBorderShimmer" paddingX={TILE_PAD_X} paddingY={TILE_PAD_Y}>
          <Box columnGap={0.35} alignItems="center" minWidth={0}>
            {t.icon(true) as never}
            <Box flexShrink={1} minWidth={0}>
              <Text bold size="footnote" wrap="truncate-end" color="subtle" dimColor>
                {t.name}
              </Text>
            </Box>
          </Box>
          <Box minWidth={0}>
            <Text color="subtle" size="caption" wrap="truncate-end" dimColor>
              {t.sub}
            </Text>
          </Box>
        </Box>
      )
    }
    if (isTextPress(ui)) {
      const label = `${t.name} ${isOn ? CHEVRON.open : CHEVRON.closed}`
      return (
        <Box
          key={`es-t-${t.k}-box`}
          flexDirection="column"
          {...tileSize(FLUID_TILE_CH + fluidCh(label) + FLUID_BUTTON_CH + cntCh(t))}
          borderStyle="round"
          borderColor={isOn ? 'suggestion' : dim ? 'promptBorderShimmer' : 'promptBorder'}
          {...(dim ? {} : { backgroundColor: CARD_BG })}
          paddingX={TILE_PAD_X}
          paddingY={TILE_PAD_Y}
        >
          <Box columnGap={0.35} alignItems="center" minWidth={0} flexWrap="nowrap">
            {t.icon(dim) as never}
            {/* 이름은 label 로도 — 웹뷰는 label 을 안 원소보다 먼저 그린다(엔진이 안 글을 사이 없이 이어 채움 — 「명령›」, 11-19 잼) */}
            <Button key={`es-t-${t.k}`} dimColor={dim} label={label} onPress={() => acts.tool(t.k)}>
              <Text bold>{t.name}</Text>
              {chevron(ui, isOn, dim) as never}
            </Button>
            {t.cnt > 0 ? (
              <Text key={`es-t-${t.k}-cnt`} bold color="warning">
                {String(t.cnt)}
              </Text>
            ) : null}
          </Box>
          <Box minWidth={0}>
            <Text color="subtle" size="caption" wrap="truncate-end" {...(dim ? { dimColor: true } : {})}>
              {t.sub}
            </Text>
          </Box>
        </Box>
      )
    }
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
        paddingX={TILE_PAD_X}
        paddingY={TILE_PAD_Y}
      >
        <Box columnGap={0.35} alignItems="center" minWidth={0}>
          {t.icon(dim)}
          <Box flexShrink={1} minWidth={0}>
            <Text bold size="footnote" wrap="truncate-end" {...(dim ? { color: 'subtle', dimColor: true } : {})}>
              {t.name}
            </Text>
          </Box>
          {/* 노트: panel.md#toolBoard — 꺾쇠(0.1.27 시안 6판 2 · 진단 13 T3 「칸이 상태 카드처럼 보임」): 접힘 ›(흐림) · 펼침 ⌄(파랑 — 펼친 칸 테와 같은 suggestion) — 이름 바로 뒤
              (시안 margin-left −3px). 글자로 둔다 — 그림(Svg)이면 칸마다 약 350자(도구판 아홉 칸 약 3천 자 — 크기 시험이 그리기 선에 닿음) · 칸 이름 자리도 더 줄었다. 이름이 줄어도 꺾쇠는 안 준다 */}
          <Box key={`es-t-${t.k}-cv`} flexShrink={0} marginLeft={-0.2}>
            {chevron(ui, isOn, dim)}
          </Box>
        </Box>
        <Box minWidth={0}>
          <Text color="subtle" size="caption" wrap="truncate-end" {...(dim ? { dimColor: true } : {})}>
            {t.sub}
          </Text>
        </Box>
        {/* 노트: panel.md#toolBoard — 수 표(0.1.26): 칸 오른쪽 위 모서리에 걸친 주황 둥근 칸 · 글은 inverseText(어두운 테마 = 어두운 글 · 밝은 테마 = 흰 글).
            절대 위치는 정수 칸만 받아(엔진) 모서리 위치(0, 0)에서 음수 여백으로 밖으로 민다.
            0.1.29 ③ A1: 0.1.28 까지 수 표가 덮개 뒤에 그려져 그 자리 누름을 수 표가 받아(추정) 칸이 안 열렸다 → 수 표를 덮개 앞에 그리고(덮개가 위에 겹침),
            수 표가 있는 칸은 덮개를 수 표만큼 위 · 오른쪽으로 늘린다(칸 밖에 걸친 부분도 칸 펴기). 수 표 안 단추는 크기 최악 시험이 그리기 선을 넘어 안 씀 */}
        {t.cnt > 0 ? (
          <Box key={`es-t-${t.k}-cnt`} position="absolute" top={0} right={0} marginTop={CNT_SHIFT_Y} marginRight={CNT_SHIFT_X} borderStyle="round" borderColor="warning" backgroundColor="warning" paddingX={0.45} paddingY={0}>
            <Text bold size="caption" color="inverseText">
              {String(t.cnt)}
            </Text>
          </Box>
        ) : null}
        <Box position="absolute" top={0} left={0} right={0} bottom={0} alignItems="stretch" {...(t.cnt > 0 ? { marginTop: CNT_SHIFT_Y, marginRight: CNT_SHIFT_X } : {})}>
          <Button key={`es-t-${t.k}`} label={COVER.repeat(coverCells(tileW - 0.5 - (t.cnt > 0 ? CNT_SHIFT_X : 0)))} plain dimColor onPress={() => acts.tool(t.k)} />
        </Box>
      </Box>
    )
  }
  // 안 = 덩이(body)마다 줄, 덩이 사이 가는 선. 안 쓰는 칸이면 맨 위 흐린 「이 역할에선 안 씀」(0.1.26 머리 글 그대로). 0.1.26 의 도구판 아래 따로 그리던 편 칸(detail · 머리)은 뺐다
  const toolCard = (t: Tool) => {
    const sections = t.body().filter(s => s.some(Boolean))
    return (
      <Box key={`es-d-${t.k}`} flexDirection="column" backgroundColor={CARD_BG} borderStyle="round" borderColor="suggestion" paddingX={1} paddingTop={0.2} paddingBottom={0.3} marginTop={CARD_TOP} minWidth={0}>
        {t.use ? null : (
          <Box key={`es-dh-${t.k}`} paddingY={0.2} minWidth={0}>
            <Text color="subtle" size="footnote">
              {L('이 역할에선 안 씀', 'Not used in this role')}
            </Text>
          </Box>
        )}
        {sections.flatMap((s, i) => [i > 0 ? <Box key={`es-dl-${t.k}${i}`} height={0.06} backgroundColor="promptBorder" /> : null, ...s])}
      </Box>
    )
  }
  const board = (list: readonly Tool[]) => {
    const open = list.find(t => t.k === pu.tool) ?? null
    return (
      <Box key="es-tools" flexDirection="column" marginTop={0.6} minWidth={0}>
        {TOOL_GROUPS().map(([g, name], i) => (
          <Box key={`es-tg-${g}`} flexDirection="column" marginTop={i === 0 ? 0 : GROUP_GAP} minWidth={0}>
            <Box key={`es-tg-h-${g}`} marginBottom={HEAD_GAP}>
              <Text bold size="caption" color="subtle">
                {name}
              </Text>
            </Box>
            <Box key={`es-tg-r-${g}`} columnGap={TILE_GAP} minWidth={0} {...(look.fluid ? { flexWrap: 'wrap' as const, rowGap: FLUID_ROW_GAP } : {})}>
              {list.filter(t => t.g === g).map(tile)}
            </Box>
            {open && open.g === g && !open.appOnly ? toolCard(open) : null}
          </Box>
        ))}
        {/* 노트: panel.md#appOnly — 흐린 칸이 있으면 도구판 아래 까닭 한 줄(0.1.28 결정 1) */}
        {list.some(t => t.appOnly) ? (
          <Box key="es-tools-why" marginTop={0.6} minWidth={0}>
            <Text color="subtle" size="footnote">
              {APP_ONLY_WHY()}
            </Text>
          </Box>
        ) : null}
      </Box>
    )
  }

  const narrowCell = (t: Tool): unknown[] => {
    const isOn = pu.tool === t.k
    const sections = isOn ? t.body().filter(s => s.some(Boolean)) : []
    const lead = look.isText ? { marginLeft: 2 } : {}
    return [
      <Box key={`es-n-${t.k}`} columnGap={1} alignItems="center" minWidth={0} {...lead}>
        <Button key={`es-t-${t.k}`} label={`${t.name} ${isOn ? CHEVRON.open : CHEVRON.closed}`} {...(look.isText ? {} : { plain: true as const })} onPress={() => acts.tool(t.k)} />
        <Box flexShrink={1} minWidth={0}>
          <Text color="subtle" wrap="truncate-end" {...(t.use ? {} : { dimColor: true })}>
            {t.sub}
          </Text>
        </Box>
        {t.cnt > 0 ? (
          <Text key={`es-n-${t.k}-cnt`} bold color="warning">
            {String(t.cnt)}
          </Text>
        ) : null}
      </Box>,
      isOn ? (
        <Box key={`es-d-${t.k}`} flexDirection="column" marginLeft={look.isText ? 4 : 2} minWidth={0}>
          {t.use ? null : (
            <Box key={`es-dh-${t.k}`} minWidth={0}>
              <Text color="subtle" size="footnote">
                {L('이 역할에선 안 씀', 'Not used in this role')}
              </Text>
            </Box>
          )}
          {sections.flat() as never}
        </Box>
      ) : null,
    ]
  }

  const toolsOf = (): Tool[] => {
    const icon =
      (name: QuickIcon, look: IconLook = TEXT_LOOK) =>
      (dim: boolean) =>
        mark(ui, name, '', dim ? { ...look, alpha: 0.45 } : look)
    const Svg = (ui as unknown as { Svg?: CharSvgEl }).Svg
    const advIcon = () => (Svg ? <Svg source={advisorCharSvg(QUICK_ROW_PX, 'on', false)} alt={L('어드바이저', 'Advisor')} width={advisorCharWidth(QUICK_ROW_PX, 'on')} height={QUICK_ROW_PX} /> : null)
    const b = v.board
    const upId = v.up?.id ?? null
    // 받는 곳이 이 세션인 것(0.1.26 의 「받은」은 모아 둔 메시지 수였다 — 수 표 cnt 가 그 값을 그대로 센다). 다른 세션 = 위 · 하위 · 형제 밖
    const near = new Set([...(upId === null ? [] : [upId]), ...kidIds, ...sibIds])
    const countOf = (m: ReadonlyMap<string, number>, keep: (id: string) => boolean) => [...m].reduce((n, [id, c]) => (keep(id) ? n + c : n), 0)
    const pair = (keep: (id: string) => boolean) => L(`보낸 ${countOf(v.sentN, keep)} · 받은 ${countOf(v.recv, keep)}`, `Out ${countOf(v.sentN, keep)} · in ${countOf(v.recv, keep)}`)
    const brdSub = b
      ? b.path === null
        ? L('자리 없음', 'Not set')
        : b.fresh === null
          ? L('못 읽음', "Can't read")
          : L(`새 줄 ${b.fresh.length}`, `New ${b.fresh.length}`)
      : v.role === 'solo'
        ? L('없음', 'None')
        : v.boardHint
          ? L(`위 세션 것 · ${v.boardHint.name}`, `Above · ${v.boardHint.name}`)
          : L('위 진행판 없음', 'None above')
    const a = v.advisorLog
    const off = (t: Tool): Tool => (look.isApp ? t : { ...t, appOnly: true, use: false, sub: APP_ONLY(), cnt: 0 })
    const tools: Tool[] = [
      off({ k: 'msg', g: 'msg', name: L('위 세션', 'Above'), icon: icon('send'), sub: v.up ? pair(id => id === upId) : v.role === 'solo' ? L('위 없음', 'None') : L('보고는 사용자에게', 'To you'), use: v.role !== 'solo', cnt: heldUp.length, body: msgBody }),
      off({ k: 'col', g: 'msg', name: L('형제 세션', 'Siblings'), icon: icon('sitemap'), sub: sibs.length > 0 ? pair(id => sibIds.has(id)) : L('없음', 'None'), use: sibs.length > 0, cnt: heldSib.length, body: colBody }),
      {
        k: 'inq',
        g: 'msg',
        name: L('다른 세션', 'Others'),
        icon: icon('ask'),
        sub: look.isApp ? pair(id => !near.has(id) && id !== v.selfId) : L(`열린 ${v.openDesk.length + v.openOut.length} · 받은 ${countOf(v.recv, id => id !== v.selfId)}`, `Open ${v.openDesk.length + v.openOut.length} · in ${countOf(v.recv, id => id !== v.selfId)}`),
        use: true,
        cnt: heldOther.length,
        body: inqBody,
      },
      off({
        k: 'rep',
        g: 'mgmt',
        name: L('하위 세션', 'Below'),
        icon: icon('clipboard'),
        sub: kids.length > 0 ? L(`${kids.length}개 · 받은 ${countOf(v.recv, id => kidIds.has(id))}`, `${kids.length} · in ${countOf(v.recv, id => kidIds.has(id))}`) : L('없음', 'None'),
        use: kids.length > 0,
        cnt: waits.length + heldKid.length,
        body: repBody,
      }),
      { k: 'brd', g: 'mgmt', name: L('진행판', 'Board'), icon: icon('notebook'), sub: brdSub, use: v.role !== 'solo', cnt: b && b.path !== null ? (b.fresh === null ? 1 : b.fresh.length) : 0, body: brdBody },
      {
        k: 'role',
        g: 'mgmt',
        name: L('역할 · 인계', 'Role'),
        icon: icon('transfer', { ...ROLE_LOOK[v.role], px: QUICK_ROW_PX }),
        sub: L(`컨텍스트 ${v.ctxPct !== null ? `${v.ctxPct}%` : '—'}`, `Context ${v.ctxPct !== null ? `${v.ctxPct}%` : '—'}`),
        use: true,
        cnt: 0,
        body: roleBody,
      },
      { k: 'cmd', g: 'tool', name: L('명령', 'Actions'), icon: icon('terminal'), sub: 'ultrathink · /btw …', use: true, cnt: 0, body: cmdBody },
      { k: 'adv', g: 'tool', name: L('어드바이저', 'Advisor'), icon: advIcon, sub: a ? L(`모두 ${a.count}번`, plural(a.count, 'call')) : L('안 불림', 'Not called'), use: true, cnt: 0, body: advBody },
      {
        k: 'mgr',
        g: 'tool',
        name: look.isApp ? TOOL_NAMES.mgr : TOOL_NAMES.mgrOff,
        icon: icon('settings'),
        sub: look.isApp ? TOOL_NAMES.mgrSub : TOOL_NAMES.mgrOffSub,
        use: true,
        cnt: 0,
        body: mgrBody,
      },
    ]
    return tools
  }

  // 데스크톱 앱 세션의 [세션 도구] 맨 위(「지금」 줄 자리). 누르기 전엔 앱 그대로(정함 11), 어느 쪽이든 누르면 다시 안 뜬다
  const firstSetupCard = () =>
    v.firstSetup && look.isApp && acts.firstSetup ? (
      <Box key="es-first" flexDirection="column" rowGap={0.3} borderStyle="round" borderColor="suggestion" paddingX={0.75} paddingY={0.4} marginTop={0.5} minWidth={0}>
        <Text key="es-first-title" bold>
          {L('추천 설정으로 시작할까요?', 'Start with the recommended settings?')}
        </Text>
        <Text key="es-first-body" color="subtle">
          {L('자식 보고를 패널에 모아 두고 · 새 자식을 고정했다 끝나면 풀고 · 사이드바 그룹으로 묶습니다.', "Holds child reports in the panel, pins new child sessions and unpins them when they're done, and groups them in the sidebar.")}
        </Text>
        <Box key="es-first-btns" columnGap={1} rowGap={0.5} alignItems="center" flexWrap="wrap" marginTop={0.2}>
          <Button key="es-first-rec" variant="primary" label={L('추천대로 켜기', 'Turn on recommended')} onPress={() => acts.firstSetup?.('rec')} />
          <Button key="es-first-app" variant="secondary" label={L('앱 그대로', "Keep the app's way")} onPress={() => acts.firstSetup?.('app')} />
        </Box>
      </Box>
    ) : null
  const selfView = () => {
    if (!self) return null
    if (look.isNarrow) return narrowView()
    if (look.isText) return textView()
    return (
      <Box key="es-selfview" flexDirection="column">
        {selfHead()}
        {firstSetupCard()}
        {nowBox()}
        {board(toolsOf())}
      </Box>
    )
  }

  // 줄 3 「지금」(있을 때만, 테 없이) · 칸마다 [이름 ›] 지금 값 한 줄(묶음 머리 없음 · 도구판 차례 그대로). 데스크톱 앱에서만 되는 칸은 뺀다(결정 1). 글만(그림을 뺀 부품 표)
  // 좁은 칸 · 글 화면의 제목 줄(제목 · 역할 · 때 한 줄)
  const selfLine = () =>
    self ? (
      <Box key="es-self" columnGap={0.5} alignItems="center" minWidth={0}>
        <Box key="es-self-title" flexShrink={1} minWidth={0}>
          <Text bold wrap="truncate-end">
            {bareTitle(self.title)}
          </Text>
        </Box>
        <Box key="es-self-when" flexShrink={0}>
          <Text color="subtle" size="footnote">{`· ${ROLE_NAME[v.role]} · ${agoText(self.lastAt, v.now)}`}</Text>
        </Box>
      </Box>
    ) : null
  const narrowView = () => {
    if (!self) return null
    const tools = toolsOf().filter(t => !t.appOnly)
    return (
      <Box key="es-selfview" flexDirection="column">
        {selfLine()}
        {nowBox(true)}
        <Box key="es-tools-n" flexDirection="column" minWidth={0}>
          {TOOL_GROUPS().flatMap(([g]) => tools.filter(t => t.g === g).flatMap(narrowCell)) as never}
        </Box>
      </Box>
    )
  }
  // 단추 없음, 단추 글 자리에 맞춰 4칸 들임) + 맨 아래 까닭 한 줄(넓은 자리 — 결정 1)
  const textView = () => {
    if (!self) return null
    const tools = toolsOf()
    const offLine = (t: Tool) => (
      <Box key={`es-n-${t.k}`} columnGap={1} alignItems="center" minWidth={0} marginLeft={4}>
        <Text color="subtle" dimColor>
          {t.name}
        </Text>
        <Box flexShrink={1} minWidth={0}>
          <Text color="subtle" wrap="truncate-end" dimColor>
            {t.sub}
          </Text>
        </Box>
      </Box>
    )
    return (
      <Box key="es-selfview" flexDirection="column">
        {selfLine()}
        {nowBox(true)}
        <Box key="es-tools-t" flexDirection="column" minWidth={0}>
          {
            TOOL_GROUPS().flatMap(([g, name]) => [
              <Box key={`es-tg-h-${g}`} minWidth={0}>
                <Text color="subtle">{name}</Text>
              </Box>,
              ...tools.filter(t => t.g === g).flatMap(t => (t.appOnly ? [offLine(t)] : narrowCell(t))),
            ]) as never
          }
          {tools.some(t => t.appOnly) ? (
            <Box key="es-tools-why" minWidth={0}>
              <Text color="subtle">{APP_ONLY_WHY()}</Text>
            </Box>
          ) : null}
        </Box>
      </Box>
    )
  }

  // 이름표 칩 「미리보기 · 입력창 위」 + ?, 지금 입력창 위 줄(drawQuickRow — 같은 값 · 누름은 빈 동작), 아래 「입력창」 자리
  const previewRow = (): unknown[] => {
    const p = v.quickPreview
    if (!p) return []
    return [
      <Box key="es-set-pv" flexDirection="column" rowGap={0.5} borderStyle="round" borderColor={PREVIEW_WELL} backgroundColor={PREVIEW_WELL} paddingX={0.75} paddingY={0.4} marginBottom={0.4} minWidth={0}>
        <Box key="es-set-pv-label" columnGap={0.5} alignItems="center" alignSelf="flex-start">
          <Box key="es-set-pv-chip" borderStyle="round" borderColor="background" backgroundColor="background" paddingX={1} paddingY={0} flexShrink={0}>
            <Text color="suggestion">{L('미리보기 · 입력창 위', 'Preview · above the input')}</Text>
          </Box>
          {pressBox(ui, 'es-help-pv', { content: [mark(ui, 'help', L('도움말', 'Help'), SUB_LOOK)], cover: 2, onPress: () => acts.fold('help:pv'), tip: PV_HELP.tip })}
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
        {drawQuickRow(ui, p.q, previewOf(p.acts), look)}
        <Box key="es-set-pv-input" borderStyle="round" borderColor="promptBorder" paddingX={1} justifyContent="center">
          <Text color="subtle">{L('입력창', 'Prompt box')}</Text>
        </Box>
      </Box>,
    ]
  }

  // (옅은 회색 칸 · 이름표 칩 + ?), 안은 부모 세션이 자식 둘(끝난 자식 A · 새로 연 자식 B)을 열었을 때의 사이드바 — 스위치 · 값을 바꾸면 바로 바뀜. 그림 없이 Box · Text 만
  const kidsPreview = (): unknown[] => {
    const s = v.settings
    const isHold = s.reports.value === 'hold'
    type Kid = { id: 'a' | 'b'; name: string; tag: string }
    const A: Kid = { id: 'a', name: L('자식 A', 'Child A'), tag: L('끝남', 'ended') }
    const B: Kid = { id: 'b', name: L('자식 B', 'Child B'), tag: L('새', 'new') }
    const pinned = s.autoPin ? [B, ...(s.autoUnpin ? [] : [A])] : []
    const loose = [B, A].filter(k => !pinned.includes(k))
    const row = (key: string, name: string, tag: string | null, depth: number, isParent = false) => (
      <Box key={key} columnGap={0.5} alignItems="center" minWidth={0} marginLeft={depth * 1.5}>
        {depth > 0 && !isParent ? (
          <Text key={`${key}-br`} color="subtle">
            └
          </Text>
        ) : null}
        <Box flexShrink={1} minWidth={0}>
          <Text wrap="truncate-end">{name}</Text>
        </Box>
        {tag ? (
          <Text key={`${key}-tag`} color="subtle" size="footnote">
            {tag}
          </Text>
        ) : null}
      </Box>
    )
    const heading = (key: string, text: string) => (
      <Box key={key} marginTop={0.2}>
        <Text color="subtle" size="footnote">
          {text}
        </Text>
      </Box>
    )
    // 떼어 내기 = 부모 밑에서 빠져 맨 위(최근 것부터), 아니면 부모 밑 └. 그룹으로 묶기 = 부모 이름 그룹 머리 아래, 아니면 「최근」
    const list = s.autoDetach
      ? [...loose.map(k => row(`es-kpv-${k.id}`, k.name, k.tag, 0)), row('es-kpv-parent', L('부모 세션', 'Parent session'), null, 0, true)]
      : [row('es-kpv-parent', L('부모 세션', 'Parent session'), null, 0, true), ...loose.map(k => row(`es-kpv-${k.id}`, k.name, k.tag, 1))]
    return [
      <Box key="es-set-kpv" flexDirection="column" rowGap={0.4} borderStyle="round" borderColor={PREVIEW_WELL} backgroundColor={PREVIEW_WELL} paddingX={0.75} paddingY={0.4} marginBottom={0.4} minWidth={0}>
        <Box key="es-set-kpv-label" columnGap={0.5} alignItems="center" alignSelf="flex-start">
          <Box key="es-set-kpv-chip" borderStyle="round" borderColor="background" backgroundColor="background" paddingX={1} paddingY={0} flexShrink={0}>
            <Text color="suggestion">{L('미리보기 · 사이드바', 'Preview · sidebar')}</Text>
          </Box>
          {pressBox(ui, 'es-help-kpv', { content: [mark(ui, 'help', L('도움말', 'Help'), SUB_LOOK)], cover: 2, onPress: () => acts.fold('help:kpv'), tip: KPV_HELP.tip })}
        </Box>
        {folds.has('help:kpv') ? (
          <Box key="es-hw-kpv" flexDirection="column">
            {KPV_HELP.lines.map((line, i) => (
              <Text key={`es-hw-kpv${i}`} color="subtle">
                {line}
              </Text>
            ))}
          </Box>
        ) : null}
        <Box key="es-set-kpv-side" flexDirection="column" rowGap={0.15} borderStyle="round" borderColor="promptBorder" paddingX={0.75} paddingY={0.3} minWidth={0}>
          {pinned.length > 0 ? [heading('es-kpv-h-pin', L('고정', 'Pinned')), ...pinned.map(k => row(`es-kpv-pin-${k.id}`, k.name, k.tag, 0))] : null}
          {heading('es-kpv-h-list', s.autoGroup ? L('▾ 부모 세션 그룹', '▾ Parent session group') : L('최근', 'Recents'))}
          {list}
        </Box>
        <Box key="es-kpv-rep" columnGap={0.5} minWidth={0}>
          <Text color="subtle" size="footnote">
            {isHold ? L('자식 보고 — 이 채팅 조용 · 하위 세션 칸 수 표', 'Child reports — this chat stays quiet · count on the Below tile') : L('자식 보고 — 보고마다 이 채팅에 한 차례', 'Child reports — one turn in this chat per report')}
          </Text>
        </Box>
      </Box>,
    ]
  }

  // 「각 안쪽 내용이 그쪽 옵션이라고 구분이되어야됨」. 줄 = 이름 · ?(마우스 올림 한 줄 · 누르면 줄 아래 펼침) · 부품은 줄 오른쪽 끝, 줄 사이 가는 선
  const setRow = (name: string, key: string, label: string, control: unknown, help?: Help): unknown[] => [
    <Box key={key} columnGap={0.5} alignItems="center" minWidth={0} paddingY={0.15}>
      <Box flexShrink={1} minWidth={0}>
        <Text wrap="truncate-end">{label}</Text>
      </Box>
      {help ? pressBox(ui, `es-help-${name}`, { content: [mark(ui, 'help', L('도움말', 'Help'), SUB_LOOK)], cover: 2, onPress: () => acts.fold(`help:${name}`), tip: help.tip }) : null}
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
  const setGroup = (key: string, name: string, icon: QuickIcon, label: string, body: unknown[], help?: Help) => (
    <Box key={key} flexDirection="column" marginTop={key === 'es-set-quick' ? 0 : look.isText ? 1 : SET_GAP}>
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
  const quickRow = (it: (typeof QUICK_ITEMS)[number]): unknown[] => {
    const isAppOnly = !look.isApp && (it.key === 'pin' || it.key === 'send')
    if (isAppOnly && look.isNarrow) return []
    const row = setRow(`q-${it.key}`, `es-set-q-${it.key}`, it.label, onOff(ui, `${QUICK_SWITCH}${it.key}`, v.settings.quick.has(it.key), on => acts.pickQuick(it.key, on), look.hasSwitch))
    if (!isAppOnly) return row
    return [
      ...row,
      <Box key={`es-set-q-${it.key}-off`} paddingBottom={0.15} minWidth={0}>
        <Text color="subtle" size="footnote">
          {APP_ONLY_SET()}
        </Text>
      </Box>,
    ]
  }
  const quickBody = (): unknown[] => [
    ...(look.isNarrow || look.isText ? [] : previewRow()),
    sub('es-set-sub-cells', L('칸', 'Cells'), true),
    ...withLines('c', QUICK_ITEMS.slice(0, 5).map(quickRow).filter(r => r.length > 0)),
    sub('es-set-sub-cmds', L('명령', 'Commands')),
    ...withLines('m', QUICK_ITEMS.slice(5).map(quickRow)),
  ]
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
  const sw = (key: string, isOn: boolean, onSet: (on: boolean) => void) => onOff(ui, key, isOn, onSet, look.hasSwitch)
  const peerHelp: Help = look.isText || look.textPress ? { ...SET_HELP.peerRel, lines: [...SET_HELP.peerRel.lines, PEER_APP_ONLY()] } : SET_HELP.peerRel
  // 아래 ▸ 수 · 크기 줄을 누르면 목록(큰 것 셋 · 그 밖 · 뺀 것), [휴지통으로]는 바로 아래 묻는 카드(채운 [휴지통으로] · 글만 [취소])
  const leftovers = (): unknown[] => {
    const c = v.clean
    const items = c?.items ?? []
    const busy = c?.moving ? L('옮기는 중…', 'Moving…') : !c || c.running ? L('세는 중…', 'Counting…') : null
    const right = busy ? (
      <Text color="subtle" size="footnote">
        {busy}
      </Text>
    ) : items.length > 0 ? (
      <Button key="es-left-trash" plain dimColor label={L('휴지통으로', 'To the Recycle Bin')} onPress={() => acts.ask(pu.ask === 'trash' ? null : 'trash')} />
    ) : (
      <Text color="subtle" size="footnote">
        {c?.error ? L('못 셈', "Couldn't count") : L('옮길 것 없음', 'Nothing to move')}
      </Text>
    )
    const top = setRow('left', 'es-set-left', L('남은 자료', 'Leftovers'), right, LEFT_HELP)
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
            content: [mark(ui, isOpen ? 'down' : 'right', isOpen ? L('접기', 'Hide') : L('펼치기', 'Show'), SUB_LOOK), <Text wrap="truncate-end">{L(`보관한 세션 스크래치 ${items.length}개 · ${sizeText(c.bytes)}`, `Scratch of archived sessions: ${items.length} · ${sizeText(c.bytes)}`)}</Text>],
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
                <Text color="subtle" size="footnote">{`${sizeText(x.bytes)} · ${x.days === 0 ? L('오늘', 'today') : L(`${x.days}일`, `${x.days}d`)}`}</Text>
              </Box>
            ))}
            {rest.length > 0 ? <Text color="subtle">{L(`그 밖 ${rest.length}개 · ${sizeText(restBytes)}`, `${rest.length} more · ${sizeText(restBytes)}`)}</Text> : null}
            {c.keepLive + c.keepRef > 0 ? <Text color="subtle">{L(`뺀 것: 살아 있는 세션 ${c.keepLive}개 · md 가 가리키는 ${c.keepRef}개`, `Left out: ${c.keepLive} of live sessions · ${c.keepRef} a .md points to`)}</Text> : null}
          </Box>
        ) : null}
        {pu.ask === 'trash' && !busy ? (
          <Box key="es-ask-trash" flexDirection="column" marginTop={0.4}>
            <Text>{L(`보관한 세션의 남은 자료 ${items.length}개(${sizeText(c.bytes)})를 휴지통으로 옮길까요? 휴지통에서 되돌릴 수 있습니다.`, `Move ${plural(items.length, 'leftover')} of archived sessions (${sizeText(c.bytes)}) to the Recycle Bin? You can restore them from there.`)}</Text>
            <Box columnGap={1} alignItems="center" marginTop={0.3}>
              <Button
                key="es-ask-trash-ok"
                variant="secondary"
                label={L('휴지통으로', 'To the Recycle Bin')}
                onPress={() => {
                  acts.ask(null)
                  void acts.cleanMove()
                }}
              />
              <Button key="es-ask-trash-no" plain dimColor label={L('취소', 'Cancel')} onPress={() => acts.ask(null)} />
            </Box>
          </Box>
        ) : null}
      </Box>,
    ]
  }
  const mdLockBody = (m: MdLockView): unknown[] => {
    const top = setRow('mdlock', 'es-set-mdlock-row', L('md 잠금 보기 · 풀기', 'See and release .md locks'), sw(MD_LOCK_SWITCH, m.on, on => acts.pickMdLock?.(on)), MD_LOCK_HELP)
    if (!m.on) return top
    const dirRow = setRow(
      'mdlockdir',
      'es-set-mdlock-dir',
      L('잠금 폴더', 'Lock folder'),
      <Box columnGap={0.5} alignItems="center" flexShrink={1} minWidth={0}>
        <Box flexShrink={1} minWidth={0}>
          <Text color="subtle" size="footnote" wrap="truncate-start">
            {m.dir}
          </Text>
        </Box>
        <Button key="es-mdlock-dir-b" plain dimColor label={folds.has('mdlock-dir') ? L('닫기', 'Close') : L('바꾸기', 'Change')} onPress={() => acts.fold('mdlock-dir')} />
      </Box>,
    )
    const dirInput =
      folds.has('mdlock-dir') && InputEl ? (
        <Box key="es-mdlock-dir-set" flexDirection="column" rowGap={0.3} marginBottom={0.3}>
          <InputEl key="es-mdlock-input" placeholder={L('잠금 폴더 경로를 붙여 넣고 Enter', 'Paste the lock folder path, then Enter')} value={m.dir} submitLabel={L('정하기', 'Set')} onSubmit={(t: string) => acts.mdLockDir?.(t)} />
        </Box>
      ) : null
    const rows = m.rows ?? []
    const isAll = folds.has('mdlock-all')
    const lockRow = (r: MdLockRow, i: number) => (
      <Box key={`es-mdl-${i}`} columnGap={0.5} alignItems="center" paddingY={0.15} minWidth={0}>
        {mark(ui, 'lock', L('잠금', 'Lock'), SUB_LOOK)}
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
          <Text wrap="truncate-end">{r.target}</Text>
          <Text color="subtle" size="footnote" wrap="truncate-end">
            {/* 남은 시간을 맨 앞에 — 368 폭에서 할 일 글이 길면 끝이 잘린다(그림 set-mdlock-368) */}
            {[L(`남은 ${r.left}`, `${r.left} left`), r.owner, r.intent].filter(Boolean).join(' · ')}
          </Text>
        </Box>
        <Button key={`es-mdl-rel-${i}`} variant="secondary" label={L('풀기', 'Release')} onPress={() => acts.mdLockRelease?.(r.file)} />
      </Box>
    )
    const list: unknown[] = m.error
      ? [subText(L(`잠금 폴더를 못 읽었습니다 — ${m.error}`, `Couldn't read the lock folder — ${m.error}`), 'warning')]
      : rows.length === 0
        ? [subText(L('지금 잠긴 md 가 없습니다.', 'No .md is locked now.'))]
        : [
            ...(isAll ? rows : rows.slice(0, LIST_LIMIT)).map(lockRow),
            ...(rows.length > LIST_LIMIT ? [tailRow('mdl-all', 'mdlock-all', L('나머지', 'More'), rows.length - LIST_LIMIT)] : []),
          ]
    return [
      ...top,
      rline('es-set-l-mdl1'),
      ...dirRow,
      dirInput,
      rline('es-set-l-mdl2'),
      <Box key="es-mdlock-list" flexDirection="column" minWidth={0}>
        {list}
        {m.expired > 0 ? <Text color="subtle" size="footnote">{L(`끝 시각이 지난 잠금 ${m.expired}개는 뺐습니다.`, `Left out ${plural(m.expired, 'lock')} past its end time.`)}</Text> : null}
      </Box>,
    ]
  }
  const settingsView = () => (
    <Box key="es-setview" flexDirection="column">
      {setGroup('es-set-quick', 'quick', 'bar', L('입력창 위 줄에 둘 것', 'On the line above the input'), quickBody(), QUICK_HELP)}
      {setGroup(
        'es-set-reply',
        'reply',
        'adjust',
        L('화면 · advisor', 'Screen · advisor'),
        withLines('r', [
          ...(v.settings.lang ? [setRow('lang', 'es-set-lang-row', '언어 · Language', <Select key="es-set-lang" value={v.settings.lang.value} options={langOptions(v.settings.lang)} onSelect={(x: string) => acts.pickLang?.(x)} />, LANG_HELP())] : []),
          setRow(
            'display',
            'es-set-display-row',
            L('화면', 'Screen'),
            <Select key="es-set-display" value={v.settings.display.value} options={v.settings.display.options} onSelect={(x: string) => acts.pickDisplay(x)} />,
            SET_HELP.display,
          ),
          setRow('advisor', 'es-set-advisor-row', 'advisor', advisorPick(), SET_HELP.advisor),
        ]),
      )}
      {/* 노트: panel.md#appOnly — 「새 자식 세션」 묶음은 데스크톱 앱에서만 일한다(0.1.28 결정 1 · ★ 값은 같이 바뀜): 넓은 자리는 카드 맨 위 까닭 한 줄, 좁은 칸은 묶음을 뺀다 */}
      {look.isApp || !look.isNarrow ? setGroup(
        'es-set-kids',
        'kids-set',
        'branch',
        L('새 자식 세션', 'New child sessions'),
        [
          ...(look.isNarrow || look.isText ? [] : kidsPreview()),
          ...(look.isApp
            ? []
            : [
                <Box key="es-set-kids-off" paddingY={0.15} minWidth={0}>
                  <Text color="subtle" size="footnote">
                    {APP_ONLY_SET()}
                  </Text>
                </Box>,
              ]),
          ...withLines('k', [
          setRow('autopin', 'es-set-autopin', L('저절로 고정', 'Pin automatically'), sw(AUTO_SWITCH.pin, v.settings.autoPin, on => acts.pickAutoPin(on)), SET_HELP.autoPin),
          setRow('autounpin', 'es-set-autounpin', L('끝나면 고정 풀기', 'Unpin when done'), sw(AUTO_SWITCH.unpin, v.settings.autoUnpin, on => acts.pickAutoUnpin(on)), SET_HELP.autoUnpin),
          setRow('autogroup', 'es-set-autogroup', L('사이드바 그룹으로 묶기', 'Group in the sidebar'), sw(AUTO_SWITCH.group, v.settings.autoGroup, on => acts.pickAutoGroup(on)), SET_HELP.autoGroup),
          setRow('autodetach', 'es-set-autodetach', L('저절로 떼어 내기', 'Detach automatically'), sw(AUTO_SWITCH.detach, v.settings.autoDetach, on => acts.pickAutoDetach(on)), SET_HELP.autoDetach),
          setRow('firstultra', 'es-set-firstultra', L('첫 글에 ultrathink', 'ultrathink in the first message'), sw(AUTO_SWITCH.ultra, v.settings.firstUltra, on => acts.pickFirstUltra(on)), SET_HELP.firstUltra),
          setRow(
            'reports',
            'es-set-reports-row',
            L('자식 보고', 'Child reports'),
            <Select key="es-set-reports" value={v.settings.reports.value} options={v.settings.reports.options} onSelect={(x: string) => acts.pickReports(x)} />,
            SET_HELP.reports,
          ),
          ]),
        ],
      ) : null}
      {/* 노트: panel.md#peerRelSet — 「메시지」 묶음: 받는 글 관계 줄 스위치(0.1.20, 처음 값 꺼짐) · 세션 규칙 스위치(0.1.27, 처음 값 켬 — register.md#sendRules) */}
      {setGroup(
        'es-set-msg',
        'msg-set',
        'message',
        L('메시지', 'Messages'),
        withLines('g', [
          setRow('peerrel', 'es-set-peerrel', L('보낸 세션 관계 알리기', 'Tell where the sender is'), sw(PEER_SWITCH, v.settings.peerRel, on => acts.pickPeerRel(on)), peerHelp),
          setRow('sessionrules', 'es-set-sessionrules', RULES_NAME(), sw(RULES_SWITCH, v.settings.sessionRules, on => acts.pickSessionRules(on)), SET_HELP.sessionRules),
          setRow('mentioninfo', 'es-set-mentioninfo', L('글에 나온 세션 정보 붙이기', 'Add info on sessions you name'), sw(MENTION_SWITCH, v.settings.mentionInfo === true, on => acts.pickMentionInfo?.(on)), SET_HELP.mentionInfo),
        ]),
      )}
      {v.settings.mdLock ? setGroup('es-set-mdlock', 'mdlock-set', 'lock', L('md 잠금', '.md locks'), mdLockBody(v.settings.mdLock)) : null}
      {setGroup('es-set-clean', 'clean-set', 'trash', L('정리', 'Clean up'), leftovers())}
    </Box>
  )

  // 0.1.25 에서 [전체]를 뺐다 — 옛 저장 값 'all' 도 첫 탭으로 그린다(노트 panel.md#segButton)
  const body = pu.view === 'settings' ? settingsView() : selfView()
  return (
    <Box key="es-panel" flexDirection="column">
      {segRow(ui, pu, acts, v.upd, look)}
      {v.upd?.isOpen ? drawUpdateDrawer(ui, v.upd, acts.upd) : null}
      {body}
    </Box>
  )
}

function segRow(ui: Ui, pu: PanelUi, acts: PanelActs, upd?: UpdView | null, look: PanelLook = DESKTOP_LOOK) {
  const { Box } = ui
  const isSet = pu.view === 'settings'
  const isText = isTextUi(ui)
  const hasUpd = upd !== null && upd !== undefined && !(look.isNarrow && !isSet)
  return (
    <Box key="es-seg" columnGap={1} rowGap={isText || look.isNarrow ? 0 : 0.5} flexWrap="wrap" alignItems="center" marginBottom={isText ? 0 : 0.5}>
      {segButton(ui, 'es-view-self', L('세션 도구', 'Session tools'), !isSet, () => acts.view('self'))}
      {segButton(ui, 'es-view-set', L('설정', 'Settings'), isSet, () => acts.view('settings'))}
      {hasUpd ? (
        <Box key="es-upd-cell" flexGrow={1} justifyContent="flex-end" alignItems="center">
          {updateButton(ui, upd.state, upd.isOpen, acts.upd.toggle)}
        </Box>
      ) : null}
    </Box>
  )
}

export function drawPanelBare(ui: Ui, pu: PanelUi, acts: PanelActs, text: string, upd?: UpdView | null, look: PanelLook = DESKTOP_LOOK) {
  const { Box, Text } = ui
  return (
    <Box key="es-panel" flexDirection="column">
      {segRow(look.isText ? withTextUi(ui) : ui, pu, acts, upd ? { ...upd, isOpen: false } : null, look)}
      <Text color="warning">{text}</Text>
    </Box>
  )
}

// ── 판 단추 · 서랍(0.1.29 — 이지 컴팩트 ui-settings.tsx updateButton · drawUpdateDrawer 를 옮김, 화면 글은 그대로 · 이름만 easy-session) ──

export function updateButton(ui: Ui, upd: UpdateState, isOpen: boolean, onPress: () => void) {
  const { Button } = ui
  const label =
    upd.phase === 'checking'
      ? L('확인 중…', 'Checking…')
      : upd.phase === 'updating'
        ? L('업데이트 중…', 'Updating…')
        : upd.phase === 'newer' && upd.market
          ? L(`${upd.market} 업데이트`, `Update to ${upd.market}`)
          : upd.phase === 'done' && upd.market
            ? L(`${upd.market} 받음`, `${upd.market} downloaded`)
            : upd.phase === 'failed'
              ? L('업데이트 확인 못 함', 'Update check failed')
              : upd.updatedTo
                ? L(`${upd.updatedTo} 바뀐 것`, `What's new in ${upd.updatedTo}`)
                : upd.phase === 'dev' && upd.own && upd.devBuild && !upd.devOff
                  ? L(`v${upd.own} 개발자 모드`, `v${upd.own} dev mode`)
                  : upd.own
                    ? `v${upd.own}`
                    : L('버전', 'Version')
  const isHot = upd.phase === 'newer' || upd.phase === 'done' || upd.phase === 'failed' || Boolean(upd.updatedTo)
  const text = `${label} ${isOpen ? '▾' : '▸'}`
  return isHot || isOpen ? <Button key="es-upd-btn" label={text} variant="secondary" onPress={onPress} /> : <Button key="es-upd-btn" label={text} plain dimColor onPress={onPress} />
}

const DRAWER_VERSIONS = 6
const DRAWER_ITEMS = 30
const UPD_LIVE_HEX = '#4c9be8'
const UPD_ACCENT = 'suggestion'
const UPD_CARD = { borderStyle: 'round', borderColor: 'promptBorder', paddingX: 1 } as const

/** 깜빡이는 점 — 데스크톱은 그림(SMIL — 다시 그리기 없이 돎), 글 화면은 같은 색 ● 한 칸, 그 밖(그림 없는 좁은 칸)은 없음 */
function updPulse(ui: Ui, alt: string) {
  const Svg = (ui as unknown as { Svg?: (p: Record<string, unknown>) => unknown }).Svg
  if (Svg) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="${UPD_LIVE_HEX}"><animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite"/></circle></svg>`
    return <Svg source={svg} alt={alt} width={10} height={10} isInteractive />
  }
  return isTextUi(ui) ? <ui.Text color={UPD_LIVE_HEX}>●</ui.Text> : null
}

function updAgo(iso: string | null, nowMs: number): string | null {
  const at = iso ? Date.parse(iso) : Number.NaN
  if (!Number.isFinite(at) || nowMs <= 0) return null
  const days = Math.floor((nowMs - at) / 86_400_000)
  return days <= 0 ? L('오늘', 'today') : L(`${days}일 전`, `${days} ${days === 1 ? 'day' : 'days'} ago`)
}

function updChanges(ui: Ui, key: string, groups: readonly ChangeGroup[]) {
  const { Box, Text } = ui
  return (
    <Box key={key} flexDirection="column" marginTop={1}>
      {groups.map((g, gi) => (
        <Box key={`${key}-g${gi}`} flexDirection="column" marginTop={gi > 0 ? 1 : 0}>
          {g.head ? <Text dimColor>{g.head}</Text> : null}
          {g.items.map((item, ii) => (
            <Text key={`${key}-g${gi}-${ii}`} wrap="wrap">
              {`· ${item}`}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  )
}

export function drawUpdateDrawer(ui: Ui, u: UpdView, acts: UpdActs) {
  const { Box, Button, Text } = ui
  const upd = u.state
  const isText = isTextUi(ui)
  const btn = (key: string, label: string, onPress: () => void, isMain = false) =>
    isMain ? <Button key={key} label={label} variant="primary" onPress={onPress} /> : <Button key={key} label={label} variant="secondary" onPress={onPress} />
  const checkBtn = btn('es-upd-check', L('업데이트 확인', 'Check for updates'), acts.check)
  const busy = (key: string, text: string) => [
    <Box key={`${key}-dot`} flexShrink={0} alignItems="center">
      {updPulse(ui, text)}
    </Box>,
    <Text key={key} color={UPD_ACCENT}>
      {text}
    </Text>,
  ]
  const ago = updAgo(upd.marketAt, u.nowMs)
  let state: unknown[] = []
  let buttons: unknown[] = []
  switch (upd.phase) {
    case 'checking':
      state = busy('es-upd-busy', L('업데이트 확인 중…', 'Checking for updates…'))
      break
    case 'updating':
      state = busy('es-upd-busy', L('업데이트 중…', 'Updating…'))
      break
    case 'latest':
      state = [
        <Text key="es-upd-state" color="success">
          {L(`최신 버전입니다(${upd.own ?? '?'})`, `Up to date (${upd.own ?? '?'})`)}
        </Text>,
      ]
      buttons = [checkBtn]
      break
    case 'newer':
      state = [
        <Text key="es-upd-state" bold>
          {L(`${upd.market} 업데이트가 있습니다`, `Version ${upd.market} is available`)}
        </Text>,
      ]
      buttons = [btn('es-upd-apply', L('업데이트', 'Update'), acts.apply, true)]
      break
    case 'done':
      state = [
        <Text key="es-upd-state" color="success" wrap="wrap">
          {L(`${upd.market ?? ''} 버전을 받았습니다. 곧 적용되고, 그대로면 앱을 다시 켜세요.`, `Downloaded ${upd.market ?? ''}. It applies shortly; restart the app if it doesn't.`)}
        </Text>,
      ]
      buttons = [checkBtn]
      break
    case 'synced':
      state = [
        <Text key="es-upd-state" dimColor wrap="wrap">
          {L('claude.ai 디렉터리에서 받은 버전입니다. 새 버전은 Claude Code 를 켤 때 저절로 받습니다.', "Installed from Anthropic's directory. Claude Code picks up new versions by itself when it starts.")}
        </Text>,
      ]
      break
    case 'dev':
      state = [
        <Text key="es-upd-state" dimColor wrap="wrap">
          {!upd.devBuild
            ? L('폴더에서 불러온 설치라 여기엔 업데이트 버튼이 없습니다.', "Loaded from a folder, so there's no Update button here.")
            : upd.devOff
              ? L('개발자 모드가 꺼져 공개 버전처럼 보이는 중입니다. 폴더에서 불러온 버전이라 업데이트 버튼은 없습니다.', 'Dev mode is off, so it looks like the public build. Loaded from a folder, so there is no Update button.')
              : L('개발자 모드입니다. 폴더에서 불러온 버전이라 업데이트 버튼이 없으니 저장소에서 받으세요.', 'Dev mode. Loaded from a folder, so there is no Update button. Pull it from the repository.')}
        </Text>,
      ]
      break
    case 'failed':
      state = [
        <Text key="es-upd-state" color="error" wrap="wrap">
          {!upd.error
            ? L('claude 명령을 찾지 못했습니다. README 의 업데이트 받기를 보세요.', "Couldn't find the claude command. See Update in the README.")
            : upd.isTimeout
              ? L('응답이 없어 멈췄습니다. 다시 시도하고, git과 네트워크도 확인하세요.', 'No response, so it stopped. Try again, and check git and your network too.')
              : upd.failedOn === 'apply'
                ? L('업데이트하지 못했습니다. git과 네트워크를 확인하세요.', 'Update failed. Check git and your network.')
                : L('확인하지 못했습니다. git과 네트워크를 확인하세요.', "Couldn't check for updates. Check git and your network.")}
        </Text>,
      ]
      buttons = [
        btn('es-upd-retry', L('다시 시도', 'Try again'), upd.failedOn === 'apply' ? acts.apply : acts.check),
        upd.error ? btn('es-upd-error', `${L('명령 출력', 'Output')} ${upd.open?.error ? '▾' : '▸'}`, acts.output) : null,
      ]
      break
    default:
      state = ago
        ? [
            <Text key="es-upd-state" dimColor>
              {L(`마지막 확인 ${ago}`, `Last checked ${ago}`)}
            </Text>,
          ]
        : []
      buttons = [checkBtn]
  }
  const canCheck = buttons.includes(checkBtn) || (upd.phase === 'failed' && upd.failedOn !== 'apply')
  const shown = buttons.filter(b => b !== null)
  const versions = (upd.versions ?? []).filter(v => (upd.changes?.[v]?.length ?? 0) > 0)
  const listed: string[] = []
  let items = 0
  for (const v of versions) {
    const n = upd.changes![v]!.reduce((sum, g) => sum + g.items.length, 0)
    if (listed.length >= DRAWER_VERSIONS || (listed.length > 0 && items + n > DRAWER_ITEMS)) break
    listed.push(v)
    items += n
  }
  const more = versions.length - listed.length
  const askRow =
    upd.phase === 'failed' ? (
      <Box key="es-upd-ask-row" columnGap={1} rowGap={0.5} alignItems="center" flexWrap="wrap" marginTop={isText ? 0 : 0.5}>
        <Box flexShrink={1} minWidth={0}>
          <Text dimColor wrap="wrap">
            {!upd.error ? L('Claude Code 를 못 찾아 Claude 에게 맡깁니다', "Couldn't find Claude Code — leave it to Claude") : L('명령이 안 돼 Claude 에게 맡깁니다', "The command didn't work — leave it to Claude")}
          </Text>
        </Box>
        <Button key="es-upd-ask" label={L('입력칸에 넣기', 'Put in prompt box')} variant="secondary" onPress={acts.ask} />
      </Box>
    ) : null
  const nameEl = (
    <Box key="es-upd-name" columnGap={1} alignItems="center">
      <Text bold>easy-session</Text>
      {upd.own ? <Text dimColor>{upd.own}</Text> : null}
    </Box>
  )
  const descEl = (
    <Box key="es-upd-desc" flexDirection="column">
      {state.length > 0 ? (
        <Box key="es-upd-state-row" columnGap={1} alignItems="center" flexWrap="wrap">
          {state}
        </Box>
      ) : null}
      {canCheck ? (
        <Text key="es-upd-net" dimColor wrap="wrap">
          {L('[업데이트 확인]을 누를 때만 Claude Code 가 GitHub 에서 마켓을 받아 옵니다. easy-session 은 스스로 통신하지 않습니다.', 'Claude Code fetches the marketplace from GitHub only when you press [Check for updates]. easy-session itself never goes online.')}
        </Text>
      ) : null}
    </Box>
  )
  const isFailed = upd.phase === 'failed'
  return (
    <Box key="es-upd-drawer" flexDirection="column" marginTop={isText ? 0 : 1} marginBottom={isText ? 1 : 0.5} {...(isText ? { marginLeft: 2 } : UPD_CARD)}>
      <Box key="es-upd-row" flexDirection="column">
        <Box
          key="es-upd-row-main"
          {...(isFailed ? { flexDirection: 'column' as const, rowGap: isText ? 0 : 0.6 } : { columnGap: 2, rowGap: 0, alignItems: 'center' as const })}
          paddingY={isText ? 0 : 0.6}
        >
          <Box key="es-upd-row-l" flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
            {nameEl}
            {descEl}
          </Box>
          {shown.length > 0 ? (
            <Box key="es-upd-row-r" flexShrink={0} columnGap={1} rowGap={1} alignItems="center" justifyContent={isFailed ? 'flex-start' : 'flex-end'} flexWrap="wrap">
              {shown}
            </Box>
          ) : null}
        </Box>
        {upd.phase === 'failed' && upd.open?.error && upd.error ? (
          <Box key="es-upd-error-text">
            <Text dimColor wrap="wrap">
              {upd.error}
            </Text>
          </Box>
        ) : null}
        {askRow}
      </Box>
      {listed.length > 0 ? (
        <Box key="es-upd-list" flexDirection="column">
          {listed.map(v => (
            <Box key={`es-upd-v-${v}`} flexDirection="column" marginTop={1}>
              <Box key={`es-upd-v-${v}-head`} columnGap={1} alignItems="center">
                <Text bold>{`v${v}`}</Text>
                {v === upd.own ? <Text dimColor>{L('· 지금 버전', '· this version')}</Text> : null}
              </Box>
              {updChanges(ui, `es-upd-v-${v}-list`, upd.changes![v]!)}
            </Box>
          ))}
          {more > 0 ? (
            <Text key="es-upd-more" dimColor wrap="wrap">
              {L(`그 앞 ${more}개 버전은 CHANGELOG 에`, `${more} earlier ${more === 1 ? 'version' : 'versions'} in the CHANGELOG`)}
            </Text>
          ) : null}
        </Box>
      ) : null}
    </Box>
  )
}

export type QuickView = { self: SessionMeta }

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
  /** 알림 대신 한 줄(VS Code — 0.1.28 결정 9, 노트 panel.md#noteLine) — 패널이 닫혔을 때만 줄 끝에, 없으면 null */
  note?: string | null
}

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
  // 오케 세션 트리 판(10-31 고름 — Tabler crown · unlink)
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
  lock: '<path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M8 11v-4a4 4 0 1 1 8 0v4"/>',
  circleX: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M10 10l4 4m0 -4l-4 4"/>',
} as const
type QuickIcon = keyof typeof QUICK_ICONS
type SvgEl = (props: { key?: string; source: string; alt: string; width?: number; height?: number }) => unknown

/** 그림 선 색 · 채움 · 크기 · 진하기(currentColor 를 흐리게) */
type IconLook = { hex?: string; fill?: boolean; px?: number; alpha?: number }
const PINNED_LOOK: IconLook = { hex: '#d83860', fill: true }
const KID_PIN_LOOK: IconLook = { hex: '#d83860' }
const PIN_TIP = {
  get owner() {
    return L('고정 — 주인(인계 때 새 주인에게 옮김)', 'Pinned — owner (moves on handover)')
  },
  get child() {
    return L('고정 — 곁가지(끝나면 저절로 풂)', 'Pinned — side session (auto-unpins)')
  },
  get user() {
    return L('고정 — 사람이 고정(손대지 않음)', 'Pinned by you')
  },
}
function pinMark(ui: Ui, why: FamilyRow['pinWhy']) {
  return mark(ui, 'pin', PIN_TIP[why ?? 'user'], why === 'child' ? KID_PIN_LOOK : PINNED_LOOK)
}
const CROWN_LOOK: IconLook = { hex: '#b8860b' }
// 파랑은 Svg 에 테마 키가 안 가서 두 테마 바탕에서 다 3:1 을 넘는 한 값(어두운 #1a1a19 약 4.6 · 밝은 #fcfcfb 약 3.9 — 셈)
export const ROLE_NAME: Record<SessionRole, string> = {
  get main() {
    return L('메인', 'Main')
  },
  get orche() {
    return L('오케', 'Orchestrator')
  },
  get sub() {
    return L('서브', 'Sub')
  },
  get solo() {
    return L('단독', 'Solo')
  },
}
const ROLE_ICON: Record<SessionRole, QuickIcon> = { main: 'crown', orche: 'crown', sub: 'branch', solo: 'user' }
const ROLE_LOOK: Record<SessionRole, IconLook> = { main: CROWN_LOOK, orche: { hex: QUICK_ICON_HEX }, sub: { hex: '#3d85d8' }, solo: { hex: QUICK_ICON_HEX } }
function roleMark(ui: Ui, role: SessionRole) {
  return mark(ui, ROLE_ICON[role], ROLE_NAME[role], { ...ROLE_LOOK[role], px: QUICK_ROW_PX })
}
const ROW_LOOK: IconLook = { hex: 'currentColor', px: QUICK_ROW_PX, alpha: 0.75 }
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

// 펼침은 U+2304 「⌄」 대신 U+02C5 「˅」: 시스템 글꼴(Segoe UI)에 ⌄ 가 없어 대체 글꼴로 작고 낮게 「v」처럼 떴다(헤드리스 Edge 로 잼) — ˅ 는 › 와 같은 크기 · 높이.
// 그림(Svg)으로 그리면 칸마다 약 150 ~ 300자(아홉 칸 1.2 ~ 2.7천 자)라 패널 크기 최악 시험 둘이 그리기 선(8만)에 걸려 안전망이 펼친 본문을 접었다
const CHEVRON = { closed: '›', open: '˅' } as const
function chevron(ui: Ui, isOpen: boolean, dim: boolean) {
  const { Text } = ui
  return (
    <Text bold size="footnote" color={isOpen ? 'suggestion' : 'subtle'} {...(dim ? { dimColor: true } : {})}>
      {isOpen ? CHEVRON.open : CHEVRON.closed}
    </Text>
  )
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
  /** 글로 누르는 표면(`textPress`)의 단추 이름 — 그림만 든 칸(? 등) · 글 아닌 원소가 든 칸에(없으면 안의 글) */
  label?: string
  /** 켬 꼴 — 글로 누르는 표면만 채운 단추로 그린다(VS Code ultrathink 넣음 — 0.1.29 ② G1). 다른 표면은 안 읽는다 */
  isOn?: boolean
}

function textPressBox(ui: Ui, key: string, o: PressOpts) {
  const { Box, Button } = ui
  const parts = o.content.filter(x => x !== null && x !== undefined && x !== false)
  const rest = parts.filter(x => elType(x) !== 'Svg')
  // 그림만 든 칸(지금은 도움말 ? 뿐 — 「전달」 칸은 이 표면 줄에 없다)은 그림을 빼고 「?」 단추 하나(그림 ? 옆 ? 단추 겹침을 피함)
  const icons = rest.length === 0 ? [] : parts.filter(x => elType(x) === 'Svg')
  const isPlain = rest.length > 0 && rest.every(x => typeof x === 'string' || elType(x) === 'Text')
  const label = o.label ?? (isPlain ? undefined : fitCells(plainOf(rest), Math.max(4, Math.floor(o.cover))) || '?')
  return (
    <Box key={`${key}-box`} columnGap={0.5} alignItems="center" minWidth={0} {...(o.grow ? { flexGrow: 1, flexShrink: 1 } : { flexShrink: 0 })} {...(o.box?.marginLeft !== undefined ? { marginLeft: o.box.marginLeft } : {})}>
      {icons as never}
      {/* 노트: panel.md#textPress — 켬(isOn)이면 dimColor 를 빼 채운 단추(웹뷰 button — VS Code 테마 단추 바탕, 기본 테마 파랑) · 0.1.29 ② G1 */}
      {o.noCover ? (
        (rest as never)
      ) : label === undefined ? (
        <Button key={key} dimColor={!isTextUi(ui) && o.isOn !== true} onPress={() => void o.onPress()}>
          {rest as never}
        </Button>
      ) : (
        <Button key={key} dimColor={!isTextUi(ui) && o.isOn !== true} label={label} onPress={() => void o.onPress()} />
      )}
    </Box>
  )
}

const TIP_BG = 'userMessageBackgroundHover'
const TIP_OFF = 'tip-off'
let tipPre = ''
const tipScope = (key: string) => `${tipPre}${key}`.slice(0, 64)
const tipHost = (key: string, hover: { backgroundColor?: string } = {}) => ({ backgroundColor: '#0000', ...hover, scope: tipScope(key) })
type TipAt = { top: number; left?: number; right?: number }
function tipChip(ui: Ui, key: string, text: string, at: TipAt) {
  const { Box, Text } = ui
  return (
    <Box position="absolute" {...at} display="none" hover={{ display: 'flex', scope: tipScope(key) }}>
      <Text wrap="truncate-end" backgroundColor={TIP_BG} hover={{ scope: TIP_OFF, backgroundColor: TIP_BG }}>{` ${text} `}</Text>
    </Box>
  )
}
const sideAt = (w: number, onLeft = false): TipAt => (onLeft ? { top: 0, right: Math.ceil(w) + 1 } : { top: 0, left: Math.ceil(w) + 1 })
const coverW = (n: number) => n * 1.18 + 1.56

// 덮개 폭을 셀 수 있는 칸(칩 · ? · 보기)은 keyed Box 한 겹(입력창 위 iconButton 꼴 — 덮개는 내림으로 칸 안에), 줄 남은 폭을 채우는 칸(grow — 요약 줄 ·
// 세션 관리 머리)만 안쪽 Box 가 넘침을 자른다(덮개가 옆 단추를 덮지 않게). 마우스 올림 줄은 바깥 keyed Box 몫(안쪽에서 자르면 같이 잘린다). 그리기 크기 — 0.1.5 재기
function pressBox(ui: Ui, key: string, o: PressOpts) {
  if (isTextPress(ui)) return textPressBox(ui, key, o)
  const { Box, Button, Text } = ui
  const cover = o.noCover ? null : (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} alignItems="stretch">
      <Button key={key} label={COVER.repeat(Math.max(1, Math.floor(o.cover)))} plain dimColor onPress={() => void o.onPress()} />
    </Box>
  )
  // 마우스 올림 줄은 칸 위(top -1) — absolute 는 앞에 그린 것 위에만 그려져(엔진 타입) 아래에 띄우면 다음 줄 · 칸에 가려진다(selfCmds 절 6.2.1판 까닭)
  const tip = o.tip ? tipChip(ui, key, o.tip, o.tipDown ? sideAt(coverW(o.cover), o.tipRight) : { top: -1, ...(o.tipRight ? { right: 0 } : { left: 0 }) }) : null
  const host = o.tip ? { hover: tipHost(key, o.box?.hover) } : {}
  if (!o.grow) {
    return (
      <Box key={`${key}-box`} columnGap={0.5} alignItems="center" flexShrink={0} {...o.box} {...host}>
        {o.content}
        {cover}
        {tip}
      </Box>
    )
  }
  return (
    <Box key={`${key}-box`} flexGrow={1} flexShrink={1} minWidth={0} {...host}>
      <Box columnGap={0.5} alignItems="center" overflow="hidden" flexGrow={1} minWidth={0} {...o.box}>
        {o.content}
        {cover}
      </Box>
      {tip}
    </Box>
  )
}

// 채움 — 엔진 타입) 빈칸(U+2800) 수를 칸 안 폭에 맞춘다. 칸 한 칸 약 12px · 글자 한 칸 약 8.5px(README-engine 실측)
const COVER = '⠀'
// 1칸 7.71px · 글 단추 안 여백 6px 둘 = 1.56칸 → 덮개 폭(칸) = 1.18n + 1.56 ≤ w. 넘치면 단추가 글 끝에 「…」 을 그려 칸 끝에 비친다.
// 0.1.21 의 「9할 − 2」는 옛 값(빈칸 1.08칸)으로 맞춰 20칸 넘는 자리에서 넘쳤다. 옛 값 환경에서는 이 식이 덜 덮는 쪽이라 안 넘친다
const coverCells = (w: number): number => Math.max(1, Math.floor(w * 0.845 - 1.4))
/** 그림 단추 칸 안 폭 — 그림 16px + 안 여백 0.5칸 둘 */
const ICON_COVER = Math.ceil((QUICK_ROW_PX + 12) / 8.5)

function iconButton(ui: Ui, key: string, icon: QuickIcon, name: string, onPress: () => void | Promise<void>, look?: IconLook, isStill = false) {
  const { Box, Button, Text } = ui
  const Svg = (ui as unknown as { Svg?: SvgEl }).Svg
  if (!Svg) return isStill ? <Text key={key}>{name}</Text> : <Button key={key} label={name} onPress={onPress} />
  if (isTextPress(ui)) {
    return (
      <Box key={key} columnGap={0.5} alignItems="center" flexShrink={0} marginLeft={ROW_LEAD}>
        {mark(ui, icon, name, { ...ROW_LOOK, ...look }) as never}
        {isStill ? <Text>{name}</Text> : <Button key={`${key}-p`} dimColor label={name} onPress={onPress} />}
      </Box>
    )
  }
  return (
    <Box key={key} borderStyle="single" borderColor="promptBorder" paddingX={0.5} paddingY={0.4} marginLeft={ROW_LEAD} hover={tipHost(key, { backgroundColor: 'promptBorderShimmer' })}>
      <Svg source={quickIconSvg(icon, { ...ROW_LOOK, ...look })} alt={name} width={QUICK_ROW_PX} height={QUICK_ROW_PX} />
      {isStill ? null : (
        <Box position="absolute" top={0} left={0} right={0} bottom={0} alignItems="stretch">
          <Button key={`${key}-p`} label={COVER.repeat(ICON_COVER)} plain dimColor onPress={onPress} />
        </Box>
      )}
      {tipChip(ui, key, name, sideAt(coverW(ICON_COVER)))}
    </Box>
  )
}

// 3:1 을 넘음, 옆 고정 칸은 20% 그대로). 늘 맨 앞 · 고를 것에 없음. 덮개는 그림 + 사이 + 글 + 안 여백 폭
const PANE_LABEL = () => L('세션 패널', 'Session panel')
const PANE_COVER = () => Math.ceil((QUICK_ROW_PX + 6 + 12) / 8.5 + textCh(PANE_LABEL()))

function paneButton(ui: Ui, isShown: boolean, onPress: () => void | Promise<void>, isStill = false) {
  const { Box, Button, Text } = ui
  const Svg = (ui as unknown as { Svg?: SvgEl }).Svg
  const name = isShown ? L('세션 패널 닫기', 'Close the session panel') : L('세션 패널 열기', 'Open the session panel')
  if (!Svg) return isStill ? <Text key="es-q-panel">{PANE_LABEL()}</Text> : <Button key="es-q-panel" label={PANE_LABEL()} onPress={onPress} />
  if (isTextPress(ui)) {
    return (
      <Box key="es-q-panel" columnGap={0.5} alignItems="center" flexShrink={0}>
        {mark(ui, isShown ? 'panelOpen' : 'panel', name, { hex: 'currentColor', px: QUICK_ROW_PX }) as never}
        {isStill ? <Text>{PANE_LABEL()}</Text> : <Button key="es-q-panel-p" label={PANE_LABEL()} onPress={onPress} />}
      </Box>
    )
  }
  return (
    <Box key="es-q-panel" borderStyle="single" borderColor="subtle" columnGap={0.5} alignItems="center" paddingX={0.5} paddingY={0.4} hover={tipHost('es-q-panel', { backgroundColor: 'promptBorderShimmer' })}>
      <Svg source={quickIconSvg(isShown ? 'panelOpen' : 'panel', { hex: 'currentColor', px: QUICK_ROW_PX })} alt={name} width={QUICK_ROW_PX} height={QUICK_ROW_PX} />
      <Text>{PANE_LABEL()}</Text>
      {isStill ? null : (
        <Box position="absolute" top={0} left={0} right={0} bottom={0} alignItems="stretch">
          <Button key="es-q-panel-p" label={COVER.repeat(PANE_COVER())} plain dimColor onPress={onPress} />
        </Box>
      )}
      {tipChip(ui, 'es-q-panel', name, sideAt(coverW(PANE_COVER())))}
    </Box>
  )
}

// Client 가 없는 표면은 켬 · 끔 드롭다운(확정안 I). module 은 이 파일 기준 글자 그대로(엔진이 소스에서 읽는다)

function onOff(ui: Ui, key: string, isOn: boolean, onSet: (on: boolean) => void, hasSwitch = true, isOff = false) {
  if (isOff && !(hasSwitch && 'Client' in ui && !isTextUi(ui))) return lockedPick(ui, key, '', L('못 읽음', "Can't read"))
  if (isTextUi(ui)) {
    const { Box, Button } = ui
    return (
      <Box key={key} columnGap={1} alignItems="center" flexShrink={0}>
        <Button key={`${key}-on`} label={isOn ? `✓ ${L('켬', 'On')}` : L('켬', 'On')} onPress={() => onSet(true)} />
        <Button key={`${key}-off`} label={isOn ? L('끔', 'Off') : `✓ ${L('끔', 'Off')}`} onPress={() => onSet(false)} />
      </Box>
    )
  }
  if (hasSwitch && 'Client' in ui) return <ui.Client key={key} module="./switch.tsx" props={{ on: isOn, disabled: isOff }} width={5} height={1} />
  const { Select } = ui
  return <Select key={key} value={isOn ? 'on' : 'off'} options={ON_OFF} onSelect={(x: string) => onSet(x === 'on')} />
}

const SEG_ON_EDGE = 'rgba(128,128,128,0.5)'

function segButton(ui: Ui, key: string, label: string, isOn: boolean, onPress: () => void | Promise<void>) {
  const { Box, Button } = ui
  if (isTextUi(ui)) return <Button key={key} label={isOn ? `✓ ${label}` : label} onPress={onPress} />
  if (!isOn) return <Button key={key} label={label} plain dimColor onPress={onPress} />
  return (
    <Box key={`${key}-on`} borderStyle="round" borderColor={SEG_ON_EDGE} paddingX={0} paddingY={0}>
      <Button key={key} label={label} variant="secondary" onPress={onPress} />
    </Box>
  )
}

const ULTRA_WORD = 'ultrathink'
const RAINBOW = ['rainbow_red', 'rainbow_orange', 'rainbow_yellow', 'rainbow_green', 'rainbow_blue', 'rainbow_indigo', 'rainbow_violet'] as const
const RAINBOW_HEX = ['#eb5f57', '#f58b57', '#fac35f', '#91c882', '#82aadc', '#9b82c8', '#c882b4'] as const

// 「Sending this word asks for deeper reasoning on this message」의 뜻, 뒤 둘은 하는 일
const ULTRA_TIP = () => L('더 깊이 추론하게 함 · 입력창 맨 앞에 넣음 · 다시 누르면 뺌', 'Asks for deeper reasoning · goes at the start of the prompt · press again to take it out')

function ultraWord(ui: Ui, isOn: boolean, isHex = false) {
  const { Text } = ui
  if (!isOn) return <Text>{ULTRA_WORD}</Text>
  const colors = isHex ? RAINBOW_HEX : RAINBOW
  return (
    <Text>
      {[...ULTRA_WORD].map((ch, i) => (
        <Text key={`es-u${i}`} color={colors[i % colors.length]}>
          {ch}
        </Text>
      ))}
    </Text>
  )
}

// advisor 묶음만 앞 여백을 1칸으로(1.5칸 띄움), 그 뒤 숫자는 앞 여백 없이 0.5칸으로 붙인다
const ROW_LEAD = 0.5

// 이름 · 20% 테두리 · 바탕은 마우스 올림 때만). 높이는 옆 세션 패널 · 고정 칸과 같게 안 여백 위아래 0.4, 마우스 올림 줄은 칸 아래
function rowChip(ui: Ui, key: string, icon: QuickIcon, label: string, onPress: () => unknown, tip: string, word?: unknown, isStill = false, isOn = false) {
  const { Button, Text } = ui
  if (isTextUi(ui)) {
    const inner = word ?? <Text>{label}</Text>
    return isStill ? (inner as never) : <Button key={key} onPress={() => void onPress()}>{inner as never}</Button>
  }
  if (!(ui as unknown as { Svg?: SvgEl }).Svg) return <Button key={key} label={label} onPress={() => void onPress()} />
  return pressBox(ui, key, {
    content: [mark(ui, icon, label, TEXT_LOOK), word ?? <Text>{label}</Text>],
    cover: Math.ceil((QUICK_ROW_PX + 6 + 12) / 8.5 + textCh(label)),
    onPress,
    tip,
    tipDown: true,
    noCover: isStill,
    isOn,
    box: { borderStyle: 'single', borderColor: 'promptBorder', paddingX: 0.5, paddingY: 0.4, marginLeft: ROW_LEAD, hover: { backgroundColor: 'promptBorderShimmer' } },
  })
}

type CharSvgEl = (props: { source: string; alt: string; width: number; height: number; isInteractive?: true }) => unknown

function advisorFigure(ui: Ui, key: string, m: AdvisorMark) {
  const { Box, Text } = ui
  const Svg = (ui as unknown as { Svg?: CharSvgEl }).Svg
  if (!Svg) return null
  return (
    <Box key={key} alignItems="center" flexShrink={0} hover={tipHost(key)}>
      <Svg
        source={advisorCharSvg(QUICK_ROW_PX, m.pose, m.isMoving)}
        alt={m.tip}
        width={advisorCharWidth(QUICK_ROW_PX, m.pose)}
        height={QUICK_ROW_PX}
        {...(m.isMoving ? { isInteractive: true as const } : {})}
      />
      {tipChip(ui, key, m.tip, sideAt(advisorCharWidth(QUICK_ROW_PX, m.pose) / 8.5))}
    </Box>
  )
}

/** 드롭다운 뒤 숫자 글 「N번 · $X」 — 무엇의 값인지는 바로 앞 「advisor」가, 이 세션 몫인 것은 띠 자리가 말한다(0.1.7 뒤 사용자 「이 세션」 뺌 — 노트 panel.md#advisorChar) */
export const advisorCountText = (m: Pick<AdvisorMark, 'count' | 'usd'>) => `${L(`${m.count}번`, `${m.count}×`)}${m.usd !== null ? ` · $${m.usd.toFixed(2)}` : ''}`

function advisorCount(ui: Ui, key: string, m: AdvisorMark) {
  const { Box, Text } = ui
  return (
    <Box key={key} alignItems="center" flexShrink={0} hover={tipHost(key)}>
      <Text color="subtle">{advisorCountText(m)}</Text>
      {tipChip(ui, key, m.tip, sideAt(textCh(advisorCountText(m))))}
    </Box>
  )
}

const LOCKED_TIP = () => L('답이 끝난 뒤 바꿀 수 있습니다', 'You can change it once the answer ends')

function lockedPick(ui: Ui, key: string, label: string, value: string, isWarn = false) {
  const { Box, Text } = ui
  if (isTextUi(ui)) {
    return (
      <Box key={key} columnGap={1} alignItems="center">
        <Text color="subtle">{label}</Text>
        <Text {...(isWarn ? { color: 'warning' } : { dimColor: true })}>{value}</Text>
      </Box>
    )
  }
  return (
    <Box key={key} columnGap={1} alignItems="center">
      <Text color="subtle">{label}</Text>
      <Box key={`${key}-v`} borderStyle="single" borderColor="promptBorderShimmer" paddingX={0.75} paddingY={0}>
        <Text {...(isWarn ? { color: 'warning' } : { dimColor: true })}>{value}</Text>
      </Box>
    </Box>
  )
}

/** 마우스를 올리면 한 줄 설명 — 패널은 칸 위(at 없음), 입력창 위 바는 같은 줄 옆(at). 노트 panel.md#tipChip */
function withTip(ui: Ui, key: string, child: unknown, tip: string, at: TipAt = { top: -1, left: 0 }) {
  const { Box } = ui
  return (
    <Box key={key} hover={tipHost(key)}>
      {child}
      {tipChip(ui, key, tip, at)}
    </Box>
  )
}

const cmdTip = (c: (typeof SELF_CMDS)[number], look: PanelLook) => (c.key === 'recap' || c.key === 'export' ? L(`바로 ${c.what}`, `${c.what} — right away`) : L(`${cmdWhat(c, look)} · 다시 누르면 뺌`, `${cmdWhat(c, look)} · press again to take it out`))

const SEND_LABEL = () => L('전달', 'Forward')
/** 값 칸 · ➤ 자리 폭(칸) · 값 글 자리(px) — 값이 바뀌어도, 고르는 순간에도 옆이 안 움직이게. 노트 panel.md#sendCell */
const SEND_VALUE_W = 15.4
const SEND_SLOT_W = 2.5
const SEND_VALUE_PX = 78
const PAD_PX = 8.46
const labelPx = (s: string): number => [...s].reduce((n, c) => n + (c === ' ' ? 3.5 : c.charCodeAt(0) > 0x2e80 ? 13 : 7), 0)

export function sendPad(label: string): string {
  return label + COVER.repeat(Math.max(0, Math.floor((SEND_VALUE_PX - labelPx(label)) / PAD_PX)))
}

// 0.1.19: 앱은 고르는 순간 목록 글을 값 칸에 바로 넣는다 — 칸이 글 폭대로 늘면 띠가 두 줄이 됐다 돌아온다. 앞글을 칸 밖 글로 빼고 값 칸 폭을 고정한다
function sendCell(ui: Ui, s: SendActs) {
  const { Box, Text, Select } = ui
  return (
    <Box key="es-q-send-row" columnGap={0.5} alignItems="center" flexShrink={0} marginLeft={ROW_LEAD}>
      <Box key="es-q-send-box" columnGap={0.5} flexShrink={0} alignItems="center" borderStyle="single" borderColor={s.state === 'on' ? 'suggestion' : s.state === 'bad' ? 'warning' : 'rgba(0,0,0,0)'} paddingX={0.5} paddingY={0.1} hover={tipHost('es-q-send-box')}>
        <Box key="es-q-send-cap" flexShrink={0}>
          <Text color="subtle">{SEND_LABEL()}</Text>
        </Box>
        <Box key="es-q-send-val" width={SEND_VALUE_W} flexShrink={0} alignItems="center">
          <Select key="es-q-send" value={s.value} options={s.options} onSelect={v => s.pick(v)} />
        </Box>
        {tipChip(ui, 'es-q-send-box', s.tip, sideAt(textCh(SEND_LABEL()) + SEND_VALUE_W + 2, true))}
      </Box>
      <Box key="es-q-send-slot" width={SEND_SLOT_W} alignItems="center" flexShrink={0}>
        {s.canText === true
          ? pressBox(ui, 'es-q-send-text', {
              content: [mark(ui, 'send', L('입력 글만 바로 보내기', 'Send just the text now'), TEXT_LOOK)],
              cover: 3,
              // 글로 누르는 표면의 단추 이름(textPress 절) — 시안 「➤ 단추」 그대로
              label: '➤',
              onPress: s.textOnly,
              tip: L('입력 글만 바로 보냅니다 · Claude 는 답하지 않습니다', "Sends just the text you typed, right away · Claude doesn't answer"),
              tipDown: true,
              tipRight: true,
              box: { borderStyle: 'single', borderColor: 'promptBorder', paddingX: 0.25, paddingY: 0.25, hover: { backgroundColor: 'promptBorderShimmer' } },
            })
          : null}
        {s.canText === false ? (
          <Box key="es-q-send-text-d" borderStyle="single" borderColor="promptBorderShimmer" paddingX={0.25} paddingY={0.25}>
            {mark(ui, 'send', L('보낼 글이 없습니다', 'Nothing to send'), { px: QUICK_ROW_PX, alpha: 0.5 })}
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

// 0.1.7: ultrathink · 명령은 패널 칩과 같은 칩(`rowChip`), advisor 는 그림 · 드롭다운 한 묶음 + 뒤에 붙인 숫자
export function drawQuickRow(ui: Ui, q: QuickView, acts: QuickActs, look: PanelLook = DESKTOP_LOOK) {
  if (look.isText) ui = withTextUi(ui)
  else if (look.textPress) ui = withTextPress(ui)
  const { Box, Text, Select } = ui
  const has = (item: QuickItem) => acts.items.has(item) && ((item !== 'pin' && item !== 'send') || look.isApp)
  if (!look.isApp && acts.send) acts = { ...acts, send: null }
  const advisor = (
    <Select key="es-q-advisor" label="advisor" value={acts.advisor.value} options={acts.advisor.options} onSelect={v => acts.advisor.pick(v)} />
  )
  const cmdPress = (key: (typeof SELF_CMDS)[number]['key']) => (key === 'recap' ? acts.recap() : key === 'export' ? acts.exportSession() : acts.slash(key))
  const mk = acts.advisor.mark
  const isFable = acts.advisor.value === 'fable' && !acts.isWorking
  // 미리보기(0.1.25)는 답하는 중과 같은 누를 수 없는 칸 — 엔진 드롭다운엔 막는 속성이 없고, 고르면 다시 그릴 때까지 고른 값이 남는다
  const isLocked = acts.isWorking || acts.isPreview === true
  // 미리보기엔 덮개 단추가 없다 — 누를 것이 없고, 띠 크기에 맞춘 덮개가 패널 글꼴에선 칩보다 넓다(그림 도구로 잼)
  const isStill = acts.isPreview === true
  const lockTip = (what: string) => (acts.isPreview ? L(`미리보기 — 아래 「${what}」에서 바꿉니다`, `Preview — change it in ${what} below`) : LOCKED_TIP())
  tipPre = acts.isPreview ? 'pv-' : ''
  const row = (
    <Box key="es-quick" columnGap={ROW_LEAD} rowGap={0.5} alignItems="center" flexWrap="wrap">
      {/* 노트: panel.md#textUi — 글 화면은 줄 앞에 흐린 「이지 세션」(시안 터미널 그림 — 띠에 mod 이름이 안 붙는 자리) */}
      {look.isText ? (
        <Box key="es-q-name" flexShrink={0}>
          <Text color="subtle">{L('이지 세션', 'easy-session')}</Text>
        </Box>
      ) : null}
      {paneButton(ui, acts.pane.isShown, acts.pane.toggle, isStill)}
      {has('pin') ? iconButton(ui, 'es-q-pin', 'pin', q.self.isStarred ? L('고정 풀기', 'Unpin') : L('고정', 'Pin'), acts.pin, q.self.isStarred ? { ...PINNED_LOOK, alpha: undefined } : undefined, isStill) : null}
      {has('ultra') ? rowChip(ui, 'es-q-ultra', 'brain', ULTRA_WORD, acts.ultrathink, ULTRA_TIP(), ultraWord(ui, acts.ultraOn, look.rainbowHex), isStill, acts.ultraOn) : null}
      {SELF_CMDS.filter(c => has(c.key)).map(c => rowChip(ui, `es-q-${c.key}`, CMD_ICONS[c.key], c.label, () => cmdPress(c.key), cmdTip(c, look), undefined, isStill))}
      {has('advisor') ? (
        <Box
          key="es-q-adv"
          columnGap={0.5}
          alignItems="center"
          flexShrink={0}
          marginLeft={2 * ROW_LEAD}
          {...(look.isText ? {} : { borderStyle: isFable ? ('round' as const) : ('single' as const), borderColor: isFable ? 'warning' : 'promptBorder', paddingX: 0.5, paddingY: 0.1 })}
        >
          {mk ? advisorFigure(ui, 'es-q-adv-mark', mk) : null}
          {withTip(
            ui,
            'es-q-advisor-box',
            isLocked ? lockedPick(ui, 'es-q-advisor-lock', 'advisor', acts.advisor.value, acts.advisor.value === 'fable') : advisor,
            isLocked ? lockTip('advisor') : L('세션마다 따로 걸립니다 · 기본값은 입력칸에 /advisor 를 쳐서', 'Set per session · for the default, type /advisor'),
            sideAt(textCh(`advisor ${acts.advisor.value}`) + 4),
          )}
          {mk && mk.count > 0 ? advisorCount(ui, 'es-q-adv-count', mk) : null}
        </Box>
      ) : null}
      {has('display') || acts.send ? <Box key="es-q-gap" flexGrow={1} /> : null}
      {acts.send ? (acts.isPreview ? lockedPick(ui, 'es-q-send-lock', SEND_LABEL(), acts.send.options.find(o => o.value === acts.send?.value)?.label.trim() ?? L('없음', 'None')) : sendCell(ui, acts.send)) : null}
      {has('display') ? (
        <Box key="es-display-box" marginLeft={ROW_LEAD} hover={tipHost('es-display-box')}>
          {isLocked ? (
            lockedPick(ui, 'es-display-lock', L('화면', 'Screen'), acts.display.options.find(o => o.value === acts.display.value)?.label ?? acts.display.value)
          ) : (
            <Select key="es-display" label={L('화면', 'Screen')} value={acts.display.value} options={acts.display.options} onSelect={v => acts.display.pick(v)} />
          )}
          {tipChip(ui, 'es-display-box', isLocked ? lockTip(L('화면', 'Screen')) : L('모든 세션의 Claude 답을 고른 기기에 맞춥니다', "Fits Claude's answers in every session to the device you pick"), sideAt(textCh(`${L('화면', 'Screen')} ${acts.display.value}`) + 4, true))}
        </Box>
      ) : null}
      {/* 노트: panel.md#noteLine — VS Code 알림 대신 한 줄(0.1.28 결정 9): 패널이 닫혔으면 줄 끝에 */}
      {acts.note ? (
        <Box key="es-q-note" marginLeft={ROW_LEAD} flexShrink={1} minWidth={0}>
          <Text color="subtle" wrap="truncate-end">
            {acts.note}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
  tipPre = ''
  return row
}

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
    note: null,
  }
}

const FABLE_TITLE = () => L('advisor 를 fable 로 켤까요?', 'Turn the advisor to fable?')
const FABLE_LEAD = () =>
  L(
    '이 세션 advisor 가 fable 로 바뀝니다. 이 대화에 /clear · /compact 전까지 안 걸리면 바꾸지 않고 그대로 둡니다. 불릴 때마다 Fable 5.2 가 돌아 같은 양이면 ',
    "This session's advisor changes to fable. If it can't apply to this conversation until /clear or /compact, nothing changes. Each call runs Fable 5.2, so for the same amount it ",
  )
const FABLE_COST: Record<PlanKind | 'unknown', string> = {
  get sub() {
    return L('5시간 사용량을 Opus 5.5 보다 많이 씁니다.', 'uses more of your 5-hour usage than Opus 5.5.')
  },
  get rate() {
    return L('요금이 Opus 5.5 의 2배 듭니다(정가 100만 토큰당 입력 $8 · 출력 $40).', 'costs twice as much as Opus 5.5 (list price per million tokens: input $8 · output $40).')
  },
  get unknown() {
    return L('구독은 5시간 사용량을 Opus 5.5 보다 많이 쓰고, API 요금으로 쓰면 요금이 2배 듭니다.', 'uses more 5-hour usage than Opus 5.5 on a subscription, and costs twice as much at API rates.')
  },
}

/** fable 확인 카드에서 누르는 것 — 켜기 · 닫기 */
export type FableActs = { confirm: () => Promise<void>; dismiss: () => Promise<void> }

export function drawFableAsk(ui: Ui, plan: PlanKind | null, acts: FableActs) {
  const { Box, Text, Button } = ui
  return (
    <Box key="es-fable" flexDirection="column" borderStyle="round" borderColor="warning" paddingX={1}>
      <Box key="es-fable-head" columnGap={1} alignItems="center">
        <Box key="es-fable-title" flexGrow={1}>
          <Text bold>{FABLE_TITLE()}</Text>
        </Box>
        <Button key="es-fable-x" variant="secondary" dimColor label="✕" onPress={acts.dismiss} />
      </Box>
      <Box key="es-fable-body">
        <Text>{`${FABLE_LEAD()}${FABLE_COST[plan ?? 'unknown']}`}</Text>
      </Box>
      <Box key="es-fable-btns" justifyContent="flex-end">
        <Button key="es-fable-on" variant="primary" label={L('켜기', 'Turn on')} onPress={acts.confirm} />
      </Box>
    </Box>
  )
}
