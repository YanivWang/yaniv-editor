# Changelog

## [Unreleased]

### Fixed

- **`require()` 加载本包彻底修复（CJS 侧此前完全不可用）。** 两处配置各自把 CJS 打穿，
  且都只在 require 侧暴露，ESM 侧一切正常，因此一直没被发现：
  1. `exports.require` 指向 `dist/index.js`，而本包是 `"type": "module"`——Node 把
     `dist/*.js` 一律按 ESM 解析，CJS 代码里的 `exports` 在 ESM 作用域下不存在，
     `require("@yanivjs/yaniv-editor")` 直接抛
     `ReferenceError: exports is not defined in ES module scope`。
     现改为 `.cjs` 后缀（`index.cjs` / `inline.cjs` / `ai.cjs`）。
  2. Rollup 默认 `output.interop: "default"` 假定 external 是纯 CJS、`module.exports`
     即默认导出；而 `@tiptap/*`、`ant-design-vue` 的 CJS 产物都带 `__esModule: true`，
     默认导出在 `.default` 上，于是 `CodeBlockLowlight.configure(...)` 在 require 侧抛
     `TypeError: X.configure is not a function`。现改为 `interop: "auto"`。
- **补齐 CJS 类型声明 `*.d.cts`。** `"type": "module"` 下 `.d.ts` 在 `node16` /
  `nodenext` 解析中一律视为 ESM 类型，`exports.require` 指回 `.d.ts` 会让 CJS 接入方
  报 `TS1479`。`exports` 同时改为 `import` / `require` 各自带 `types` 的标准双包形态，
  并补上 `"./package.json"` 子路径导出。
- **链接白名单不再吞掉锚点与站内相对地址。** `normalizeSafeUrl` 对无协议输入一律补
  `https://`，导致 `#docs` 被判为非法（Link 扩展据此**丢弃整个链接标记**，
  `<a href="#docs">` 解析后只剩纯文本），`/docs/page` 被补成指向外部主机 `docs` 的
  `https://docs/page`——站内链接被静默劫持到站外。现与同文件的 `normalizeSafeMediaUrl`
  对齐：`#` / `?` / `/` / `./` / `../` 原样保留，`//` 仍按协议相对的绝对地址处理。
  脚本类协议的拦截行为不变。
- **AI 悬浮层不再因过期位置崩溃。** `calculatePopoverPosition` 用会话开始时记下的
  `positionAnchor` 调 `view.coordsAtPos()`，用户在流式输出期间删减文档后该位置可能越界，
  抛 `RangeError: Position N out of range`，且调用链 `click → remountPopover →
mountPopover` 全程无人捕获。这与 `0.2.0` 已修的 `getAiSuggestionData` 是同一类问题，
  当时漏了这一处。现按文档大小夹取并兜底。点击回调里第二条分支的 `posAtDOM` 裸调用
  （只有第一条分支做了 try/catch）也一并收口。

### Security

- **媒体 src 白名单补齐 JSON 与命令两条入口。** `0.2.0` 在 `parseHTML` / `renderHTML`
  两侧接了 `normalizeSafeMediaUrl`，但这只覆盖 **DOM 边界**；JSON 内容与
  `setImage()` / `setVideo()` / `insertContent()` 根本不经过 DOM。由于 `renderHTML`
  会把**输出**洗干净，`getHTML()` 完全看不出异常（实测仍是 `<p><img></p>`），
  而危险值已经进了文档 attrs——`getJSON()` 这个公开 API 会把
  `src: "javascript:alert(1)"` 原样交给宿主，宿主持久化 JSON 后自行渲染即中招。
  现新增 `src/utils/mediaSrcPolicy.ts`，在两处补齐强制点：`adaptJsonToSchema`
  （所有 JSON 内容的唯一漏斗）与 `createMediaSrcGuardPlugin` 的 `appendTransaction`
  事务级兜底（补偿事务标记 `addToHistory: false`，避免撤销把危险值撤回来）。
  四条入口逐一断言见 `mediaSrcPolicy.test.ts`。

### Tests

对新增测试做变异测试（把源码改坏看测试是否变红），修补了发现的失效覆盖：

- **`video` 节点此前完全没有测试**，schema 层白名单删掉也全绿 → 新增 `video.test.ts`。
- **`resizableImage` 的 `parseHTML` 侧无覆盖**：原用例只断言 `getHTML()`，而 `renderHTML`
  那一侧的白名单会把输出洗干净，`parseHTML` 整个失效照样绿 → 改为断言节点 attrs 与 `getJSON()`。
- **`formatPainter` 退出编辑态自清无测试** → 新增 `formatPainter.test.ts`。
- **`bindLocale` 的用例是空断言**：`expect(en).toBeDefined()` 断言的是本用例刚创建的
  `vi.fn()` 存在，恒真；把 `bindLocale` 改回构建期绑定语义（即 `367dcb9` 要修的多实例串用）
  测试照样绿 → 改为断言弹层里真的用上了绑定的解析器。
- **`useRovingTabindex` 的 `MutationObserver` 重扫无覆盖**：短路掉 `observer.observe(...)`
  原有 6 个用例全绿，因为 `mountEditor` 会等到所有异步组件就绪才断言，掩盖了「按钮晚到」
  这个真实场景 → 新增挂载后追加控件的用例。
- **`div[onclick]` 那条无障碍断言恒真**：Vue 的 `@click` 编译成 addEventListener，不反射成
  `onclick` 内容属性（实测命中数恒为 0），该断言永远不会失败 → 改为断言「声明交互 role 的
  元素必须可聚焦」，原意图由 `eslint-plugin-vuejs-accessibility` 在 lint 阶段覆盖。
- 两条测试名与断言不符（斜杠菜单语义、查找替换输入框），改名对齐实际断言范围。
- `mountEditor` 的就绪预算 10s → 18s：原值只有 `testTimeout` 的一半，繁忙机器上编辑器
  还在解析十几个门控 chunk 时轮询就先放弃了，明明还剩 10s 没用。轮询一就绪即返回，
  健康机器上不受影响。

