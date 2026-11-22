/**
 * Claude 에게 넣는 지시 글(세션 관리 [정리] · 하위 줄 「일 합치기」 · [보고 꼴로] · [제목 정리] · [인계]) — 글만 있다.
 * register.tsx 가 공개본 256 KiB 한도를 넘지 않게 따로 둔다(0.1.31). 부르는 곳 · 넣는 길은 register.tsx
 */
import { L } from './i18n'
import type { SessionRole } from './meta'

export const CLEAN_ASK = (): string =>
  L(
    [
      '이 세션을 정리해 주세요(easy-session 「정리」 단추).',
      '① 정본 맨 위 「지금 상태」 · 「인계」를 지금대로 고칩니다.',
      '② 안 한 커밋은 경로를 붙여 커밋하고, 쥔 잠금을 풉니다.',
      '③ 이 세션이 만든 임시 md 가 있으면, 정본 · 노트가 가리키지 않는 것을 끝 줄에 적습니다(지우지 않음). 스크래치는 보관 뒤 easy-session 이 휴지통으로 옮깁니다.',
      '④ 진행판이 있으면 맨 위에 끝 줄 「- MM-DD [세션 이름] 끝: 한 일 · 남은 것」을 씁니다 — easy-session 이 끝남으로 적고, bypass 세션이면 저절로 붙인 고정을 풉니다(auto 면 같은 세션 트리 위 bypass 세션이 대신 풂 — 없으면 고정은 그대로).',
      '⑤ 보관은 하지 않습니다 — 주인이나 사용자가 합니다.',
    ].join('\n'),
    [
      'Please clean up this session (easy-session 「Clean up」 button).',
      '① Update the current state and handover notes at the top of the main doc to match now.',
      "② Commit what isn't committed yet, naming the paths, and release any locks you hold.",
      "③ If this session made temporary .md files, list the ones the main doc and notes don't point to on the end line (don't delete them). easy-session moves scratch files to the Recycle Bin after archiving.",
      "④ If there is a progress board, write the end line at its top: 「- MM-DD [session name] 끝: what was done · what's left」 (keep 끝: as is — easy-session reads it). easy-session marks this session ended and, in a Bypass session, unpins what it pinned automatically (in auto, a Bypass session above in the same session tree does it — without one, the pin stays).",
      "⑤ Don't archive — the owner or the user does that.",
    ].join('\n'),
  )

// 시안 글의 「(>>위)」는 0.1.26 때 없던 신호라 「보고 꼴 다섯 칸」으로 풀어 씀(0.1.29 ③ F9 부터 >>위 는 신호 — 글은 그대로)
export const CLEAN_TOP = (): string[] => [
  L(
    'ⓐ 하위 세션 — 「하위 세션」 칸의 줄을 보고, 끝난 세션은 일 합치기 · 보관을, 오래 쉰 세션은 정리 부탁 · 끝내기를 줄마다 권합니다(실행은 줄마다 단추로).',
    'ⓐ Sessions below — look at the rows in the Below tile; on each row suggest merging work and archiving for ended sessions, and asking to clean up or ending for long-idle ones (each runs from its row\'s buttons).',
  ),
  L('ⓑ 일 — 진행판 · 정본의 닫힌 물음을 정리하고 남은 결정을 한 줄로 모읍니다.', 'ⓑ Work — tidy the closed questions on the progress board and in the main doc, and gather the remaining decisions in one line.'),
  L(
    'ⓒ 보고 — 위 세션이 있으면 위로, 없으면 사용자에게 보고 꼴 다섯 칸(끝난 것 · 하는 중 · 막힌 것 · 기다리는 결정 · 다음)으로 씁니다.',
    'ⓒ Report — upward if there is a session above, otherwise to the user, in the five-part report form (done · in progress · blocked · decisions waiting · next).',
  ),
]

// 하위 줄 ⋯ [일 합치기] = 그 하위 보낼 칸을 이 글로 채워 연다(정리 부탁과 같은 길 — 보내는 건 사람). 보관은 위 세션이 그 줄 [보관]으로
export const MERGE_ASK = (): string =>
  L(
    [
      '하던 일을 위 세션에 넘기고 끝내 주세요(easy-session 「일 합치기」).',
      '① 끝 줄 — 한 일 · 남은 것을 한 줄로 씁니다.',
      '② 만든 문서 · 바뀐 파일 경로를 적습니다 — 안 한 커밋은 경로를 붙여 커밋합니다.',
      '③ ①과 ②를 답으로 씁니다 — 위 세션이 받아 이어 갑니다.',
      '④ 진행판이 있으면 맨 위에 끝 줄 「- MM-DD [세션 이름] 끝: 한 일 · 남은 것」을 씁니다 — easy-session 이 끝남으로 적습니다.',
      '⑤ 보관은 하지 않습니다 — 위 세션이 그 줄 [보관]으로 합니다.',
    ].join('\n'),
    [
      'Hand your work over to the session above and end (easy-session 「Merge work」).',
      "① End line — write what was done and what's left in one line.",
      "② List the documents you made and the files you changed — commit what isn't committed yet, naming the paths.",
      '③ Write ① and ② as your answer — the session above picks it up.',
      "④ If there is a progress board, write the end line at its top: 「- MM-DD [session name] 끝: what was done · what's left」 (keep 끝: as is — easy-session reads it). easy-session marks this session ended.",
      "⑤ Don't archive — the session above does it with Archive on that row.",
    ].join('\n'),
  )

