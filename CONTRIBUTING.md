# 贡献指南 & 提交规范（Conventional Commits）

欢迎为 AI-Travel-Planner 做贡献。为保持历史可读性与自动化（例如自动生成 changelog、触发 CI/CD），请采用 Conventional Commits 规范。

## 1. 规范简介

提交信息格式：

<type>(<scope>): <subject>

可选 body

可选 footer

常用 type：
- feat: 新功能
- fix: 修复 bug
- docs: 文档变更
- style: 代码风格（不影响功能）
- refactor: 重构（既不是 fix 也不是 feat）
- perf: 性能优化
- test: 添加/修改测试
- chores: 构建/脚手架/依赖相关
- ci: 持续集成配置变更

scope：可选，表示改动影响的模块，如 `auth`, `ui`, `api`, `map` 等

subject：简短描述，尽量使用英文原始形式或中英混合，保持动词时态为现在时

示例：
- feat(auth): add supabase email sign-up
- fix(map): correct marker clustering on zoom
- docs: add PRD and contributing guide

## 2. 项目建议的 scope 列表

- init、repo
- ui 或 frontend
- auth
- api
- l10n
- map
- voice
- store
- ci
- docs
- test

## 3. 推荐工作流

1. 在 `main` 上创建 feature 分支：`feature/<短描述>` 或 `fix/<短描述>`
2. 每一项独立改动做为一个 commit，使用 Conventional Commits 格式
3. 提交并 push 到远程分支，发起 Pull Request 到 `main`（或 `develop`，若团队启用）
4. PR 描述包含变更点、测试步骤与截图（如果有）

## 4. 提交钩子 & CI（建议）

- 使用 `commitlint` + `husky` 在本地校验 commit message 格式
- CI（GitHub Actions）在 PR 中运行：lint、类型检查（如果使用 TypeScript）、单元测试、E2E（可选）

示例 GitHub Actions 流程：
- on: [push, pull_request]
- jobs:
  - lint
  - test
  - build

## 5. 初始提交示例序列（建议按顺序提交）

以下为建议的一系列小而单一职责的提交信息（均符合 Conventional Commits），用于将项目从空仓库逐步建立起：

1. chore(repo): init repository with README and LICENSE
2. feat(repo): add vite + vue3 project scaffold
3. feat(ui): integrate element-plus and basic layout
4. feat(auth): add supabase auth config and login page stub
5. feat(state): add pinia store scaffolding
6. feat(router): add vue-router and base routes
7. feat(api): add Hunyuan-T1 service stub and prompt templates
8. feat(map): add gaode map component stub and API wrapper
9. feat(voice): add iflytek voice input component stub
10. feat(expense): add expense tracker scaffold
11. docs: add PRD.md
12. docs: add CONTRIBUTING.md
13. test: add vitest config and a sample unit test
14. ci: add GitHub Actions for lint & test
15. chore(deps): add eslint, prettier, commitlint and husky

将每一条作为独立 commit，可以清晰追踪每个子模块的变更。

## 6. 其他注意事项

- 提交前请确保代码能通过基本 lint 与测试
- 若大改动，建议先发一个 RFC 或在 PR 中详细说明设计方案

谢谢你的贡献！