### Build / CI

- **`.npmrc` 不再把 registry 钉到 `registry.npmmirror.com`。** 国内镜像属于开发者个人
  环境（`~/.npmrc`），随开源库分发的代价是：`pnpm audit` 对所有人失效（镜像无
  advisories 端点）、发布链路要靠三层保险绕开、六个 CI job 各自 `sed` 改写该文件。
  移除后这些 workaround 一并删除，CI 回到「默认就是官方源」。镜像用法见 `CONTRIBUTING.md`。
- **产物断言换成真实加载自检**（`scripts/check-dist-entries.mjs`，`pnpm run build:check`）。
  旧断言只有 `test -s`（文件非空），上述两个 CJS 缺陷因此全程绿灯。新脚本按
  `package.json#exports` 逐条件 `import()` / `require()`，并校验声明文件后缀与条件自洽。
- **订正 registry 相关注释中的失实描述。** 实测 pnpm 11 **既不读 `NPM_CONFIG_REGISTRY`
  也不读 `npm_config_registry`**（npm 两个都读），此前把它当作"额外一层保险"是无效的。
  CI 走官方源的真正原因是：仓库 .npmrc 不设 registry、runner 无用户级配置，
  pnpm 落到内置默认源；发布链路的鉴权与源则由 `actions/setup-node` 写入的 user 级
  .npmrc 承担。该变量予以保留，但仅覆盖 `npx only-allow pnpm` 这类真正的 npm 调用。
- **发布前的 registry 断言补上作用域级检查。** 只查 `pnpm config get registry` 会漏掉
  `@yanivjs:registry`——它的优先级高于通用源，也高于 `pnpm publish --registry` 这个 CLI
  flag，即真正决定 tarball 发到哪里的是它（本地实测：通用源与命令行都指向官方 npm，
  publish 仍解析到私有 Verdaccio）。
- **手动触发不再可能误发布。** `workflow_dispatch` 的下拉框可以选中 tag，此时
  `github.ref` 同样是 `refs/tags/v*`，勾了「只构建不发布」的手动运行会连真发布一起执行。
  真发布现在只认 `push` 事件。
- 清理：移除 `tsconfig.json` 中指向已删除依赖的 `vue-types` 路径映射
  （随 `vue-types` 一起删掉的遗留项）、`vite.config.ts` 中无任何源码使用的 `/^#\/.*/`
  external，并订正 dts `exclude` 的失实注释。

## [0.2.0] — 2026-08-30

### ⚠️ 许可证更正（License correction）

