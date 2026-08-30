# 贡献指南

## 环境要求

| 工具 | 版本                       |
| ---- | -------------------------- |
| Node | `>=22.12.0`（见 `.nvmrc`） |
| pnpm | `>=11.0.0`                 |

仓库通过 `preinstall` 钩子强制使用 pnpm，请勿使用 npm / yarn。

```bash
pnpm install
pnpm dev          # 示例站 → http://localhost:9527
pnpm docs:dev     # VitePress 文档
```

### 使用镜像源

仓库的 `.npmrc` **不设置 registry**，一律走官方 npm。装包慢请配到自己的全局配置里：

```bash
npm config set registry https://registry.npmmirror.com/ --location=global
```

不要把镜像写回仓库 `.npmrc`：`registry.npmmirror.com` 是只读镜像，没有 advisories
端点，一旦写进项目级配置，`pnpm audit` 会对所有人失效（`ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`），
发布链路也得靠额外步骤绕开它。

> 注意作用域级配置（如 `@yanivjs:registry`）**优先级高于** `pnpm publish --registry`，
> 本地手动发布前先确认 `pnpm config get @yanivjs:registry` 的值。

## 提交前必须通过

```bash
pnpm run verify
```

等价于 `typecheck` + `test:coverage` + `lint` + `lint:style` + `format:check`。
CI 会跑同一套加上 `build` 与 Playwright E2E。

改动构建配置（`vite.config.ts` / `package.json#exports`）时还要跑产物自检：

```bash
pnpm run build:check      # = build + scripts/check-dist-entries.mjs
```

它会按 `exports` 逐条件**真实加载**每个入口（`import` 走 `import()`、`require` 走
`require()`）。只检查文件存在是不够的——CJS 侧曾因为后缀与 interop 两处配置问题
整个打穿，而文件一直都在。

`husky` 已挂 `pre-commit`（lint-staged）与 `commit-msg`（commitlint）。

## 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat(scope): 摘要
fix(core): 修复 session 重建时内容丢失
docs: 补充 z-index 说明
```

破坏性变更需在 body 中写 `BREAKING CHANGE:`，并在 `CHANGELOG.md` 的
`BREAKING CHANGES` 段落顶部登记。

## 分支

在哪个分支改就在哪个分支提交，不要为了提交单独开分支。

## 架构约定（改代码前必读）

`ARCHITECTURE.md` 是分层设计的唯一依据。几条硬约束：

| 层           | 允许                                         | 禁止                                      |
| ------------ | -------------------------------------------- | ----------------------------------------- |
| **Shell**    | 布局、slot、expose、BlockMenuHost 注册       | `initEditor`、散落 watch、命令式 DOM      |
| **Runtime**  | 从 props 推导 profile / chromePolicy / gates | Tiptap 实例操作、`window`/`document` 访问 |
| **Session**  | sessionKey 重建、phase 切换、受控内容同步    | UI 显隐逻辑                               |
| **Registry** | 能力定义 → 扩展 + toolbar + chrome 映射      | 从 `@/components` import 运行时值         |

补充约定：

1. **禁止模块级可变状态。** 库要支持同页多实例，`let x = ...` 形式的模块级配置会让实例
   互相覆盖（历史上 outline `scrollParent` 与 AI `hostConfig` 都踩过）。用 provide/inject
   或 owner 键控注册表。
2. **默认 preset 关闭的能力必须动态 import。** 见 `src/capabilities/registry.ts` 文件头。
   CI 有断言检查门控能力没有回流到主 chunk。
3. **URL 一律过白名单。** 链接 / 媒体 / iframe 分别用 `normalizeSafeUrl` /
   `normalizeSafeMediaUrl` / `normalizeSafeFrameUrl`，不要新增绕过路径。
4. **新增文案必须同时补 `zh-CN` 与 `en-US` 以及 `locales/types.ts`。**
   `localeParity.test.ts` 会校验两边 key 完全一致且无空值。
5. **交互元素用原生语义标签。** `div` + `@click` 会被 `vuejs-accessibility` 拦下；
   确有必要时用 `eslint-disable-next-line` 并写明理由。

## 测试

- 单测：`src/**/*.test.ts`（vitest + jsdom）。纯函数与扩展行为优先。
- 组件测试：`@vue/test-utils`，覆盖 gate 过滤、条件渲染与无障碍属性。
- E2E：`e2e/*.spec.ts`（Playwright，chromium）。

覆盖率阈值配置在 `vitest.config.ts`，不要为了让 CI 通过而下调阈值。

## 发布

见 `PUBLISH.md`。`prepublishOnly` 会自动构建。
