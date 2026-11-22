/**
 * 패널 따라 열기 · 칸 폭 셈. 옛 세션 트리(msg 세션 목록으로 그린 트리 · 🌳)는 0.1.31 에 뺐고, 공개 코드가 쓰는 함수만 남았다
 */
import type { StoredPane } from '../types'

/** $.store 의 열린 패널을 이 세션 기준으로: 연 세션과 같은 묶음일 때만 따라 연다 */
export function paneFollows(stored: unknown, selfGroup: string | null): boolean {
  if (typeof stored !== 'object' || stored === null || selfGroup === null) return false
  return (stored as Partial<StoredPane>).group === selfGroup
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
