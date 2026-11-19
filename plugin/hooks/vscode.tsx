// VS Code 이름을 아는 코드는 이 파일 하나(tools/check-surface.mjs 가 지킨다). $ 를 받지 않는다 — 표면 글 · 목록만 받아 셈한다

// 노트: vscode.md#VSCODE_SURFACE
export const VSCODE_SURFACE = 'vscode'

// 노트: vscode.md#isVscodeSurface
export function isVscodeSurface(surface: string | null | undefined): boolean {
  return surface === VSCODE_SURFACE
}

// 노트: vscode.md#hasVscode
export function hasVscode(surfaces: readonly string[]): boolean {
  return surfaces.includes(VSCODE_SURFACE)
}

// 노트: vscode.md#isVscodeEntry
export function isVscodeEntry(entrypoint: string | null): boolean {
  return entrypoint === 'claude-vscode'
}

// 노트: vscode.md#paneIsCondensed
export function paneIsCondensed(surface: string, placement: string | undefined): boolean {
  return surface === VSCODE_SURFACE && placement === 'inline'
}

// 노트: vscode.md#padsPane
export function padsPane(surface: string): boolean {
  return surface !== VSCODE_SURFACE
}

// 노트: vscode.md#lacksClient
export function lacksClient(surface: string): boolean {
  return surface === VSCODE_SURFACE
}

// 노트: vscode.md#pressesText
export function pressesText(surface: string): boolean {
  return surface === VSCODE_SURFACE
}

// 노트: vscode.md#fillsByFlex
export function fillsByFlex(surface: string): boolean {
  return surface === VSCODE_SURFACE
}

// 노트: vscode.md#toastsStack
export function toastsStack(surface: string): boolean {
  return surface === VSCODE_SURFACE
}

// 노트: vscode.md#rainbowAsHex
export function rainbowAsHex(surface: string): boolean {
  return surface === VSCODE_SURFACE
}
