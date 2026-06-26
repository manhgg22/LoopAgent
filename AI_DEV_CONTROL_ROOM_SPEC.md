# AI Dev Control Room — Product & Build Spec for Claude Code

> Mục tiêu: build một hệ điều phối nhiều AI coding agent kiểu “control room”, lấy cảm hứng từ các ý tưởng: nhiều terminal/tile, agent roles, goal loop, codebase harness, verifier, human approval.  
> Sản phẩm này là **hệ riêng của mình**, không dùng branding/tên/asset của Nyx. Gọi tạm là **AI Dev Control Room**.

---

## 0. Tóm tắt cho Claude Code

Hãy build một app desktop/local để người dùng có thể:

1. Mở nhiều terminal trong cùng một workspace.
2. Gán vai trò cho từng terminal/agent: **Builder, Tester, Reviewer, Server, Verifier**.
3. Chạy Claude Code, Codex hoặc terminal command trong từng tile.
4. Nhập task theo format **Goal Contract**.
5. Cho Builder sửa code, Tester kiểm tra, Verifier chạy `scripts/verify.ps1`, Reviewer đọc diff.
6. Hiển thị log realtime, trạng thái task, số vòng loop, kết quả PASS/FAIL.
7. Không cho agent tự merge/deploy. Người thật duyệt cuối.

Công thức sản phẩm:

```text
AI Dev Control Room
= Multi-terminal workspace
+ Agent roles
+ Goal loop
+ Codebase harness
+ Verifier
+ Human approval
```

---

## 1. Các source đã học và thứ cần nhặt lại

### 1.1 getnyx.dev

**Ý chính học được:**

Nyx là một “mission control” cho AI coding agents. Nó cho phép mở nhiều terminal/agent/tile trong một màn hình để người dùng điều phối nhiều Claude/Codex/Gemini/terminal cùng lúc.

**Thứ cần nhặt cho sản phẩm của mình:**

```text
- Canvas nhiều tile
- Terminal thật bằng PTY
- Agent tile cho Claude/Codex
- Todo/Goal panel
- Browser tile sau này
- Diff viewer
- Worktree isolation
- Status realtime
- Human control cuối cùng
```

**Áp dụng vào sản phẩm:**

Sản phẩm của mình cần có một màn hình chính dạng control room:

```text
Workspace Canvas
├── Builder Terminal
├── Tester Terminal
├── Reviewer Terminal
├── Server Terminal
├── Verify Terminal
├── Goal/Task Panel
├── Log Viewer
└── Diff Viewer
```

---

### 1.2 YouTube `1HkqTlXbQmQ` — Codebase Harness / Crabbox / Loop Engineer

**Ý chính học được:**

Trước khi cho AI sửa code, repo phải “agent-ready”. Tức là agent phải biết:

```text
- Repo dùng công nghệ gì
- Chạy dev bằng lệnh nào
- Test bằng lệnh nào
- Verify bằng lệnh nào
- File nào được sửa
- Khi nào coi là xong
- Khi nào phải dừng
```

**Thứ cần nhặt: Codebase Harness**

Mỗi repo nên có:

```text
AGENTS.md
CLAUDE.md
scripts/dev.ps1
scripts/test.ps1
scripts/verify.ps1
loops/dev-fix-loop/CONTRACT.md
loops/dev-fix-loop/RUNBOOK.md
loops/dev-fix-loop/VERIFIER.md
logs/GLOBAL_WORK_LOG.md
artifacts/tasks/
artifacts/reports/
artifacts/evidence/
```

**Crabbox:** là sandbox/test box nâng cao. Chưa làm trong MVP. Để phase sau.

---

### 1.3 YouTube `W6x-hb44C0c` — Loop Engineer

**Ý chính học được:**

Không chỉ prompt AI từng câu, mà phải cho AI chạy theo vòng lặp:

```text
trigger → read context → plan → execute → verify → report → repeat if needed
```

Với Dev Workflow:

```text
Giao task
→ Builder sửa
→ Tester test
→ Verifier chạy verify
→ Nếu fail thì Builder sửa tiếp
→ Reviewer review
→ Bạn duyệt
```

**Thứ cần nhặt: Goal Loop Manager**

Loop phải có:

```text
- Goal rõ ràng
- Scope rõ ràng
- DO NOT rõ ràng
- Verify rõ ràng
- Done When rõ ràng
- Max loop rõ ràng
- Stop condition rõ ràng
```

**Bài học quan trọng:**

```text
Verifier quan trọng hơn prompt.
```

Không được để agent nói “xong rồi” nếu chưa chạy verify/test.

---

### 1.4 X Matt Van Horn — 15 AI loops thực chiến

**Ý chính học được:**

Có nhiều loop thực tế. Với sản phẩm này, lấy 6 loop chính:

```text
1. Build-Test-Fix Loop
2. Verifier Loop
3. Harness Starter Loop
4. Plan-Generate-Verify-Fix Loop
5. Human Review Queue
6. Anti-Spin / Anti-Spiral Loop
```

**Áp dụng:**

```text
Build-Test-Fix:
Builder sửa → Tester test → lỗi thì trả về Builder → pass thì report.

Verifier Loop:
Verifier chạy verify.ps1 và đánh PASS/FAIL.

Harness Starter:
Kiểm tra repo có AGENTS.md, CLAUDE.md, scripts/verify.ps1 chưa.

Plan-Generate-Verify-Fix:
AI phải lập plan trước khi sửa.

Human Review Queue:
Người thật duyệt trước khi merge/deploy.

Anti-Spin:
Dừng nếu quá 5 vòng hoặc lỗi lặp lại.
```

---

## 2. Vision sản phẩm

### 2.1 Một câu mô tả

```text
AI Dev Control Room là một dashboard local/desktop để điều phối nhiều AI coding agent,
mở nhiều terminal trong một workspace, gán vai trò Builder/Tester/Reviewer,
chạy theo Goal Loop, kiểm tra bằng Verifier, và để người thật duyệt kết quả cuối.
```

### 2.2 Người dùng mục tiêu

Người dùng không cần quá technical nhưng muốn dùng AI coding agent có kiểm soát:

```text
- Mở project/repo
- Giao task
- Nhìn nhiều AI agent làm việc
- Xem lỗi/log/test
- Duyệt kết quả cuối
```

### 2.3 Nguyên tắc sản phẩm

```text
1. Người thật là Controller.
2. Mỗi agent có một vai trò rõ ràng.
3. Không agent nào tự merge/deploy.
4. Không có verify thì chưa được coi là xong.
5. Có log/evidence cho mỗi task.
6. Nếu loop chạy quá lâu thì dừng và báo cáo.
```

---

## 3. MVP cần build trước

Không build tất cả ngay. MVP cần 6 phần:

```text
1. Workspace mở repo local
2. Nhiều terminal tile
3. Gán role Builder/Tester/Reviewer/Server/Verifier
4. Goal panel để giao task
5. Verify terminal chạy scripts/verify.ps1
6. Log/report cuối task
```

Chưa cần trong MVP:

```text
- Browser inspect
- Inline diff comments
- Crabbox sandbox
- Auto merge
- Composio
- gogcli
- Sales workflow
```

---

## 4. Tech stack đề xuất

Vì app cần chạy terminal thật trên Windows/local, ưu tiên:

```text
Desktop shell: Electron
Frontend: React + TypeScript + Vite
Terminal UI: xterm.js
PTY backend: node-pty
Realtime transport: Electron IPC hoặc WebSocket nội bộ
State: Zustand hoặc Redux Toolkit
Styling: Tailwind CSS
Git wrapper: simple-git hoặc child_process git command
Storage: SQLite hoặc local JSON trước
```

MVP đơn giản nhất:

```text
Electron + React + TypeScript + xterm.js + node-pty + local JSON storage
```

---

## 5. Kiến trúc tổng thể

```text
AI Dev Control Room
│
├── Electron Main Process
│   ├── Workspace Manager
│   ├── Terminal/PTY Manager
│   ├── Git Manager
│   ├── Verify Runner
│   ├── File/Log Manager
│   └── IPC API
│
├── React Renderer
│   ├── Workspace Screen
│   ├── Tile Canvas
│   ├── Terminal Tile
│   ├── Goal Panel
│   ├── Agent Role Panel
│   ├── Diff Viewer
│   ├── Log Viewer
│   └── Human Approval Panel
│
└── Local Project Repo
    ├── AGENTS.md
    ├── CLAUDE.md
    ├── scripts/verify.ps1
    ├── loops/dev-fix-loop/
    ├── artifacts/
    └── logs/
```

