/** 앱 딥링크로 옮겨 갈 세션(go) */
export type NavNode = { alias: string; label: string; sessionId: string; isDone: boolean }

/** $.store 'pane': 패널을 연 묶음. 같은 묶음 세션만 따라 연다(관계없는 세션엔 안 뜬다) */
export type StoredPane = { group: string | null }

/** 이 계정의 요금 갈래 — 'sub' 구독(5시간 · 7일 창이 옴), 'rate' 토큰마다 요금(응답이 있었는데 창이 없음). 노트 register.md#plan */
export type PlanKind = 'sub' | 'rate'

/** $.store 'plan': 모든 세션이 같이 보는 마지막 판정 — 첫 응답 전 세션이 쓴다 */
export type StoredPlan = { kind: PlanKind; at: number }

/** 이 세션에서 advisor 가 불린 수(하위 에이전트 포함) · 마지막 때 — <자료 폴더>/advisor/<앱 세션 id>.json. 노트 register.md#advisorUse */
export type AdvisorUse = { n: number; lastAt: number | null }

/**
 * advisor 호출 한 번 — 결과까지 온 것만, 세션 기록에서 읽어 메모리에만 둔다(tools/advisor-times.mjs — 노트 register.md#advisorTimes).
 * 조언 내용 · 물음은 없다. at = 호출 줄 시각(ms), input · output = 그 호출 토큰(못 찾으면 null), kind = 결과 꼴, doing = 호출 직전 글 꼬리,
 * tools · after = 직후 도구 이름 · 직후 첫 글 앞부분
 */
export type AdvisorCall = {
  id: string
  at: number
  input: number | null
  output: number | null
  model: string | null
  kind: string
  isAgent: boolean
  doing: string | null
  tools: readonly string[]
  after: string | null
}

/** 앱 세션 메타에서 쓰는 칸만 — 없거나 꼴이 다른 칸은 null(노트 meta.md#slimMeta) */
export type SessionMeta = {
  id: string
  title: string
  cli: string | null
  cwd: string | null
  /** 앱이 붙인 부모 — 떼어 내면 null(자식 보고 물려받기 · 앱 동작 기준). 패널 세션 트리는 `treeParents` 로 따로(노트 meta.md#treeParents) */
  parent: string | null
  /** spawnedFrom.sessionId — 떼어 내도 남는 원래 부모 */
  from: string | null
  /** 같은 가족 안 짧은 이름(spawnedFrom.name — start_session 의 name) — 없으면 칸 없음. 노트 meta.md#sendPlace */
  name?: string
  /** 앱이 맨 위로 옮긴 세션(lineageDetached) */
  detached: boolean
  createdAt: number | null
  lastAt: number | null
  isArchived: boolean
  isStarred: boolean
  mode: string | null
  model: string | null
  status: string | null
  /** 마지막 턴 요약 한 줄(postTurnSummary.status_detail) */
  detail: string | null
  /** 사람을 기다리는 일(postTurnSummary.needs_action) — 막힘일 때 패널 줄에 */
  needs: string | null
  receipts: Receipt[]
  /** 앱이 다음 차례에 넘기려고 쌓아 둔 곁가지 보고(앱 메타 queuedSideSessionNotes) — 없으면 칸 없음 */
  queued?: QueuedNote[]
  /** 앱이 센 끝난 차례 수(completedTurns) — 없으면 칸 없음. 첫 차례 판정(register.md#turnLines) */
  turnsDone?: number
  /** 예약 작업이 연 세션(앱 메타 scheduledTaskId — 사람 없는 세션, 0.1.31 8b). 아니면 칸 없음. 노트 meta.md#modeMatch */
  isScheduled?: boolean
  oddFields: number
}

/**
 * 엔진 세션 등록부 항목 하나 — <설정 폴더>/sessions/<pid>.json(살아 있는 세션만 · 평평 · 엔진이 문서로 약속한 자리 아님). 없거나 꼴이 다른 칸은 null.
 * entrypoint = claude-desktop · claude-vscode · cli …, hostSessionId = 데스크톱 앱 세션 id(데스크톱만), socket = 메시지 통로(messagingSocketPath). 노트 meta.md#parseRegistryEntry
 */
