# Changelog

All notable changes to easy-session. Versions follow [Semantic Versioning](https://semver.org/). [한국어](CHANGELOG.ko.md)

**Update:** send Claude `Update this plugin: easy-session (claude plugin marketplace update easy-session, then claude plugin update easy-session@easy-session)`, or run those two lines in a shell, then restart Claude — see [Update](README.md#update).

## [0.1.28] — 2026-11-19

0.1.27 was never published, so its changes are listed here too.

### New
- **VS Code** — the line above the input and the session panel now show in the Claude Code extension's chat panel in VS Code (checked with extension 2.1.326). A VS Code session is outside the desktop app's session tree, so what needs the desktop app is dimmed with the reason in the wide panel beside the chat, and left out in the 12-line box above the input. In that box the panel is a list, one line per tile; press a line to open it right under.
- **Terminal** — `claude` in a terminal gets the line above the input with the 세션 패널 (session panel) button, and the panel in text: tiles as text buttons, choices as a row of buttons, switches as [켬] (on) and [끔] (off).
- **Sessions outside the desktop app** — VS Code and terminal sessions open now show in the 다른 세션 (other sessions) tile under 데스크톱 앱 밖 · 지금 열린 세션 (outside the desktop app · open now), tagged VS Code or 터미널 (terminal), with 보내기 (send); 가기 (go) stays for desktop app sessions. In a VS Code or terminal session, that tile lists the desktop app sessions open now in their tree order, tagged 메인 (main) or 오케 (orchestrator).
- **Sending from VS Code and a terminal** — 보내기 (send) sends right away in any permission mode. When the session can't be reached, an instruction for Claude goes in the prompt box instead. Messages a VS Code or terminal session sent show 도착 (arrived).
- **Remote Control and export in VS Code and a terminal** — they run Claude Code's own `/remote-control` and `/export` when the session has those commands, right away in any permission mode. Export saves the conversation as a text file (`conversation-<date-time>.txt`) in your Downloads folder. Without those commands, a one-line request goes in the prompt box.
- **Session rules** — Settings → 메시지 (messages) → 세션 규칙(보내기 확인 · Claude 안내) (session rules — send check and notes for Claude), on at first. When Claude in a desktop app session sends to an ended or archived session, or to a third different session in one answer, the send is stopped so Claude asks you first; the same send after you answer goes through. Claude also gets short rule lines with your messages, in every session: a handed-over session's first answer only reads the handover notes and reports, a main or orchestrator session decides and delegates instead of doing the work itself, and instructions go one level down. In a desktop app session, asking in plain words to hand over, to open something or to send up adds a one-line hint.
- **`ultrathink` in the first message** — Settings → 새 자식 세션 (new child sessions) → 첫 글에 ultrathink, off at first. When this session opens a new session, or hands its work over to one, `ultrathink` goes at the start of what it sends.

### Changed
- **Session tools tab** — the 이 세션 (this session) group comes first: 명령 (commands), 어드바이저 (advisor) and 고정 · 보관 (pin · archive — the old 현재 세션 tile). Then 세션 메시지 (session messages) and 관리 (manage). No tile is open at first; a tile opens as a card right under its row and closes when you press it again (› and ˅). Inside a card each row has a label and its buttons, and the explanations moved behind **?**. 고정 · 보관 has three rows: 표시 (show — pin, Remote Control), 정리 (clean up — clean up, tidy title) and 닫기 (close — end, archive, detach).
- **Tile lines** — 보낸 N · 받은 N (sent · received) counts messages from the app's delivery records (받은 used to count held messages); 하위 세션 (below) shows N개 · 받은 N; 역할 · 인계 (role · handover) shows the context %. The line under the title shows only the role chip and 위 · (above ·) with the title of the session above. The role chip opens and closes the 역할 · 인계 card, and 보기 (view) in the 지금 (now) box only opens.
- **Labels** — 받기 N on a row below is now 수락 N (accept), a group of held messages says 받은 글 N (received), the progress board rows are 파일 (file) and 새 줄 (new lines), a sub session's board line says 위 세션 것 (the session above's), and 가기 (go) is a filled button.
- **Handover** — the instruction 인계 (hand over) puts in the prompt box asks the new session to spend its first turn reading the handover notes, report what it does and which sessions are running or ended, and then wait for you.
- **Notices in VS Code** — one line at the bottom of the panel, or at the end of the line above the input when the panel is closed, instead of a toast; ✓ only when something worked. It goes away at your next press. `ultrathink`'s rainbow letters use colors VS Code shows.
- **Messages from VS Code and terminal sessions** — with 보낸 세션 관계 알리기 (tell where the sender is) on, Claude is told the sender is a VS Code or terminal session outside the desktop app, instead of that it wasn't found in the session list.

### Fixed
- **A side session's next round** — when a side session opened its own next round, the panel put the two the other way round from the sidebar. While both are open, the new round now sits under the old one, tagged 이전 차수 (previous round) and 다음 차수 (next round). Handovers of main and orchestrator sessions work as before: the new round takes over the place and the sessions below.

## [0.1.26] — 2026-11-18 · first public release

### New
- **Line above the input** — the 세션 패널 (session panel) button, plus pin, `ultrathink`, advisor (model picker with this session's call count, and its cost when easy-compact is installed), 전달 (forward — to the session above, below or beside this one), 화면 (screen) and command chips (`/btw`, `/fork`, `/rewind`, `/recap`, export). You pick which ones in Settings.
- **`ultrathink` on the working line** — while a turn sent with `ultrathink` runs, the chat's working line starts with `ultrathink · `.
- **Session panel, 세션 도구 (session tools) tab** — a role chip (메인 main · 오케 orchestrator · 서브 sub · 단독 solo) with how many sessions sit above, below and beside; a 지금 (now) box for what waits for you (sessions needing input, held reports and messages, new board lines); and nine tiles in three groups — 세션 메시지 (above · siblings · other sessions), 관리 (below · progress board · role and handover) and 도구 (commands · advisor · this session). One tile opens at a time, tiles your role doesn't use are dimmed, and an orange number on a tile's corner counts what waits there.
- **Sessions below** — state tags (ended, needs input, idle 7+ days, attached), receive their held reports, archive, go, and for main and orchestrator sessions a ⋯ with send, ask to clean up, end, merge work, archive and detach. Archive all runs in one go in Bypass permissions only (it skips sessions open on screen and unpins first); in other modes, archive row by row.
- **Report form** — puts a five-part report request in the prompt box (done, in progress, blocked, decisions waiting, next); the answer goes to the session above, or to the chat for a top session.
- **This session** — pin, Remote Control on or off, clean up (main and orchestrator sessions get three extra steps first: sessions below, work, report), tidy title, end, archive, detach.
- **Send signal** — end a message with `>>main` or `>>name` and that turn's last answer goes to that session; ➤ sends only the text you typed. A Bypass-permissions session sends it directly; other modes go through Claude's SendMessage or a card in the receiving session's panel.
- **Settings tab** — what the line above the input shows (with a live preview), 화면 and advisor, new child sessions (auto-pin, unpin when ended, sidebar group, auto-detach, hold child reports in the panel), telling Claude where a message came from, and leftovers.
- **Leftovers to the Recycle Bin** — the scratch folders that archived sessions left behind, minus the ones a `.md` file mentions, moved to the Windows Recycle Bin after you confirm.
- **Wake-cost card** — when you send to a session whose cache has gone cold and compacting it first is cheaper, both prices show before anything is sent.
- **Works with easy-compact** — the advisor count and cost match easy-compact's, and easy-session's line stays on top of the rows above the input.
