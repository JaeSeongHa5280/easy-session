export type AdvisorPose = 'on' | 'adv' | 'sleep'

const PAL: Readonly<Record<string, string>> = {
  o: '#1d2c48',
  e: '#0f1b2a',
  w: '#ffffff',
  k: '#f4a3b8',
  V: '#a58ff0',
  v: '#7a66cc',
  H: '#d6ccfa',
  K: '#3a3866',
  P: '#c9bcff',
  g: '#f6f4ff',
  W: '#fffbe8',
  S: '#c9ced8',
  s: '#8e95a3',
  Z: '#9aa3b5',
}

const BODY = [
  '..oooooooooooo..',
  '.oPPPPPPPPPPPPo.',
  '..oooKKKKKKooo..',
  '.P..oKKKKKKo....',
  '.P..oKKKKKKo....',
  'PP.oVVVVVVVVo...',
  '..oVHVVVVVVVVo..',
  '..oggggVVggggo..',
  '..ogweggggwego..',
  '..ogeegVVgeego..',
  '..oggggVVggggo..',
  '..oVkVVVVVVkVo..',
  '..ovVVVVVVVVvo..',
  '...ovvvvvvvvo...',
  '....oooooooo....',
  '....o.o..o.o....',
]
const SLEEP = BODY.map((r, y) => (y === 8 ? '..ogvvggggvvgo..' : r))
const ARM = ['..V', '..V', '.V.', 'V..']
const STAR = ['..P..', '..P..', 'PPWPP', '..P..', '..P..']
const ZZ = ['ZZZ', '..Z', '.Z.', 'ZZZ']
const zz = ['zz', '.z', 'zz']

const WIDTH: Readonly<Record<AdvisorPose, number>> = { on: 16, adv: 21, sleep: 19 }

/** 안 걸린 그림 — 몸 색만 회색으로 */
const gray = (g: readonly string[]) => g.map(r => r.replace(/[VHP]/g, 'S').replace(/v/g, 's'))

/** 색마다 path 하나 — 같은 글자가 가로로 이어지면 한 칸, 같은 자리 · 폭이 아래로 이어지면 한 네모(agent-char.ts paths 와 같음) */
function paths(grid: readonly string[], dx: number, dy: number): string {
  const rects: Record<string, string> = {}
  let open = new Map<string, { ch: string; x: number; w: number; y: number; h: number }>()
  const close = (r: { ch: string; x: number; w: number; y: number; h: number }) => {
    rects[r.ch] = `${rects[r.ch] ?? ''}M${r.x + dx} ${r.y + dy}h${r.w}v${r.h}h-${r.w}z`
  }
  grid.forEach((row, y) => {
    const next = new Map<string, { ch: string; x: number; w: number; y: number; h: number }>()
    for (let x = 0; x < row.length; ) {
      const ch = row[x]
      let w = 1
      while (row[x + w] === ch) w++
      if (PAL[ch]) {
        const key = `${ch}${x},${w}`
        const prev = open.get(key)
        if (prev) {
          prev.h++
          open.delete(key)
          next.set(key, prev)
        } else next.set(key, { ch, x, w, y, h: 1 })
      }
      x += w
    }
    open.forEach(close)
    open = next
  })
  open.forEach(close)
  return Object.keys(rects)
    .map(ch => `<path fill="${PAL[ch]}" d="${rects[ch]}"/>`)
    .join('')
}

export function advisorCharWidth(px: number, pose: AdvisorPose): number {
  return (px * WIDTH[pose]) / 16
}

export function advisorCharSvg(px: number, pose: AdvisorPose, isMoving = false): string {
  let body: string
  if (pose === 'sleep') body = paths(gray(SLEEP), 0, 0) + paths(ZZ, 14, 2) + paths(zz, 17, 0)
  else if (pose === 'adv') {
    const css = isMoving
      ? '<style>.tw{animation:tw 1.2s steps(1) 1 forwards}@keyframes tw{0%{opacity:1}25%{opacity:0}50%{opacity:1}75%{opacity:0}100%{opacity:1}}' +
        '@media (prefers-reduced-motion:reduce){.tw{animation:none!important}}</style>'
      : ''
    body = `${css}${paths(BODY, 0, 0)}<g class="tw">${paths(ARM, 14, 5)}${paths(STAR, 16, 0)}</g>`
  } else body = paths(BODY, 0, 0)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${advisorCharWidth(px, pose)}" height="${px}" viewBox="0 0 ${WIDTH[pose]} 16" shape-rendering="crispEdges">${body}</svg>`
}