export type RegistryEntry = {
  pid: number
  sessionId: string
  cwd: string | null
  entrypoint: string | null
  hostSessionId: string | null
  name: string | null
  status: string | null
  startedAt: number | null
  updatedAt: number | null
  socket: string | null
  kind: string | null
}

/**
 * 「다른 세션」 칸의 지금 열린 세션 한 줄(0.1.28 — 등록부 · 데스크톱 앱 세션 기록). id = 그리기 · 보낼 칸 열쇠(데스크톱 세션은 앱 id, 그 밖은 엔진 세션 번호) ·
 * to = 보낼 주소(엔진 세션 번호 — `{ sessionId }`) · tag = 제목 뒤 표지(메인 · 오케 · 없음) · depth = 데스크톱 세션 트리 깊이 · canGo = [가기](데스크톱 세션만). 노트 meta.md#openRows
 */
export type OpenRow = { id: string; to: string; title: string; tag: string | null; depth: number; canGo: boolean }

/** 데스크톱 앱 밖 세션(등록부 — VS Code · 터미널) 한 줄 재료 — tag = 이름표(VS Code · 터미널). 노트 meta.md#openRows */
export type OutsideEntry = { entry: RegistryEntry; tag: string }

/** 앱 대기 칸의 곁가지 보고 하나 — body 는 앱이 다음 차례 글에 그대로 붙일 글. 노트 meta.md#queuedReports */
export type QueuedNote = { from: string; at: number; body: string }

/** 보낸 글 하나의 도착 기록(앱 메타 peerReceipts) */
export type Receipt = {
  to: string
  sentAt: number
  delivery: string
  deliveredAt: number | null
  readAt: number | null
  repliedAt: number | null
  reason: string | null
}

export type SentState = 'sent' | 'delivered' | 'read' | 'replied' | 'undelivered'

/** 패널 아래 「보낸 글」 한 줄 */
export type SentRow = { to: string; title: string; sentAt: number; state: SentState; reason: string | null }

/** easy-session 이 적는 끝남 기록 — <자료 폴더>/sessions/<앱 세션 id>.json */
export type EndRecord = { ended: true; summary: string; by: 'self' | 'user'; at: number }

/** 할 일 「끝난 곁가지」 한 줄(0.1.6) — 이 세션의 세션 트리 아래 끝남 기록이 있는 살아 있는 세션. attached = 보관하면 같이 보관될 붙은 세션 수 */
export type EndedKid = { id: string; title: string; summary: string; at: number; attached: number }

/** [전체] 「정리」 칸의 마지막 셈(0.1.6) — 보관된 세션이 남긴 스크래치(살아 있는 세션 것 · md 가 가리키는 것 뺌). at null = 아직 안 셈 */
export type CleanScan = {
  at: number | null
  running: boolean
  items: { path: string; title: string; bytes: number; days: number }[]
  bytes: number
  keepLive: number
  keepRef: number
  error: string | null
  /** 휴지통으로 옮기는 중 */
  moving?: boolean
}

/** 앱 묶음 트리 한 줄 */
export type FamilyRow = {
  id: string
  title: string
  depth: number
  isSelf: boolean
  isStarred: boolean
  isArchived: boolean
  isEnded: boolean
  isCold: boolean
  status: string | null
  needs: string | null
  lastAt: number | null
  mode: string | null
  /** 그 아래 보일 수 있는 세션 수(접혔을 때 「자식 N」) — 노트 meta.md#buildFamilies */
  kids: number
  /** 그 아래에서 입력을 기다리는 세션 수(접혔을 때 「입력 필요 N」) — 노트 meta.md#buildFamilies */
  waiting: number
  /** 접혀서 아래 줄을 안 그리는가(펼침 삼각 ▸) */
  isShut: boolean
  /** 떼어 낸 세션(앱 보고가 안 옴 — 끊김 그림) */
  isDetached: boolean
  /** 오케로 정한 세션(왕관) */
  isOrche: boolean
  /** 고정 이유(0.1.6) — 고정 안 됐으면 null. owner 주인 · child 곁가지(끝나면 풂) · user 사람 */
  pinWhy: 'owner' | 'child' | 'user' | null
}