---

## 6. Các module cần code

### 6.1 Workspace Manager

**Mục tiêu:** quản lý project/repo local.

Chức năng:

```text
- Add Workspace
- Open Workspace
- Save repo path
- List recent workspaces
- Validate folder is git repo
- Show workspace status
```

Data:

```ts
type Workspace = {
  id: string;
  name: string;
  repoPath: string;
  createdAt: string;
  updatedAt: string;
};
```

---

### 6.2 Terminal Tile Manager

**Mục tiêu:** mở nhiều terminal trong một màn hình.

Chức năng:

```text
- Create terminal tile
- Set cwd
- Set startup command
- Stream stdout/stderr realtime
- Send user input
- Stop/restart terminal
- Rename tile
- Save tile layout
```

Data:

```ts
type TileRole = "builder" | "tester" | "reviewer" | "server" | "verifier" | "plain";

type TerminalTile = {
  id: string;
  workspaceId: string;
  title: string;
  role: TileRole;
  cwd: string;
  command?: string;
  status: "idle" | "running" | "stopped" | "error";
  createdAt: string;
};
```

Suggested tile presets:

```text
Builder Terminal:
- role: builder
- command: claude

Tester Terminal:
- role: tester
- command: codex hoặc powershell

Reviewer Terminal:
- role: reviewer
- command: claude hoặc codex

Server Terminal:
- role: server
- command: .\scripts\dev.ps1

Verify Terminal:
- role: verifier
- command: powershell
```

---

### 6.3 Agent Role Manager

**Mục tiêu:** mỗi terminal/agent có vai trò rõ ràng.

Roles:

```text
Builder:
- Sửa code chính
- Không tự merge
- Không sửa ngoài scope
- Phải báo cáo file đã sửa

Tester:
- Viết/chạy test
- Tìm lỗi
- Không sửa implementation chính nếu chưa được yêu cầu

Reviewer:
- Đọc diff
- Bắt lỗi logic/scope/security
- Approve hoặc Needs Changes

Server:
- Chạy app/dev server
- Không sửa code

Verifier:
- Chạy scripts/verify.ps1
- Đánh PASS/FAIL
- Lưu evidence
```

Role prompt mẫu nên lưu trong app để copy/gửi vào terminal.

---

### 6.4 Goal / Task Panel

**Mục tiêu:** người dùng nhập task theo format chuẩn.

Data:

```ts
type DevTask = {
  id: string;
  workspaceId: string;
  title: string;
  goal: string;
  scope: string;
  doNot: string;
  verify: string;
  doneWhen: string;
  maxLoop: number;
  status: "draft" | "planned" | "running" | "needs_changes" | "verify_failed" | "ready_for_review" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};
```

UI fields:

```text
TASK
GOAL
SCOPE
DO NOT
VERIFY
DONE WHEN
MAX LOOP
```

Mẫu task:

```text
TASK:
Fix backend lanes API đang bị 404.

GOAL:
Các endpoint sau hoạt động:
- POST /api/lanes/:id/up
- POST /api/lanes/:id/down
- POST /api/lanes

SCOPE:
Chỉ sửa backend routes/controller/service liên quan đến lanes.

DO NOT:
Không sửa UI nếu không cần.
Không đổi database schema nếu chưa hỏi.
Không xóa dữ liệu.
Không sửa .env thật.
Không commit secret/API key/token.
Không tự merge.

VERIFY:
Chạy .\scripts\verify.ps1
Nếu server chạy được, kiểm tra 3 endpoint không còn 404.

DONE WHEN:
- Không còn 404
- Verify pass
- Có danh sách file đã sửa
- Có bằng chứng lệnh đã chạy
- Có final report

MAX LOOP:
5
```

---

### 6.5 Loop Manager

**Mục tiêu:** theo dõi trạng thái vòng lặp.

Loop stages:

```text
Draft
→ Planning
→ Building
→ Testing
→ Fixing
→ Verifying
→ Reviewing
→ Ready for Human Approval
→ Approved / Rejected
```

Data:

```ts
type LoopRun = {
  id: string;
  taskId: string;
  iteration: number;
  stage: "planning" | "building" | "testing" | "fixing" | "verifying" | "reviewing" | "reporting";
  status: "running" | "passed" | "failed" | "stopped";
  startedAt: string;
  endedAt?: string;
  summary?: string;
};
```

