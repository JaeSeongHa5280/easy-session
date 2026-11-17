#!/usr/bin/env node
// easy-session advisor 호출 시점(0.1.13) — 세션 기록을 읽어 결과까지 온 호출 목록을 낸다(읽기만, 아무것도 안 씀).
// 쓰임: node advisor-times.mjs <projects 폴더> <세션 기록 id>  → 표준 출력에 JSON 한 줄 { found, calls: [...] }
// 메인 기록 <projects>/<폴더>/<id>.jsonl 과 하위 에이전트 기록 <폴더>/<id>/subagents/**/agent-*.jsonl 을 줄 단위로 읽는다.
// 기록은 크다(이 PC 가장 큰 것 614MB) — 통째로 메모리에 안 올린다. 줄을 푸는 규칙은 advisor-scan.mjs, 노트 docs/notes/register.md#advisorTimes
import { createReadStream, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

import { feedLine, finishScan, mergeCalls, newScan } from './advisor-scan.mjs'

const [projects, id] = process.argv.slice(2)
if (!projects || !id) {
  process.stderr.write('쓰임: node advisor-times.mjs <projects 폴더> <세션 기록 id>\n')
  process.exit(2)
}

/** 작업 폴더가 바뀌어도 엔진은 처음 파일에 계속 쓴다 — 폴더 이름을 짓지 않고 한 층 훑는다 */
function findMain() {
  for (const dir of readdirSync(projects, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const file = join(projects, dir.name, `${id}.jsonl`)
    if (existsSync(file)) return { file, base: join(projects, dir.name, id) }
  }
  return null
}

/** subagents 아래 agent-*.jsonl — workflows 밑까지 */
function agentFiles(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...agentFiles(p))
    else if (e.name.startsWith('agent-') && e.name.endsWith('.jsonl')) out.push(p)
  }
  return out
}

async function scanFile(file, isAgent) {
  const scan = newScan(isAgent)
  const rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity })
  for await (const raw of rl) feedLine(scan, raw)
  return finishScan(scan)
}

const main = findMain()
if (!main) {
  process.stdout.write(`${JSON.stringify({ found: false, calls: [] })}\n`)
  process.exit(0)
}
const lists = [await scanFile(main.file, false)]
const sub = join(main.base, 'subagents')
if (existsSync(sub)) for (const f of agentFiles(sub)) lists.push(await scanFile(f, true))
process.stdout.write(`${JSON.stringify({ found: true, calls: mergeCalls(lists) })}\n`)