/** 패널 세션 트리를 그리는 이지 세션 기록($.store) — 주인 덮어쓰기(owner:<id> = 세션 id · 'top') · 인계(succ:<옛 주인> = 뒤 주인) · 오케(orche:<id>). 노트 meta.md#treeParents */
export type TreeLinks = { owners: ReadonlyMap<string, string>; succ: ReadonlyMap<string, string>; orche: ReadonlySet<string> }

/** 오케의 진행판 — <자료 폴더>/boards/<오케 id>.json(경로 · 본 줄 앞 60자 모음). 경로가 빈 글이면 안 정함. 노트 meta.md#board */
export type BoardFile = { path: string; seen: string[] }

/** advisor 공용 파일(이지 컴팩트가 씀) — <설정 폴더>/plugins/data/advisor-use/<엔진 세션 id>.json. 노트 meta.md#parseAdvisorShare */
export type AdvisorShare = { n: number; usd: number; at: number }

/** 앱 묶음 하나 — spawnedFrom 을 따라 맨 위 세션까지 */
export type Family = {
  rootId: string
  isSelf: boolean
  isOpen: boolean
  rows: FamilyRow[]
  live: number
  ended: number
  archived: number | null
  lastAt: number | null
  /** 줄 상한을 넘는 줄 수(「나머지 N」 — 펼쳐 둬도 센다) — 노트 meta.md#buildFamilies */
  hidden: number
}

/** 받는 세션의 컨텍스트 — 그 세션이 턴 끝에 적은 값 또는 대화 기록 끝 */
export type ContextInfo = { tokens: number; model: string | null; ttlMs: number | null; at: number; source: 'report' | 'transcript' }

/** 받는 세션이 떼어 모아 둔 자식 보고 하나 — <자료 폴더>/reports/<받는 세션 앱 id>.json */
export type HeldReport = { from: string; title: string; text: string; at: number }

/** 앱 대기 칸에서 먼저 받은 보고의 서명 — 앱이 같은 글을 나중에 넘기면 버리려고 둔다(sent = 앱 글과 짝지음). 노트 meta.md#heldFile */
export type HeldSeen = { from: string; at: number; key: string; sent: boolean }

/** 받는 세션 몫 보고 파일 전체 — took = 보낸 세션마다 내보낸 칸에서 어디까지 받았나(그 글의 at). 노트 meta.md#outbox */
export type HeldBox = { items: HeldReport[]; seen: HeldSeen[]; took?: Readonly<Record<string, number>> }

/** 입력창 신호 하나 — word = >> 뒤 낱말, rest = 신호를 뺀 사람 글. 노트 meta.md#signalOf */
export type DraftSignal = { word: string; rest: string }

/** 받을 세션 찾기 결과. 못 찾으면 miss(self = 이 세션뿐 · none = 없음 · many = 여럿 · crowns = 왕관 여럿)와 맞는 세션 이름. 노트 meta.md#findTarget */
/** 입력창 신호의 받는 곳 — name = 위 · 메인 밖 이름(0.1.29 ③ F9 — 입력창 보내기는 위로만, 보내지 않음). crowns · many 는 0.1.29 부터 안 나옴(글만 남김) */
export type RelayFound = { id: string } | { miss: 'self' | 'none' | 'many' | 'crowns' | 'name'; names: readonly string[] }

/** 보내는 길 — direct 이 세션 mod 가 바로 · model Claude 가 SendMessage · card 받는 세션 할 일 카드. 노트 meta.md#relayWay */
export type RelayWay = 'direct' | 'model' | 'card'