Rules:

```text
- Max loop mặc định: 5
- Nếu verify fail, tăng iteration
- Nếu quá max loop, stop task và yêu cầu human review
- Nếu cùng một lỗi lặp lại 2 lần, stop và báo cáo Anti-Spin
```

---

### 6.6 Verifier Runner

**Mục tiêu:** chạy kiểm tra chuẩn.

Chức năng:

```text
- Detect scripts/verify.ps1
- Nếu có thì chạy
- Nếu không có thì báo thiếu harness
- Stream output
- Lưu output vào artifacts/evidence/
- Mark PASS/FAIL
```

Data:

```ts
type VerifyResult = {
  id: string;
  taskId: string;
  command: string;
  exitCode: number;
  status: "pass" | "fail";
  outputPath: string;
  startedAt: string;
  endedAt: string;
};
```

Rule:

```text
Không có VerifyResult PASS thì task không được coi là done.
```

---

### 6.7 Diff Viewer

**Mục tiêu:** người dùng và Reviewer xem thay đổi code.

Chức năng MVP:

```text
- Run git status
- Run git diff
- Show changed files
- Show diff text
```

Phase sau:

```text
- Inline comments
- Reviewer approval per file
- Send comment back to Builder
```

---

### 6.8 Log & Evidence Manager

**Mục tiêu:** lưu bằng chứng.

Folder đề xuất trong repo:

```text
artifacts/
  tasks/
  reports/
  evidence/

logs/
  GLOBAL_WORK_LOG.md
```

Evidence cần lưu:

```text
- Terminal output quan trọng
- Verify output
- Diff snapshot
- Final report
- Reviewer result
```

---

### 6.9 Human Approval Queue

**Mục tiêu:** người thật duyệt cuối.

UI hiển thị:

```text
- Task summary
- Files changed
- Verify result
- Reviewer result
- Remaining risks
```

Actions:

```text
Approve
Request Changes
Reject
Mark as Merged Manually
```

Rule:

```text
Agent không tự merge/deploy trong MVP.
```

---

## 7. Codebase Harness cần tự tạo cho mỗi repo

App nên có nút:

```text
Setup Harness
```

Nút này kiểm tra và tạo các file nếu thiếu:

```text
AGENTS.md
CLAUDE.md
scripts/dev.ps1
scripts/test.ps1
scripts/verify.ps1
loops/dev-fix-loop/CONTRACT.md
loops/dev-fix-loop/RUNBOOK.md
loops/dev-fix-loop/VERIFIER.md
logs/GLOBAL_WORK_LOG.md
artifacts/tasks/README.md
artifacts/reports/README.md
artifacts/evidence/README.md
```

---

## 8. Nội dung template cho AGENTS.md

Tạo file `AGENTS.md` trong repo target:

```md
# AGENTS.md

## Project Overview

This repo is managed by AI Dev Control Room. Multiple AI agents may work on tasks, but every task must follow the Dev Fix Loop.

## Agent Roles

### Builder
- Writes implementation code.
- Must stay inside task scope.
- Must not merge, deploy, or change production config.
- Must report files changed and commands run.

### Tester
- Writes or runs tests.
- Reports failures clearly.
- Must not change implementation unless explicitly requested.

### Reviewer
- Reviews diff and logic.
- Checks scope, safety, and verification evidence.
- Can approve or request changes, but must not merge.

### Verifier
- Runs `scripts/verify.ps1`.
- Produces PASS/FAIL result.
- Saves verification evidence.

## Safety Rules

- Do not edit real `.env` files.
- Do not commit API keys, tokens, cookies, credentials, or secrets.
- Do not delete data.
- Do not change database schema without asking.
- Do not merge or deploy without human approval.
- Do not claim completion without verification evidence.

## Definition of Done

A task is done only when:

- Code changes are complete.
- Tests or verify script have run.
- `scripts/verify.ps1` passes, or failure is clearly explained.
- Files changed are listed.
- Risks and remaining issues are documented.
- Human approves the final result.
```

---

## 9. Nội dung template cho CLAUDE.md

Tạo file `CLAUDE.md` trong repo target:

```md
# CLAUDE.md

## How Claude should work in this repo

You are working inside a controlled multi-agent dev workflow.

Before editing:

1. Read the task.
2. Read `AGENTS.md`.
3. Read `loops/dev-fix-loop/CONTRACT.md`.
4. Create a short plan.
5. Confirm files likely to be changed.

While editing:

1. Stay inside task scope.
2. Prefer small, reversible changes.
3. Do not touch secrets or production config.
4. Do not merge or deploy.

After editing:

1. Run relevant tests if available.
2. Run `scripts/verify.ps1` if possible.
3. Prepare a final report.

## Final Report Format

```text
DEV TASK REPORT

Status:
PASS / FAIL / PARTIAL

Summary:
...

Files changed:
- ...

Commands run:
- ...

Verification:
- ...

Evidence:
- ...

Risks / Remaining issues:
- ...

Next step:
...
```

## Stop Conditions

Stop and ask the human if:

- The task requires changing database schema.
- The task requires production credentials.
- The task requires changing deployment config.
- The task is outside the provided scope.
- The same error repeats more than twice.
- The task exceeds 5 fix loops.
```

---

## 10. Nội dung template cho CONTRACT.md

Tạo file `loops/dev-fix-loop/CONTRACT.md`:

```md
# Dev Fix Loop Contract

## Purpose

The Dev Fix Loop is used to complete coding tasks safely through a repeated cycle:

```text
Plan → Build → Test → Fix → Verify → Review → Human Approval
```

## Roles

- Controller: human who assigns task and approves final result.
- Builder: AI agent that edits implementation.
- Tester: AI agent or terminal that tests behavior.
- Reviewer: AI agent that reviews diff and risks.
- Verifier: terminal/script that runs verification.

## Completion Conditions

A task is complete only when:

- Scope is satisfied.
- Verification passes or failure is documented.
- Diff is reviewed.
- Final report is produced.
- Human approves.

## Hard Limits

- Maximum 5 fix iterations.
- Stop if same error repeats twice.
- Stop if change requires secrets, production config, or database migration.
- Stop if task scope becomes unclear.

## Forbidden Actions

- No auto-merge.
- No auto-deploy.
- No secret editing.
- No deleting data.
- No changing production config.
```

---

## 11. Nội dung template cho RUNBOOK.md

Tạo file `loops/dev-fix-loop/RUNBOOK.md`:

```md
# Dev Fix Loop Runbook

## Step 1 — Controller creates task

Task must include:

- TASK
- GOAL
- SCOPE
- DO NOT
- VERIFY
- DONE WHEN
- MAX LOOP

## Step 2 — Builder plans

Builder reads:

- `AGENTS.md`
- `CLAUDE.md`
- `CONTRACT.md`
- task details

Builder produces a short plan before editing.

## Step 3 — Builder edits code

Builder changes only files required by the task.

## Step 4 — Tester tests

Tester runs tests or creates a checklist.

## Step 5 — Verifier runs verify

Run:

```powershell
.\scripts\verify.ps1
```

## Step 6 — Fix if failed

If verification fails, send error back to Builder.

## Step 7 — Reviewer reviews diff

Reviewer checks:

- Scope
- Logic
- Risk
- Secrets
- Test evidence

## Step 8 — Human approval

Human chooses:

- Approve
- Request changes
- Reject
```

---

## 12. Nội dung template cho VERIFIER.md

Tạo file `loops/dev-fix-loop/VERIFIER.md`:

```md
# Verifier Rules

## Required checks

- Dependency install is valid.
- Tests pass if tests exist.
- Lint/typecheck pass if configured.
- Build passes if configured.
- API endpoints work if task touches backend.
- UI manually checked if task touches frontend.
- No secrets are added.
- No files outside scope are changed.

## PASS condition

Verifier can mark PASS only if:

- Main verify command exits successfully.
- No blocking errors remain.
- Evidence is saved.

## FAIL condition

Verifier must mark FAIL if:

- Tests fail.
- Build fails.
- Task goal is not met.
- Secret risk is found.
- Agent modified files outside scope.
```

---

## 13. scripts/verify.ps1 MVP

Tạo file `scripts/verify.ps1`:

```powershell
$ErrorActionPreference = "Stop"

Write-Host "=== AI Dev Control Room Verify ==="

$root = Get-Location
Write-Host "Repo: $root"

$passed = $true

function Run-Step {
    param(
        [string]$Name,
        [string]$Command
    )

    Write-Host ""
    Write-Host ">>> $Name"
    Write-Host "$Command"

    try {
        Invoke-Expression $Command
        Write-Host "PASS: $Name"
    }
    catch {
        Write-Host "FAIL: $Name"
        Write-Host $_
        $script:passed = $false
    }
}

if (Test-Path "package.json") {
    Write-Host "Detected Node project"

    if (Test-Path "pnpm-lock.yaml") {
        $pm = "pnpm"
    }
    elseif (Test-Path "yarn.lock") {
        $pm = "yarn"
    }
    else {
        $pm = "npm"
    }

    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    $scripts = $pkg.scripts

    if ($scripts.test) {
        Run-Step "Test" "$pm test"
    }

    if ($scripts.lint) {
        Run-Step "Lint" "$pm run lint"
    }

    if ($scripts.typecheck) {
        Run-Step "Typecheck" "$pm run typecheck"
    }

    if ($scripts.build) {
        Run-Step "Build" "$pm run build"
    }
}
elseif (Test-Path "pyproject.toml" -or Test-Path "requirements.txt") {
    Write-Host "Detected Python project"

    if (Get-Command pytest -ErrorAction SilentlyContinue) {
        Run-Step "Pytest" "pytest"
    }
    else {
        Run-Step "Python compile check" "python -m compileall ."
    }
}
else {
    Write-Host "No known project type detected. Running basic git check only."
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    Run-Step "Git status" "git status --short"
}

Write-Host ""
if ($passed) {
    Write-Host "=== VERIFY PASS ==="
    exit 0
}
else {
    Write-Host "=== VERIFY FAIL ==="
    exit 1
}
```

---

## 14. Role prompts để app copy vào terminal

### 14.1 Builder Prompt

```text
ROLE:
Bạn là Builder Agent trong AI Dev Control Room.

GOAL:
{goal}

TASK:
{task}

SCOPE:
{scope}

DO NOT:
{doNot}

LOOP:
1. Đọc AGENTS.md và CLAUDE.md.
2. Đọc loops/dev-fix-loop/CONTRACT.md.
3. Lập plan ngắn.
4. Sửa code trong scope.
5. Chạy test/verify nếu có.
6. Nếu lỗi thì sửa tiếp.
7. Dừng sau tối đa {maxLoop} vòng.

VERIFY:
{verify}

DONE WHEN:
{doneWhen}

FINAL REPORT:
Trả về:
1. Status: PASS / FAIL / PARTIAL
2. Summary
3. Files changed
4. Commands run
5. Verification result
6. Risks / Remaining issues
7. Next step

RULES:
- Không tự merge.
- Không tự deploy.
- Không sửa .env thật.
- Không commit secret/token/API key.
- Nếu cần đổi schema/config production thì hỏi người dùng.
```

---

### 14.2 Tester Prompt

```text
ROLE:
Bạn là Tester Agent trong AI Dev Control Room.

GOAL:
Kiểm tra task và tìm lỗi.

TASK:
{task}

SCOPE:
Chỉ sửa file test hoặc script verify nếu cần.
Không sửa implementation chính trừ khi được yêu cầu.

VERIFY:
1. Tìm test framework hiện có.
2. Chạy test liên quan.
3. Nếu thiếu test, tạo checklist kiểm tra.
4. Chạy scripts/verify.ps1 nếu có.
5. Báo lỗi rõ cho Builder.

FINAL REPORT:
1. Test/checklist đã chạy
2. Commands run
3. Result
4. Bugs found
5. Recommendation for Builder
```

---

### 14.3 Reviewer Prompt

```text
ROLE:
Bạn là Reviewer Agent trong AI Dev Control Room.

GOAL:
Review thay đổi code cho task.

CHECK:
- Có đúng yêu cầu không?
- Có sửa ngoài scope không?
- Có hardcode secret không?
- Có rủi ro mất dữ liệu không?
- Có test/verify evidence không?
- Có thể gây lỗi route/module khác không?

DO NOT:
- Không tự sửa code nếu chưa được yêu cầu.
- Không merge.
- Không approve nếu chưa có verify evidence.

OUTPUT:
1. Approved / Needs changes
2. Blocking issues
3. Non-blocking suggestions
4. Files inspected
5. Required fixes
```

