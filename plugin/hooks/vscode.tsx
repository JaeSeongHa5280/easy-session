// VS Code 이름을 아는 코드는 이 파일 하나(tools/check-surface.mjs 가 지킨다). $ 를 받지 않는다 — 표면 글 · 목록만 받아 셈한다

export const VSCODE_SURFACE = 'vscode'

export function isVscodeSurface(surface: string | null | undefined): boolean {
  return surface === VSCODE_SURFACE
}

export function hasVscode(surfaces: readonly string[]): boolean {
  return surfaces.includes(VSCODE_SURFACE)
}

export function isVscodeEntry(entrypoint: string | null): boolean {
  return entrypoint === 'claude-vscode'
}

export function paneIsCondensed(surface: string, placement: string | undefined): boolean {
  return surface === VSCODE_SURFACE && placement === 'inline'
}

export function padsPane(surface: string): boolean {
  return surface !== VSCODE_SURFACE
}

export function lacksClient(surface: string): boolean {
  return surface === VSCODE_SURFACE
}

export function pressesText(surface: string): boolean {
  return surface === VSCODE_SURFACE
}

export function fillsByFlex(surface: string): boolean {
  return surface === VSCODE_SURFACE
}

export function toastsStack(surface: string): boolean {
  return surface === VSCODE_SURFACE
}

export function rainbowAsHex(surface: string): boolean {
  return surface === VSCODE_SURFACE
}