/** 이 차례 끝에 보낼 것 — $.store relay:<세션 id>(다시 불러도 남게). 노트 register.md#relay */
export type RelayPending = { to: string; word: string; way: RelayWay; own: string; at: number; turnId: string | null; modelSent?: boolean }

/** 이 세션이 끝 답을 보낸 표시 — $.store relayed:<보낸 세션 id>. 받는 세션이 같은 차례 자동 보고 하나를 거른다. 노트 meta.md#splitRelayed */
export type RelayMark = { to: string; at: number }

/** 내보낸 칸의 글 하나 — <자료 폴더>/outbox/<보낸 세션 id>.json. 받는 세션이 읽어 할 일 카드로. 노트 meta.md#outbox */
export type OutItem = { to: string; title: string; text: string; at: number }

/** 받은 세션 글의 보낸 쪽 — 꼬리표 `<cross-session-message …>` 에서 읽은 값(from = 앱 id 또는 엔진 주소 · session = 기록 id · name = 제목). 노트 meta.md#peerRel */
export type PeerSender = { from: string | null; session: string | null; name: string | null }

/**
 * 보낸 세션과 이 세션의 관계(패널 세션 트리 기준) — up 바로 위 · upFar 위쪽이지만 바로 위는 아님(via = 바로 위 세션 제목, isCrown = 보낸 세션이 오케) ·
 * down 아래 · tree 같은 세션 트리의 다른 세션 · other 다른 세션 트리 · unknown 세션 목록에 없음. 노트 meta.md#peerRel
 */
export type PeerRel =
  | { kind: 'up' | 'down' | 'tree' | 'other'; title: string }
  | { kind: 'upFar'; title: string; via: string; isCrown: boolean }
  /** 데스크톱 앱 밖 세션(0.1.28 — 등록부로 풂): surface = VS Code · 터미널 */
  | { kind: 'outside'; title: string; surface: string }
  | { kind: 'unknown' }

/**
 * 보내기 확인(0.1.27 msg 규칙 R1 · R2) — 본 대화 차례 하나의 기록($.state). isHuman = 이 차례에 사람 글(composer · bridge)이 있음 · places = 이 차례에 센 서로 다른 곳 ·
 * asked = 막고 물으라고 한 곳(사람이 답할 때까지 남음) · ok = 사람이 답해 이 차례에 통과하는 곳 · allow = 사용자가 시킨 보내기(이지 세션이 채운 글 · >> 신호)의 곳. 곳 = 세션 id(못 풀린 곳은 「?」+ 입력 글).
 * cold = 오래 쉰 세션이라 이 차례에 한 번 막은 곳(0.1.31 H2 — 같은 차례 같은 곳 다시 보내면 통과, 차례마다 비움). 없으면 빈 목록으로 본다.
 * 노트 register.md#sendRules
 */
export type RulesTurn = { isHuman: boolean; places: string[]; asked: string[]; ok: string[]; allow: string[]; cold?: string[] }

/** prompt.submit 이 적어 두고 다음 본 대화 turn.start 가 가져가는 것(그 차례를 시작한 글) — 노트 register.md#sendRules */
export type RulesPending = { isHuman: boolean; allow: string[] }

/** 받는 곳(0.1.27 msg 규칙) — id = 풀린 앱 세션 id(못 풀면 null), key = 세는 열쇠, title = 까닭 글에 쓸 이름. 노트 meta.md#sendPlace */
/** alt = 같은 곳의 다른 주소(등록부 항목 — uds: 통로 · 엔진 세션 번호 · 이름, 0.1.28 ⑦) — 시킨 곳 · 물은 곳 맞추기에 */
/** dups = 제목 · 짧은 이름이 같은 살아 있는 세션이 둘 이상(0.1.31 H3) — n 개 중 최근 순 셋까지의 id. 있으면 늘 막는다(id 로 다시 보내라) */
export type SendPlace = { id: string | null; key: string; title: string; alt?: string[]; dups?: { n: number; ids: string[] } }

/** 한 세션의 자식 보고 켬 · 끔 — 그 세션에서 정한 값, 아니면 가장 가까운 위 세션 값(from), 아니면 처음 값 */
export type ReportState = { on: boolean; isSet: boolean; from: string | null }