// (`>>낱말` — 입력창 「전달」과 같은 길: 보내면 차례 끝 답이 위로 간다), 위가 없으면(메인 · 맨 위 오케) 사용자에게 채팅으로. 다시 누르면 뺀다(ask 의 같은 글 찾기)
export const REPORT_LINES = (): string[] => [
  L('① 끝난 것 — 커밋 · 경로와 함께', '① Done — with commits and paths'),
  L('② 하는 중 — 지금 단계 · 다음 단계', '② In progress — the current step and the next'),
  L('③ 막힌 것 — 무엇 때문인지 · 누가 풀 수 있는지', '③ Blocked — on what, and who can unblock it'),
  L('④ 기다리는 결정 — 물음 하나씩, ★ 가 있으면 함께', '④ Decisions waiting — one question each, with ★ if any'),
  L('⑤ 다음 — 이 세션이 할 일 · 위가 할 일', '⑤ Next — what this session does and what the one above does'),
  L('칸마다 한두 줄, 없으면 「없음」.', 'One or two lines per part; "None" if empty.'),
]

export const TITLE_FORM: Record<SessionRole, string> = {
  get main() {
    return L('「[범위] 원래 제목 N차 — 묶음」', '「[scope] original title N차 — batch」 (keep N차 as is — easy-session reads it for handovers)')
  },
  get orche() {
    return L('「[범위] 원래 제목 N차 — 묶음」', '「[scope] original title N차 — batch」 (keep N차 as is — easy-session reads it for handovers)')
  },
  get sub() {
    return L('「[범위] 하는 일」 — [범위]는 위 오케의 것', "「[scope] the work」 — [scope] is the orchestrator's above")
  },
  get solo() {
    return L('정한 꼴 없음 — 하는 일이 드러나게 짧게', 'no set form — short, so the work shows')
  },
}

// 채팅 카드(offer)를 띄운다. 세션 트리는 새 세션 제목이 다음 차수면 넘어간다
export const HANDOFF_ASK = (): string =>
  L(
    [
      '이 세션을 인계해 주세요(easy-session 「인계」 단추).',
      '① 정본 맨 위 「지금 상태」 · 「인계」를 지금대로 고치고 커밋합니다.',
      '② 채팅에 새 세션 카드를 띄웁니다 — start_session(initiation "offer"), 제목은 이 세션의 다음 차수 「[범위] 원래 제목 N+1차 — 다음 묶음」. 사용자가 새 세션을 고르면 할 일은 정본 맨 위부터 읽고 잇기로 쓰되, 첫 차례는 인계 자료만 읽고 「나 · 연결」(무엇을 하는 세션인지 한 줄 · 도는 세션 · 끝난 세션)을 보고한 뒤 사용자 말을 기다린다고 씁니다.',
      '③ 세션 트리는 easy-session 이 넘깁니다 — 제목이 다음 차수면 새 세션 고정 · 이 세션 고정 풀기 · 곁가지 · 오케 표시 · 진행판.',
      '④ 이 세션 보관은 사용자 말 뒤에 합니다. 사이드바에서 보관하면 붙은 새 세션까지 같이 보관되니, 이 세션 패널 [보관]이나 Claude 에게 말로 합니다(붙은 세션을 먼저 떼어 남깁니다).',
    ].join('\n'),
    [
      'Hand this session over (easy-session 「Hand over」 button).',
      '① Update the current state and handover notes at the top of the main doc to match now, and commit.',
      "② Show a new-session card in the chat — start_session(initiation \"offer\"), titled as this session's next round 「[scope] original title N+1차 — next batch」 (keep N차 as is — easy-session reads it). For the task, write that the new session continues by reading the main doc from the top, and that its first turn only reads the handover notes, reports who it is and what it is connected to (one line on what the session does · sessions running · sessions ended), then waits for the user.",
      '③ easy-session moves the session tree over — when the title is the next round: pin the new session, unpin this one, side sessions, the orchestrator mark and the progress board.',
      "④ Archive this session only after the user says so. Archiving from the sidebar also archives the attached new session, so use Archive in this session's panel or ask Claude in words (it detaches the attached session first and keeps it).",
    ].join('\n'),
  )