- **恢复 MIT 许可证。** 本项目派生自 [benngaihk/Tiptap-UI-Kit](https://github.com/benngaihk/Tiptap-UI-Kit)，
  接手时上游为 MIT 协议。提交 `23a7605`（「修复ts错误和移除版权信息」）删除了 `LICENSE`
  文件与 `package.json` 的 `"license": "MIT"` 字段，而 MIT 明确要求在所有副本及实质性部分中
  **保留版权声明与许可声明**——`0.1.1` – `0.1.4` 的 npm 发布因此不符合上游授权条件。
  现已恢复 `LICENSE`（同时保留 benngaihk 与 YanivWang 两条版权行）、补回 `license` 字段，
  并新增 `NOTICE` 说明衍生关系。接入方在此前版本上的合规疑虑随本次修正解除。

### Security

- **HTML 解析不再经过 `innerHTML`。** `ContentAdapter` 原先用
  `document.createElement("div").innerHTML = html` 解析传入内容，节点建在**活动文档**中，
  `<img src=x onerror=...>` / `<svg onload=...>` 会立即执行，外链资源会真实发起请求。
  Inline Editor 的 `v-model:content` 直接接收宿主 HTML（评论 / 表单等 UGC 场景），
  该路径构成存储型 XSS 面。改用 `DOMParser.parseFromString(..., "text/html")` 产出的
  惰性文档（无 browsing context），与 Tiptap 官方 `elementFromString` 一致。
- **`embed` 节点的 iframe 加固。** `provider` 是节点属性，可由粘贴的 JSON 或
  `setEmbed({ provider: "iframe" })` 直接指定，`resolveEmbedProvider` 的域名判断因此不构成
  安全边界，此前可生成任意 `src` 的 iframe 且无 `sandbox`。现在：`src` 必须通过新增的
  `normalizeSafeFrameUrl`（仅 http/https，且不做 `https://` 自动补全）；不合格时降级为书签卡片；
  iframe 加 `sandbox`、`referrerpolicy`、`loading="lazy"`，`allow` 从 6 项权限收窄到播放必需的 4 项，
  移除 `accelerometer` / `gyroscope` / `clipboard-write`。
- **书签卡片校验 `href` 与封面图。** 未通过白名单的 `url` 不再写入 `href`（卡片不可点击），
  封面图经 `normalizeSafeMediaUrl` 过滤。
- 新增 `SECURITY.md`，明确编辑器与接入方各自的安全边界（服务端二次校验、AI 密钥 `proxy` 模式、
  上传文件扫描等仍属接入方责任）。

### BREAKING CHANGES

- **最低 Node 版本提升至 22.12.0（`engines.node: ">=22.12.0"`）。** Node 20 已于
  2026-04-30 结束维护，不再接收安全补丁，故从 `engines`、CI 构建矩阵与 `.nvmrc` 中一并移除。
  仍在 Node 20 上构建的接入方需先升级运行时；本包**运行时代码本身不依赖 Node 22 的新 API**，
  该约束只作用于安装与构建期。同时 `engines.pnpm` 提升至 `>=11.0.0`（仅影响本仓库贡献者）。
- **`dist/inline.css` 不再包含 Full Editor 的全量样式。** 此前构建脚本把 `style.css` 整体拼进
  `inline.css`，导致 inline 产物（139KB）反而大于 full（114KB），与 inline 入口「评论 / 表单
  轻量场景」的定位冲突。现在按 rollup 入口可达性拆分，`inline.css` 降至 56KB（gzip 19.1→9.2KB）。
  若你在页面上**仅引入 `inline.css` 却渲染了 Full Editor**，请改为引入 `style.css`。
  正常按入口配对引用样式的用法不受影响。
- **`getHostAiConfig()` / `isHostAiManaged()` 在多实例下的行为变化。** 见下方多实例修复。

### Fixed

- **媒体节点未做 URL 白名单校验。** `Video` / `ResizableImage` 的 `src` 只在 UI 上传路径
  （`VideoUpload.vue` / `mediaUpload.ts`）过滤，而 `initialContent` 的 JSON/HTML、粘贴、
  宿主直接调 `setVideo()` / `setImage()` 三条路径完全绕开。schema 是渲染前最后一道关，
  现已在 `parseHTML` / `renderHTML` 两侧接入 `normalizeSafeMediaUrl`。
- **图片尺寸在 HTML 往返中丢失。** `renderHTML` 把 width/height 写成内联 `style`
  （`width: 200px`），而 `parseHTML` 只读 `width` 属性 → **每次 HTML 往返尺寸归零**。
  Inline Editor 的 `v-model:content` 正是 HTML 往返，图片尺寸在每次内容同步后被清掉。
  现在解析同时接受属性与内联 style。
- **`width="abc"` 产生 `NaN` 并写入文档。** 旧写法 `value ? parseInt(value) : null` 中
  `"abc"` 为真值，`parseInt` 得到 `NaN` 存进节点属性，破坏后续缩放计算；而 `getJSON()`
  会把 `NaN` 序列化成 `null`，导致宿主收到的值与编辑器内部状态不一致。现统一校验为正整数。
- **`getAiSuggestionData` 遇过期位置抛 `RangeError`。** `aiSuggestionManager` 在
  `posAtDOM` 失败时会回退到会话开始时保存的 `positionAnchor.from`；用户在流式输出期间
  删减文档后该位置可能越界，`doc.resolve()` 直接抛错，且调用点在 click 回调里无人捕获。
  现与同文件的 `addAiHighlight` / `updateAiHighlight` 一致做边界判断。
- **`aiSuggestionManager` 持有已销毁的 editor。** 它是跨 session 存活的模块级单例，
  而能力开关变化会重建 editor、组件卸载会 destroy；此后任何 `editor.view` 访问都会抛
  `[tiptap error]: The editor view is not available`。新增 `liveEditor()` 统一守门，
  与 `SearchReplace` / `FormatPainter` 已有的 `isDestroyed` 判断对齐。
- **块菜单打开请求在异步组件加载期间被丢弃。** `BlockPickerMenu` 改为 `defineAsyncComponent`
  后，chunk 解析完成前实例尚未注册，`provideBlockMenuHost` 直接丢掉此时到达的
  `activate` / `openInsert`——用户敲下的第一个 `/` 不弹菜单，得再敲一次。现缓冲最后一次
  打开请求，实例注册后补投。
- **AI 宿主配置的多实例串用。** `hostConfig.ts` 原先是单个模块级变量：同页两个编辑器时，
  后挂载者覆盖先挂载者；**未传 `ai-config` 的实例会静默复用另一个实例的密钥与端点**。
  改为按 owner（每实例一个 Symbol）键控的注册表。无 owner 的查询：恰好一个实例登记时返回该配置
  （单实例行为不变），多个实例登记时返回 `null` 并告警——此时不存在正确答案，任选一个正是原来的缺陷。
  与本批次修复的 outline `scrollParent` 属同源问题（模块级存储 → 实例作用域）。
- **AI 悬浮层语言被后挂载实例覆盖。** `aiSuggestionManager.bindLocale` 原先在 capability
  构建扩展时调用，同页多实例下按构建顺序互相覆盖（zh-CN 实例可能弹出 en-US 文案）。
  改为由各 AI 扩展在**发起会话时**绑定；会话是互斥的，因此按会话绑定既正确又无需实例化多份 manager。
- **`terserOptions.mangle.properties` 会破坏运行时。** 原配置对所有 `^_` 开头的属性做 mangle，
  而 Vue（`_ctx` / `__vccOpts` / `__name`）、Tiptap 扩展 options 与 ProseMirror 插件状态都依赖
  下划线前缀属性跨包访问。该配置因挂在从未设置的 `NODE_ENV` 上而侥幸未生效，现已移除。
- **`drop_console: true` 会抹掉面向接入方的诊断信息**（如 session 重建失败告警）。
  改为只清除 `console.log` / `debug` / `info`，保留 `warn` / `error`。
- **E2E 中 `count() === 0` 的分支判断存在竞态**：`count()` 是瞬时快照、不自动等待，
  门控工具按钮改为按需加载后会随机走进从未被验证过的 fallback 分支。改用自动等待的合并选择器。
- **`AiSuggestionPopover` 中只写不读的 `anchorRef`。** 模板上以 `ref="anchorRef"` 绑定、
  脚本里从不读取，组件也没有 `defineExpose`，且 `aiSuggestionManager` 用 `h()` 创建、
  不持有模板 ref——即 Vue 赋值后无人消费的死状态。升级 vue-tsc 3 后由 TS6133 暴露。
  定位 Popover 的是 `<span>` 上的 `:style`，与该 ref 无关，移除后 DOM 输出完全一致。

### Added

- **无障碍基线（WCAG 2.1 AA 方向）。** 接入 `eslint-plugin-vuejs-accessibility` 并清零全部告警：
  - 所有工具栏按钮补 `aria-label`（此前 `title` 只喂给 `a-tooltip` 浮层，按钮本身对辅助技术无名称）；
    切换类按钮补 `aria-pressed`，下拉按钮补 `aria-haspopup` / `aria-expanded`。
  - `div[@click]` 一律改为原生 `<button>`：图库项、模板卡、表格尺寸格、公式显示态、下拉分裂项。
  - `BaseTooltip` 的 `@focus`/`@blur` 改为会冒泡的 `@focusin`/`@focusout`——**原实现下键盘用户
    永远看不到提示**（focus 事件不冒泡，挂在容器上不会被子元素触发）；提示层补 `role="tooltip"`。
  - 块菜单与提及菜单的 `@mouseenter` 补 `@focus` 对等项，遮罩层标记 `role="presentation"`。
  - 无法自动满足的两处保留 `eslint-disable` 并写明理由（用户上传视频无字幕轨道、纯装饰性容器）。
- **工具栏键盘导航（`useRovingTabindex`）。** 按 WAI-ARIA APG 的 toolbar 模式，工具栏收敛为
  **单一 tab stop**，内部用 ←/→/↑/↓ 与 Home/End 移动。改动前 `preset="full"` 下工具栏有 18 个
  tab stop，键盘用户要按 18 次 Tab 才能越过工具栏到达正文。实现用 `MutationObserver` 重扫
  （按需加载的工具按钮首帧尚未挂载），并跳过输入型控件与带修饰键的方向键。
- **虚拟焦点弹层的 ARIA 绑定（`useVirtualFocusPopup`）。** 斜杠命令与提及菜单的焦点始终留在正文，
  DOM 焦点无法表达"当前选中项"。现在弹层用 `role="listbox"` / `role="option"` + `aria-selected`，
  并把 `aria-expanded` / `aria-controls` / `aria-activedescendant` 挂到编辑器正文，关闭时清除引用。
- **查找替换对话框的焦点管理。** 打开时焦点直接落在查找框（此前落在对话框容器，还需多按一次 Tab）；
  关闭时把焦点还给正文——Ant Design Modal 只会还给"触发元素"，而该面板可由 Ctrl/Cmd+F 唤起
  （无触发元素），焦点会掉到 body。两个输入框补 `aria-label`。
- 两个新 composable 从主入口导出，供自建 shell 复用。
- **组件测试与覆盖率门禁。** 引入 `@vue/test-utils` 与 `@vitest/coverage-v8`；
  新增 `YanivEditor` / `YanivInlineEditor` 挂载与阶段测试、无障碍基线测试、
  URL 白名单测试、HTML 惰性解析回归测试、`embed` iframe 安全测试、多实例 AI 配置测试、
  `buildExtensions` gate 过滤测试、工具栏 roving tabindex 测试，以及 Office 粘贴流水线、
  AI 三个适配器与客户端、AI 配置存储、Word 导出、气泡菜单判定、块菜单动作、
  扩展命令（video / toggle / formatPainter / searchReplace）、图片节点、
  AI 高亮 mark、AI 会话管理器、斜杠菜单等模块的测试。
  **用例数 86 → 421。** 覆盖率阈值设为 statements/lines 56、branches 44、functions 52
  （实测 57.3 / 58.9 / 45.2 / 53.1）。

  这些数字不可与 0.1.x 直接相比：本版同时升级到 vitest 4，其 v8 provider 改用
  `ast-v8-to-istanbul` 做 AST 级重映射且无开关可退回。vitest 3 时代 statements 与 lines
  的分子分母完全一致（都是 10788/14630），说明它其实把行覆盖当语句覆盖在报；换口径后
  statements 分母 14630 → 6996、branches 2376 → 3987、functions 992 → 1729，
  三个维度变化方向各不相同。同一批测试、同一份源码，只是量得更准——
  **不是覆盖劣化，也不是为了让门禁通过而下调阈值**。

  `DragHandleExtension` 与浮层定位是纯浏览器几何逻辑，jsdom 无布局引擎，
  强行做单测只能断言自己写的桩。这两块改由 Playwright E2E 验收
  （新增 `e2e/drag-handle.spec.ts` 5 个用例，E2E 共 22 个），并在
  `vitest.config.ts` 注明——**没有把它们排除出覆盖率分母来修饰数字**。

- **CI 质量门禁**（`.github/workflows/ci.yml`）：typecheck / 覆盖率测试 / ESLint / Stylelint /
  Prettier、Node 22 与 24 双版本构建、Playwright E2E、`pnpm audit`。
  构建任务附带产物断言：入口文件齐全、**类型声明确实被打包**、
  `inline.css` 必须小于 `style.css`、门控能力不得回流主 chunk。`deploy-pages` 部署前也会先跑 `verify`。
- **公开 API 表面锁**（`src/publicApi.test.ts`）：三个入口的导出名快照。
  这是发布到 npm 的库，导出增删即契约变更；快照让改动必须显式过一次人眼，
  并额外断言 AI 符号不从主入口泄漏。
- **发布流水线**（`.github/workflows/release.yml`）：tag 触发，发布前跑完整 `verify`、
  校验 tag 与 `package.json` 版本一致、断言 tarball 内含 `LICENSE` 与 `NOTICE`，
  使用 `npm publish --provenance` 附带可验证的构建来源证明。支持 dry-run。
- **产物体积预算**（CI）：主 chunk 46KB / `style.css` 19KB / `inline.css` 10.5KB（均为 gzip，
  当前实测 43.2 / 18.0 / 9.3KB）。超预算必须显式调整并说明原因，避免"每次多一点"的无声劣化。
- `CONTRIBUTING.md`、`SECURITY.md`、`NOTICE`、`CODEOWNERS`、Issue / PR 模板、
  `dependabot.yml`（Tiptap 全家桶分组升级、忽略 major）。

### Changed

- **能力按 gate 代码分割。** `capabilities/registry.ts` 此前 43 行全是静态 import，
  gate 只决定「运行时是否注册」，不影响打包体积——`preset="basic"` 的接入方仍会下载
  DragHandle（1000+ 行）、office-paste 流水线、search-replace 与全套 AI 扩展。
  现在**默认 preset 关闭的能力一律 `await import()`**：table / video / outline / officePaste /
  searchReplace / formatPainter / math / ai / notionBlocks / dragHandle / slashCommand。
  同步地，`ToolbarNav` 与 `EditorEditChrome` 中由 gate 控制显隐的 15 个组件改为
  `defineAsyncComponent`。主 chunk 366KB → 199KB（gzip 73.9 → 41.8KB，**−43%**）。
- **`docx` / `file-saver` / `mammoth` / `katex` 标记为可选 peer 依赖**
  （`peerDependenciesMeta.optional`）——它们只在 Word 导入导出与公式能力的动态 import 链路中使用，
  不用这些能力的接入方无需安装。
- 构建产物输出 sourcemap，便于接入方调试到库内部。
- 移除无引用的 devDependencies：`rollup-plugin-obfuscator`、`@tiptap/extension-typography`。
- `verify` 脚本改用 `test:coverage`，与 CI 保持一致。
- **工具链升级：pnpm 11 与 Node 22/24。** `packageManager` 与 CI 全线 pnpm 11.16.0；
  构建矩阵 `[20, 22]` → `[22, 24]`；`deploy-pages` 改用 `.nvmrc` 作为 Node 版本单一来源。
  新增 `pnpm-workspace.yaml` 的 `allowBuilds`：pnpm 11 起依赖的安装脚本默认不执行，
  显式登记 `@parcel/watcher` / `core-js` / `esbuild` / `unrs-resolver` 为 `false`
  （四者均随 optionalDependencies 分发预编译二进制），与 pnpm 10 时期的既有行为一致。
  `pnpm-lock.yaml` 在 pnpm 11 下零变更，lockfileVersion 9.0 完全兼容。
- **`@tiptap/*` 3.13.0 → 3.30.5。** 24 个包整体同版本升级，并把 `devDependencies` 中参差的
  范围统一收敛为 `^3.30.5`——版本漂移会破坏 schema 一致性。`peerDependencies` 仍为 `^3.0.0`，
  本次无源码适配，对下游依旧兼容整个 3.x。
- **`katex` 0.16 → 0.18，`peerDependencies` 由 `^0.16.0` 放宽为 `>=0.16.0 <0.19.0`。**
  这是放宽而非收紧：已在 0.16 的接入方继续满足，同时允许升到 0.17 / 0.18。
  仓库只用到 `renderToString`，行为与选项均未变；`katex/dist/katex.min.css` 路径不变。
  katex 0.18 自带类型声明，冗余的 `@types/katex` 已移除。
- **其余依赖升级**：vitest 4 + jsdom 30、vue-tsc 3、vite-plugin-dts 5、
  `@vitejs/plugin-vue` 6、commitlint 21、lint-staged 17、`@types/node` 22
  （对齐 `engines.node`，不跟进 26——类型声明应描述最低支持的运行时）、
  postcss-html 2、stylelint-config-html 2、eslint-import-resolver-typescript 4、
  prettier 3.9，以及 vue 3.5.42 等一批同 major 更新。
  全部 GitHub Actions 升至 node24 运行时（checkout v7、setup-node v7、upload-artifact v7、
  upload-pages-artifact v5、deploy-pages v5、pnpm/action-setup v6），消除
  "Node.js 20 is deprecated" 告警。
- **移除未使用的 `vue-types` 直接依赖。** 全仓库无任何引用，它只是 `ant-design-vue` 的
  传递依赖（后者要求 `^3.0.0`）；升到 7 反而会让依赖树里同时存在两份。
- **以下依赖本轮刻意不升，原因如下**：
  - `typescript` 保持 5.5：TS 7 是 Go 重写版，与 vue-tsc 配合的风险过高。
  - `vite` 保持 6：到 8 跨两个 major，且 `vite.config.ts` 的自定义 `generateBundle` 插件
    依赖 rollup 的 `viteMetadata.importedCss` 内部结构（CSS 按入口拆分逻辑），须专门验证。
  - `eslint` 保持 9：`eslint-plugin-import` 最新版（2.32.0）的 peer 仅到 `^9`，在 ESLint 10 下
    `import/order` 会因 `sourceCode.getTokenOrCommentAfter` 已被移除而抛 TypeError。
    危险之处在于 `pnpm run lint` 仍返回 0——只有当规则真要报告/修复某处时才崩溃，
    现有代码恰好没有违规，CI 会一路绿灯直到有人写出乱序 import。待上游支持
    （或迁移到 `eslint-plugin-import-x`）再升。
  - `vue-router` 保持 4：5.x 要求 vite `^7.3.0 || ^8.0.0`，与上面的 vite 决定冲突；
    且它仅被 examples 使用，对发布产物无影响。

### Docs

- **`ARCHITECTURE.md` 补 5 条架构不变量**（第 14 – 18 条）：能力按 gate 代码分割、
  禁止模块级可变状态、HTML 入口惰性解析、URL 白名单单一入口、无障碍基线。
  该文档是本仓库的实施依据，本次新增的约束必须写进去，否则文档与实现分叉。
- `docs/api/ai-config.md` 补同页多实例语义；`docs/api/composables.md` 补两个无障碍 composable；
  `docs/guide/getting-started.md` 补样式入口配对提示（含 `inline.css` 的 breaking 说明）；
  `docs/features/feature-matrix.md` 说明 preset 同时决定打包体积并给出 gzip 数字。
- 修正 `docs/features/media.md` 已失实的警告：媒体上下文条早已接入 i18n；
  同时补充视频字幕属接入方责任的说明。
- 补充压缩策略的实际行为说明：Vite 的 `vite:terser` 插件对 `build.lib && format === "es"`
  直接跳过压缩，这是面向打包器的**有意设计**（保留换行与 `/*#__PURE__*/` 标注以便下游
  tree-shake），Vue / React / Tiptap / Ant Design Vue 同样以未压缩 ESM 发布。CJS 产物正常压缩。

### Fixed

- **AI 配置回退链失效**：registry 的 `getProvider` 兜底为 `"openai"`，使 `client.ts` 的 `getAiConfig()` 恒判定"宿主已托管"，localStorage（AI 设置弹窗）与 `VITE_AI_*` 两级回退永远走不到。改为各 getter 只透传宿主原值，缺省值统一在 `getAiConfig()` 补齐；`resolveAiExtensionOptions` 无 provider 时返回 `null`。同时统一 timeout 默认值为 60s，并让 `storageMode: "proxy"` 在无 apiKey 时也判定为已配置。
- **notion preset 下大纲与查找替换不可达**：两项 gate 默认开启但 UI 只挂在顶栏，而 notion 隐藏顶栏。现在大纲面板不再耦合 `toolbarConfig.outline`，收起时在 rail 渲染展开把手；查找面板与 Ctrl/Cmd+F 拆分到 `FindReplaceDialog`（挂 `EditorEditChrome`，只看 `gates.searchReplace`），顶栏按钮退化为纯触发入口。
- **移动端工具栏绕过 gate 过滤**：`ToolbarNav` 在 ≤768px 时把 `COMPACT_TOOLBAR_CONFIG` spread 覆盖到已过滤的配置上，使 COMPACT 中硬编码为 `true` 的 `image` / `ai` 重新出现（`preset="basic"` 窄屏下会渲染无扩展支撑的 AI 按钮）。改为取交集的掩码合并。
- **outline `scrollParent` late-binding 断链**：`bindOutlineScrollParent` command 写模块级单例，而 registry 的 getter 读 `ctx.outline`，两者互不相通导致 `TableOfContents` 恒回退 `window`；模块级存储还会让同页多实例互相覆盖。改为 `createOutlineScrollParentBinder(ctx.outline.bindScrollParent)`，写回实例作用域。
- **phase 切换不清理扩展状态**：`SearchReplace` / `FormatPainter` 现在各自在 plugin `view.update` 中检测 `view.editable` 由 true 变 false 并自清（搜索词与命中高亮、格式刷激活态与光标样式），不再依赖顶栏卸载这一副作用。
- **实例 locale 非响应式**：`provideEditorLocale` 的 `messagesRef` 是普通对象，语言包异步加载完成后不触发重渲，先渲染的组件会永久显示原始 key（如 `editor.outlineToggle`）。改为 `shallowRef`。
- **Ctrl/Cmd+F 快捷键是全局的**：`useFindReplaceHotkey` 用 hotkeys-js 注册全局快捷键，同页多实例下按一次会同时弹出多个查找面板；`hotkeys.unbind("ctrl+f,command+f")` 解绑的是全部 handler，一个实例卸载会废掉其他实例；`hotkeys.filter = () => true` 的全局覆盖还会影响宿主自己用 hotkeys-js 注册的快捷键。改为在编辑器根节点监听 `keydown`：天然按实例隔离，且焦点在编辑器之外时不再劫持浏览器原生查找。
- **`FooterNav` 缩放条位置 prop 名不匹配**：`EditorStatusChrome` 传 `:zoom-bar-placement`，组件声明的是 `placement`，导致 `presetLayout.zoomPlacement` 是死配置。同时删除从未被读取的 `editor` prop。

### Removed

- **peer dependency `hotkeys-js`**：查找快捷键改为原生 `keydown` 监听后已无引用，接入方可少装一个包。若宿主自身用到 hotkeys-js，请自行加入依赖。

### Changed

- `SearchReplace` / `FormatPainter` 的自清逻辑补上 `editor.isDestroyed` 前置判断（destroy 后访问 `editor.view` 会抛错），并新增 `phaseSelfCleanup.test.ts` 锁住自清行为与"清理只产生一次 dispatch"。
- `useFindReplaceHotkey` 新增可选 `target` 参数（默认取 `EditorShell` 根节点），自建 shell 可显式指定监听容器。
- i18n 覆盖补齐：图片 / 视频上下文条按钮、拖拽手柄 `aria-label`、session 骨架与错误态文案改为走实例 locale，新增 `editor.mediaPreview` / `imageDelete` / `videoDelete` / `dragHandleAddBlock` / `dragHandleOpenMenu` / `sessionLoading` / `sessionRetry` / `sessionInitFailed`。
- `editorConstants.ts` 中 `TEXT_ALIGN_OPTIONS` / `EDITOR_LIMITS` / `KEYBOARD_SHORTCUTS` 标记为 `@deprecated`（无运行时引用，真实值分别在 `AlignDropdown` 的 i18n key、`ZoomBar` props 默认值与各扩展的 `addKeyboardShortcuts()`）。

### Docs

- 全量校对文档与源码，补全 `update` / `update:content` 事件与 Inline `#toolbar` 插槽的 API 文档；修正 preset 能力描述、inline 工具栏扩展对照表、`buildExtensions` 示例参数、代码块语言数量、浮动菜单触发条件等。
- 说明 `createI18n({ messages })` 不影响编辑器文案（自定义文案只被全局 `t()` 读取），并列出仍为中文的占位内容。

## [0.1.4] — 2026-07-09

### Fixed

- `tsconfig.json`：移除 `baseUrl`，`paths` 改为 `./` 相对写法，修复部分工具链下路径别名解析异常。

### Changed

- 清理 `contentAdapter.ts` 中未使用的 `EMPTY_DOC` 常量；统一 `isVisuallyEmpty.test.ts` 的 import 格式。

## [0.1.3] — 2026-07-09

### Fixed

- DragHandle：Editor 构造时 `view.dom` 尚未挂入 `.yaniv-editor` 时不再同步解析 overlay portal，改为延迟挂载；修复切换到 Notion preset（启用 dragHandle）时 session 重建失败。

### Changed

- Z-index：token 作用域限定在 `.yaniv-editor`；新增 `zIndexBase` prop（默认 `1000`）；浮层统一挂载 `.yaniv-editor__overlay-portal`。
- 浮层挂载收口：BubbleMenu / Ant Design Dropdown·Select·Popover·Modal·Tooltip / DragHandle 菜单 / AI Popover / Toast·Notice 全部走 overlay portal；删除 Tippy 兼容层（`useOverlayTippyOptions`）、`document.body` fallback、以及 Ant Design 静态 `message` / `notification`。
- 统一入口：`useOverlayMountTarget` / `useOverlayBubbleMenu`（`src/composables/useOverlayMount.ts`）、`useOverlayFeedback` / `showOverlayToast` / `showOverlayNotice`（`src/core/overlayFeedback.ts`）。
- 删除未使用的 `useYeZIndex`；文档内 tooltip 改用 `--ye-z-chrome-tooltip`，portal 内 Ant Design Tooltip 使用 `--ye-z-tooltip`（`base + 60`），Toast 使用 `--ye-z-toast`（`base + 80`）。

### Docs

- 文档与注释对齐当前实现：`adaptJsonToSchema` 关闭 capability 时提升子内容（非整段静默丢失）；表格上下文条能力与 `TableCellWithBackground` schema/UI 边界；`withTransactionGuard` 命名；basic 下表格工具依赖 `gates.table`。

## [0.1.2] — 2026-07-06

### Fixed

- Ant Design Vue 组件改为在各 UI 组件内局部 import（`src/shared/antd.ts`），宿主应用**无需** `app.use(Antd)` 或 Nuxt 额外全局注册即可使用 `<YanivEditor>`。

## [0.1.1] — 2026-05-23

### Changed

- 大纲面板默认**收起**（`provideOutlinePanel` 默认 `expanded=false`）。如需初始展开，传入 `:default-outline-expanded="true"`。

### Fixed

- Inline Editor：`placeholder`、`extraExtensions` 变化现在会正确更新 `sessionKey` 并触发 session 重建（此前修改可能不生效）。
- 多实例场景下 `aiConfig` 卸载时不再误清其他编辑器实例的配置（`hostConfig` owner 隔离）。
- 块菜单「标注框 / Callout」改为包裹当前块，而非仅 toggle 空标注。
- 媒体上传 URL 经 `safeUrl` 规范化，过滤不安全协议。

## [0.1.0] — 2026-05-22

Architecture Refactor（Session / Runtime / Capability Registry 分层重构）

### BREAKING CHANGES

#### 1. `basic` preset 默认能力收紧

`basic` preset 不再默认开启 `table` 和 `video`，重构后仅保留 `image`。

**迁移**：若需保留旧行为，显式传入 features：

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

#### 2. CSS 选择器 `.is-preview` → `[data-phase="preview"]`

`.is-preview` class 已删除，根节点改为声明式 `:data-phase="profile.mode"`。

**迁移**：

```css
/* 旧 */
.is-preview .my-class { ... }

/* 新 */
[data-phase="preview"] .my-class { ... }
```

#### 3. `registerAppearance()` 全局 API 删除

模块级 `registerAppearance(name, vars)` 已删除（违反多实例隔离原则）。`YanivEditorExpose` **不**暴露 appearance 实例方法；宿主通过 props 注入自定义外观变量。

**迁移**：

```vue
<YanivEditor appearance="custom" :custom-appearance-vars="{ '--ye-primary': '#ff00ff' }" />
```

#### 4. `buildEditorExtensions` / `buildInlineExtensions` / `resolveInlineExtensionGates` 删除

旧的扩展 builder 已删除，统一由 `capabilities/buildExtensions(host, ctx)` 取代（`gates` 在 `ctx.gates` 内）。高级集成方如需自定义能力，通过 Capability Registry API 注册。

#### 5. `resolveExtensionGates` / `isFeatureEnabled` / `applyExtensionGatesToToolbarConfig` 删除

能力门控逻辑统一收入 Capability Registry，不再对外暴露独立函数。

**迁移**：

```ts
// 旧
import { applyExtensionGatesToToolbarConfig } from "@yanivjs/yaniv-editor";

// 新
import { applyGatesToToolbarConfig } from "@yanivjs/yaniv-editor";
```

#### 5b. `hasInlineToolbarItems` 删除

Inline 工具栏显隐改由 Registry 推导。

**迁移**：

```ts
// 旧
import { hasInlineToolbarItems } from "@yanivjs/yaniv-editor/inline";

// 新
import { resolveShowInlineToolbar, CAPABILITIES } from "@yanivjs/yaniv-editor/inline";

resolveShowInlineToolbar(toolbar, CAPABILITIES);
```

#### 5c. AI 模块独立入口

AI 功能从主包拆出，按需引入：

```ts
import { AiMenuButton, useAiConfig } from "@yanivjs/yaniv-editor/ai";
```

主入口不再 `export * from "./features/ai"`。

#### 6. `localeGeneration` 不再 export

旧的 `:key="localeEpoch"` 强制重渲方案已废弃；`localeGeneration` 为 `locales/manager.ts` 模块内部实现。locale 切换通过 scoped locale + session rebuild 处理。

#### 7. Inline 编辑器 schema 容错行为变更

Inline toolbar 关闭某类格式时，外部传入内容中对应的 mark/node 会在解析时**静默丢弃**（保留文字，丢失格式），而非"保留为 `<p>` 段落"。

**影响**：若宿主依赖 Inline 编辑器保留 Full 编辑器写入的格式（如 table、math），改用 Full 编辑器，或显式开启对应 toolbar slug。

#### 8. capability 关闭后未知节点结构被剥离（子内容提升）

通过 `features` prop 关闭某 capability（如 `{ table: false }`）触发 session rebuild 时，新 schema 不识别对应节点（如 `table` / `tableRow` / `tableCell`）。JSON 快照会经 `ContentAdapter.adaptJsonToSchema` **剥离未知节点结构并提升子内容**（例如单元格内文本保留为段落），而不是整段内容消失。这是 by-design 行为。

**影响**：不要在运行时频繁切换 `features` 开关；切换后表格等结构会丢失，仅保留可提升的文本/合法后代。若需完整结构，请自行在切换前备份内容。

#### 9. `outlinePanel.visible` → `outlinePanel.expanded` 重命名

`provideOutlinePanel()` / `useOutlinePanel()` 返回的字段从 `visible` 改名为 `expanded`，语义对齐 chromePolicy 文档。

**v0.1.0 发布时**默认仍为 `true`；**v0.1.1 起**默认改为 `false`。恢复旧默认展开行为：

```vue
<YanivEditor preset="full" :default-outline-expanded="true" />
```

**迁移（字段重命名）**：

```ts
const { visible } = useOutlinePanel(); // 旧
const { expanded } = useOutlinePanel(); // 新
```

#### 10. `PhaseChangeEvent` 新增 `reason` 字段；`from` 可为 `null`

`useEditorSession` 派发的 `PhaseChangeEvent` 新增 `reason: 'mode-change' | 'ready'`，且 `from` 类型改为 `EditorPhase | null`（`reason === 'ready'` 时为 `null`）。

> **说明**：`onPhaseChange` 由 Session 层（`useEditorSession`）提供，**未**挂到 `YanivEditor` / `YanivInlineEditor` 的组件 expose。宿主切换 edit/preview 请使用 `:mode` prop；仅在 fork 库内 Session 集成或高级封装时订阅此回调。

**迁移**（Session 层订阅方）：

```ts
onPhaseChange(({ from, to, editor, reason }) => {
  if (reason === "ready") return; // 跳过 session rebuild 后的初始同步
  // ... 原逻辑；from 可能为 null
});
```

#### 11. 禁止直接调用 `editor.setEditable`；宿主用 `:mode` prop 切换 phase

Shell 与扩展层禁止直接调 `editor.setEditable`；入口收口至 `useEditorSession.requestPhaseTransition`。`YanivEditorExpose` **不**暴露 `requestPhase` / `getPhase`。

**迁移**（宿主业务代码）：

```vue
<!-- 旧：editorRef.value?.getEditor()?.setEditable(false) -->
<YanivEditor :mode="previewMode ? 'preview' : 'edit'" />
```

自定义扩展内若需感知 phase，通过 `ctx.isEditable`（`BuildExtensionsCtx`）或 `filterTransaction` 守卫，**不要**直接 `setEditable`。

#### 12. 内置 appearance `github` / `typora` 移除

内置视觉皮肤收敛为 `default | word | notion | custom`，`appearance="github"` 与 `appearance="typora"` 不再可用。

**迁移**：若仍需类似风格，使用 `appearance="custom"` 并通过 `:custom-appearance-vars` 覆盖 `--ye-*` token（可参考 git 历史中已删除的 CSS 变量定义）。

```vue
<YanivEditor
  appearance="custom"
  :custom-appearance-vars="{
    '--ye-primary': '#0969da',
    '--ye-bg': '#ffffff',
  }"
/>
```

---

### 新增导出（`@yanivjs/yaniv-editor` 主入口）

| 符号                        | 说明                                                    |
| --------------------------- | ------------------------------------------------------- |
| `EditorRuntimeProfile`      | Runtime 配置快照类型                                    |
| `ResolvedChromePolicy`      | Chrome 显隐策略（Full / Inline discriminated union）    |
| `SessionStatus`             | Session 状态：`idle` \| `loading` \| `ready` \| `error` |
| `EditorShellHost`           | `'full'` \| `'inline'`                                  |
| `EditorPhase`               | `'edit'` \| `'preview'`                                 |
| `ExtensionGates`            | 能力门控对象                                            |
| `PhaseChangeEvent`          | Phase 切换事件类型                                      |
| `CapabilityDefinition`      | Registry 能力定义类型                                   |
| `BuildExtensionsCtx`        | 扩展构建上下文类型                                      |
| `resolveEditorProfile`      | Preset + features → profile                             |
| `mergeFeatures`             | Overrides 合并（undefined 不覆盖）                      |
| `resolveChromePolicy`       | profile + layout + gates → chromePolicy                 |
| `computeSessionKey`         | Session 重建 key                                        |
| `resolveInlineGates`        | Inline toolbar → gates                                  |
| `buildExtensions`           | 统一扩展 builder                                        |
| `BYPASS_GUARD_META`         | ContentAdapter 绕过守卫 meta（Symbol）                  |
| `CAPABILITIES`              | 能力 Registry 常量                                      |
| `applyGatesToToolbarConfig` | Full 工具栏 gate 过滤                                   |
| `resolveShowInlineToolbar`  | Inline 工具栏是否展示                                   |
| `ContentAdapter`            | 受控内容 raw dispatch                                   |
| `applyPhaseTransition`      | Phase 切换顺序规范化                                    |

`@yanivjs/yaniv-editor/inline` 额外导出：`CAPABILITIES`（与主入口同源，供 `resolveShowInlineToolbar(toolbar, CAPABILITIES)` 使用）。

---

### 内部重构（无宿主-facing API 变更，但影响 fork / 高级集成）

- Session 层：`useEditorSession` 取代 `initEditor` + `isInitializing` + `isFirstInit` 并发锁
- Phase 切换：`applyPhaseTransition` 规范化为"edit→preview: 先 emit 再 setEditable"顺序；Session 层提供 `requestPhaseTransition(nextPhase)` 入口与 buffer 机制（session loading 期间切换会延后到 rebuild 完成）
- ContentAdapter：所有受控内容写入改用 raw transaction + `BYPASS_GUARD_META`（Symbol），不再使用 `editor.commands.setContent`；新增 `addToHistory` / `source` 选项
- Locale：各编辑器实例独立 locale context，扩展通过 `ctx.locale` 静态快照读取文案
- Appearance：`customAppearances` Map 移入 `useEditorAppearance` 实例作用域，多编辑器实例互不影响
- Outline：scrollParent 改为 late-binding（`editor.commands.bindOutlineScrollParent(el)`），由 Workspace `onMounted` 后注入
- AI 配置：扩展层全部改为 getter 形式（`getApiKey: () => ctx.aiConfig()?.apiKey`），宿主修改 `aiConfig` 后无需重建 session
- Inline gates：`resolveInlineGates(toolbar, capabilities)` 为 Inline gates 唯一来源；Full gates 仅由 `profile.features` 推导
- CSS 分层：ProseMirror 正文结构收敛至 `content.css` / `table.css` / `code-block.css`；appearance 仅改 token 与排版；Notion 块 hover 独立为 `block-hover.css`（`.appearance-notion` 限定）
- Tiptap 版本绑定：要求 `@tiptap/core ≥ 3.0.0`；`withTransactionGuard` 位于 `capabilities/transactionGuard.ts`，通过 `ctx.isEditable` Ref 注入