/**
 * 데스크톱 패널 화면 상태(이 세션) — 보는 쪽([세션 도구] · [설정] — 0.1.25 에서 [전체]를 뺌, 옛 저장 값 'all' 은 첫 탭으로 그림) · ⋯ 메뉴를 연 줄 · 원격이 켜진 것을 본 id · 보내는 곳(줄 id, 「메시지 보내기」
 * 칸이면 'to:' + id) · 카드 · 보낼 글 · 펼친 접힘(open: · rest: · ended: · arch: + 묶음 맨 위 id, shut: · msgs: + 줄 id,
 * sibs · kids = 「이 세션」 쪽 목록 나머지, held: + 메시지 열쇠 = 펼친 내용(한 번에 하나), help: + 칸 이름 = ? 를 눌러 편 설명,
 * board-lines · board-edit · adopt, adv-more = 어드바이저 칸 이전 줄) · 세션 관리에서 묻는 중(끝내기 · 보관 — 0.1.5) ·
 * 도구판에서 편 칸 하나(0.1.26 — 칸 열쇠 msg · col · inq · rep · brd · role · cmd · adv · mgr, null = 닫음) ·
 * remoteBad = 원격 상태를 못 읽은 이 세션 id(0.1.29 ② F1 — 「고정 · 보관」 칸 Remote Control 스위치 흐림, 옛 판 상태엔 없음)
 */
export type PanelUi = {
  view: 'self' | 'settings'
  tool: string | null
  open: string | null
  remote: string | null
  remoteBad?: string | null
  sending: string | null
  card: string | null
  draft: string
  folds: string[]
  /** 묻는 중 — 끝내기 · 보관 · 휴지통 · 0.1.31 8c [모두 거절](모아 둔 메시지 칸 맨 위 — 한 번 묻고 지움) */
  ask: 'end' | 'archive' | 'trash' | 'rejectAll' | null
  /** 0.1.31 ⑧ 보관 · 끝내기 전 남은 메시지 묻기(누를 때 센 값 — 그릴 때 파일을 안 읽는다). ⑦ 정리는 붙은 세션도. 없으면 null */
  pre?: PreAsk | null
  /** 0.1.31 8b ⓐ 패널 [보내기]가 막히는 칸(받는 쪽 권한 무시 · plan, 이 세션 그 밖)일 때 보낼 칸 자리의 고르기(누를 때 센 값). 없으면 null */
  match?: MatchAsk | null
  /** 0.1.31 8b ⓑ [하위 모두 자동으로] 뒤 트리로만 묶인 권한 무시 하위(이 세션이 연 세션이 아님) — 묻기 카드 하나로 묶어 묻는 중. 없으면 null */
  kidsAsk?: string[] | null
}

/** 8b ⓐ 고르기 재료 — text = 보낼 글, busy = 받는 곳이 일하는 중(엔진 등록부), isOwnKid = 이 세션이 연 하위(앱 부모), confirm = 남의 세션 내리기 한 번 더 묻는 중. 노트 register.md#modeMatch */
export type MatchAsk = { id: string; text: string; fromMode: string; toMode: string; busy: boolean; isOwnKid: boolean; confirm: boolean }

/** 일하는 중인 세션을 그 차례가 끝난 뒤 자동으로 내리기(8b ⓐ [끝나면 내리고 보내기] · ⓑ [하위 모두 자동으로]) — text 가 있으면 내린 뒤 보낸다. 노트 register.md#lowerQueue */
export type LowerJob = { id: string; text: string | null; at: number }

/** ⑧ 묻기 카드 재료 — act = 줄 [보관] · [끝내기] · [정리](끝난 하위 모두), rows = 남은 메시지나 붙은 세션이 있는 세션만. 노트 register.md#leftover */
export type PreAsk = {
  act: 'archive' | 'finish' | 'tidy'
  ids: string[]
  rows: { id: string; title: string; inN: number; outN: number; attached: number }[]
}

