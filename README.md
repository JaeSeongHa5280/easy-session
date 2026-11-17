<h1 align="center">easy-session</h1>

<p align="center">
  <b>See the sessions that belong with this one, and message, pin, hand over or archive them from one panel.</b><br>
  Claude Code plugin · Claude desktop app (Code tab) · checked on Claude Code 2.1.325
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.26-4c9be8" alt="Version 0.1.26">
  <img src="https://img.shields.io/badge/Claude_Code-plugin-D97757" alt="Claude Code plugin">
  <img src="https://img.shields.io/badge/tested_on-Claude_Code_2.1.325-4c9be8" alt="Tested on Claude Code 2.1.325">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license">
</p>

<p align="center">
  <b>English</b> · <a href="README.ko.md">한국어</a>
  &nbsp;|&nbsp;
  <a href="#requirements">Requirements</a> · <a href="#install">Install</a> · <a href="#update">Update</a> · <a href="#whats-new-in-0126">What's new</a> · <a href="#features">Features</a> · <a href="#good-to-know">Good to know</a> · <a href="#something-wrong--report-it">Report a problem</a>
</p>

---

## Requirements

| | |
|---|---|
| **Claude desktop app** | easy-session reads the desktop app's own session records, so it works in the app's **Code** tab. In `claude` in a terminal it draws nothing. The Claude Code extension in VS Code hasn't been tried. |
| **Claude Code** | Checked on **2.1.325** — in a Code tab session, type `/status` and read the **Claude Code** row (not the app version in About). The oldest version it works on hasn't been measured. |
| **To update** | **Claude → Check for Updates** (macOS) or **Help → Check for Updates** (Windows), then start a new session. |
| **git** | Needed to add the marketplace from GitHub — `git --version` should print a version. macOS: if a developer-tools prompt opens, install them. Windows: [Git for Windows](https://git-scm.com/downloads/win). |
| **Language** | The panel, the line above the input, its notices and the lines it adds for Claude are in Korean. There is no English interface yet; this README gives each Korean label with its meaning. |
| **Optional** | Node.js on your PATH — for the advisor call list and for counting and moving leftovers. Without it, those two show an error. |
| **Tested on** | Windows 11 — desktop app, Claude Code 2.1.325. macOS and Linux haven't been tried. Two actions run Windows programs and don't work there yet: jumping to a session (`rundll32`) and moving leftovers to the Recycle Bin (PowerShell). |

## Install

**First time only. Easiest — send this one line to Claude** (in a Code tab session of the desktop app):

```
Install this plugin: github.com/JaeSeongHa5280/easy-session (claude plugin marketplace add JaeSeongHa5280/easy-session, then claude plugin install easy-session@easy-session)
```

Then quit the Claude app completely and open it again. The **세션 패널** (session panel) button appears on the line above the input.

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

> **Note for Claude:** check the engine version first (`<engine> --version`). easy-session was checked on 2.1.325; if the engine is older, tell the user and suggest updating first (see [Requirements](#requirements)). If `claude` is not on PATH (usual in the desktop app), run the running engine — its path is `CLAUDE_CODE_EXECPATH`, or else the executable of `CLAUDE_PID`. macOS · Linux: `"$CLAUDE_CODE_EXECPATH" plugin marketplace add JaeSeongHa5280/easy-session`, then `"$CLAUDE_CODE_EXECPATH" plugin install easy-session@easy-session`. Windows PowerShell: `& $env:CLAUDE_CODE_EXECPATH plugin marketplace add JaeSeongHa5280/easy-session`, then `& $env:CLAUDE_CODE_EXECPATH plugin install easy-session@easy-session` (without the variable, `(Get-Process -Id $env:CLAUDE_PID).Path`). If adding the marketplace fails because `git` is missing, help the user install git (on macOS, `xcode-select --install`). To update an existing install, run `plugin marketplace update easy-session` first, then `plugin update easy-session@easy-session` (same engine path) — without the first step it reports the old version as the latest. Check `plugin list` shows `easy-session@easy-session` enabled, then ask the user to quit and reopen the app. Don't clone this repository or edit `settings.json`.

## Update

**Send this one line to Claude**, then quit and reopen the Claude app:

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

## What's new in 0.1.26

First public release.

- **A line above the input** with the session panel button and the items you pick: pin, `ultrathink`, advisor, 전달 (forward), 화면 (screen) and command chips. While a turn sent with `ultrathink` runs, the working line in the chat starts with `ultrathink · `.
- **A session panel** with two tabs: 세션 도구 (session tools) for this session and the sessions around it — a role chip, a 지금 (now) box and nine tiles in three groups — and 설정 (settings).
- **Send signal** — end a message with `>>main` or `>>name`, and that turn's last answer goes to that session.
- **Clean up** — moves the scratch folders that archived sessions left behind to the Recycle Bin.

## Features

### 1. The line above the input

**One line above the chat input, in every desktop app session.** The **세션 패널** (session panel) button always comes first and opens or closes the panel. What else shows is up to you, in Settings → 입력창 위 줄에 둘 것 (*what to put on the line above the input*):

| Item | What it does | On at first |
|---|---|---|
| 고정 (pin) | Pins or unpins this session in the sidebar | ✓ |
| `ultrathink` | Puts `ultrathink` at the start of your prompt (in rainbow letters while it's there); press again to take it out. While that turn runs, the working line in the chat starts with `ultrathink · ` | ✓ |
| advisor | Picks the advisor model — off · sonnet · opus · fable — for all sessions, as `/advisor` does. A small figure shows whether it applies to this session's model, and the number is how often it was called in this session (with its cost when easy-compact is installed). Picking fable asks first | ✓ |
| 전달 (forward) | Picks the session that gets this turn's last answer — see [3](#3-send-a-turns-answer-to-another-session) | ✓ |
| 화면 (screen) | Which device you're reading on — see [Good to know](#good-to-know) | |
| `/btw` · `/fork` · `/rewind` | Puts the command at the start of your prompt; you send it | |
| `/recap` | Runs `/recap` | |
| 내보내기 (export) | Saves this conversation as a zip in your Downloads folder | |

While Claude is answering, the advisor and 화면 choices are locked until the answer ends.

### 2. Session tools tab

**The panel's first tab, 세션 도구 (session tools), covers this session and the sessions around it.** From top to bottom:

- **Title and role** — this session's title, then its role on a chip: 메인 (main — the orchestrator with nothing above it, when there is only one), 오케 (orchestrator), 서브 (sub — under another session) or 단독 (solo), followed by how many sessions sit above, below and beside it. The role isn't stored: easy-session reads it from which session opened which and from the orchestrator marks. To change it, press the chip.
- **지금 (now)** — only when something waits for you, in an orange box: sessions below that wait for your input (**열기**, open — jumps there), reports held from sessions below, messages received, and new lines on the progress board (**보기**, view). When a sub session opens sessions of its own, it also asks here whether to make it an orchestrator.
- **Nine tiles in three groups** — press one and it opens underneath; one is open at a time. A tile this session's role doesn't use is dimmed, and an orange number on a tile's corner counts what waits there.

| Group | Tile | Inside |
|---|---|---|
| 세션 메시지 (session messages) | 위 세션 (above) | The session above with **보내기** (send), and the messages you sent it with whether they arrived. **보고 꼴로** (report form) puts a five-part report request in the prompt box — done, in progress, blocked, decisions waiting, next — ending with the send signal, so the answer goes up. A main or top orchestrator session gets **보고 꼴로 — 채팅에** (in the chat) instead. |
| | 형제 세션 (siblings) | The sessions beside this one, each with **보내기** (send) and **가기** (go). |
| | 다른 세션 (other sessions) | The main session when it isn't the one above, and messages to and from sessions outside these. For any other session, type `>>name` in the prompt box. |
| 관리 (manage) | 하위 세션 (below) | The sessions below: their state (ended, needs input, idle for 7+ days, attached), **받기 N** (receive its N held reports — they go to Claude here), **보관** (archive, once ended), **가기** (go), and **⋯** to read each held report and 수락 (accept) or 거절 (reject) it. Main and orchestrator sessions also get, under **⋯**: send, 정리 부탁 (ask it to clean up), end, 일 합치기 (merge work — asks it to hand its work up and stop), archive and detach; and under the rows, **모두 보관** (archive all ended — in Bypass permissions only) and **밑으로 붙이기** (put another session under this one). |
| | 진행판 (progress board) | Main and orchestrator sessions: the `.md` board you choose and its new lines, **넣기** (add a line — puts it in the prompt box) and **바꾸기** (change). A sub session shows the board above it. |
| | 역할 · 인계 (role · handover) | **인계** (hand over) puts an instruction in the prompt box to save the state and open the next round, titled `… N+1차`, with the same role; the new session takes over the pin, the orchestrator mark and the board. Below it, changing this session's role: make it an orchestrator or stop being one, take a sub session solo (detach), or put a solo session under an orchestrator you pick. Changes that can't happen now are dimmed, with the reason. |
| 도구 (tools) | 명령 (commands) | `ultrathink` · `/btw` · `/fork` · `/rewind` · `/recap` · 내보내기 (export). |
| | 어드바이저 (advisor) | When the advisor was called in this session: each call's time and tokens, what Claude was doing just before and what it did right after. The advisor's answer itself is never read. |
| | 현재 세션 (this session) | 고정 (pin), Remote Control on or off, 정리 (clean up — an instruction to update notes, commit and write the end line on the board), 제목 정리 (tidy the title to its role's form), 끝내기 (end), 보관 (archive) and 떼어 내기 (detach — can't be undone). |

If a session you send to has gone cold and compacting it first would be cheaper, a card shows both prices before anything is sent. Accepting a held report sends its text to Claude here as your message; the figure under it is what one request costs at the current context.

### 3. Send a turn's answer to another session

**End your message with `>>main` (or `>>메인`) or `>>name`, and when Claude finishes that turn, its last answer goes to that session.** `name` matches a session's `[scope]`, part of its title, or the start of its app session id; `main` is the orchestrator above this session (or the top of its tree). The **전달** (forward) cell on the line above the input shows where it will go, lets you pick a related session instead — above, below or beside this one (it writes the signal for you) or 없음 (none) to cancel. **➤** next to it sends only the text you typed, right away, without Claude answering.

How it goes depends on the permission modes:

- From a session in **Bypass permissions**, easy-session sends it itself.
- From any other mode, Claude is asked to send it with SendMessage — unless the receiving session runs in Bypass permissions or plan mode, which doesn't take messages from other modes. Then it waits as a card in that session's panel, to be accepted there.
- If the app reports the message wasn't delivered, it becomes a card as well. A notice under the answer says what happened.

### 4. Settings tab

**The panel's second tab, 설정 (settings).** Each row has a **?** — hover for one line, press for more.

- **입력창 위 줄에 둘 것** (what to put on the line above the input) — a live preview of the line, then a switch for each item in [1](#1-the-line-above-the-input).
- **화면 · advisor** (screen · advisor) — the same two choices as on the line, for when you've taken them off it.
- **새 자식 세션** (new child sessions — when a session opens another): 저절로 고정 (pin it), 끝나면 고정 풀기 (unpin it once it writes its end line on the board), 사이드바 그룹으로 묶기 (put the whole tree in one sidebar group), 저절로 떼어 내기 (detach it right away), and 자식 보고 (child reports): 앱 그대로 (the app's way — the opener gets each report and runs a turn) or 사이드 패널에 모아 둠 (hold them in the panel until you accept). All off, and the app's way, at first. Pin, group and detach act only in Bypass-permissions sessions.
- **메시지** (messages) — 보낸 세션 관계 알리기: when a message arrives from another session, tell Claude where the sender is (above, below, same tree or another tree). Off at first.
- **정리** (clean up) — 남은 자료 (leftovers): the scratch folders that archived sessions left in your temp folder, minus the ones a `.md` file still mentions. Counted when you open Settings, at most every 10 minutes; ▸ lists the biggest. **휴지통으로** (to the Recycle Bin) asks first, then moves them to the Windows Recycle Bin, where you can restore them. It moves nothing if the Recycle Bin would delete them right away or overflow.

## Good to know

- **Permission modes matter.** Buttons that change the app — pin, archive, detach, export, Remote Control on or off, send — act directly only in a session running in **Bypass permissions**. In other modes they put a one-line request in your prompt box (press again to take it out), and nothing happens until you send it.
- **Everything stays on your computer.** easy-session makes no network requests. Messages between sessions go through the desktop app's own session messaging on this computer.
- **화면 (screen) applies to every session, terminal ones included.** Set it to PC, tablet or phone and each message you send carries one line telling Claude how to answer on that device; on tablet and phone, Claude's choice cards and widgets are refused so it asks in plain text. 쓰지 않음 (off, the default) adds nothing.
- **Dollar amounts are rough estimates** at fixed per-token rates. On a subscription, read them as how heavy a request is, not what you're billed.
- **Titles in Korean form:** a handoff is recognized when the new session's title is the next round (`… 2차` → `… 3차`), and a side session's end line on a progress board reads `- MM-DD [name] 끝: …` (끝 = done).
- **With [easy-compact](https://github.com/JaeSeongHa5280/easy-compact):** the advisor count matches easy-compact's and shows its cost — easy-session reads the small file easy-compact writes for that. easy-session's line stays on top of the rows above the input.

## Something wrong? — report it

Open an [issue](https://github.com/JaeSeongHa5280/easy-session/issues) with what happened and how to reproduce it, your easy-session version (`claude plugin list`), your Claude Code version (`/status`), your OS and the permission mode of the session. A screenshot of the panel helps. easy-session keeps no diagnostics file and never sends anything by itself.

## License

[MIT](LICENSE)
