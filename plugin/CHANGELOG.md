# Changelog

All notable changes to easy-session. Versions follow [Semantic Versioning](https://semver.org/). [한국어](CHANGELOG.ko.md)

**Update:** send Claude `Update this plugin: easy-session (claude plugin marketplace update easy-session, then claude plugin update easy-session@easy-session)`, or run those two lines in a shell, then restart Claude — see [Update](README.md#update).

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