---

## 15. UI layout đề xuất

Màn hình chính:

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: Workspace name | Repo path | Git branch | Status       │
├──────────────────────────────────────────────────────────────┤
│ Left Sidebar                                                  │
│ - Workspaces                                                  │
│ - Tasks                                                       │
│ - Agents                                                      │
│ - Reports                                                     │
├───────────────┬───────────────────────────────┬──────────────┤
│ Goal Panel    │ Tile Canvas                    │ Status Panel │
│               │ ┌──────────┐ ┌──────────────┐ │              │
│ TASK          │ │ Builder  │ │ Tester       │ │ Loop stage   │
│ GOAL          │ │ Terminal │ │ Terminal     │ │ Iteration    │
│ SCOPE         │ └──────────┘ └──────────────┘ │ Verify       │
│ DO NOT        │ ┌──────────┐ ┌──────────────┐ │ Review       │
│ DONE WHEN     │ │ Server   │ │ Verifier     │ │ Approval     │
│ Send to agent │ └──────────┘ └──────────────┘ │              │
├───────────────┴───────────────────────────────┴──────────────┤
│ Bottom: Diff Viewer / Logs / Evidence / Final Report          │
└──────────────────────────────────────────────────────────────┘
```

---

## 16. Development phases

### Phase 1 — Local terminal control room

Build:

```text
- Electron app
- Add workspace
- Create terminal tile
- Run commands
- Stream output
- Save tile config
```

Done when:

```text
Người dùng mở được 3 terminal trong một app và chạy lệnh độc lập.
```

---

### Phase 2 — Agent roles + presets

Build:

```text
- Role selector
- Builder/Tester/Reviewer/Server/Verifier presets
- Startup command per role
- Prompt copy button
```

Done when:

```text
Người dùng tạo được 5 tile với role rõ ràng.
```

---

### Phase 3 — Goal panel + task state

Build:

```text
- Task form
- Save task
- Send/copy task prompt to selected agent
- Track task status
```

Done when:

```text
Người dùng nhập task và gửi prompt chuẩn cho Builder.
```

---

### Phase 4 — Verify runner

Build:

```text
- Detect scripts/verify.ps1
- Run verify
- Show PASS/FAIL
- Save evidence
```

Done when:

```text
Task có VerifyResult rõ ràng.
```

---

### Phase 5 — Git diff viewer

Build:

```text
- git status
- git diff
- changed file list
```

Done when:

```text
Người dùng xem được file nào đã thay đổi trước khi approve.
```

---

### Phase 6 — Human approval

Build:

```text
- Ready for Review state
- Approve / Request changes / Reject
- Final report view
```

Done when:

```text
Task chỉ được complete sau khi human approve.
```

---

## 17. Non-goals cho MVP

Không làm trong MVP:

```text
- Auto merge
- Auto deploy
- Cloud sandbox / Crabbox
- Browser inspect
- Composio
- Google Workspace
- Sales lead workflow
- Multi-user collaboration
- Remote agent execution
```

---

## 18. Security & safety rules

App phải tuân thủ:

```text
- Không lưu secret nếu không cần.
- Không tự đọc file .env để gửi vào model.
- Không tự merge/deploy.
- Không tự chạy destructive command như rm -rf, format, drop database.
- Với command nguy hiểm phải hỏi người dùng.
- Luôn hiển thị cwd của terminal để tránh chạy nhầm folder.
- Luôn lưu log của verify.
```

Commands cần cảnh báo trước khi chạy:

```text
git reset --hard
git clean -fd
rm -rf
del /s
drop database
docker system prune
npm publish
git push --force
deploy command
```

---

## 19. Definition of Done cho app MVP

MVP được coi là xong khi:

```text
1. Mở được app local.
2. Add được workspace repo path.
3. Tạo được nhiều terminal tile.
4. Mỗi tile chạy được command riêng.
5. Gán được role Builder/Tester/Reviewer/Server/Verifier.
6. Nhập được task theo Goal Contract.
7. Copy/send được role prompt vào terminal.
8. Chạy được scripts/verify.ps1 từ app.
9. Hiển thị PASS/FAIL.
10. Hiển thị git status/diff.
11. Có nút Human Approval.
12. Lưu được report/evidence local.
```

---

## 20. Prompt tổng để đưa cho Claude Code build project

Dùng prompt này trong Claude Code:

```text
Bạn là senior full-stack engineer. Hãy build MVP cho sản phẩm “AI Dev Control Room”.

