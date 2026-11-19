<h1 align="center">easy-session</h1>

<p align="center">
  <b>See the sessions that belong with this one, and message, pin, hand over or archive them from one panel.</b><br>
  Claude Code plugin · Claude desktop app (Code tab) · VS Code · terminal · checked on Claude Code 2.1.325
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.28-4c9be8" alt="Version 0.1.28">
  <img src="https://img.shields.io/badge/Claude_Code-plugin-D97757" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/tested_on-Claude_Code_2.1.325-4c9be8" alt="Tested on Claude Code 2.1.325">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license">
</p>

<p align="center">
  <b>English</b> · <a href="README.ko.md">한국어</a>
  &nbsp;|&nbsp;
  <a href="#requirements">Requirements</a> · <a href="#install">Install</a> · <a href="#update">Update</a> · <a href="#whats-new-in-0128">What's new</a> · <a href="#features">Features</a> · <a href="#good-to-know">Good to know</a> · <a href="#something-wrong--report-it">Report a problem</a>
</p>

---

## Requirements

| | |
|---|---|
| **Where it shows** | The Claude desktop app's **Code** tab, the Claude Code extension's chat panel in VS Code, and `claude` in a terminal. easy-session reads the desktop app's own session records, so everything works in the desktop app. A VS Code or terminal session is outside the desktop app's session tree: pin, archive, detach and the sessions above, beside and below it don't apply there, so those parts are dimmed with the reason or left out. |
| **Claude Code** | Checked on **2.1.325** — in a desktop app session, type `/status` and read the **Claude Code** row (not the app version in About); in a terminal, `claude --version`. VS Code was checked with the Claude Code extension **2.1.326**. The oldest version it works on hasn't been measured. |
| **To update** | Desktop app: **Claude → Check for Updates** (macOS) or **Help → Check for Updates** (Windows), then start a new session. Terminal: `claude update`. VS Code: update the Claude Code extension. |
| **git** | Needed to add the marketplace from GitHub — `git --version` should print a version. macOS: if a developer-tools prompt opens, install them. Windows: [Git for Windows](https://git-scm.com/downloads/win). |
| **Language** | The panel, the line above the input, its notices and the lines it adds for Claude are in Korean. There is no English interface yet; this README gives each Korean label with its meaning. |
| **Optional** | Node.js on your PATH — for the advisor call list and for counting and moving leftovers. Without it, those two show an error. |
| **Tested on** | Windows 11 — desktop app and terminal (Claude Code 2.1.325), VS Code (Claude Code extension 2.1.326). macOS and Linux haven't been tried. Two actions run Windows programs and don't work there yet: jumping to a session (`rundll32`) and moving leftovers to the Recycle Bin (PowerShell). |

## Install

**First time only.** The desktop app, the terminal and the Claude Code extension in VS Code share the same settings, so installing once from the desktop app or a terminal works in all three (restart VS Code after installing).

**Easiest — send this one line to Claude** (in the desktop app's Code tab or a terminal session):

```
Install this plugin: github.com/JaeSeongHa5280/easy-session (claude plugin marketplace add JaeSeongHa5280/easy-session, then claude plugin install easy-session@easy-session)
```

Then quit the Claude app completely and open it again (or start a new `claude` session). The **세션 패널** (session panel) button appears on the line above the input.

<details>
<summary><b>Type it yourself</b></summary>

**In Claude's input box — send each line on its own.** Send the second line after the first one finishes. Pasting both lines in one message doesn't install.

```
/plugin marketplace add JaeSeongHa5280/easy-session
```

```
/plugin install easy-session@easy-session
```

- **Desktop app:** the first line opens **Add marketplace** — click **Sync**. The red warning there is the standard notice for any marketplace Anthropic doesn't run. The second line opens easy-session in the plugin list — install it.
- **Terminal session:** the second line opens the plugin's details — choose **Install for you**.

**In a terminal (macOS Terminal · Windows PowerShell):**

```
claude plugin marketplace add JaeSeongHa5280/easy-session
claude plugin install easy-session@easy-session
```

No `claude` command (usual if you only use the desktop app)? Send the one line above to Claude.

</details>

> **Note for Claude:** check the engine version first (`<engine> --version`). easy-session was checked on 2.1.325; if the engine is older, tell the user and suggest updating first (see [Requirements](#requirements)). If `claude` is not on PATH (usual in the desktop app), run the running engine — its path is `CLAUDE_CODE_EXECPATH`, or else the executable of `CLAUDE_PID`. macOS · Linux: `"$CLAUDE_CODE_EXECPATH" plugin marketplace add JaeSeongHa5280/easy-session`, then `"$CLAUDE_CODE_EXECPATH" plugin install easy-session@easy-session`. Windows PowerShell: `& $env:CLAUDE_CODE_EXECPATH plugin marketplace add JaeSeongHa5280/easy-session`, then `& $env:CLAUDE_CODE_EXECPATH plugin install easy-session@easy-session` (without the variable, `(Get-Process -Id $env:CLAUDE_PID).Path`). If adding the marketplace fails because `git` is missing, help the user install git (on macOS, `xcode-select --install`). To update an existing install, run `plugin marketplace update easy-session` first, then `plugin update easy-session@easy-session` (same engine path) — without the first step it reports the old version as the latest. Check `plugin list` shows `easy-session@easy-session` enabled, then ask the user to quit and reopen the app (in a terminal, start a new `claude` session; in VS Code, restart VS Code). Don't clone this repository or edit `settings.json`.

## Update

**Send this one line to Claude**, then quit and reopen the Claude app (or start a new `claude` session; restart VS Code):

```
Update this plugin: easy-session (claude plugin marketplace update easy-session, then claude plugin update easy-session@easy-session)
```

To do it yourself in a shell, these two lines:

```
claude plugin marketplace update easy-session
claude plugin update easy-session@easy-session
```

- Typing the install lines again only says *already installed*, and `plugin update` alone reports the old version as the latest — the first line fetches the new list.
- Your settings stay as they were.
- **Get new versions automatically:** in a terminal session, `/plugin` → **Marketplaces** → **easy-session** → **Enable auto-update**. It is off for marketplaces Anthropic doesn't run ([Claude Code docs](https://code.claude.com/docs/en/plugins/install)).
- Your version: `claude plugin list`. What changed: [CHANGELOG](CHANGELOG.md).

<details>
<summary><b>Remove</b></summary>

```
claude plugin uninstall easy-session@easy-session
```

No cloning into `~/.claude` and no `settings.json` edits are involved.

</details>

## What's new in 0.1.28

0.1.27 wasn't published, so this covers both.

- **VS Code and terminal** — the line above the input and the session panel now show in the Claude Code extension's chat panel in VS Code and in `claude` in a terminal. What only the desktop app can do is dimmed with the reason, or left out where there's little room. Remote Control and export run Claude Code's own `/remote-control` and `/export` there.
- **A tidier session tools tab** — the tools for this session come first, nothing is open at first, and a tile opens as a card right under its row.
- **Sessions outside the desktop app** — VS Code and terminal sessions open now show in the desktop app's panel with a tag, and you can send to them.
- **Session rules** (on at first) — in a desktop app session, Claude asks you before sending to an ended or archived session, or to a third different session in one answer; in every session, Claude gets short rule lines with your messages.
- **`ultrathink` in a new session's first message** — a setting, off at first.

## Features

### 1. The line above the input

**One line above the chat input, in every session — desktop app, VS Code and terminal.** The **세션 패널** (session panel) button always comes first (in a terminal, after a dim 이지 세션) and opens or closes the panel. What else shows is up to you, in Settings → 입력창 위 줄에 둘 것 (*what to put on the line above the input*):

| Item | What it does | On at first |
|---|---|---|
| 고정 (pin) | Pins or unpins this session in the sidebar | ✓ |
| `ultrathink` | Puts `ultrathink` at the start of your prompt (in rainbow letters while it's there); press again to take it out. While that turn runs, the working line in the chat starts with `ultrathink · ` | ✓ |
| advisor | Picks the advisor model — off · sonnet · opus · fable — for all sessions, as `/advisor` does. A small figure (not in a terminal) shows whether it applies to this session's model, and the number is how often it was called in this session (with its cost when easy-compact is installed). Picking fable asks first | ✓ |
| 전달 (forward) | Picks the session that gets this turn's last answer — see [3](#3-send-a-turns-answer-to-another-session) | ✓ |
| 화면 (screen) | Which device you're reading on — see [Good to know](#good-to-know) | |
| `/btw` · `/fork` · `/rewind` | Puts the command at the start of your prompt; you send it | |
| `/recap` | Runs `/recap` | |
| 내보내기 (export) | Saves this conversation as a zip in your Downloads folder. In a VS Code or terminal session it runs `/export`, which saves the conversation as a text file (`conversation-<date-time>.txt`) | |

While Claude is answering, the advisor and 화면 choices are locked until the answer ends.

**In VS Code and a terminal,** 고정 (pin) and 전달 (forward) aren't on the line — both need the desktop app. In VS Code, `ultrathink`'s rainbow letters use colors VS Code shows. In a terminal, reach the line with ctrl+x tab; its buttons are text, and the working line in the chat doesn't get `ultrathink · `. After opening the panel from the line, press shift+tab, ctrl+x tab, then Tab to reach its buttons.

### 2. Session tools tab

**The panel's first tab, 세션 도구 (session tools), covers this session and the sessions around it.** From top to bottom:

- **Title and role** — this session's title, then its role on a chip — 메인 (main — the orchestrator with nothing above it, when there is only one), 오케 (orchestrator), 서브 (sub — under another session) or 단독 (solo) — and 위 · (above ·) with the title of the session above. The role isn't stored: easy-session reads it from which session opened which and from the orchestrator marks. Press the chip to open or close the 역할 · 인계 (role · handover) card.
- **지금 (now)** — only when something waits for you, in an orange box: sessions below that wait for your input (**열기**, open — jumps there), reports held from sessions below, messages received, and new lines on the progress board (**보기**, view — opens that tile). When a sub session opens sessions of its own, it also asks here whether to make it an orchestrator.
- **Nine tiles in three groups** — none is open at first. Press a tile and it opens as a card right under its row (**›** turns to **˅**); press it again to close it. One is open at a time. A tile's second line sums up what's inside — for the message tiles, 보낸 N · 받은 N (sent · received). A tile this session's role doesn't use is dimmed, and an orange number on a tile's corner counts what waits there. In a card each row has a label and its buttons; **?** next to a label explains the row.

| Group | Tile | Inside |
|---|---|---|
| 이 세션 (this session) | 명령 (commands) | `ultrathink` · `/btw` · `/fork` · `/rewind` · `/recap` · 내보내기 (export). |
| | 어드바이저 (advisor) | When the advisor was called in this session: each call's time and tokens, what Claude was doing just before and what it did right after. The advisor's answer itself is never read. |
| | 고정 · 보관 (pin · archive) | Three rows. 표시 (show): 고정 (pin) and Remote Control on or off. 정리 (clean up): 정리 (an instruction to update notes, commit and write the end line on the board) and 제목 정리 (tidy the title to its role's form). 닫기 (close): 끝내기 (end), 보관 (archive) and 떼어 내기 (detach — can't be undone). |
| 세션 메시지 (session messages) | 위 세션 (above) | The session above — labelled 이전 차수 (previous round), 연 세션 (opened this one) or 주인 (owner) — with **보내기** (send), and the messages you sent it with whether they arrived. **보고 꼴로** (report form) puts a five-part report request in the prompt box — done, in progress, blocked, decisions waiting, next — ending with the send signal, so the answer goes up. A main or top orchestrator session gets **보고 꼴로 — 채팅에** (in the chat) instead. |
| | 형제 세션 (siblings) | The sessions beside this one, each with **보내기** (send) and **가기** (go), and what you sent them. |
| | 다른 세션 (other sessions) | The main session when it isn't the one above; the VS Code and terminal sessions open now, under 데스크톱 앱 밖 · 지금 열린 세션 (outside the desktop app · open now), tagged VS Code or 터미널 (terminal), each with **보내기** (send); and messages to and from sessions outside these. For any other session, type `>>name` in the prompt box. |
| 관리 (manage) | 하위 세션 (below) | The sessions below: their state (ended, needs input, idle for 7+ days, attached, 다음 차수 — next round), **수락 N** (accept its N held reports — they go to Claude here), **보관** (archive, once ended), **가기** (go), and **⋯** to read each held report and 수락 (accept) or 거절 (reject) it. Main and orchestrator sessions also get, under **⋯**: send, 정리 부탁 (ask it to clean up), end, 일 합치기 (merge work — asks it to hand its work up and stop), archive and detach; and a 손질 (manage) row with **모두 보관** (archive all ended — in Bypass permissions only) and **밑으로 붙이기** (put another session under this one). |
| | 진행판 (progress board) | Main and orchestrator sessions: the `.md` board you choose — 파일 (file) with **바꾸기** (change), and 새 줄 (new lines) with **넣기** (add — puts them in the prompt box) and **보기** (view). A sub session shows the board of the session above. |
| | 역할 · 인계 (role · handover) | **인계** (hand over) puts an instruction in the prompt box to save the state and open the next round, titled `… N+1차`, with the same role; the new session spends its first turn reading the handover notes and reporting back. A main or orchestrator session's next round takes over its place, the sessions below, the pin, the orchestrator mark and the board; a side session's next round stays under it while both are open (이전 차수 · 다음 차수 — previous and next round). **바꾸기** (change) changes only this session's role: make it an orchestrator or stop being one, take a sub session solo (detach), or put a solo session under an orchestrator you pick. What can't happen now is on the 안 됨 (not now) row, dimmed, with the reason. The tile's second line shows the context %. |

If a session you send to has gone cold and compacting it first would be cheaper, a card shows both prices before anything is sent. Accepting a held report sends its text to Claude here as your message; the figure under it is what one request costs at the current context.

**In VS Code and a terminal.** These sessions aren't in the desktop app's session tree, so they have no session above, beside or below, and the desktop app's tools aren't there:

- **The panel opens and closes on its own** — not together with the desktop app's sessions.
- **Wide panel** (in VS Code, the panel beside the chat when the Claude tab is 800 px or wider; the terminal panel): 위 세션 · 형제 세션 · 하위 세션 are dimmed with 데스크톱 앱에서만 (desktop app only), and a line under the tiles says why. 고정 · 보관 becomes 정리 · 끝내기 (clean up · end) — Remote Control, 정리, 제목 정리 and 끝내기, with pin, archive and detach on a dimmed 안 됨 row. Remote Control runs Claude Code's `/remote-control` (you need to be signed in with a claude.ai subscription); if the session doesn't have that command, a request goes in the prompt box instead.
- **Narrow box** (VS Code's 12-line box above the input, when the Claude tab is narrower): the panel is a list — title, role and time on one line, then one line per tile with `name ›` and what's in it. Press a line to open it right under. The desktop-app-only tiles and rows are left out.
- **다른 세션** (other sessions) lists the desktop app sessions open now in their tree order, tagged 메인 (main) or 오케 (orchestrator), with **가기** (go), and the other VS Code and terminal sessions. Its second line reads 열린 N · 받은 N (open · received).
- **보내기** (send) sends right away in any permission mode. If the session can't be reached, it puts an instruction for Claude in the prompt box (바로 못 보내 입력칸에 넣었습니다 — couldn't send right away, put it in the prompt box). Sent messages show 도착 (arrived).
- **In a terminal,** the title, role and time are one line of text (no chip to press), the tiles are text buttons, `[name ›] value`, under their group names, and choices are a row of buttons.

### 3. Send a turn's answer to another session

**End your message with `>>main` (or `>>메인`) or `>>name`, and when Claude finishes that turn, its last answer goes to that session.** `name` matches a session's `[scope]`, part of its title, or the start of its app session id; `main` is the orchestrator above this session (or the top of its tree). The **전달** (forward) cell on the line above the input shows where it will go, lets you pick a related session instead — above, below or beside this one (it writes the signal for you) or 없음 (none) to cancel. **➤** next to it sends only the text you typed, right away, without Claude answering.

How it goes depends on the permission modes:

- From a session in **Bypass permissions**, easy-session sends it itself.
- From any other mode, Claude is asked to send it with SendMessage — unless the receiving session runs in Bypass permissions or plan mode, which doesn't take messages from other modes. Then it waits as a card in that session's panel, to be accepted there.
- If the app reports the message wasn't delivered, it becomes a card as well. A notice under the answer says what happened.

The send signal works between desktop app sessions. From a VS Code or terminal session, send from the session panel.

### 4. Settings tab

**The panel's second tab, 설정 (settings).** Each row has a **?** — hover for one line, press for more.

- **입력창 위 줄에 둘 것** (what to put on the line above the input) — a live preview of the line, then a switch for each item in [1](#1-the-line-above-the-input).
- **화면 · advisor** (screen · advisor) — the same two choices as on the line, for when you've taken them off it.
- **새 자식 세션** (new child sessions — when a session opens another): 저절로 고정 (pin it), 끝나면 고정 풀기 (unpin it once it writes its end line on the board), 사이드바 그룹으로 묶기 (put the whole tree in one sidebar group), 저절로 떼어 내기 (detach it right away), 첫 글에 ultrathink (put `ultrathink` at the start of the new session's first message — also of the text when this session hands its work over to a new one), and 자식 보고 (child reports): 앱 그대로 (the app's way — the opener gets each report and runs a turn) or 사이드 패널에 모아 둠 (hold them in the panel until you accept). All off, and the app's way, at first. Pin, group and detach act only in Bypass-permissions sessions.
- **메시지** (messages):
  - 보낸 세션 관계 알리기 (tell where the sender is): when a message from another session arrives in a desktop app session, tell Claude where the sender is — above, below, same tree, another tree, or a VS Code or terminal session outside the desktop app. Off at first.
  - 세션 규칙(보내기 확인 · Claude 안내) (session rules — send check and notes for Claude): on at first. When Claude in a desktop app session is about to send to an ended or archived session, or to a third different session during one answer, easy-session stops the send and Claude asks you first; the same send after you answer goes through. With your messages Claude also gets short rule lines, in every session, VS Code and terminal ones included — a handed-over session's first answer only reads the handover notes and reports, a main or orchestrator session decides and delegates instead of doing the work, instructions go one level down. In a desktop app session, asking in plain words to hand over, to open something, or to send up (`>>위` included, when there is a session above) adds a one-line hint.
- **정리** (clean up) — 남은 자료 (leftovers): the scratch folders that archived sessions left in your temp folder, minus the ones a `.md` file still mentions. Counted when you open Settings, at most every 10 minutes; ▸ lists the biggest. **휴지통으로** (to the Recycle Bin) asks first, then moves them to the Windows Recycle Bin, where you can restore them. It moves nothing if the Recycle Bin would delete them right away or overflow.

**In VS Code and a terminal,** switches are 켬 · 끔 (on · off) dropdowns in VS Code and [켬] [끔] buttons in a terminal. The rows that work only in the desktop app — pin and 전달 on the line, and 새 자식 세션 — say 데스크톱 앱에서만 — 여기서 바꿔도 데스크톱 세션에 적용됩니다 (desktop app only — changing it here applies to desktop sessions). In VS Code's 12-line box those rows and the preview are left out; a terminal leaves out only the preview.

## Good to know

- **Permission modes matter.** Buttons that change the app — pin, archive, detach, export, Remote Control on or off, send — act directly only in a session running in **Bypass permissions**. In other modes they put a one-line request in your prompt box (press again to take it out), and nothing happens until you send it — in auto mode the desktop app won't run an app tool that a plugin's own code calls, and asks for Claude to make the call (checked on Claude Code 2.1.325). In a VS Code or terminal session, send goes right away in any mode, and so do Remote Control and export when the session has Claude Code's `/remote-control` and `/export` commands, which they run.
- **Everything stays on your computer.** easy-session makes no network requests. Messages between sessions go through Claude Code's own session messaging on this computer.
- **화면 (screen) applies to every session, VS Code and terminal ones included.** Set it to PC, tablet or phone and each message you send carries one line telling Claude how to answer on that device; on tablet and phone, Claude's choice cards and widgets are refused so it asks in plain text. 쓰지 않음 (off, the default) adds nothing.
- **In VS Code, notices are one line.** VS Code keeps toasts stacked above the input, so easy-session writes its notice on the panel's last line, or at the end of the line above the input when the panel is closed — with ✓ when something worked. It goes away at your next press.
- **Dollar amounts are rough estimates** at fixed per-token rates. On a subscription, read them as how heavy a request is, not what you're billed.
- **Titles in Korean form:** a handoff is recognized when the new session's title is the next round (`… 2차` → `… 3차`), and a side session's end line on a progress board reads `- MM-DD [name] 끝: …` (끝 = done).
- **With [easy-compact](https://github.com/JaeSeongHa5280/easy-compact):** the advisor count matches easy-compact's and shows its cost — easy-session reads the small file easy-compact writes for that. easy-session's line stays on top of the rows above the input.

## Something wrong? — report it

Open an [issue](https://github.com/JaeSeongHa5280/easy-session/issues) with what happened and how to reproduce it, your easy-session version (`claude plugin list`), your Claude Code version (`/status`), where you saw it (desktop app, VS Code or terminal), your OS and the permission mode of the session. A screenshot of the panel helps. easy-session keeps no diagnostics file and never sends anything by itself.

## License

[MIT](LICENSE)
