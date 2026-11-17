<h1 align="center">easy-session</h1>

<p align="center">
  <b>이 세션과 이어진 세션들을 보고, 한 패널에서 메시지 · 고정 · 인계 · 보관까지 합니다.</b><br>
  Claude Code 플러그인 · Claude 데스크톱 앱(Code 탭) · Claude Code 2.1.325 에서 확인
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.26-4c9be8" alt="버전 0.1.26">
  <img src="https://img.shields.io/badge/Claude_Code-plugin-D97757" alt="Claude Code 플러그인">
  <img src="https://img.shields.io/badge/tested_on-Claude_Code_2.1.325-4c9be8" alt="Claude Code 2.1.325 에서 시험">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT 라이선스">
</p>

<p align="center">
  <a href="README.md">English</a> · <b>한국어</b>
  &nbsp;|&nbsp;
  <a href="#필요한-것">필요한 것</a> · <a href="#설치">설치</a> · <a href="#업데이트-받기">업데이트 받기</a> · <a href="#0126-에서-바뀐-것">바뀐 것</a> · <a href="#기능">기능</a> · <a href="#알아-둘-것">알아 둘 것</a> · <a href="#문제가-생기면--제보">제보</a>
</p>

---

## 필요한 것

| | |
|---|---|
| **Claude 데스크톱 앱** | 이지 세션은 데스크톱 앱이 적는 세션 기록을 읽습니다. 그래서 앱의 **Code** 탭에서 돕니다. 터미널의 `claude` 에선 아무것도 그리지 않습니다. VS Code 의 Claude Code 확장은 아직 시험하지 않았습니다. |
| **Claude Code** | **2.1.325** 에서 확인 — Code 탭 세션에서 `/status` → **Claude Code** 줄(앱 정보의 앱 버전 번호가 아님). 몇 버전부터 되는지는 아직 재지 않았습니다. |
| **업데이트** | **Claude → Check for Updates**(macOS) · **Help → Check for Updates**(Windows) 뒤 새 세션. |
| **git** | GitHub 에서 마켓을 추가할 때 필요 — `git --version` 이 버전을 찍으면 됩니다. macOS: 개발자 도구 설치 창이 뜨면 설치하세요. Windows: [Git for Windows](https://git-scm.com/downloads/win). |
| **언어** | 패널 · 입력창 위 줄 · 알림 · Claude 에게 붙이는 줄이 모두 한국어입니다(영어 화면은 아직 없음). |
| **선택** | PATH 의 Node.js — advisor 호출 목록과 남은 자료 세기 · 옮기기에 씁니다. 없으면 그 둘은 오류를 보입니다. |
| **시험한 곳** | Windows 11, 데스크톱 앱 · Claude Code 2.1.325. macOS · Linux 는 아직 시험하지 않았습니다. 두 동작은 Windows 프로그램을 불러서 그쪽에선 아직 안 됩니다: 세션으로 이동(`rundll32`) · 남은 자료를 휴지통으로(PowerShell). |

## 설치

**처음 한 번만. 가장 쉬운 길 — Claude 에게 이 한 줄을 보내세요**(데스크톱 앱 Code 탭 세션에서):

```
이 플러그인 설치해줘: github.com/JaeSeongHa5280/easy-session (claude plugin marketplace add JaeSeongHa5280/easy-session 후 claude plugin install easy-session@easy-session)
```

그다음 Claude 앱을 완전히 껐다 켭니다. 입력창 위 줄에 **세션 패널** 단추가 뜹니다.

<details>
<summary><b>직접 치려면</b></summary>

**Claude 입력창에서 — 한 줄씩 따로 보내세요.** 첫 줄이 끝난 뒤 둘째 줄을 보냅니다. 두 줄을 한 번에 붙여 보내면 설치가 안 됩니다.

```
/plugin marketplace add JaeSeongHa5280/easy-session
```

```
/plugin install easy-session@easy-session
```

- **데스크톱 앱:** 첫 줄을 치면 **마켓플레이스 추가** 창이 뜹니다 — **동기화** 를 누르세요. 빨간 경고는 Anthropic 이 운영하지 않는 마켓이면 늘 뜨는 안내입니다. 둘째 줄을 치면 플러그인 목록에 easy-session 이 보입니다 — 설치하세요.
- **터미널 세션:** 둘째 줄을 치면 플러그인 정보가 열립니다 — **Install for you** 를 고르세요.

**터미널(macOS 터미널 · Windows PowerShell)에서:**

```
claude plugin marketplace add JaeSeongHa5280/easy-session
claude plugin install easy-session@easy-session
```

`claude` 명령이 없으면(데스크톱 앱만 쓰면 보통) 위의 한 줄을 Claude 에게 보내세요.

</details>

> **Claude 에게:** 먼저 엔진 버전을 보세요(`<엔진> --version`). 이지 세션은 2.1.325 에서 확인했습니다. 그보다 낮으면 사용자에게 알리고 먼저 업데이트를 권하세요([필요한 것](#필요한-것)). `claude` 가 PATH 에 없으면(데스크톱 앱이면 보통) 지금 도는 엔진으로 돌리세요 — 엔진 경로는 `CLAUDE_CODE_EXECPATH`, 없으면 `CLAUDE_PID` 의 실행 파일입니다. macOS · Linux: `"$CLAUDE_CODE_EXECPATH" plugin marketplace add JaeSeongHa5280/easy-session` 다음 `"$CLAUDE_CODE_EXECPATH" plugin install easy-session@easy-session`. Windows PowerShell: `& $env:CLAUDE_CODE_EXECPATH plugin marketplace add JaeSeongHa5280/easy-session` 다음 `& $env:CLAUDE_CODE_EXECPATH plugin install easy-session@easy-session`(변수가 없으면 `(Get-Process -Id $env:CLAUDE_PID).Path`). `git` 이 없어 마켓 추가가 실패하면 git 설치를 안내하세요(macOS 는 `xcode-select --install`). 이미 설치된 것을 업데이트할 땐 같은 엔진 경로로 `plugin marketplace update easy-session` 을 먼저, 그다음 `plugin update easy-session@easy-session` — 첫 단계 없이는 옛 버전을 최신이라고 답합니다. `plugin list` 에서 `easy-session@easy-session` 이 enabled 인지 보고, 앱을 완전히 껐다 켜 달라고 안내하세요. 이 저장소를 clone 하거나 `settings.json` 을 고치지 마세요.

## 업데이트 받기

**Claude 에게 이 한 줄을 보낸 뒤** Claude 앱을 껐다 켜세요.

```
이 플러그인 업데이트해줘: easy-session (claude plugin marketplace update easy-session 후 claude plugin update easy-session@easy-session)
```

셸에서 직접 하려면 이 두 줄입니다:

```
claude plugin marketplace update easy-session
claude plugin update easy-session@easy-session
```

- 설치 줄을 다시 치면 "이미 설치됨"만 나옵니다. `plugin update` 만 치면 옛 버전을 최신이라고 답합니다 — 첫 줄이 새 목록을 받아 옵니다.
- 쓰던 설정은 그대로 남습니다.
- **새 버전을 저절로 받으려면:** 터미널 세션에서 `/plugin` → **Marketplaces** → **easy-session** → **Enable auto-update**. Anthropic 이 운영하지 않는 마켓은 꺼진 채로 시작합니다([Claude Code 문서](https://code.claude.com/docs/en/plugins/install)).
- 내 버전 번호: `claude plugin list`. 무엇이 바뀌었나: [변경 기록](CHANGELOG.ko.md).

<details>
<summary><b>지우기</b></summary>

```
claude plugin uninstall easy-session@easy-session
```

`~/.claude` 에 clone 하거나 `settings.json` 을 고친 것이 없어 이것으로 끝입니다.

</details>

## 0.1.26 에서 바뀐 것

첫 공개입니다.

- **입력창 위 줄** — 세션 패널 단추와 고른 칸: 고정 · `ultrathink` · advisor · 전달 · 화면 · 명령 칩. `ultrathink` 를 넣어 보낸 차례 동안은 채팅 작업 줄 글 앞에 `ultrathink · ` 가 붙습니다.
- **세션 패널** — 이 세션과 둘레 세션을 다루는 [세션 도구] 탭(역할 칩 · 「지금」 칸 · 묶음 셋에 칸 아홉)과 [설정] 탭.
- **보내기 신호** — 글 끝에 `>>메인` 이나 `>>이름` 을 붙이면 그 차례 끝 답이 그 세션으로 갑니다.
- **정리** — 보관한 세션이 남긴 스크래치 폴더를 휴지통으로 옮깁니다.

## 기능

### 1. 입력창 위 줄

**데스크톱 앱 세션마다 입력창 위에 한 줄이 생깁니다.** 맨 앞 **세션 패널** 단추는 늘 있고 패널을 열고 닫습니다. 나머지는 [설정] → 「입력창 위 줄에 둘 것」에서 고릅니다:

| 칸 | 하는 일 | 처음 |
|---|---|---|
| 고정 | 이 세션을 사이드바에 고정하거나 고정을 풉니다 | 켬 |
| `ultrathink` | 입력창 맨 앞에 `ultrathink` 를 넣습니다(들어 있는 동안 무지개 글자). 다시 누르면 뺍니다. 그 글을 보낸 차례 동안은 채팅 작업 줄 글 앞에 `ultrathink · ` 가 붙습니다 | 켬 |
| advisor | advisor 모델(off · sonnet · opus · fable)을 고릅니다 — `/advisor` 처럼 모든 세션에 걸립니다. 작은 그림은 이 세션 모델에 걸리는지, 숫자는 이 세션에서 불린 횟수입니다(이지 컴팩트가 있으면 금액도). fable 은 먼저 묻습니다 | 켬 |
| 전달 | 이 차례 끝 답을 받을 세션을 고릅니다 — [3](#3-차례-끝-답을-다른-세션으로) | 켬 |
| 화면 | 지금 어느 기기로 보는지 — [알아 둘 것](#알아-둘-것) | |
| `/btw` · `/fork` · `/rewind` | 입력창 맨 앞에 그 명령을 넣습니다. 보내는 건 사람입니다 | |
| `/recap` | `/recap` 을 돌립니다 | |
| 내보내기 | 이 대화를 zip 으로 다운로드 폴더에 저장합니다 | |

Claude 가 답하는 동안엔 advisor · 화면을 바꿀 수 없습니다. 답이 끝나면 바꿀 수 있습니다.

### 2. 세션 도구 탭

**패널 첫 탭 [세션 도구] 는 이 세션과 둘레 세션을 다룹니다.** 위에서 아래로:

- **제목 · 역할** — 이 세션 제목, 그 아래 역할 칩: 메인(위가 없는 오케가 하나뿐일 때 그 세션) · 오케 · 서브(다른 세션 아래) · 단독. 칩 뒤에 위 · 하위 · 형제 세션 수가 붙습니다. 역할은 따로 저장하지 않습니다. 어느 세션이 어느 세션을 열었는지와 오케 표시로 읽습니다. 바꾸려면 칩을 누릅니다.
- **지금** — 할 것이 있을 때만 주황 칸에: 입력을 기다리는 하위 세션(**열기** — 그 세션으로), 하위에서 모인 보고, 받은 글, 진행판 새 줄(**보기**). 서브 세션이 하위 세션을 열면 오케로 바꿀지도 여기서 묻습니다.
- **칸 아홉 · 묶음 셋** — 칸을 누르면 그 아래에 펴집니다. 한 번에 하나만 펴집니다. 이 세션 역할에서 안 쓰는 칸은 흐립니다. 칸 모서리의 주황 수는 그 칸에서 기다리는 것의 수입니다.

| 묶음 | 칸 | 안에 있는 것 |
|---|---|---|
| 세션 메시지 | 위 세션 | 위 세션 줄과 **보내기**, 보낸 글과 도착 여부. **보고 꼴로** 는 다섯 칸 보고 글(끝난 것 · 하는 중 · 막힌 것 · 기다리는 결정 · 다음)을 입력칸에 넣고 끝에 전달 신호를 붙입니다 — 보내면 답이 위로 갑니다. 메인 · 맨 위 오케는 **보고 꼴로 — 채팅에**. |
| | 형제 세션 | 옆 세션마다 **보내기** · **가기**. |
| | 다른 세션 | 위 세션이 아닐 때의 메인 세션, 그 밖 세션과 주고받은 글. 다른 세션에는 입력칸에 `>>이름` 을 씁니다. |
| 관리 | 하위 세션 | 아래 세션들: 상태(끝남 · 입력 필요 · 7일 넘게 쉼 · 붙임), **받기 N**(모인 보고 N개를 여기 Claude 에게), **보관**(끝난 뒤), **가기**, 보고를 하나씩 보는 **⋯**(수락 · 거절). 메인 · 오케는 **⋯** 에 보내기 · 정리 부탁 · 끝내기 · 일 합치기(하던 일을 위로 넘기고 끝내 달라는 글) · 보관 · 떼어 내기가 더 있습니다. 줄 아래에는 **모두 보관**(끝난 세션 모두 — Bypass permissions 에서만) · **밑으로 붙이기**(다른 세션을 이 세션 아래로)가 있습니다. |
| | 진행판 | 메인 · 오케: 고른 `.md` 진행판과 새 줄, **넣기**(입력칸에 한 줄), **바꾸기**. 서브는 위 세션의 진행판을 보입니다. |
| | 역할 · 인계 | **인계** — 상태를 적고 같은 역할로 다음 차수(`… N+1차`) 새 세션을 열라는 지시 글을 입력칸에 넣습니다. 새 세션이 고정 · 오케 표시 · 진행판을 이어받습니다. **바꾸기** 는 이 세션 역할만 바꿉니다: 오케로 · 오케 풀기 · 서브를 단독으로(떼어 내기) · 단독을 고른 오케 아래 서브로. 지금 안 되는 것은 흐린 줄에 까닭과 함께 보입니다. |
| 도구 | 명령 | `ultrathink` · `/btw` · `/fork` · `/rewind` · `/recap` · 내보내기. |
| | 어드바이저 | 이 세션에서 advisor 가 불린 때: 호출마다 때 · 토큰, 바로 앞에 하던 일, 바로 뒤에 한 일. advisor 답 내용은 읽지 않습니다. |
| | 현재 세션 | 고정 · Remote Control 켜기 · 끄기 · 정리(노트 고치기 · 커밋 · 진행판 끝 줄을 시키는 지시 글) · 제목 정리(역할 꼴로) · 끝내기 · 보관 · 떼어 내기(되돌릴 수 없음). |

받는 세션 캐시가 식었고 컴팩트하고 보내는 쪽이 싸면 보내기 전에 두 값을 견주는 카드가 뜹니다. 모인 보고를 수락하면 그 글이 여기 Claude 에게 내 메시지로 갑니다. 보고 아래 숫자는 지금 컨텍스트로 요청 한 번에 드는 값입니다.

### 3. 차례 끝 답을 다른 세션으로

**글 끝에 `>>메인`(또는 `>>main`)이나 `>>이름` 을 붙이면 Claude 가 그 차례를 끝낼 때 끝 답이 그 세션으로 갑니다.** `이름` 은 세션 제목의 `[범위]` · 제목 일부 · 앱 세션 id 앞부분과 맞춰 봅니다. `메인` 은 이 세션 위의 오케(없으면 나무 맨 위)입니다. 입력창 위 **전달** 칸이 보낼 곳을 보여 줍니다. 여기서 관계 세션(위 · 하위 · 형제)을 고르면 신호를 대신 써 줍니다. 「없음」을 고르면 취소합니다. 옆 **➤** 는 친 글만 바로 보냅니다. 이때 Claude 는 답하지 않습니다.

가는 길은 권한 모드에 따라 다릅니다:

- **Bypass permissions** 세션에서는 이지 세션이 직접 보냅니다.
- 그 밖의 모드에서는 Claude 에게 SendMessage 로 보내라고 합니다. 받는 세션이 Bypass permissions · plan 모드면 다른 모드의 메시지를 받지 않습니다. 그때는 글이 그 세션 패널에 카드로 남습니다. 수락은 거기서 합니다.
- 앱이 안 갔다고 알리면 그것도 카드가 됩니다. 어떻게 됐는지는 답 아래 알림 줄에 나옵니다.

### 4. 설정 탭

**패널 둘째 탭 [설정].** 줄 이름 옆 **?** 에 풀이가 있습니다.

- **입력창 위 줄에 둘 것** — 맨 위에 입력창 위 줄 미리보기, 그 아래 [1](#1-입력창-위-줄)의 칸마다 스위치.
- **화면 · advisor** — 입력창 위 줄과 같은 두 값. 줄에서 뺐을 때 여기서 바꿉니다.
- **새 자식 세션** — 세션이 다른 세션을 열 때 할 일: 저절로 고정 · 끝나면 고정 풀기(진행판에 끝 줄을 쓰면 풂) · 사이드바 그룹으로 묶기 · 저절로 떼어 내기. 「자식 보고」는 「앱 그대로」와 「사이드 패널에 모아 둠」 가운데 고릅니다. 앱 그대로면 연 세션이 보고를 받을 때마다 차례가 돕니다. 모아 두면 수락할 때까지 패널에 있습니다. 처음엔 스위치가 다 꺼져 있고 자식 보고는 앱 그대로입니다. 고정 · 그룹 · 떼어 내기는 Bypass permissions 세션에서만 됩니다.
- **메시지** — 보낸 세션 관계 알리기: 다른 세션 글을 받으면 보낸 세션이 위 · 아래 · 같은 나무 · 다른 나무 중 어디인지 Claude 에게 알립니다. 처음엔 꺼짐.
- **정리** — 남은 자료: 보관한 세션이 임시 폴더에 남긴 스크래치 폴더(`.md` 가 아직 가리키는 것은 뺌). [설정]을 열 때 10분에 한 번 셉니다. ▸ 로 큰 것부터 봅니다. **휴지통으로** 는 먼저 묻고 Windows 휴지통으로 옮깁니다 — 휴지통에서 되돌릴 수 있습니다. 휴지통이 바로 지우게 설정됐거나 넘치게 되면 옮기지 않습니다.

## 알아 둘 것

- **권한 모드에 따라 다릅니다.** 앱을 바꾸는 단추(고정 · 보관 · 떼어 내기 · 내보내기 · Remote Control 켜기 · 끄기 · 보내기)는 **Bypass permissions** 세션에서만 바로 처리합니다. 다른 모드에선 입력창에 한 줄 부탁 글을 넣고(다시 누르면 뺌), 그 글을 보내야 처리됩니다.
- **모든 것이 내 PC 안에서 돕니다.** 이지 세션은 네트워크 요청을 하지 않습니다. 세션 사이 메시지는 이 PC 의 데스크톱 앱 세션 메시지 길로 갑니다.
- **화면은 모든 세션에 걸립니다(터미널 세션 포함).** PC · 태블릿 · 폰을 고르면 보내는 글마다 그 기기에 맞춰 답하라는 줄이 Claude 에게 붙습니다. 태블릿 · 폰이면 고르기 카드 · 그림 위젯을 막아 글로 묻게 합니다. 「쓰지 않음」(처음 값)이면 아무것도 붙지 않습니다.
- **금액은 고정 단가로 낸 어림입니다.** 구독 요금제라면 요청이 얼마나 무거운지를 보는 값으로 읽으세요.
- **제목 꼴:** 인계는 새 세션 제목이 다음 차수일 때 알아봅니다(`… 2차` → `… 3차`). 곁가지의 진행판 끝 줄은 `- MM-DD [이름] 끝: …` 꼴입니다.
- **[이지 컴팩트](https://github.com/JaeSeongHa5280/easy-compact)와 같이 쓰면:** advisor 횟수가 이지 컴팩트와 같아지고 금액도 보입니다 — 이지 컴팩트가 적는 작은 파일을 읽습니다. 입력창 위 여러 줄 가운데 이지 세션 줄이 맨 위에 옵니다.

## 문제가 생기면 — 제보

[이슈](https://github.com/JaeSeongHa5280/easy-session/issues)에 적을 것: 증상 · 재현 순서, 이지 세션 버전(`claude plugin list`), Claude Code 버전(`/status`), OS, 그 세션의 권한 모드. 패널 화면 캡처가 있으면 좋습니다. 이지 세션은 진단 파일을 만들지 않습니다. 스스로 밖으로 보내는 것도 없습니다.

## 라이선스

[MIT](LICENSE)