Mục tiêu:
Build một desktop/local app để điều phối nhiều AI coding agent bằng nhiều terminal tile, có role Builder/Tester/Reviewer/Server/Verifier, có Goal Panel, có Verify Runner, có Git Diff Viewer và Human Approval.

Tech stack ưu tiên:
- Electron
- React
- TypeScript
- Vite
- xterm.js
- node-pty
- Tailwind CSS
- local JSON storage hoặc SQLite nhẹ

Core requirements:
1. Add/Open Workspace bằng repo path.
2. Tạo nhiều terminal tile trong một màn hình.
3. Mỗi terminal tile có:
   - title
   - role
   - cwd
   - command
   - status
   - realtime output
   - input support
4. Role presets:
   - Builder
   - Tester
   - Reviewer
   - Server
   - Verifier
5. Goal Panel gồm:
   - TASK
   - GOAL
   - SCOPE
   - DO NOT
   - VERIFY
   - DONE WHEN
   - MAX LOOP
6. Có nút generate/copy prompt cho Builder/Tester/Reviewer.
7. Verify Runner:
   - detect scripts/verify.ps1
   - chạy verify
   - hiển thị PASS/FAIL
   - lưu output vào artifacts/evidence nếu có workspace
8. Git Diff Viewer:
   - git status
   - git diff
   - changed file list
9. Human Approval:
   - Approve
   - Request Changes
   - Reject
10. Không auto merge/deploy.

Build theo phase:
Phase 1: scaffold app + terminal tile chạy được.
Phase 2: workspace manager + multiple tiles.
Phase 3: role presets + goal panel.
Phase 4: verify runner.
Phase 5: git diff viewer.
Phase 6: approval/report.

Quy tắc:
- Không dùng branding/tên/asset của Nyx.
- Không tự thêm cloud service.
- Không làm auth/login trong MVP.
- Không làm sales workflow.
- Code phải chạy được trên Windows.
- Viết README hướng dẫn chạy.
- Sau mỗi phase, báo cáo file đã tạo/sửa và cách test.
```

---

## 21. Prompt setup Codebase Harness cho repo bất kỳ

Sau khi app chạy được, cần có chức năng hoặc prompt để setup harness trong repo target:

```text
Bạn hãy setup Dev Workflow Harness cho repo này.

Mục tiêu:
Repo này phải sẵn sàng cho mô hình nhiều agent chạy song song theo Goal Loop:
Controller → Builder → Tester → Reviewer → Verifier → Human Approve.

Hãy tạo/cập nhật:

1. AGENTS.md
2. CLAUDE.md
3. loops/dev-fix-loop/CONTRACT.md
4. loops/dev-fix-loop/RUNBOOK.md
5. loops/dev-fix-loop/VERIFIER.md
6. scripts/verify.ps1
7. scripts/test.ps1
8. scripts/dev.ps1
9. artifacts/tasks/README.md
10. artifacts/reports/README.md
11. artifacts/evidence/README.md
12. logs/GLOBAL_WORK_LOG.md

Yêu cầu:
- Không sửa logic app hiện tại nếu chưa cần.
- Chỉ tạo harness file và script.
- scripts/verify.ps1 phải tự phát hiện Node/Python nếu có.
- Không động vào .env thật.
- Không commit secret.

Sau khi làm xong, báo cáo:
- file đã tạo/sửa
- cách chạy dev
- cách chạy verify
- workflow nhiều terminal nên mở như thế nào
```

---

## 22. Kết luận

Sản phẩm cần build không chỉ là terminal dashboard.

Nó là:

```text
AI Dev Control Room
= nhiều terminal
+ nhiều agent role
+ task goal contract
+ vòng lặp build-test-fix
+ verifier
+ diff review
+ human approval
```

Ưu tiên build MVP theo đúng thứ tự:

```text
1. Terminal tile chạy được
2. Workspace repo path
3. Role presets
4. Goal panel
5. Verify runner
6. Git diff viewer
7. Human approval
```

Sau MVP mới tính:

```text
- Browser tile
- Worktree manager
- Crabbox sandbox
- GitHub issue/PR
- Composio/gogcli
- Sales workflow
```
