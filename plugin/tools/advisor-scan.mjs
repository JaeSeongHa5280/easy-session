// easy-session advisor 호출 시점(0.1.13) — 세션 기록 줄에서 언제 불렸는지만 뽑는 순수 함수(파일 · 프로세스를 안 건드림 — 시험이 바로 부른다).
// 지키는 것(사용자 11-09 「어느시점에 어드바이저가 호출되어서 사용되었다 정도면」): 줄은 JSON.parse 하기 전에 봉인 칸 값을 지운다 · 결과 블록은
// 짝(tool_use_id)과 꼴(content.type)만 본다 · 글은 assistant 줄의 text 블록만(thinking 은 안 읽음) · 아무것도 파일에 안 쓴다. 노트 docs/notes/register.md#advisorTimes

const SEALED = '"encrypted_content"'
/** 하던 일 꼬리 · 그 뒤 앞부분 글자 수(사용자 시안 약 70자) */
const TEXT_CH = 70
/** 그 뒤 도구 수(사용자 시안 최대 4개) */
const TOOL_MAX = 4
/** 글 다듬기 전에 잘라 둘 길이 — 긴 글에 정규식을 안 돌리게 */
const RAW_CH = 600
/** 패널 일감이 아닌 앱 표지 도구 — 「그 뒤」에 세면 일을 못 보인다(재기 — 노트 register.md#advisorTimes) */
const QUIET_TOOLS = new Set(['update_plan', 'wrap_up', 'mark_chapter'])

/** 봉인 칸의 글 값을 빈 글로 — 값이 코드 안으로 안 들어오게 파싱 전에 지운다. 글 속 이름은 따옴표가 이스케이프돼 안 걸린다 */
export function dropSealed(line) {
  let at = line.indexOf(SEALED)
  if (at < 0) return line
  let out = ''
  let from = 0
  while (at >= 0) {
    let i = at + SEALED.length
    while (line[i] === ' ' || line[i] === ':') i++
    if (line[i] !== '"') {
      at = line.indexOf(SEALED, i)
      continue
    }
    let j = i + 1
    while (j < line.length && line[j] !== '"') j += line[j] === '\\' ? 2 : 1
    out += `${line.slice(from, i)}""`
    from = j + 1
    at = line.indexOf(SEALED, from)
  }
  return out + line.slice(from)
}

