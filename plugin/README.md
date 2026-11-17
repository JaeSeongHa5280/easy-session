# easy-session

easy-session shows the Claude desktop app sessions that belong with the one you are in, and lets you message, pin, end, hand over and archive them from one panel. It adds a **line above the chat input** and a **session panel** (titled 세션). Its interface is in Korean.

- **Line above the input**: the 세션 패널 (session panel) button, plus what you turn on in Settings: pin this session, `ultrathink`, the advisor model with how often it was called, 전달 (forward — send this turn's last answer to another session), 화면 (screen — which device you are reading on) and command chips (`/btw`, `/fork`, `/rewind`, `/recap`, export).
- **Session panel**: this session's role, what waits for you (sessions that need your input, held reports and messages, new board lines), and nine tiles: the sessions above, beside and elsewhere to message; the sessions below, the progress board, and role and handover; commands, advisor calls and this session's own actions (pin, Remote Control, clean up, end, archive, detach).
- **Send signal**: end a message with `>>main` (`>>메인`) or `>>name` and the last answer of that turn goes to that session.
- **Settings**: what the line above the input shows (with a preview), the screen and advisor choices, what happens when a session opens a new one (pin it, group it in the sidebar, detach it, hold its reports in the panel), and moving the leftover scratch folders of archived sessions to the Recycle Bin.

easy-session is a Claude Code mod (`modules` in `hooks/hooks.json`). It reads the desktop app's own session records, so it shows only in the Claude desktop app's Code tab; in a terminal it draws nothing. Checked on Claude Code 2.1.325.

## What it reads

- **The desktop app's session records** in the app's data folder (`claude-code-sessions/<account>/<organization>/local_*.json` and `archived-sessions.idx`): each session's title, working folder, which session opened it and whether it was detached, archived or pinned, permission mode, model, last activity, the app's status summary, the delivery receipts of messages it sent, and the side-session reports the app queued for it.
- **Environment variables, only these**: where the app's and Claude Code's folders are (`LOCALAPPDATA`, `APPDATA`, `HOME`, `USERPROFILE`, `CLAUDE_CONFIG_DIR`), the two folder names under `claude-code-sessions` (`CLAUDE_CODE_ACCOUNT_UUID`, `CLAUDE_CODE_ORGANIZATION_UUID`) and which app session this is (`CLAUDE_CODE_HOST_SESSION_ID`). It reads no keys or login tokens.
- **Its own files** in its data folder (see What it writes), including the ones other sessions on this computer wrote there: end marks, held messages, cards left for this session, context sizes.
- **Claude Code's settings**, one value: the advisor model (`advisorModel`), to show it on the line above the input and in Settings.
- **This session's usage** from Claude Code: the context size, and whether 5-hour and 7-day plan limits are reported. It uses them to estimate what one request costs when you accept a held message, and to word the notice shown before switching the advisor to Fable.
- **Your prompt box text**: when the line above the input is drawn, every 3 seconds while 전달 is on, and right before a button changes the box. It looks for `ultrathink`, a send signal (`>>name`) or the text a button put there. The text is not stored; only the words typed with a send signal are kept until that turn ends (see What it writes).
- **easy-compact's advisor file**, when easy-compact is installed: `~/.claude/plugins/data/advisor-use/<session id>.json` (number of advisor calls and their cost), to show the same count and cost.
- **This session's transcript** (`~/.claude/projects/…/<session id>.jsonl` and its subagent transcripts), through `tools/advisor-times.mjs`, only when the session has called the advisor and the panel's 어드바이저 (advisor) tile is open. It takes when each call happened, its token counts, the end of the text before it, and the tools and first text after it. The list stays in memory. The encrypted advisor result field is blanked on each line before the line is parsed, so its value is never read, kept, shown or written.
- **For the leftovers count**, through `tools/clean-scratch.mjs`: the scratch folders Claude Code keeps per session in your temp folder (`<temp>/claude/…` — size and newest file time), and the `.md` files under your Claude folder and under the working folders of sessions that aren't archived (up to 20,000 files, skipping folders such as `node_modules` and `.git`), only to see whether one mentions a scratch folder's session id. Folders that are mentioned are kept. The text is not kept.
- **A progress board file you choose** (진행판 — any `.md` path you enter in the panel of an orchestrator session): its lines, to show new ones and to notice a side session's end line.
- **The Recycle Bin settings**, through `tools/recycle.mjs` and PowerShell, only after you confirm a move: `NukeOnDelete` and `MaxCapacity` under `HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\BitBucket\Volume`, and the size of what is already in the Recycle Bin.
- **App state through the app's tools**, read-only. In any permission mode, a session's details (`get_session`): when the panel opens, when you switch to its first tab, open its 현재 세션 (this session) tile or a row's ⋯ menu (to see whether Remote Control is on), and after a session opens a new one (to check the new session's opener, title and sidebar group). As part of the Bypass-permissions actions below, the window layout (`get_window_layout` — it won't archive another session that is open on screen) and the sidebar group list (`list_groups`).

## What it runs, and why

- **`rundll32.exe url.dll,FileProtocolHandler claude://code/continue?session=<app session id>&source=session_nav`** when you press 이동 (go), 열기 (open) or 세션 열기 (open session): it asks the Claude desktop app to show that session. This is a Windows command; there is no macOS or Linux version yet.
- **Node.js**, with three scripts from this plugin's `tools/` folder (`advisor-scan.mjs` is a helper they import):
  - `node tools/advisor-times.mjs <~/.claude/projects> <session id>` prints the advisor call list described above. It writes nothing.
  - `node tools/clean-scratch.mjs <app session-record folder> <Claude folder> <working folders…>`, while the Settings tab is open, at most once every 10 minutes, prints the scratch folders of archived sessions (path, title, size, age). It changes nothing.
  - `node tools/recycle.mjs <data folder>/clean/list.txt <data folder>/clean/log.txt`, only after you confirm 휴지통으로 (to the Recycle Bin) in Settings, runs `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand …` with `ES_LIST` and `ES_LOG` set to those two files. It moves the listed folders to the Windows Recycle Bin with the shell's undo flag, so you can restore them. It moves nothing when a drive's Recycle Bin deletes files right away, or when what is already there plus these folders would pass its maximum size (Windows would then delete older items for good). On macOS and Linux it moves nothing.

  Their arguments are only those paths and the session id. They don't connect anywhere. Without `node` on your PATH, the advisor list and the leftovers count show an error instead.
- **Claude Code commands**, only when you pick them: `/recap` (the `/recap` chip) and `/advisor <off | sonnet | opus | fable>` when you pick an advisor model on the line above the input or in Settings. `/advisor` changes Claude Code's advisor setting for all sessions, as typing it does; picking fable shows a confirm card first.
- **The desktop app's own session tools** (`$.mcp.call`). Calls that change something run only in a session whose permission mode is **Bypass permissions**, and only when you press a button, when a setting you turned on applies, when a handoff is detected (a new session titled as the next round), or when Claude archives a session that handed over (see What its hooks do). In any other mode a button puts a one-line request in your prompt box instead, and nothing happens until you send it; Claude then uses the same tools with the usual permission checks. The read-only calls are listed under What it reads.
  - `ccd_sidebar`: `set_pinned` (pin and unpin — also when ending, archiving or handing over, and for the auto-pin settings), `move_sessions` and `create_group` (the sidebar-group setting: a session tree goes into a group named after the `[scope]` of its top session's title).
  - `ccd_session_mgmt`: `archive_session`, `unarchive_session` (also before sending to an archived session), `detach_session` (cannot be undone — the app stops sending that session's reports to the session that opened it), `set_remote_control` (turn Remote Control on or off), `export_transcript` (the app saves the conversation as a zip in your Downloads folder).
- Messages to other sessions and text put in your prompt box: see What it sends.

## What it sends

easy-session makes no network requests of its own: no telemetry and no update checks. Everything below stays on this computer. It goes to Claude in your sessions, or to another session through the desktop app's own session messaging.

- **Context lines for Claude**, added to a turn as hook context (your text is not changed):
  - `[화면] …` on every message in every session, only when 화면 is set to something other than 쓰지 않음 (off): the device you picked (PC, tablet or phone) and how to answer on it.
  - `[easy-session 보내기] …` on a message with a send signal: which session the answer goes to, and whether easy-session sends it or Claude should send it with SendMessage.
  - `[easy-session 관계] …` on a message from another session, only with 보낸 세션 관계 알리기 (tell where the sender is) turned on: whether the sender is above or below this session, in the same tree or in another one, with its title.
- **Messages to other sessions on this computer** (`$.session.send`, through the app's session messaging):
  - the text in the panel's send box: what you type, or the clean-up (정리 부탁) or merge-work (일 합치기) instruction a ⋯ action put there for you to send;
  - with a send signal, this turn's last answer (up to 20,000 characters) with one line saying it came from a send signal, plus up to 300 characters you typed with the signal;
  - with 입력 글만 바로 보내기 (send the prompt text only), the text in your prompt box with one line saying you typed it.

  easy-session sends these itself only from a Bypass-permissions session. Otherwise Claude is asked to send them with SendMessage, or, when the receiving session runs in Bypass permissions or plan mode, the text is left as a card in that session's panel through a file in the data folder, and someone accepts it there. If the app reports that a message was not delivered, the same card is left.
- **Text in your prompt box** (`$.prompt.fill`): `ultrathink`, `/btw`, `/fork`, `/rewind`, the send signal picked in 전달, new board lines, the handoff, clean-up, title-tidy (제목 정리) and report-form (보고 꼴로 — a five-part report, with a send signal to the session above when there is one) instructions, and, outside Bypass permissions, the one-line requests for pin, archive, export, detach, Remote Control on or off and send. It only fills the box (pressing again takes the text out); you send it.
- **Accepted messages**: 수락 (accept) on a held message, or 받기 N (receive all N held from one session below), sends its text to Claude in this session as your message (`$.prompt.submit`), with one line saying it came from another session and is data, not instructions.
- **Refused tools**: while 화면 is set to tablet or phone, Claude's choice cards (`AskUserQuestion`) and widgets (`mcp__visualize__show_widget`) are refused with a one-line reason, so Claude asks in plain text.
- **Commands**: `/recap` and `/advisor …`, as above.

## What it writes

- **Settings and marks, to Claude Code's plugin store** (`$.store`) on this computer: which panel is open (so it follows you between related sessions), the items on the line above the input, 화면, the Settings switches, whether this computer was last seen on a subscription or on API billing, and per-session marks: why a session was pinned, which sessions are orchestrators, an owner you picked, which session took over after a handoff, a send signal waiting for its turn to end (the target session and the words you typed with it) and short-lived "already sent" marks.
- **Files in its data folder**, `~/.claude/plugins/data/easy-session-<marketplace>/`:
  - `context/<session>.json`: this session's context size, window and model after each turn, so another session can show how big it is before waking it.
  - `sessions/<session>.json`: end marks (끝내기, or a side session's end line on the board) with up to 160 characters of its summary.
  - `reports/<session>.json`: messages held for that session, with their text: side-session reports (when 자식 보고 is set to hold) and cards left by other sessions.
  - `outbox/<session>.json`: cards this session left for other sessions (receiver, title, text).
  - `boards/<session>.json`: the progress board path you chose and which of its lines were seen.
  - `advisor/<session>.json`: how many advisor calls this session made and when the last one was. Numbers only.
  - `clean/list.txt` (the folders you confirmed to move) and `clean/log.txt` (what was moved).
- **The Windows Recycle Bin**: the scratch folders you confirmed, as above.
- **Desktop app state**, through the app's tools above: pins, sidebar groups, archive, detach, Remote Control on or off, and an exported zip in Downloads.
- **Claude Code's advisor setting**, through `/advisor`, as above.
- Short notices, and notice lines in the conversation after a send signal.

## What its hooks do

- `session.start`: starts two timers: every 1.5 seconds it opens or closes the panel to match the related sessions, and every 3 seconds it rereads app records that changed and redraws. Once, 20 seconds in, if this session's title is the next round of the session that opened it (a handoff) and no successor is recorded yet, it records this session as the successor and moves the orchestrator mark and the progress board to it; in Bypass permissions it also moves the pin.
- `turn.start`, `turn.complete`: tie a send signal to its turn and, when the turn ends, send or leave its last answer; write this session's context size; note whether the turn's text has `ultrathink` (for the working line below).
- `turn.step`: counts the advisor calls that returned and notes the main model. Passed on unchanged.
- `session.measure`: notes whether plan limits are reported.
- `session.send`: while a send signal waits, if Claude sends to that same session itself, it records that, or refuses Claude's copy when easy-session is the one sending, so the text doesn't go twice. Other sends pass unchanged.
- `prompt.change`: notes whether the prompt box holds `ultrathink`.
- `prompt.submit`: adds the context lines under What it sends. In a message that carries the app's side-session reports, it removes the app's notices that easy-session dropped an earlier turn, and, when 자식 보고 (child reports) is set to hold, takes the reports out and keeps them in the panel. An app turn left with nothing else is dropped, with the note `easy-session: 사이드 패널에서 관리해 주세요`. The words you typed are never changed.
- `tool.call` on `AskUserQuestion` and `mcp__visualize__show_widget`: refused only while 화면 is tablet or phone.
- `tool.call` on `mcp__ccd_session__start_session`: after a session opens a new one, checks the new session (`get_session`), applies a handoff when the new title is the next round (the same moves as under `session.start`), and applies the auto-pin, auto-detach and sidebar-group settings. The result passes unchanged.
- `tool.call` on `mcp__ccd_session_mgmt__archive_session`: when Claude archives a session that handed over to another, in Bypass permissions it first detaches the sessions attached to it (`detach_session`) so they aren't archived along with it, and refuses the archive if it can't. Outside Bypass permissions it only refuses when this session would be archived along with it.
- `tool.call` on `Edit` and `Write`: reads only `file_path`. If that file is a progress board, it marks the lines this session added as seen, or notices a side session's end line. The edit passes unchanged.
- `ui.render`, `ui.message`, `ui.close`: draw the line above the input and the panel, and handle their buttons and switches. On `AbovePromptList` it only moves its own row to the top of the rows above the input; on `Spinner` (desktop), while a turn whose text has `ultrathink` runs, it puts `ultrathink · ` before the chat's working-line text; on `SessionMode` it adds nothing in this version.

It adds no slash command and no model tool.

## Install

Install it in Claude Code from the repository's own marketplace:

```
/plugin install easy-session --marketplace JaeSeongHa5280/easy-session
```

How it works and every setting: <https://github.com/JaeSeongHa5280/easy-session>. 한국어 설명: <https://github.com/JaeSeongHa5280/easy-session/blob/main/README.ko.md>
