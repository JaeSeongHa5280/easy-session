import { L } from './i18n'
import { josa } from './panel'

/** 고를 값 — 이 계정에서 엔진이 내는 그대로(인자 없는 /advisor 로 읽으면 대화에 줄이 남아서 고정 목록) */
export const ADVISORS = ['off', 'sonnet', 'opus', 'fable'] as const

/** 설정 값 → 고르기 값: 비면 off, 모델 이름은 별칭으로 줄이고, 모르는 값은 그대로 */
export function advisorAlias(raw: string): string {
  if (raw === '') return 'off'
  const low = raw.toLowerCase()
  return ADVISORS.find(a => a !== 'off' && low.includes(a)) ?? raw
}

/** 엔진 답 한 벌 — said = 바꿨다고 답함 · isSession = 이 세션만 · isLater = 열린 대화는 /clear · /compact 전까지 앞 값 · model = 새 모델(끔이면 null) · kept = 대화가 쥔 앞 모델 */
export type AdvisorAnswer = { said: boolean; isSession: boolean; isLater: boolean; model: string | null; kept: string | null }

// 「(this session only)」), 열린 대화가 앞 값을 쥐면 「… until /clear or /compact」. 옛 엔진(기본값에 씀)은 이 세션 표지가 없다
export function readAdvisorAnswer(text: string): AdvisorAnswer {
  const off = /Advisor disabled/i.test(text)
  const set = /Advisor set to (.+?)(?= for this session| \(this session only\)|\.?\s*(?:\n|$))/i.exec(text)
  const keeps = /keeps (.+?) as its advisor/i.exec(text)
  return {
    said: off || set !== null,
    isSession: /for this session|\(this session only\)/i.test(text),
    isLater: /until \/clear or \/compact/i.test(text),
    model: set ? set[1].trim() : null,
    kept: keeps ? keeps[1].trim() : null,
  }
}

export function advisorToast(text: string): string {
  if (/can't be changed from this client/i.test(text)) return L('이 화면에선 advisor 를 바꿀 수 없습니다', "The advisor can't be changed from this screen")
  const a = readAdvisorAnswer(text)
  if (!a.said) return text
  const m = a.model
  const who = a.isSession ? L('이 세션 advisor 를', "this session's advisor") : L('advisor 를', 'the advisor')
  const said =
    m === null
      ? L(`${who} 껐습니다`, `Turned ${who} off`)
      : L(`${who} ${m} ${josa(m, '으로', '로')} 바꿨습니다`, `Set ${who} to ${m}`)
  const notes = [
    ...(a.isLater ? [a.kept ? L(`이 대화는 /clear · /compact 전까지 ${a.kept} 그대로`, `this conversation keeps ${a.kept} until /clear or /compact`) : L('이 대화는 /clear · /compact 전까지 그대로', 'this conversation stays as is until /clear or /compact')] : []),
    ...(/will not activate on the main model/i.test(text) ? [L('이 세션 메인 모델엔 안 걸림 · 하위 에이전트만', "not on this session's main model · subagents only")] : []),
    ...(/less capable than the current main model/i.test(text) ? [L('메인 모델보다 약해 안 걸림', "less capable than the main model, so it won't apply")] : []),
    ...(/doesn't support the advisor/i.test(text) ? [L('지금 메인 모델은 advisor 를 못 씀', "the current main model doesn't support the advisor")] : []),
  ]
  return [said, ...notes].join(' · ')
}

/** 이 대화엔 /clear · /compact 전까지 안 걸려 앞 값으로 되돌린 뒤의 알림 — isBack = 되돌리기도 엔진이 받음, value = 고른 값 */
export function advisorKeptToast(text: string, isBack: boolean, value: string): string {
  if (!isBack) return L(`이 대화엔 /clear · /compact 전까지 안 걸리는데 되돌리지 못해 ${value} ${josa(value, '으로', '로')} 바뀐 채 남았습니다`, `It won't apply to this conversation until /clear or /compact, and couldn't be undone — left at ${value}`)
  const kept = readAdvisorAnswer(text).kept
  return kept
    ? L(`이 대화는 /clear · /compact 전까지 ${kept} 그대로라 안 바꿨습니다`, `This conversation keeps ${kept} until /clear or /compact, so nothing changed`)
    : L('이 대화엔 /clear · /compact 전까지 안 걸려서 안 바꿨습니다', "It won't apply to this conversation until /clear or /compact, so nothing changed")
}