/**
 * 패널 판 단추 · 서랍 상태(0.1.29 — easy-compact types UpdateState 그대로, 노트 register.md#refreshUpdateInfo). phase: idle = 아직 안 눌러 봄 ·
 * checking · latest · newer · updating · done = 받음 · failed · synced = 디렉터리 설치본(Claude Code 가 켤 때 받음) · dev = 폴더로 불러온 판 · 폴더 마켓 판(단추 없음).
 * devBuild = 개발본(개발자 구역 안에서만 켬 — 「개발자 모드」 글), devOff = 개발자 모드 꺼짐. updatedTo = 업데이트 뒤 첫 실행의 그 판(본 판과 다를 때).
 * changes · versions = 판별 바뀐 것(새 판부터), open = 서랍 안 펼친 것(명령 출력)
 */
export type UpdateState = {
  phase: 'idle' | 'checking' | 'latest' | 'newer' | 'updating' | 'done' | 'failed' | 'synced' | 'dev'
  devOff?: boolean
  devBuild?: boolean
  own: string | null
  market: string | null
  marketAt: string | null
  error?: string
  failedOn?: 'check' | 'apply'
  isTimeout?: boolean
  updatedTo?: string | null
  changes?: Record<string, ChangeGroup[]>
  open?: { changes?: boolean; error?: boolean; note?: boolean }
  versions?: string[]
}

/** 변경 기록 한 판의 묶음 하나(### 머리 · 줄들) */
export type ChangeGroup = { head: string; items: string[] }

declare module 'claude-code' {
  interface PluginState {
    'easy-session': {
      /** 데스크톱 패널 화면 상태 */
      panelUi: PanelUi
      /** 앱 메타가 바뀌면(또는 1분마다) 올린다 — 그리는 쪽이 읽어 다시 그린다 */
      appTick: number
      selfGroup: string | null
      /** 이 세션에 트리 패널을 열어 두었는가 */
      isOpen: boolean
      /** advisor 를 fable 로 켤지 묻는 카드를 입력창 위 띠에 띄웠는가 — [켜기] · ✕ · 다른 값 고르기로 닫는다 */
      fableAsk: boolean
      /** 이 세션이 본 요금 갈래 — 구독 창을 한 번 보면 'sub' 로 남는다(노트 register.md#plan) */
      plan: PlanKind | null
      /** 이 세션에서 advisor 가 불린 수 · 마지막 때 — null 은 저장 파일을 아직 안 읽음(노트 register.md#advisorUse) */
      advisorUse: AdvisorUse | null
      /** 지금 메인 차례 안에서 advisor 가 불린 때 — 메인 차례가 끝나면 지운다(그동안 그림이 손짓 꼴) */
      advisorTurn: number | null
      /** 메인 요청이 쓴 모델(하위 에이전트 요청은 안 씀) — advisor 가 이 세션 메인에 걸리는지 가른다 */
      mainModel: string | null
      /** 입력창 글에 ultrathink 낱말이 있는가 — 입력창 위 단추 꼴(노트 register.md#ultrathink) */
      ultraOn: boolean
      /** 지금 본 대화 차례 글에 ultrathink 낱말이 들어갔는가 — 채팅 작업 줄 글 앞 「ultrathink · 」(0.1.26 — 노트 register.md#ultraSpinner) */
      ultraTurn: boolean
      /** 보내기 확인(0.1.27) — 지금 본 대화 차례 기록 · 다음 차례를 시작할 글(노트 register.md#sendRules) */
      rulesTurn: RulesTurn
      rulesPending: RulesPending | null
      /** VS Code 알림 대신 한 줄(0.1.28) — 다음에 누를 때까지(노트 register.md#noteLine) */
      noteLine: string | null
      /** 패널 판 단추 · 서랍 상태(0.1.29 — 노트 register.md#refreshUpdateInfo) */
      update: UpdateState
      /** 판 단추 서랍을 폈는가(0.1.29) */
      updDrawer: boolean
    }
  }
}