/** 마크다운 기호를 뗀 맨 글(패널 plainLine 과 같은 규칙 · 줄마다) */
function plain(text) {
  return text
    .split(/\r?\n/)
    .map(line =>
      line
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\*\*|__|`/g, '')
        .replace(/^\s*(?:#+\s+|>\s*|(?:[-*+]|\d+[.)])\s+)/, ''),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tailOf(text) {
  if (typeof text !== 'string') return null
  const cs = [...plain(text.slice(-RAW_CH))]
  if (cs.length === 0) return null
  return cs.length > TEXT_CH ? `…${cs.slice(-TEXT_CH).join('').trimStart()}` : cs.join('')
}

function headOf(text) {
  if (typeof text !== 'string') return null
  const cs = [...plain(text.slice(0, RAW_CH))]
  if (cs.length === 0) return null
  return cs.length > TEXT_CH ? `${cs.slice(0, TEXT_CH).join('').trimEnd()}…` : cs.join('')
}

/** mcp__서버__도구 → 도구 */
const shortTool = name => (name.startsWith('mcp__') ? name.slice(name.lastIndexOf('__') + 2) : name)

/** 기록 파일 하나를 읽는 값 — isAgent = 하위 에이전트 기록(그 파일 줄은 다 곁줄이라 곁줄을 안 거른다) */
export function newScan(isAgent = false) {
  return { isAgent, calls: new Map(), usage: new Map(), lastText: null, cur: null }
}

function noteAssistant(scan, o) {
  const m = o.message
  if (!m || !Array.isArray(m.content) || m.model === '<synthetic>') return
  // 같은 응답이 블록마다 한 줄씩 온다 — usage 는 응답 id 의 마지막 값(줄어든 값으로는 안 덮음)
  const iters = m.usage?.iterations
  if (typeof m.id === 'string' && Array.isArray(iters)) {
    const list = iters.filter(x => x?.type === 'advisor_message').map(x => ({ model: x.model ?? null, input: x.input_tokens ?? null, output: x.output_tokens ?? null }))
    if (list.length >= (scan.usage.get(m.id)?.length ?? 0)) scan.usage.set(m.id, list)
  }
  for (const b of m.content) {
    if (b?.type === 'text') {
      if (typeof b.text !== 'string' || b.text.trim() === '') continue
      scan.lastText = b.text
      if (scan.cur && scan.cur.after === null) scan.cur.after = b.text
    } else if (b?.type === 'tool_use') {
      const name = typeof b.name === 'string' ? shortTool(b.name) : null
      if (name && !QUIET_TOOLS.has(name) && scan.cur && scan.cur.tools.length < TOOL_MAX) scan.cur.tools.push(name)
    } else if (b?.type === 'server_tool_use' && b.name === 'advisor') {
      if (typeof b.id !== 'string' || scan.calls.has(b.id)) continue
      const at = Date.parse(o.timestamp)
      if (!Number.isFinite(at)) continue
      const call = { id: b.id, at, msg: m.id ?? null, kind: null, doing: scan.lastText, tools: [], after: null }
      scan.calls.set(b.id, call)
      scan.cur = call
    } else if (b?.type === 'advisor_tool_result') {
      const call = scan.calls.get(b.tool_use_id)
      if (call) call.kind = typeof b.content?.type === 'string' ? b.content.type : 'unknown'
    }
  }
}

/**
 * 기록 줄 하나를 먹인다. 파싱하는 줄: assistant · 사람 글(차례 경계)뿐. 도구 결과가 든 user 줄과 그 밖의 줄(요청 덩이 api-request-blob 포함 — 결과는
 * assistant 줄에 다 있다, 141건 재기)은 파싱하지 않는다(이스케이프 안 된 꼴만 진짜 블록이다)
 */
export function feedLine(scan, raw) {
  const isAsst = raw.includes('"type":"assistant"')
  if (!isAsst && (!raw.includes('"type":"user"') || raw.includes('"type":"tool_result"'))) return
  let o
  try {
    o = JSON.parse(dropSealed(raw))
  } catch {
    return
  }
  if (o === null || typeof o !== 'object') return
  // 곁줄은 하위 에이전트 파일에서 센다 — 메인 파일에 섞여 와도 글 흐름에 넣지 않는다
  if (!scan.isAgent && o.isSidechain === true) return
  if (o.type === 'assistant') noteAssistant(scan, o)
  else if (o.type === 'user' && o.isMeta !== true && o.isCompactSummary !== true) {
    // 사람 글 = 차례 경계: 그 뒤는 여기서 끊고, 앞 차례 글을 다음 호출의 하던 일로 안 쓴다
    scan.lastText = null
    scan.cur = null
  }
}

/** 결과까지 온 호출만 — 토큰은 그 응답의 k 번째 advisor_message */
export function finishScan(scan) {
  const nth = new Map()
  const out = []
  for (const c of scan.calls.values()) {
    if (c.kind === null) continue
    const k = nth.get(c.msg) ?? 0
    nth.set(c.msg, k + 1)
    const it = (c.msg !== null ? scan.usage.get(c.msg) : undefined)?.[k] ?? null
    out.push({
      id: c.id,
      at: c.at,
      input: it?.input ?? null,
      output: it?.output ?? null,
      model: it?.model ?? null,
      kind: c.kind,
      isAgent: scan.isAgent,
      doing: tailOf(c.doing),
      tools: c.tools,
      after: headOf(c.after),
    })
  }
  return out
}

/** 파일 여럿을 합친다 — 호출 id 하나는 한 번(앞 파일 먼저 · 메인이 앞), 옛것부터 */
export function mergeCalls(lists) {
  const byId = new Map()
  for (const list of lists) for (const c of list) if (!byId.has(c.id)) byId.set(c.id, c)
  return [...byId.values()].sort((a, b) => a.at - b.at)
}
