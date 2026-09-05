# Changelog

## [Unreleased]

## [0.3.1] — 2026-09-05

发布 `0.3.0` 之后做可复现性核验时挖出来的一组构建问题。**只改构建配置，不改任何运行时源码**，
但产物会变——其中第一条修掉的是一个**影响所有接入方的行为缺陷**。

### Fixed

- **`0.3.0` 的 AI demo 模式是恒开的，运行时关不掉。** `src/features/ai/client.ts` 的
  `isAiDemoMode()` 读 `import.meta.env.VITE_AI_DEMO_MODE`，而 vite 在**构建期**静态替换它——
  `0.3.0` 是在存在 `.env`（`VITE_AI_DEMO_MODE=true`）的机器上打的，那段代码被常量折叠成
  `typeof import.meta !== "undefined" && true`，于是**所有装了 `0.3.0` 的接入方拿到的都是
  模拟 AI 流，而不是真实 API 调用**。
  修法：`command === "build"` 时把 `envPrefix` 换成一个永不匹配的前缀，库构建不再内联任何
  `VITE_*`。`pnpm dev`（`serve`）不受影响，本地照旧能用 `.env` 打开 demo 模式。
- **`{index,ai,inline}.d.ts` 的 `declare module` 增强块顺序不稳定。** `vite-plugin-dts`
  发射这 17 个 `declare module "@tiptap/core"` 块时没有稳定排序，**同一个 commit、同一台机器
  连跑两次结果都不同**。新增 `sortAmbientModuleBlocksPlugin()` 在 dts 发射后按文本排序
  （块之间只是 TS 声明合并，顺序不影响语义）。

### Changed

- **`release` 脚本改用 `npm publish`（原 `pnpm publish`）。** 写 `gitHead` 是 npm 的行为，
  pnpm 不写——`0.3.0` 在 registry 里的 `gitHead` 是 `undefined`，溯源只能靠人工记录提交号。
  改回 npm 之后每次发布的元数据都会带上发布时的 HEAD。
- **补打了遗漏的 `v0.3.0` tag**（指向 `e8a7bfa`）。`0.3.0` 发布时漏打了。

### Build / CI

- 库构建现在是**确定性**的，两条都实测过：有无 `.env` 产物整树哈希相同；连跑两次整树哈希相同。

⚠ **对接入方的影响**：配置分级里第 4 级「构建期 `VITE_AI_*`」对**已发布的 npm 包**不再生效
——它本来也不生效（冻结的是发布者机器上的值，不是接入方的），只是现在变成**确定的**不生效。
要用构建期变量，只能从源码接入（走接入方自己的 vite 构建）。

## [0.3.0] — 2026-09-03

### BREAKING CHANGES

- **`BYPASS_GUARD_META` 的类型从 `symbol` 变为 `string`。** 它原本就没在按 symbol 工作
  （所有 symbol meta 键共用 `meta["undefined"]` 一个槽，任何第三方 meta 都能解除只读守卫），
  值为 `"yaniv:bypassGuard"`。**迁移**：调用点原先必须写的
  `tr.setMeta(BYPASS_GUARD_META as unknown as string, true)` 现在直接
  `tr.setMeta(BYPASS_GUARD_META, true)` 即可，去掉 cast 就行。
- **`CapabilityDefinition` 移除可选字段 `chrome?: string[]`。** 全仓无任何读取方，
  声明它不产生任何效果。**迁移**：删掉自定义 capability 里的 `chrome` 字段即可。

- **`AiProviderInfo` 去掉 `name` / `description`。** 这两个字段是 UI 文案，却写死在
  `AI_PROVIDERS` 常量里，导致 AI 设置弹窗在 en-US 下照样显示「阿里云通义千问」「本地运行的开源模型」。
  现移入语言包 `aiSettings.providerName[id]` / `aiSettings.providerDesc[id]`，随 `locale` 切换。
  读这两个字段的接入方改为 `t('aiSettings.providerName.' + info.id)`。
- **`ConnectionTestResult.message` → `messageKey` + 可选 `detail`。**
  `useAiConfig` 没有 locale 上下文却直接回中文串。现在只回语言包 key，由持有 `useEditorT()` 的
  UI 层翻译；provider 返回的原始错误（无法本地化）走 `detail`。
  `AiConfigState.testError` 相应从 `string | null` 变为 `ConnectionTestResult | null`。
- **`MentionOptions.suggestionItems` → `getSuggestionItems`（getter）。** 详见下方 Fixed。
- **删除 `utils/editorState.ts` 里无消费方的导出。** 独立函数 `isActive` / `isHeadingActive` /
  `isActiveAlign` / `canExecute` 与 `createStateCheckers` 返回的四个闭包**逐字重复**，
  而全仓库没有任何文件 import 过它们；`getCurrentTextAlign` 同样零引用。
  该文件实际只被两样东西消费：`createStateCheckers`（10 处）与 `getCurrentParagraphStyle`（1 处）。
  这些名字未出现在任何包入口（`exports` 映射只有 `.` / `./inline` / `./ai`，无法深引用），
  `publicApi.test.ts` 快照不变。一份逻辑两处实现，改了一处漏另一处是迟早的事。

- **删除无消费方的常量与类型。** `editorConstants.ts` 的 `TEXT_COLORS` / `BACKGROUND_COLORS` /
  `TABLE_CELL_COLORS` / `TEXT_ALIGN_OPTIONS` / `TABLE_BORDER_STYLES` / `LINE_HEIGHTS` /
  `EDITOR_LIMITS` / `KEYBOARD_SHORTCUTS`，以及 `toolbarTypes.ts` 里由它们推导的
  `TextColor` / `BackgroundColor` / `FontFamily` / `FontSizeOption` / `LineHeightOption` /
  `CodeLanguage` / `TableBorderStyle` / `TextFormatType` / `ListType`；`DEFAULT_VALUES` 收敛为
  实际被读取的 `fontFamily` / `fontSize`。这些都未从任何包入口导出（`publicApi.test.ts` 快照不变），
  但仓库内引用会失效。它们「看起来像可调参数、改了却毫无效果」——例如缩放上下限真正写在
  `ZoomBar` 的 props 默认值里，快捷键真正由各扩展的 `addKeyboardShortcuts()` 注册。

### Added

- **`YanivEditor` 新增 `mention-items` prop。** `@` 提及候选项与块菜单「页面链接」插入的内容
  终于可以由宿主注入（此前只有写死的「首页 / 文档 / 路线图 / 我」）。经 `BuildExtensionsCtx.mentionItems`
  getter 下发，与 upload / gallery 一致：**变更不触发 session 重建**。
- **`aiConfig.documentContextLimit`**：送进 AI 上下文的文档全文字符上限（默认 8000），
  超出即截断并提示用户。见 Fixed 段与 `docs/api/ai-config.md`。
- **`@yanivjs/yaniv-editor/ai` 新增导出** `buildDocumentContext`、
  `DEFAULT_DOCUMENT_CONTEXT_LIMIT` 与类型 `DocumentContext`。
  `buildDocumentContextPrompt` 保持原签名（新增的 `limit` 是可选参数），
  `runAiSuggestionStream` / `runAiContinueWritingStream` 也只在末尾追加可选参数
  ——都是向后兼容的扩展，不属于 BREAKING CHANGES。
- **文本选中底色跟随品牌主色**（`--ye-selection` + `::selection` 规则）。此前选中色一直是
  浏览器默认的系统高亮，与三套外观的品牌色无关。现在三套外观 × 明暗两态各有一份值，
  RGB 恒等于同一作用域的 `--ye-primary`，透明度分档（亮 30% / 暗 40%——深色底上同样的
  半透明色看起来更弱）。只设 `background-color` 不设 `color`，代码块的语法高亮、链接色、
  AI 高亮都不受影响。浏览器实测六种组合的选中文字对比度 7.08~~13.92，全部远超 WCAG AA
  的 4.5；真正卡住取值的是「选中背景 vs 正常背景」的可辨识度（1.45~~1.97）。
  新增护栏 `styles/selectionColor.test.ts` 锁住「选中色与主色同源」。→ 不变量 46

- **两处几何逻辑补上 E2E 验收**：图片拖拽改尺寸（`e2e/resize-image.spec.ts`）与
  AI 建议浮层的挂载/定位（`e2e/ai-suggestion.spec.ts`）此前既没有单测也没有 E2E
  ——`vitest.config.ts` 的注释一度写着「验收在 Playwright」，实际上并没有这些用例。
  两组都做过变异验证，AI 那条用 `page.route` 拦截 SSE，不打真实网络。
- **不变量 15（禁止模块级可变状态）补上静态护栏** `src/moduleLevelState.test.ts`：
  逐条登记当前 12 处模块级可变状态与「为什么不该按实例隔离」的理由，新增未登记的会红，
  清单里留下已删掉的条目也会红。此前这条不变量有三次历史事故却零检查，
  且文档一直写着「已知有意例外两处」，实际 `features/ai/config/` 那 5 处从未登记。

### Fixed

- **下拉菜单的子菜单收起定时器在组件卸载后仍会触发。** 关菜单时清了，卸载路径漏了
  ——宿主切 preset / locale 会把整个 chrome 卸载重挂，而 `setTimeout` 排的那一帧
  还在 150ms 后回来改一个已经没人看的状态。补 `onBeforeUnmount`。→ 不变量 56
- **公式块的键盘用户没有编辑入口。** 显示态是个 `<button aria-label="编辑公式">`，
  而键盘激活它只会选中节点：真正的编辑入口只有 `dblclick`，双击没有键盘等价物。
  空公式的占位文案也一直写着「点击编辑公式」，而单击同样不进编辑。
  补上 Enter / Space 进编辑，并把文案改成与实际交互一致的「双击编辑公式」。→ 不变量 57
- **公式编辑框与自定义 AI 输入框在 Mac 上按不了 Cmd+Enter。** Vue 模板的 `.ctrl`
  修饰符不匹配 Cmd（那是 `.meta`），而 tiptap 侧的 `Mod-` 前缀自带这个映射，
  于是同一个编辑器里两套快捷键行为不一致。两处各补一条 `.meta` 绑定。
- **链接气泡菜单里输入非法地址时什么也不发生。** 弹窗不关、链接不变、没有任何提示，
  用户不知道自己输错了什么（同仓库 `ImageUpload` 的网络地址弹窗一直有这条提示）。
  补上提示，并保留弹窗与用户已输入的内容让他修改。→ 不变量 55

- **换一次 AI 操作之后，「取消」按钮就再也停不下正在跑的流。** `aiSuggestionManager`
  只存一个 `AbortController`；换流的时序是「新流设句柄 → 旧流被 abort → 旧流的 fetch
  以 `AbortError` 走 `onError` 并在那里清句柄」，而清的时候句柄已经是**新流**的了。
  `runStream` 用的是无条件的 `setAbortController(null)`，于是新流的取消能力被一起
  扔掉：实测点「取消」后新流 `signal.aborted` 仍是 `false`，它继续消耗 API 配额、
  继续往同一个单例写建议文本。改用按身份清（`clearAbortController(自己那个)`）——
  这个方法 `aiSuggestionManager` **内部本来就有并且用对了**（`executeCustomPrompt`），
  只是 `runStream` 那半没跟上。新增护栏禁止 `setAbortController(null)` 出现在源码里。
  → 不变量 53
- **切换编辑器语言后，翻译目标语言的文案会串成另一种语言。** 目标语言持久化的是
  **界面标签**（如「英语」）而不是语言代码：中文界面选了英语再切到英文界面，按钮显示
  `Translate to 英语`；反过来是「翻译为 English」，菜单里的选中标记两个方向都丢。
  这份配置存在 localStorage 里，错乱会一直跟着用户走。改为存 `LANGUAGE_CODES` 的
  代码，显示时按当前 locale 翻译；旧的标签值在界面首次拿到 locale 时自动迁移，
  反查不到（用户换过界面语言）就回到「未选择」，不会显示成另一种语言。
  语言代码还能命中 `AI_PROMPTS.translate.targetLanguages` 的展示名映射，
  那张表本来就是为代码准备的。→ 不变量 54
- **本地上传图片/视频失败时完全没有提示。** 两个上传弹窗都设了
  `:show-upload-list="false"`，antd 把文件标成 error 用户根本看不见，而 `catch` 里
  只有 `onError?.(e)`——宿主的 `uploadImage` 抛错、或返回了不合媒体白名单的地址时，
  **弹窗照常关闭、图片没插入、界面上什么也不出现**，用户会以为上传成功了。
  文案 `messages.imageUploadFailed` 早就在两份语言包里写好了，只是从来没有消费方
  （同仓库的 `WordButton` 是接上的）。→ 不变量 55
- **从块菜单插入媒体失败时同样无声，且视频那条文案根本不存在。**
  `pickMediaUrl` 用 `null` 同时表示「用户取消选择」和「上传失败」，调用方只能
  `if (!src) return`，两者分不开。提示改到最靠近失败点的地方发出（那里还知道原因，
  也已经拿着 `translate` 与 overlay portal）。补上缺失的 `messages.videoUploadFailed`
  ——`imageUploadFailed` 有而 video 没有，模板拼接的 key 字面量扫描器认不出来。
  → 不变量 55、约定 41
- **`resolveMediaUrl` 的非空断言在类型上说谎。** `normalizeSafeMediaUrl(...)!` 让函数
  声称返回 `string` 却可能交出 `null`，调用方会把 `src: null` 写进文档（`<img src="null">`
  会向 `<origin>/null` 发一次请求）。改成显式守卫并抛错，与 upload 路径同口径。

- **拖拽手柄的「转换为」把行内格式整个吃掉。** 转换项按 `node.textContent` 把块重建成
  纯文本，于是加粗 / 斜体、链接的 `href`、换行、mention 全部消失——`<p>普通<strong>加粗
</strong><a href="https://…">链接</a></p>` 转成标题 1 得到 `<h1>普通加粗链接</h1>`，
  链接地址无声丢掉。多块源（列表、表格、引用）还会把各块文字粘成一段
  （两项列表转正文得到 `<p>甲乙</p>`）。改为搬运源块的行内 `Fragment` 并按源块切分，
  一个源块产出一个目标块。→ 不变量 50
- **多行代码块转成正文后换行永久丢失。** 代码块的换行是文本里的字面 `\n`，直接搬进段落
  会输出 `<p>a\nb</p>`；HTML 解析把换行当普通空白折叠，`getHTML()` → `setContent()`
  往返一次就变成 `<p>a b</p>`。现在换行统一还原成 `hardBreak`，往返无损。
  反方向（转成代码块）仍走纯文本——`codeBlock` 的 content 是 `text*`、`marks: ""`，
  schema 只收得下纯文本，`hardBreak` 会被还原成 `\n`。→ 不变量 50
- **块菜单一移上去就消失，「转换为」根本点不到。** 真实浏览器实测：触发菜单的段落
  只有 26px 高，菜单 139px；指针从手柄移向菜单项、Y 一旦越过块底 + 12px 容差，
  `mousemove` 就按指针坐标重新做块命中，命中菜单**下方**那个块，于是把菜单关掉。
  - 号唤起的块选择器更严重（340px 高，指针还没走到第一项就没了），因为它连
    「是自己的浮层」都不在判定里。现在指针落在自己的交互面（手柄 / + 号 / 块菜单 /
    块选择器）上时一律保持现状，不重新命中；`mousemove` / `mouseleave` / `mousedown`
    三条路径收敛到同一个判据。→ 不变量 51
- **拖拽影像会泄漏，还会误删别的编辑器实例的那一份。** 影像是整个块的深拷贝，挂在
  `document.body`，不在编辑器根节点内。销毁路径完全没有收回它——拖拽途中宿主切
  locale / preset 触发会话重建，影像就永久留在页面上（实测 `destroy()` 后仍在）。
  而 `dragend` 的清理写成 `document.querySelectorAll(".drag-handle__drag-image")`，
  同页多实例时会把别的实例正在拖拽的影像一起删掉（实测 A 仍在拖拽、影像已被 B 抹掉）。
  改为由创建者持引用，`dragend` / 停止交互 / `destroy()` 三处只收自己那一份。→ 不变量 52

- **AI 高亮在深色下几乎看不见（对比度 1.18 : 1）。** `.ai-highlight` 的底色写死成
  `#fff7e6`（接近纯白），而高亮里的文字用的是继承来的 `--ye-text`——深色下是 `#e5e5e5`。
  浏览器实测浅色 14.8 : 1、深色 **1.18 : 1**（WCAG 正文要求 4.5 : 1），整段 AI 建议文字
  基本读不出来。颜色全部改走 `--ye-ai-highlight-*` token（浅色沿用原值，深色换成半透明琥珀
  `rgb(255 169 64 / 16%)`），`@keyframes` 也一并用 token，否则淡入终帧会把深色底再刷回浅色。
  修复后实测：浅色 14.8 : 1 不变，深色 **9.97 : 1**。
- **`table.css` 里 12 条规则被浏览器整条丢弃。** 该文件是普通 CSS（经 `index.css` `@import`），
  却写了 `:deep(...)`——那是 `@vue/compiler-sfc` 处理 `<style scoped>` 时才会消费的编译期标记，
  在这里没人转换，原样打进 `dist/style.css`，浏览器当成未知伪类丢弃**整条规则**。
  实测 `document.styleSheets` 的 829 条 style rule 里一条都找不到，`table.table-border-outer`
  想要的 `border: 2px solid #333` 算出来是 `0px none`。其中 `table-border-default / -none / -outer`
  三组全仓（含 examples / e2e / docs）零引用，直接删除；两条图标字号压缩改回普通后代选择器，
  其中 768px 那条与 `base.css` 的 `--ye-btn-icon-size` 断点同值（14px），一并去掉。
  新增静态护栏 `styles/scopedPseudoScope.test.ts`。对应不变量 30。
- **`toolbar-dropdown.css` 的窄屏压缩整块失效。** 媒体块写在文件开头、基础规则在后面，
  而 `@media` **不提升特异性**，同选择器同特异性只看源码顺序。浏览器实测 375px 视口下
  `matchMedia("(max-width: 768px)")` 命中，但下拉按钮算出的仍是 `height: 32px` / 图标 `18px` /
  文字 `14px`（媒体块想要 28 / 14 / 12）。把媒体块移到三条基础规则之后，实测恢复为 28 / 14 / 12，
  宽视口不受影响。同文件另两个媒体块本来就写在基础规则之后，是对的。
  新增静态护栏 `styles/mediaQueryOrder.test.ts`。对应不变量 29。
- **`appearance-word` / `appearance-notion` 的浅色态、以及 `appearance="custom"` 的
  派生 token 全部跟不上主题。** 这是不变量 26 形状 ① 的浅色版本：`:root` 上的纯别名
  （`--ye-table-border: var(--ye-border)` 这类）在 `:root`（= `<html>`）上就求值了，
  而改基础 token 的三条路径——外观类、深色属性、custom 的内联变量——全都落在**编辑器根节点**上，
  已经晚了。深色路径没暴露，是因为形状 ① 早已在深色段补过一遍。
  浏览器实测（修复前，word 浅色）：`--ye-border` 已是 word 的 `#d4d4d4`，但 `--ye-table-border`
  仍解析为全局 `#e9eaec`，表格单元格边框实测 `rgb(233, 234, 236)`；`--ye-caret` 是 `#3370ff`
  而非 `#0078d4`；`--ye-link-hover` 是 `#1456f0` 而非 `#106ebe`。word 断 10 个、notion 断 9 个，
  `appearance="custom"` 因为走内联变量而**全断**。
  修法是把 17 个纯别名在 `.yaniv-editor` 实例作用域重新求值一次（与 z-index 用 `.yaniv-editor`
  承载 `--ye-z-base` 派生同一个道理）。修复后实测：word 浅色单元格边框 `rgb(212, 212, 212)`，
  notion 浅色跟到 `rgba(55, 53, 47, 0.09)`，custom 内联 `--ye-border: #ff0000` 时 8 个派生 token
  全部变红；深色三套与 default 浅色**一处未变**。`darkTokenAliases.test.ts` 扩出形状 C。
  对应不变量 26 ③。
- **两个 CSS 静态护栏的扫描器会被注释里的花括号打乱，静默漏报。**
  `darkOverrides.test.ts` 的 `flatRules` 与 `darkTokenAliases.test.ts` 的 `parseRules` 都是
  逐字符找 `{` 切规则、**之后**才剥注释，于是注释里只要出现一个花括号
  （`.appearance-{name}`、`Table.configure({ resizable: true })` 这类说明文字里很常见），
  整份文件的规则切分就全部错位。探针实证：给一段本该报 1 条的 CSS 前面加一句含 `{` 的注释，
  findings 直接变成 `[]`。仓库里 `index.css` 与 `table.css` 的注释正好各含一个花括号。
  两处都改成**先把注释换成等长空白再切**（等长是为了保住行号）。
  **负结果**：补上这个洞之后重跑全仓，没有捞出被掩盖的真缺陷——这两个文件里注释之后的
  深色规则本来就都是换了值的。价值在于防止以后静默漏报。
- **提及菜单项、公式对话框按钮、颜色面板关闭按钮的字体退回浏览器默认。**
  三处都是 `<button>` 且渲染文字，但样式里没有 `font` / `font-family`——按钮不继承字体，
  Chromium UA 给的是 `Arial`。证据最直白的是提及菜单：同一个菜单里 `__empty` 这个 `<div>`
  实测 `"PingFang SC"`，而 `__item` 这个 `<button>` 实测 `Arial`；公式的「取消 / 确定」实测
  也是 `Arial`，而周围正文是 `-apple-system`。按第 7 棒立下的写法补 `font: inherit` +
  显式 `font-size`（另补 `line-height: normal`，免得连 `.ProseMirror` 的 1.7 行高一起继承过来），
  修复后实测字体跟随上下文、**盒子尺寸一处未变**（205×32 / 50×27）。
  仓库里另有 13 个纯图标按钮同样没有字体声明，**有意不动**——它们没有文字，加了反而会把字号
  从 UA 的 13.333px 换成继承值、改变图标度量。新增静态护栏 `styles/buttonFontInherit.test.ts`
  （只判会渲染文字的按钮）。对应约定 17。
- **`image-toolbar.css` 的深色 resize handle 规则从未生效。**
  写成 `[data-color-mode="dark"] .yaniv-editor …`，把编辑器根节点当成了该属性的**后代**；
  而 `data-color-mode` 是 `applyAppearanceToElement` 写在根节点**自身**上的，
  这要求另有外层祖先持有该属性，实际永远匹配不到。浏览器实测深色下 handle 底色一直是
  `rgb(26, 26, 26)`（即 `--ye-bg`）而非规则想要的 `#1f1f1f`——而 `var(--ye-bg)` 本就已是
  正确深色，该规则纯属多余，直接删除。`darkOverrides.test.ts` 补上这一形态的检查。
  对应不变量 31。

- **`appearance="word"` 下拖拽块菜单与斜杠命令菜单完全没有皮肤。**
  `drag-handle.css` / `block-picker.css` 的文件头写着「视觉皮肤见 appearance/styles/」，
  把底色、边框、阴影整个推给外观层，但没有任何东西保证每个外观都写了皮肤——
  而 `word.css` 里 chrome 选择器**一条都没有**（`default.css` 有 19 条，`notion.css` 有 67 条）。
  浏览器实测（Chromium 加载 `dist/style.css`）：word 外观下这两个菜单的 `background-color`
  都是 `rgba(0, 0, 0, 0)`，即**透明面板 + 黑字直接压在正文上**；`.drag-handle__dot` 同样没有
  背景色，六个拖拽点整个看不见；拖拽定位线 `prosemirror-dropcursor-block::before` 也是透明的。
  现在把基础皮肤收回结构层（全部用 `--ye-*` token），appearance 只在需要偏离 token 时覆盖。
  `default.css` 那两份副本与 token 基础层**逐字相同**，一并删除——等于同一份皮肤抄了三遍
  还漏了一遍。修复后实测：word 菜单底色 `rgb(255,255,255)` / `rgb(38,38,38)`，
  拖拽点 `rgb(136,136,136)` / `rgb(110,110,110)`；default 与 notion 的实测值一处未变。
  新增静态护栏 `styles/overlayBaseSkin.test.ts`。对应不变量 28。
- **大纲条目、大纲关闭按钮、块选择项的字体退回浏览器默认。**
  这三个都是从 `div` 改成 `<button>` 的（为了键盘可达性），但没有 `font: inherit`——
  按钮不继承字体，Chromium 的 UA 样式表给的是 `Arial`。实测三套外观、明暗六种组合下
  大纲条目的 `font-family` 全是 `Arial`，与正文的 `-apple-system…` / `ui-sans-serif…` /
  `Calibri…` 都对不上。修复后逐一跟随各自外观的字体。
  仓库里 `.drag-handle-menu__item` / `.ye-dropdown-*` / `.template-card` 都写了 `font: inherit`，
  这三处是漏网的。
- **删掉 `base.css` 里全部零引用的动画与工具类。** `ye-fade-in` / `ye-slide-in` / `ye-blink`
  三个 keyframes 与 `.ye-flex-center` / `.ye-hidden` / `.ye-visible` 三个工具类，
  在 `src` / `examples` / `e2e` / `docs` 里**一处引用都没有**，也不在任何公开文档中。
  各处动画本就在自己的样式文件里就地定义（如 `block-picker-fade-in`）。
  该文件只剩移动端 token 断点，文件头注释同步改正。
- **又一批与基础规则同值的深色覆盖（22 条）与状态覆盖（8 条）。**
  深色部分是**复合选择器**形态（`.x[data-color-mode="dark"]` 与 `.x` 各自成条），
  上一轮补的护栏只认后代形态（`[data-color-mode="dark"] .x`），于是又攒了一批：
  `.drag-handle-menu` / `.block-picker-menu` / `.continuous-pages` / notion 的复选框与拖拽点等。
  状态部分是 `--danger:hover` 的 `color` 与非 hover 同值——`VideoToolbar` / `ImageToolbar` /
  `LinkBubbleMenu` 与 notion 各两条（明暗各一）。删除前逐条算过特异性：
  `ImageToolbar` 的 `.image-menu-btn.active` 虽然同特异性且更靠前，但模板里
  `active` 只绑在对齐按钮上、`--danger` 只在删除按钮上，两者从不共存。
  `styles/darkOverrides.test.ts` 扩到复合形态，并显式**排除自定义属性**——
  token 层的同值声明是有意写的（见 `darkTokenAliases.test.ts`），两条护栏各管一层。
- **`notion.css` / `outline.css` 的死规则。** notion 的 placeholder `font-style: normal`
  （全仓没有任何规则把 placeholder 设成 italic，初始值本就是 normal）；
  `outline.css` 的 `.outline-panel__index`（组件里根本没有这个元素）、
  `.yaniv-editor .outline-panel` 的 `border/border-radius/box-shadow` 三条重置
  （基础规则不设这三项，唯一设它们的 notion 特异性更高且导入更晚）、
  以及 `--h1..--h6.is-active` 的颜色块（与上方 `.outline-panel__item.is-active` 同特异性同值）。
- **深色模式下一批 token 悄悄退回浅色值，三套外观都中招。** 两个独立成因：
  ① **派生 token 在声明处就被求值**——自定义属性的 `var()` 在**声明它的元素**上替换，不是在使用处。
  `:root` 上写 `--ye-table-border: var(--ye-border)`，`var()` 就在 `:root` 上算成浅色字面量再继承下来；
  编辑器根节点的 `[data-color-mode="dark"]` 再改 `--ye-border` 已经晚了。
  ② **外观浅色段盖住全局深色段**——`.yaniv-editor.appearance-X`（0,2,0）比
  `[data-color-mode="dark"]`（0,1,0）特异性高。`appearance-default` 还抄了一份与 `:root`
  **逐字相同**的 `--ye-primary` / `--ye-primary-hover`，唯一效果就是让深色主色永远退回 `#3370ff`。
  浏览器实测（Chromium 加载 `dist/style.css`，深色 / 浅色并排对比）：
  表格边框三套外观都是 `rgb(233, 234, 236)`，在 `#1a1a1a` 底上画出接近纯白的网格线；
  `<hr>`、行内代码边框同理；`appearance-default` 的链接与引用块边框停留在浅色蓝 `#3370ff`；
  `appearance-word` 的行内代码是 `#333` 压在 `#2d2d2d` 上，对比度约 **1.06:1**，等于看不见。
  现在 `variables.css` 深色段补齐 11 个派生 token（这一处是真正改变渲染的修复），
  三套外观的深色段各自补齐被自己遮蔽的 token。其中「需要深色下保持浅色值」的几条
  （Notion 的透明引用块与行内代码边框、Word 蓝）对渲染没有影响——外观浅色段的特异性
  本就压过全局深色段——写出来是为了让「有意保持」与「不慎遮蔽」在代码里能区分开，
  这正是 `--ye-code-text` 那条真缺陷当初藏得住的原因。修复后实测：表格边框 `rgb(55, 55, 55)` / `rgb(62, 62, 62)` /
  `rgba(255, 255, 255, 0.09)`，Word 行内代码 `rgb(212, 212, 212)`；**浅色侧数值一处未变**。
  新增静态护栏 `styles/darkTokenAliases.test.ts`（对两种形状各带自检用例）。
  对应不变量 26。
- **模板卡片一直顶着浏览器默认按钮的灰底，深色下标题几乎看不见。**
  `TemplateButton` 的 `.template-card` 由 `div` 改成 `<button>` 时，注释写明「需重置浏览器默认按钮样式」，
  却只重置了 `font` / `color` / `text-align` / `appearance`——**漏了 `background`**。
  `appearance: none` 只关掉原生控件绘制，不会清掉 UA 样式表的 `button { background-color: ButtonFace }`。
  浏览器实测：只写 `appearance: none` 的按钮计算出的 `background-color` 仍是 `rgb(239, 239, 239)`，
  补 `background: none` 才变成 `rgba(0, 0, 0, 0)`。于是深色模式下卡片标题 `#e0e0e0`
  压在灰底 `#efefef` 上，对比度约 1.15:1。仓库里其余 6 处按钮重置都显式写了 background，只有这里漏了。
  静态护栏 `styles/uaResetScope.test.ts` 增加第二条规则。对应不变量 27。
- **底栏缩放条卸载时不摘编辑器监听，edit ↔ preview 每来回一次泄漏两个。**
  `ZoomBar` 用 `watch(editor, (ed, oldEditor) => ...)` 的手接写法，只覆盖「换实例」，
  组件卸载时 watcher 只是停止、回调不再跑，监听就永久留在那个**仍然活着**的编辑器上。
  这条路径是真实可达的：`resolveChromePolicy` 在 `mode` 切到 preview 时把 `showFooter` 置 false，
  底栏整棵子树卸载，而 `computeSessionKey` **不含 mode**，编辑器并不重建。
  实测挂载/卸载三轮，监听数 4 → 6 → 8 单调增长，每个残留的 `updateCounts` 还跟着每次按键跑。
  改用 `onCleanup`（换实例与卸载都会触发），与 `HeadingControl` / `useControlledContent` 一致。
  `composables/editorListenerScope.test.ts` 增加第二条护栏：**组件**只要订阅编辑器事件，
  就必须存在随生命周期触发的退订。不变量 24 相应补上「卸载」这一半。
- **折叠块箭头的 `aria-label` 写死英文 `"Toggle"`，且没有 `aria-expanded`。**
  这是全仓唯一一个没走 locale 的 `aria-label`（其余 20+ 处都经 `t()`）。读屏用户既听不到
  本地化名称，也听不出当前是展开还是收起——图标旋转对辅助技术不可见。
  现在按 `DragHandleExtension` 既有的约定加 `getLocaleText` option，由 `registry.ts` 注入实例 locale，
  文案复用已存在的 `slashCommand.toggleBlock`（不新增 key）；`syncOpen` 同步写 `aria-expanded`。

- **嵌入块（bookmark / iframe）改了属性后画面不变，且永远回不来。** 节点视图的两个渲染函数
  读的都是**创建时**捕获的 `node`，而 `update()` 又返回 `true`（表示「已自行处理」，
  ProseMirror 因此不再重建视图）。ProseMirror 只在本节点属性变化时才调 `update()`，
  于是每一次属性更新都被视图吞掉：文档 JSON 已是新值，页面上还是旧卡片，且不会自愈。
  实测把 `url` 从 `https://old.example.com/` 改到 `https://new.example.com/`，
  卡片 href 与标题纹丝不动；把 `provider` 从 `bookmark` 切到 `iframe` 并同时换成 YouTube 地址，
  渲染出的 iframe 用的仍是旧的 `https://plain.example.com/`。
  同一仓库里 `video` / `resizableImage` / `toggle` / `callout` 四个节点视图都正确读
  `updatedNode`，只有这里漏了。现在视图持有 `currentNode` 并在 `update()` 里推进；
  包裹元素上的属性镜像同步跟进，且键取自 schema、属性被清空时 `removeAttribute`
  （此前 `value != null` 的一次性循环让清空后的旧值永久残留）。
  沙箱等级与 src 始终由同一份属性算出，因此旧行为虽然显示错乱但**不构成沙箱降级**。
- **大纲面板不会滚动到刚敲出来的标题。** 高亮项的自动滚动 watcher 用默认的 `pre` 时机，
  跑在组件重渲**之前**：此刻 DOM 还是上一版，新标题对应的按钮尚未创建
  （列表从空变非空时连 `listRef` 都还是 `null`），`querySelector` 取到 `null` 就静默跳过。
  而下一轮 `syncItems` 算出的 `activeItemId` 没变，又被 `id === prevId` 提前返回，
  于是这次滚动**永远补不回来**——直到用户把光标移到另一个标题上。
  实测：真实编辑器里插入 `<h2>` 并把光标放进去，`scrollIntoView` 一次都没被调用。
  改为 `flush: "post"`。
- **提及节点把 `id` / `label` 写成了裸 HTML 属性。** `addAttributes` 用的是默认属性渲染，
  于是输出 `<span id="page-home" label="首页" …>`。`id` 是 HTML **全局属性**：
  同一个页面被提及两次就产生**重复 DOM id**（实测两个 span 同为 `id="app"`），
  而提及 id 来自宿主注入的 `mention-items` 数据，撞上宿主页面已有的 id 就会劫持
  `getElementById` / `:target`（实测 `document.getElementById("app")` 命中的是文档里的提及块）；
  `label` 也不是 `span` 的合法属性。两者的值又与同一个 `renderHTML` 里显式写的
  `data-id` / `data-label` 完全重复。现在三个内容属性统一以 `data-*` 输出，
  与同级的 `mentionType` 一致。`getJSON()` 完全不变；`data-id` / `data-label` 本就一直在写，
  所以历史 HTML 照常读回（有用例锁定）。
- **切换编辑器实例时漏摘旧实例上的事件监听（4 处同型）。** 退订函数里读的是
  `editor.value` / `toValue(editor)`——而 `watch(editor, cb)` 的回调触发时它**已经是新实例**，
  于是 `off()` 全打在刚换上的实例上（那上面还没有监听），旧实例的
  `update` / `selectionUpdate` / `transaction` 一个也摘不掉。涉及
  `FormatPainterButton`、`UndoRedoButton`、`useEditorColorState`、`CodeBlockLanguageBadge`
  ——最后一处写了 `if (prev) unbindEditorEvents()`，看着用了 `prev`，实际 `unbind` 内部
  读的仍是 `editor.value`。统一改成由参数接收待退订的实例，与 `ZoomBar` / `OutlinePanel` 一致
  （另一种正确写法是 `onCleanup` 闭包，见 `HeadingControl` / `useControlledContent`）。
  实测：换实例后旧实例的监听计数纹丝不动，修复后精确回到基线。
  新增静态护栏 `composables/editorListenerScope.test.ts`，对四处历史缺陷全部报警。
- **撤销/重做按钮还叠加了两处独立缺陷。** ① 订阅被包在 `nextTick` 里，而
  `if (editor.value) setup()` 与 `{ immediate: true }` 各调一次 setup，清理跑在订阅之前
  ——于是每个事件挂了**两份** handler，每次事件回调跑两遍（实测挂载后监听数 +2）。
  ② 订阅了 `create` 事件：编辑器由父组件构造完才传进来，`create` 早已 emit 过，
  那个回调**永远不会执行**；它又是匿名函数，而退订写的是 `off("create", updateUndoRedoState)`
  （另一个引用），于是每换一次实例就多攒一个摘不掉的监听（实测 2 → 4 → 5 单调增长）。
  已去掉 `nextTick` 与重复调用，并整体删除 `create` 订阅。
- **代码块语言角标在卸载后仍可能访问已销毁的编辑器。** `scheduleUpdate()` 直接
  `requestAnimationFrame(updatePosition)` 且不留句柄，卸载时无从取消；排队中的回调随后
  执行 `updatePosition`，而 `editor.view` 在销毁后是**直接抛错**的（不变量 15），
  组件卸载与 session 重建恰好同时发生时就会抛出未捕获异常。现在保留帧句柄，
  重复调度时先取消上一帧，卸载时一并取消。

- **白名单拦下危险媒体 URL 后，浏览器反而会向宿主自己的域名发一次无效请求。** 图片与视频的
  节点视图都直接写 `el.src = node.attrs.src`。`src` 是 DOM 字符串属性，赋 `null` 会被强制成
  字符串 `"null"`——而 `src` 为 `null` 恰恰是白名单**拒绝之后**的正常状态
  （`normalizeSafeMediaUrl` 不合格返回 `null`，事务级守卫据此把 attrs 写回 `null`）。
  于是 `<img src="javascript:…">` 被拦下后，DOM 上留下的是 `<img src="null">`，
  浏览器真的去 GET `<origin>/null`（实测 `.src` 解析为 `http://localhost:3000/null`）：
  宿主服务端凭空多出 404、图片触发 `onerror`。没有 src 的节点（`insertContent({type:"image"})`）
  同样中招。现在统一走 `applyMediaSrc()`——没有可用值时**移除属性**而不是赋空值
  （赋 `""` 同样不行，空 URL 会被解析成当前页面地址并重新请求本页）。
  这是媒体 src 白名单的第四个落点，已补进 `mediaSrcPolicy.ts` 的入口表与不变量 17。
- **视频尺寸沿用裸 `parseInt`，非法值会把 `NaN` 写进 attrs。** 图片扩展早先修过这个问题
  （`parseSize` 守卫），但同型缺陷还留在 `video.ts` 未被扫到。`width="abc"` → `NaN` 进 attrs，
  `getJSON()` 又把它序列化成 `null`，宿主看到的值与文档实际值不一致；节点视图 `update()` 里
  `NaN !== NaN` 恒成立，每次事务都误判「尺寸变了」。判定提取为共享的 `utils/mediaSize.ts`，
  图片与视频共用同一份实现。

- **块级公式每存读一轮就多出两个空段落，且逐轮累积。** `math` 声明为 `inline: true`，
  只会出现在段落等 inline 容器里，但 `renderHTML` 按 `data-block` 把块级公式序列化成
  `<div>`，于是 `getHTML()` 产出 `<p><div data-type="math"></div></p>`——div 不是
  phrasing content，不是合法 HTML。存库后经 `setContent()` 回读时，HTML 解析器会在 div
  处把 `<p>` 劈开，公式前后各留一个空段落；再存再读又各多一个，N 轮后凭空多出 2N 个空段落
  （实测 1→3→5→7→9 个顶层节点）。公式若插在句中，那句话还会被拦腰截断成两段
  （`before` → `be` + 公式 + `fore`）。HTML 是本库的一等内容通路
  （`setHtml` / `v-model:content` 都收 HTML 串），因此这是真实的内容损坏。
  现在一律序列化为 `span`，块级与否只由 `data-block` 与 `math-block` class 表达，
  展示仍由 NodeView 的 `.is-block` 样式负责。`parseHTML` 保留 div 变体，
  已落库的历史内容照常读回（有用例锁定）。
- **未选中的数学公式常态显示为一个灰色系统按钮。** `.math-display` 由 `span` 改成
  `<button>` 以获得键盘可达性，注释也写明「需重置浏览器默认按钮样式」，
  但整组重置（`font: inherit` / `color: inherit` / `appearance: none` / `background` /
  `border`）被写进了 `.math-node-wrapper.is-selected`，只在选中时生效；仓库里没有任何
  全局 button 重置兜底，于是公式平时一直顶着 UA 的按钮外观（灰底、`outset` 边框、
  非继承字体），一选中反而"变正常"。重置移回基础选择器，`.is-selected` 只留 `outline`。
  全仓扫过其余 6 处 UA 重置均正确落在基础选择器上，并补静态护栏
  `styles/uaResetScope.test.ts` 防止再写回状态选择器。
- **公式渲染出错后，改对了也回不来。** `renderLatex` 在两个 `computed`（显示态 / 编辑态预览）
  里写同一个 `renderError` ref，而模板是先读 `renderError` 再决定要不要读 `previewHtml`：
  一旦出错切到 `v-if` 分支，预览 computed 就不再求值，也就再没人把错误清回 `null`——
  错误提示粘住、预览永远回不来。渲染改为纯函数 `renderMath()` 返回 `{ html, error }`，
  组件侧只做纯派生，从结构上杜绝这类粘滞状态。该路径需宿主显式设 `katexOptions.throwOnError: true`
  才可达（缺省 `false` 时 KaTeX 就地渲染错误、不抛错），但 `throwOnError` 是公开选项。
  顺带修掉两处：KaTeX 报错文案里原样带着用户输入的 LaTeX，此前未转义就拼进 `v-html`
  （实测 `\q<img src=x onerror=...>` 的报错里确有裸 `<img`）；`latex` 非字符串时
  `.trim()` 会抛 `TypeError`，现按空公式处理。

- **「复制块」之后，图片工具栏会操作到错误的那张图。** `getCurrentImageInfo` 在选区不是
  `NodeSelection` 时（拖选恰好框住一张图就是这种情况，`isActive("image")` 同样为真），
  拿节点**对象**去 `doc.descendants` 里反查位置。两个问题叠在一起：「复制块」走的是
  `node.copy(node.content)`，副本与原块**共享同一批子节点实例**，文档里两处 image
  于是真的是同一个对象；而 `descendants` 回调返回 `false` 只表示「不再向下递归」、
  并不终止遍历，所以反查命中的是**最后**一处——框住前一张图，对齐 / 预览却作用到后一张
  （实测确认两处 image `===` 成立、反查返回后一处的位置）。现在位置一律由选区推出
  （`nodeAfter` 起于 `$anchor`、`nodeBefore` 止于 `$anchor`），既精确又是 O(1)，
  与 `VideoToolbar` 里本就正确的写法对齐。该逻辑与对齐一起提到 `imageToolbarActions.ts`，
  以便直接测到。

- **查找替换开正则模式后，一个半截模式就能卡死编辑器。** `getRegex()` 直接 `RegExp(term)`，
  而它是在 ProseMirror 插件的 `apply` 里被调用的：宿主设了 `disableRegex: false` 时，
  用户敲 `(foo)` 的过程中必然先经过 `(`，`SyntaxError` 从 `apply` 抛出打断整条 transaction。
  更糟的是坏搜索词此时已经存进 storage，此后**每一次**事务（包括正文里正常打字）都会
  重新编译它再抛一次——编辑器一直卡到搜索词碰巧重新合法为止（实测确认）。
  现在非法模式按「无命中」处理，与主流编辑器的正则搜索一致。本扩展此前没有任何测试，
  一并补上 13 个用例（跨 mark 匹配、块边界、大小写、替换、导航、退出编辑态自清理）。
- **给图片设对齐会把后面那一段也一起对齐。** 选区终点写成
  `$pos.start(depth) + parent.nodeSize`，而 `nodeSize` 含首尾两个标记、比 `content.size` 大 2，
  于是选区越过本段落伸进下一个块，`setTextAlign` 一次改两段。改用 `$pos.end(depth)`；
  这段位置算术从 `ImageToolbar.vue` 提到 `imageAlign.ts`，以便直接测到。
- **不带前导斜杠的相对媒体路径被改写成外部地址。** `normalizeSafeMediaUrl` 的
  「无协议就补 `https://`」分支只放过 `/`、`./`、`../` 开头的相对路径，于是
  `<img src="a.png">` 被改成 `https://a.png/`（把文件名当成了主机名）、
  `images/a.png` 被改成 `https://images/a.png`。图片直接失效，而且这个被改坏的值会经
  `getJSON()` 回到宿主并被持久化。现在只有形如 `host.tld/path`（首段含点且带路径）
  才当作省略了协议的绝对地址，其余按相对路径原样保留——无协议的值本就不可能承载
  可执行 scheme，这与 `isSameDocumentReference` 放行 `./a.png` 的理由是同一条。
  链接侧 `normalizeSafeUrl("example.com/x")` 的补全行为不变（那是有意的、且有用例锁定）。
- **文件选择器被取消时泄漏。** `pickMediaUrl` 只监听 `change`：用户直接关掉选择器不会有
  该事件，于是那个隐藏 `<input>` 永久留在 `document.body` 里、Promise 也一直悬着，
  每取消一次泄漏一份。现补上 `cancel` 事件。
- **清理恒为空操作的 dark 覆盖（21 条声明 / 11 个块）。** 主题走 CSS 变量，
  `--ye-border` / `--ye-footer-divider` 这些 token 本身已在 `variables.css` 的 dark 段改写过，
  所以形如 `[data-color-mode="dark"] & { border-color: var(--ye-border); }` 的覆盖
  **永远**算出与基础规则相同的值。涉及 `zoom-toolbar.css`（6 个 dark 块全是空操作）、
  `ColorPicker` / `TableButton` / `ImageToolbar` / `LinkBubbleMenu` / `VideoToolbar` / `ToolbarNav`。
  同时删掉 `CustomAiPopover` 里与基础规则同值的 `:has(.footer-right)` 规则、
  `ToolbarNav` 注释掉的 `min-height` 与随之失效的 `$dark-selector` 变量。
  新增静态护栏 `styles/darkOverrides.test.ts` 扫描全仓库样式，对将来新写的样式同样生效。

- **AI 流式响应遇到网络分片会整段丢内容。** 三个 adapter（openai / aliyun / ollama）各写了一份
  `decoder.decode(value)` + `chunk.split("\n")`：网络分片**不保证**落在行边界或字符边界上，
  一旦一行 SSE / NDJSON 被劈成两个 chunk，前半段 `JSON.parse` 抛错、后半段不再带 `data:` 前缀，
  两半都被 `catch {}` 静默吞掉——那一整段增量凭空消失（实测 `onComplete` 收到空串）。
  多字节字符被劈开时，缺少 `{ stream: true }` 的解码还会解出 U+FFFD，对中文输出尤其致命。
  现抽出共用的 `readStreamLines()`：解码器跨 chunk 续接半个字符，行缓冲跨 chunk 拼接，
  流末冲刷无换行的残行。原有测试每个 chunk 都恰好是完整的若干行，覆盖不到这条路径，
  新增按**字节**切分的回归用例。
- **`useAiConfig().isConfigured` 永远不更新。** 写成 `computed(() => store.isConfigured())`，
  而该方法读的是 localStorage 与模块级变量，Vue 追踪不到任何依赖——computed 首次求值后
  永久缓存，用户在设置弹窗里存好配置，这个公开派生量仍旧回 `false`。改为从响应式 `state` 推导。
  「配置是否可用」的判定此前有三份完全相同的副本（`store.isConfigured()` /
  `resolveRequestConfig()` / 本处），一并收敛为 `isUsableAiConfig()` 单一实现。
- **删除死代码：** `features/ai/config/index.ts`（零导入方的 barrel，公开 `ai` 入口走的是
  `features/ai/index.ts`，不经过它）、`prompts.ts` 的 `AiFeature` 类型（全仓库零引用）。
  并修正 `envConfig.ts` 里一处注释：守卫用的是 `Number()`，注释却写 `parseFloat()`——
  两者行为不同（`parseFloat("1.5x")` 得 1.5，`Number("1.5x")` 得 NaN）。

- **`@` 提及的候选项配置此前完全失效。** `MentionOptions.suggestionItems` 声明了、给了默认值，
  但**没有任何读取方**：`MentionSuggestionMenu` 直接调 `getMentionSuggestions(query)` 吃内置占位数据，
  块菜单的「页面链接」也写死一条 `{ id: "page-docs", label: "文档" }`。现改为 getter
  （`getSuggestionItems`，避免 `configure()` 构建期取值造成 stale closure），新增
  `resolveMentionItems(editor)` 作为唯一读取入口，菜单与块菜单都经它取值；并补上宿主入口
  `mention-items` prop。回归护栏见 `mentionItems.test.ts`。
- **`VITE_AI_TEMPERATURE` / `VITE_AI_MAX_TOKENS` 此前是死配置。** `loadAiConfig()` 会读它们，
  但 `getAiConfig()` 的返回类型不带这两个字段、`resolveAdapter()` 也只传
  provider / apiKey / baseUrl / model，最终永远用 `createAiConfig()` 里写死的 0.7 / 2048。
  现在贯通到 adapter 请求体。注意它们**不跟随凭据来源分级**：宿主 `ai-config` 与 localStorage
  都不含这两项，若按凭据那套「命中即返回」走，只要用户在设置弹窗里配过 key 就永远读不到 `.env`
  的值——所以调参单独解析。顺带修掉 `parseFloat("abc")` 会把 `NaN` 发给 provider 的问题。
- **AI 子包的 UI 文案接入 locale。** 此前这些位置在 en-US 界面下仍是中文：AI 设置弹窗的
  「API Key 存储方式」区块（标签 / 三个下拉项 / 提示语）、`AI_PROVIDERS` 的提供商名称与说明、
  连接测试结果（「连接成功」「连接超时」「请输入 API Key」…）、client 的未配置提示与请求失败兜底、
  以及演示模式的 5 段流式文案。分层原则：无 locale 上下文的模块只回 key，翻译交给持有
  `useEditorT()` 的组件；`client.ts` 由 `createConfiguredAiClient` 注入实例解析器。
- **快速切换 `locale` 会让界面语言与 `locale` 永久对不上。** `provideEditorLocale` 在 watch 回调里
  `await` 语言包的动态 import，却没有陈旧守卫：先切 zh→en 时若 zh 的 chunk 晚于 en 落地，
  zh 会把 en 覆盖掉——`locale` 报 `en-US`、界面全是中文，且直到下次切换都不会自愈。
  这条路径此前还额外预载 en-US 包，正好让「后发先至」更容易发生。现改为 `onCleanup` 置陈旧位后丢弃过期结果。
  回归护栏见 `useEditorLocale.test.ts`。
- **EditorShell 重复加载语言包。** `provideEditorLocale` 已经加载了一份，Shell 里又起了一个 watch
  调 `resolveLocaleMessages` 加载第二份，两份状态各自竞态、可能停在不同语言上。现统一用
  `ctx.messages` 单一来源，`resolveLocaleMessages`（已无消费方）随之删除。
- **实例 locale 白下载一份 en-US 语言包。** `provideEditorLocale` / `resolveLocaleMessages` 都调
  `ensureLocalesLoaded(code, "en-US")`，但实例 `t()` 未命中时直接返回 key、从不查兜底包——
  这份 chunk 没有任何读取方。内置两包的 key 集合由 `localeParity.test.ts` 保证一致，
  兜底包也不可能补上缺失的 key。默认 zh-CN 场景因此每次挂载都白拉一次 en-US。
- **`createI18n({ fallbackLocale })` 是个被静默忽略的选项。** 该值只传给了预加载，`t()` 里把
  `"en-US"` 写死，于是 `fallbackLocale: "zh-CN"` 既不报错也不生效。现提升为模块级状态供 `t()` 读取；
  兜底段同时补上 `customMessages` 查询——内置两包 key 集合恒等，缺 key 只可能出现在自定义包，
  只查内置包的话这一段永远命不中。
- **带占位符的文案靠调用点手写 `.replace()`。** 全局 `t()` 支持 params，实例 `useEditorT()` 只接 key，
  而 chrome 组件被禁止使用全局 `t()`——于是 `editor.galleryCount` / `editor.translateTo` 只能在
  各自调用点手写 `.replace("{total}", …)`。漏写一处，用户界面上就直接出现 `{total}`。
  现在两者共用 `interpolate`，调用点传参即可；新增静态护栏 `localeParams.test.ts` 扫描全仓库源码，
  对将来新增的文件同样生效。单趟替换还顺带堵住「参数值里含 `{x}` 被后续参数二次替换」。
- **`useEditorSession` 的 `locale` 类型说谎。** 声明为 `ComputedRef<TiptapLocale>`，实现里却处处判空
  （语言包落地前确实是 null），调用方只能用 `!` 强行绕过。改为 `Ref<TiptapLocale | null>`，
  让类型与既有守卫一致。
- **格式刷：删除无消费方的 `toggleContinuousMode` 命令**（全仓库零调用，却出现在 `Commands` 类型增强里，
  下游会看到一个不存在的命令补全），以及未被任何模块引用的 `sampleFormats` / `FormatPainterFormats` 导出。
  `startContinuousFormatPainting` 此前是 `startFormatPainting(2)` 的整段复制（约 25 行），改为直接转发。
- **删除死 CSS `.gallery-footer` 的 dark 覆盖**（`border-top-color: var(--ye-border)` 与基础规则同值，
  而 `--ye-border` 本身已随 dark 模式改写，该覆盖恒为空操作）。
- **删除死 CSS `.yaniv-inline-editor__status`**（无任何组件使用该 class）与 `ColorPicker`
  里两分支完全相同的三元（`props.type === "text" ? DEFAULT_COLORS : DEFAULT_COLORS`）。

- **同页多编辑器切换 AI 会话会永久遗留高亮标记。** `aiSuggestionManager` 是模块级单例，
  旧的 `ensureEditor` 直接 `this.editor = editor` 就换人，于是上一个实例的 `ai-highlight`
  再没人清得掉（`hide()` 之后只作用于新实例）。这不只是视觉残留：该 mark 会被序列化进
  `getHTML()` / `getJSON()`，污染宿主保存的内容；旧实例的 click handler 也永远摘不掉。
  现在切换实例前先 `hide()` 把上一个复位干净。
- **门控组件 chunk 加载失败不再静默。** 代码分割引入了一个新失败模式：部署更新后旧页面
  请求已被替换的 hash 文件（`Failed to fetch dynamically imported module`）。Vue 默认只渲染空，
  生产构建里没有任何提示，接入方看到的是"某个按钮莫名不见了"。新增
  `defineGatedAsyncComponent`（25 处调用点统一接入），失败时打出带组件名与处置建议的
  `console.error`，并用空占位组件收住错误——否则 `fail()` 会把错误抛给宿主
  （实测能让测试进程以退出码 1 结束）。这与仓库在 terser 配置里特意保留
  `console.warn` / `console.error` 的决定一致。

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
- **Word 导出丢引用块正文。** `parseBlockNodes` 先把 `<blockquote>` 里的内容解析成
  `Paragraph`，再试图 `{...(inner as any).options}` 取回构造参数、重包一层加缩进与左边框。
  但 docx 的 `Paragraph` 构造完只剩 XML 树，**没有 `options` 属性**（实例上只有
  `rootKey` / `root` / `fileChild` / `properties`），`|| {}` 兜底后重建出的是一个
  **没有 children 的空段落**——文档里每个引用块导出后都只剩一条带边框的空行，正文全丢。
  `as any` 让整个对象字面量退化成 `any`，连 `style: "single"` 这种本该报错的写法也一并放行。
  现改为在构造时下发段落装饰（`parseBlockNodes(el, BLOCKQUOTE_STYLE)`），不再事后重包。
- **Word 导出的嵌套列表内容重复。** `parseListItem` 对 `<li>` 整体调 `parseInlineNodes`，
  而后者会一路递归到底，把子列表的文字并进父项；紧接着又按层级把同一批文字作为嵌套项
  输出一遍，于是每层嵌套内容在 .docx 里出现两次。原代码的 `runs.filter((r): r is TextRun => ...)`
  注释写着「排除嵌套列表生成的段落」，但 `parseInlineNodes` 的返回类型里**根本没有段落**，
  该过滤恒为全通过——类型谓词也是错的（`ExternalHyperlink` 被断言成 `TextRun`）。
  现新增 `parseListItemInline`，只取列表项自身的行内内容。
- **AI 悬浮层在编辑器销毁后会抛 `The editor view is not available`。** 上一轮加了
  `liveEditor()` 做存活判断，但只用在了 `show` / `showContinueWriting` / `accept` /
  `hide` 上；`updateHighlightMeta`（**每个流式 token 都会走**）、`showCustom`、
  `executeCustomPrompt`、`beginSession`、`setupClickHandler` / `removeClickHandler`、
  `restoreSuggestion`、`mountPopover` 仍在裸用 `this.editor`。销毁后 `editor.state`
  还能读（有缓存），但凡走到 `editor.view` 的都会抛：派发事务、读 `view.dom`、
  `showEditorNotice` 全在此列，而这些调用大多在流式回调里，无人捕获。现全部经 `liveEditor()`
  取用，异步回调在**回调发生时**重取。原注释「任何 `editor.view` / `editor.state` 访问都会抛」
  也据实测更正。
- **`hide()` 在编辑器已销毁时漏复位会话状态。** 那条早退分支的注释写着「仍要复位自身状态，
  否则下一个 session 会读到脏数据」，但代码只复位了 `visibleRef`，没有复位 `state` /
  `mode` / `userContextRange` / `customClient`——于是 `isVisible()` 恒为 `true`、
  `getState()` 一直返回上一轮的建议文本、`customClient` 停在上一个实例的 client 上。
  现在复位与编辑器存活与否无关，只有「清高亮」「摘监听」两步需要活着的实例。
- **AI 悬浮层在编辑器销毁时不会自我收尾。** `aiSuggestionManager.destroy()` 是公开方法，
  但生产代码里**没有任何调用方**——session 重建与组件卸载都只 destroy editor
  （`useEditorSession` 三处）。于是编辑器被销毁时，已挂载的弹层 Vue app 永远不会 unmount，
  会话状态也留在单例里。也不能反过来让 session 层来调：AI 是门控能力，主 chunk 里出现它
  会打穿代码分割断言。现改为在 `init()` 里订阅编辑器自身的 `destroy` 事件并持有显式反订阅
  句柄（换实例时先摘旧监听，避免监听随实例累积）。Tiptap 先 emit 再拆 view，因此收尾时
  点击监听还能摘干净，但不再派发任何事务。
- **AI 弹层不再伪造 locale 注入上下文。** 弹层由独立 `createApp` 挂载，继承不到 EditorShell
  的 provide，早先的做法是自铺一份 `editorLocaleKey`——其中 `t` 是真的，`locale` 却写死
  `"zh-CN"`、`messages` 写死 `null`。今天没有组件读这两个字段，所以没有可见症状，但任何
  未来读它们的组件都会拿到与实例不符的语言。现改为把 `t` 作为**显式 prop** 传给
  `AiSuggestionPopover` / `CustomAiPopover`（两者新增可选 `t` prop，未传时仍回退到组件树
  里的 `useEditorT()`，对宿主直接挂载这两个公开组件的用法完全兼容），独立挂载点不再伪造
  任何注入上下文。顺带把弹层的文案解析器改为晚绑定，不再快照挂载那一刻的 `getLocaleText`。
- **DragHandle 的 mousemove 重复注册。** 同一个处理器同时挂在 `handleRoot` 与 `document`
  上，而 `handleRoot` 就在 `document` 里、没人对 mousemove `stopPropagation`——鼠标每移动
  一次就跑两遍，每遍都要做 `getBoundingClientRect` / `posAtCoords` / `elementFromPoint` /
  `getComputedStyle`。现只保留 `document` 一处（菜单挂在 overlay portal，也只有这一层覆盖
  得到）；`mouseleave` 不冒泡，仍留在 `handleRoot`。
- **图片拖拽写回尺寸时可能把 `NaN` 存进文档。** `resizableImage.ts` 里那段注释早就写明
  「`parseInt("abc")` 得到 NaN，写进 attrs 会破坏后续缩放计算，`getJSON()` 又会把它序列化成
  `null`，导致宿主看到的值与文档实际值不一致」——但守卫只加在**解析**路径，拖拽结束的
  **写回**路径仍是裸 `parseInt(img.style.width)`。图片尚未加载完、或只是在手柄上点一下没拖动时，
  `img.style.width` 是 `""` / `"auto"`，于是 `setNodeMarkup` 把 `NaN` 写进 `width` / `height`。
  现把「合法像素尺寸」判定提到模块级 `parseSize`，解析与写回共用；算不出合法值时**不写文档**。
- **dot-path 取词有四份重复实现。** `locales/manager.ts`、`core/infra/useEditorLocale.ts`
  与 `capabilities/registry.ts`（AI、dragHandle 各一份）各写了一遍行为等价的走法，
  而四者作用的都是同一个 `TiptapLocale`（`LocaleMessages` 就是它的别名）。现收敛为
  `locales/resolveMessage.ts` 一份（不导出到包入口，公开 API 不变）。顺带修掉 `t()` 的
  哨兵值缺陷：旧写法拿「返回值 === key」判断未命中，自定义语言包里译文恰好等于 key 的条目
  会被误判为没查到而继续往下找；新实现未命中返回 `undefined`，用 `??` 串联回退链。
- **表格工具按钮的 tooltip 永久显示原始 key。** `TableButton.vue` 与 `TableToolbar.vue`
  在 setup 顶层调用 `t()` 并把结果存进**普通数组**。语言包是异步加载的（见
  `provideEditorLocale` 里 shallowRef 的注释：setup 执行时 `messages` 还是 null），
  于是存下来的是 `table.addRowBefore` 这样的 key，加载完成后也不再更新，切换 locale 同理。
  实测（等语言包加载完再打开面板）10 个按钮的 tooltip 全是 key。现改为 `computed`。
  另加一条静态护栏测试，挡住「把 t() 结果冻进顶层字面量」这个写法本身。
- **链接气泡里两个 watch 从不触发。** 注释写着「监听编辑器选择变化 / 状态更新」，
  但 `editor` 是 shallowRef、ProseMirror 的 state 不是响应式对象，
  `() => editor.value?.state` 这类 getter 只会在**编辑器实例**变化时重跑——选区与文档
  变化根本不触发；而 `deep: true` 还让每次重跑都深度遍历整个 state 对象图（文档全树、
  schema、各插件状态）。链接 URL 的实时来源本来就是 `shouldShow` 的回调。现收敛为
  只在实例切换时复位一次。
- **`inline-starter` 的 undoRedo gate 写法与同侪不一致。** `g.undoRedo !== false` 暗示
  「未设置即开启」，但 inline gates 全部由 `resolveInlineGates` 推导、恒为布尔值
  （不变量 10），该分支永远走不到，只会让人误以为它有不同的默认语义。改为 `g.undoRedo`。
- **再删一批死代码。** DragHandle 块菜单的 `BlockMenuItem.description` 字段、其渲染分支
  与三处样式（`drag-handle.css` / `default.css` / `notion.css`）里的
  `.drag-handle-menu__description` 规则——**没有任何生产者**会设置该字段（且
  `is-actions-menu` 下还写着 `display: none`，菜单又只有这一种形态）；`createList` 里
  从未被调用的 `taskList` 分支；`ColorPicker` 的 `gap` prop（声明并文档为「颜色块间距，
  默认 8px」，但组件从不读取，实际间距由 CSS 固定为 6px，宿主传了毫无效果）。
- **再删一批死 CSS 与死工具函数。**
  ① 14 条与基础规则**同值**的深色覆盖（`.template-card` / `.grid` / `.grid-cell` /
  `.floating-menu` / `.menu-group` / `.heading-icon` / `.ye-heading-dropdown-overlay …` /
  `.yaniv-editor.document-layout`）。这是 `0.2.0` 清掉 21 条的**同一个问题换了个写法**：
  既有护栏只认 SCSS 嵌套的 `[data-color-mode="dark"] &`，认不出纯 CSS 里
  `[data-color-mode="dark"] .x { }` 与 `.x { }` 各自成条的平铺形态。删除前逐条算过特异性，
  确认没有介于两者之间、值又不同的规则（`notion.css` 里同名规则特异性更高且更靠后，本就压过它们）。
  `styles/darkOverrides.test.ts` 补上平铺形态的扫描。
  ② `utils/prosemirrorUtils.ts` 里的 `buildParagraphNodesFromText` 与 `hasNewlines` ——
  全仓零 import，覆盖率报告里 `FNDA:0`（一次都没执行过），且未从任何包入口导出
  （`publicApi.test.ts` 快照不变）。仓库里也不存在与之重复的第二份实现，纯属残留。
- **`ToggleExtension` 自己算了一遍 placeholder 空态，与 `callout` 的做法分家。**
  `YanivPlaceholder` 已经把 `is-empty` + `data-placeholder` 作为**节点装饰**下发
  （`CONTAINER_PLACEHOLDER_TYPES` 含 `toggleBlock`），`callout` 直接消费装饰，而 `toggle`
  另起炉灶：每次节点视图更新都扫一遍 `editor.extensionManager.extensions` 找 placeholder 扩展，
  还硬传 `hasAnchor: true`。两处收敛到共享的 `shared/nodeViewDecorations.ts`，
  装饰 → DOM 的映射只剩一份；类改为增量增删，不再整体赋值 `dom.className`。
- **Word 列表层级来自剪贴板却没有上限，畸形值直接打断整次粘贴。** `transformLists` 把
  `mso-list` 里的 `level{N}` 原样喂给 `while (level > stack.length)` 建嵌套列表。
  实测 `mso-list:l0 level5000 lfo1` 创建 5000 层嵌套 `<ul>`，序列化时 parse5 递归
  **爆栈抛 `RangeError`**（耗时 2.4s）——而 `transformPastedHTML` 抛异常会让这次粘贴整体失败。
  层级按 Word 自身上限钳制到 `[1, 9]`。`level0` / `levelX` 这类解析异常此前会算出 `0` / `NaN`，
  两个 `while` 都不进、栈为空，段落被 `el.remove()` 删掉而内容没有任何去处——实测输出**空字符串**，
  整段内容静默丢失；钳制后这类值收敛为第 1 级，正常成列表。对应不变量 34。
- **`mso-list:none` 的段落被误转成无序列表。** Word 用它显式声明「这段**不是**列表项」，
  而 `transformLists` 只看 `style` 里有没有 `mso-list:`，实测
  `<p style="mso-list:none">普通段落</p>` 变成 `<ul><li>普通段落</li></ul>`。
  改为解析不出列表 id 就原样放过（不转换、更不删除）。同时把 id 正则从 `/l[0-9]+/` 改为
  `/^l\d+$/`：未锚定时 `level1` 的第 5 个字符起正好是 `l1`，会冒充列表 id 让这条早退失效。
- **Word 写死的 `color:black` 只清掉了一半，深色模式下就是黑底黑字。** 清理规则用
  `[style*="color: black"]` 匹配 style 属性的**子串**，而带空格的形态只在元素**恰好含 `mso-` 属性**、
  被上一步重写过之后才会出现。实测 `<p style="color:black">`（Word 的原样输出，无空格、无 `mso-` 同伴）
  完全漏网，`#000` / `#000000` 同样漏；而 `background-color: black` 反倒因为包含该子串被选中。
  改为遍历 `[style]` 用 CSSOM 读 `el.style.color` 判定，浏览器把 `black` / `#000` / `rgb(0,0,0)`
  统一归一化成 `rgb(0, 0, 0)`，`background-color` 不再误伤。
- **CSS 声明按 `;` 朴素切分，data URL 与带引号的值被截断后**写回** style。**
  `parseStyleAttribute` 用 `split(";")`，而 `;` 在括号与引号内部是普通字符。实测
  `background:url(data:image/png;base64,AAAB)` 被解析成 `background: "url(data:image/png"`，
  `transformMsoStyles` 再把解析结果 join 回 style 属性 —— base64 数据被静默丢弃，
  这是内容损坏而不只是解析不准。新增引号 / 括号感知的 `splitCssDeclarations`，
  `excel.ts` 里逐字重复的第二份 `parseCSS` 一并收敛过去。
- **图片占位串里的 `$&` 被当成替换模式展开，把刚摘掉的 `<img>` 又塞了回去。**
  `replaceImageWithPlaceholder` 把公开选项 `imagePlaceholderHtml` 直接作为
  `String.replace` 的替换串。实测宿主传 `<span>$&</span>` 时，`<img src="secret.png">`
  变成 `<span><img src="secret.png"></span>`——占位彻底失效，原始标签连同本地路径回到文档。
  改用函数形式 `() => placeholder`，没有任何展开语义。对应不变量 32。
- **`<img>` 正则在引号内的 `>` 处截断，属性碎片泄漏成正文。** `[^>]*` 不理解引号。实测
  `<p><img alt="a>b" src="x.png">尾巴</p>` 被替换成 `<p>[IMG]b" src="x.png">尾巴</p>`——
  `src` 路径（Word 图片常是 `file:///C:/Users/…`）作为可见文本留在文档里。
  抽出引号感知的 `TAG_INNARDS`（`src/utils/htmlTagPattern.ts`），VML / `<img>` / `<o:p>`
  以及 `templates.ts` 的空单元格补全统一改用。对应不变量 33。
- **`<o:p>` 只清掉了最窄的一种形态。** 原正则 `/<o:p>(.*?)<\/o:p>/` 要求标签无属性、
  内容不跨行（`.` 不匹配换行），也不认自闭合。带属性、跨行、`<o:p/>` 三种实测都会残留。
- **`transformMsoHtmlClasses` 的选择器与操作两套口径，白跑一趟。**
  `p[class*="MsoNormal"]` 是子串匹配，会选中 `MsoNormalTable` / `MsoNormalIndent` 这些**别的**类，
  而 `classList.remove("MsoNormal")` 按 token 精确删，对它们是空操作。改用类选择器 `p.MsoNormal`，
  并在类删空后清掉残留的 `class=""`。
- **Excel 单元格有多个类名时样式全丢。** `styles[cell.getAttribute("class")]` 拿整个 class
  属性当表键，实测 `class="xl65 xl66"` 查不到任何条目，两个类的背景色一起丢失。
  改为按类名逐个查表合并，后写的类覆盖先写的。
- **Excel 的字体色写在 `<td>` 上，被 schema 直接丢弃。** `tableCell` 只解析
  `backgroundColor` / `textAlign` / `align`，`cell.style.color` 写进 DOM 后无人消费；
  即便挂上 `TextStyle` + `Color` 扩展也不产生 mark（Color 的 parseHTML 认的是 `<span>`），
  实测粘贴结果里没有任何颜色信息。改为把单元格内容裹进 `<span style="color:…">`，
  颜色落到内容层，Color mark 正常解析。
- **Office 粘贴的图片占位段永远是中文，英文宿主无法改。** `imagePlaceholderHtml` 的默认值
  硬编码 `[图片将由文档 HTML 带入]`，而 registry 注册时没传该选项、`YanivEditor` 也没有
  透传它的 prop —— 英文界面下从 Word 粘贴含图内容，写进文档正文的是中文。
  新增 `editor.officePasteImagePlaceholder` 文案，由 registry 按当前 locale 拼装；
  文案可被 `createI18n({ messages })` 覆盖，因此拼进 HTML 前先转义。
  `escapeHtml` 从 `extensions/math/renderMath.ts` 抽到 `utils/escapeHtml.ts` 共用，
  避免出现第二份实现。
- **三套外观的文档尺寸全部被 JS 内联样式压掉。** `useEditorPagination.initPageCssVariables()`
  把 A4 常量（`--ye-doc-page-width: 794px` / `padding: 96px` / `min-height: 931px`）
  用**内联 style** 写到 `.document-container` 上，而这些 `--ye-doc-*` 是 appearance 层的
  设计 token——内联优先级高于任何选择器。浏览器实测：default 外观的 900px 页宽被压成 794px、
  48px 内边距被压成 96px、480px 最小高度被压成 931px；notion 的 708px / 24px 同样被压成
  794px / 96px；连 word 自己的 939px 最小高度也被改成 931px。**三套外观无一幸免**，
  且不报任何错。删除该函数后逐一复验：default 恢复 900/48/480，word 恢复 939，notion 恢复 708/24。
  `pageConstants.ts` 里因此变成零引用的 `A4_WIDTH_PX` / `PAGE_PADDING_*` /
  `PAGE_CONTENT_HEIGHT_PX` 一并删除（页宽与内边距本就该只属于 CSS 层）。
  → 不变量 35 + 护栏 `styles/designTokenWriteScope.test.ts`
- **只读事务守卫可被任意第三方 meta 意外解除。** `BYPASS_GUARD_META` 是 `Symbol()`，
  而 ProseMirror 的 meta 存取是 `this.meta[typeof key == "string" ? key : key.key]`——
  symbol 没有 `.key` 属性，所有 symbol 键共用 `meta["undefined"]` 这一个槽。
  实测：任意无关 symbol、任意没有 `.key` 的裸对象 `{}`、乃至字符串 `"undefined"`
  都能读到 bypass 标记；反过来用无关 symbol 写入后，`getMeta(BYPASS_GUARD_META)`
  读到的是那个无关值。也就是说 `editable=false` 下的写保护，任何用 symbol 作 meta 的
  第三方代码都能无意中解除——而 `BYPASS_GUARD_META` 还是**公开导出的 API**。
  改成带命名空间前缀的字符串 `"yaniv:bypassGuard"`（与既有的 `"yaniv:source"` 同风格），
  两处调用点的 `as unknown as string` 一并去掉——那个 cast 正是掩盖了 symbol 没在按 symbol 工作。
  原有测试断言的是 `typeof === "symbol"`，锁的恰恰是缺陷本身，已改为断言**隔离性**。
  → 不变量 36
- **`useEditorAppearance` 省略可选参数就报 Vue 警告。** `customAppearanceVars` 声明为可选，
  却被直接放进 `watch` 的源数组，省略时数组里是一个 `undefined`，
  Vue 实测报 `Invalid watch source`。改用 getter `() => customAppearanceVars?.value`。
  同文件另外两处一并收敛：`registerCustom` 改为具名函数（返回值不再需要 `!` 非空断言），
  `ResolvedColorMode` 改为 `import type`。
- **toast / 通知的无障碍语义恒为 polite，错误提示可能听不到。** 两个入口都写死
  `role="status"`，而 `kind` 可以是 `error`。`status` 是 polite live region，
  屏幕阅读器要等当前朗读结束才播报，而 toast 只停留 2.5 秒。改为错误用 `role="alert"`
  （assertive），其余仍 polite；通知补 `aria-atomic="true"`——它由标题 + 描述两个子节点组成，
  不整块播报就只会读出变化的那一个。
- **行高扩展给每个段落和标题都强加了内联 `line-height: 1.5`。** `LineHeight` 的
  `default` 直接填了具体值 `"1.5"`，`parseHTML` 的回退也是它。后果三重：
  ① 内联样式盖掉 appearance 的 `--ye-line-height`（default 外观定义的 1.7 被压成 1.5）；
  ② `getJSON()` 里**每个** paragraph / heading 都多出宿主从未设过的 `lineHeight: "1.5"`；
  ③ 解析外部 HTML 时，本来没有行高的段落也被硬塞一个。改为 `default: null`、
  `parseHTML` 回退 `null`，只有显式设置过才输出内联样式。
  与不变量 35 同型——只是这次内联样式来自 schema 属性的 `renderHTML` 而不是 `setProperty`。
- **格式刷的「复制行高」从未生效过。** 采样时从 `getAttributes("textStyle").lineHeight` 读，
  而本仓库的行高是**段落级节点属性**（挂在 paragraph / heading 上），不是 textStyle mark 属性
  ——实测该值恒为 `undefined`，于是 `if (formats.lineHeight)` 永远为假，整段复制逻辑是死的。
  改为从 `getAttributes("paragraph") ?? getAttributes("heading")` 读。
  根因是借用了 `@tiptap/extension-text-style` 的**全局命令类型声明**（那里 `lineHeight`
  确实是 mark 属性），而本仓库的实现语义不同；已在 `lineHeight.ts` 文件头写明这个差异。
- **AI 流式回调在编辑器销毁后抛未捕获异常。** `showEditorNotice` / `showEditorToast`
  走 `editor.view.dom` 解析浮层容器，销毁后实测抛
  `[tiptap error]: The editor view is not available`。这两个入口大量出现在 AI 润色 /
  续写 / 总结 / 翻译的 `onError` 回调里，而回调发生时编辑器可能早已销毁（组件卸载，
  或能力开关变化触发 session 重建），且**无人捕获**。
  改为编辑器已销毁时静默跳过；缺 `.yaniv-editor` 祖先或缺 portal 属于**结构错误**，
  照常抛出，不一起吞掉。
- **连续两次 AI 操作会留下无法取消的孤儿流。** `aiSuggestionManager.setAbortController()`
  直接覆盖旧句柄而不 abort 它，而同一个编辑器上 `show()` 不会 abort
  （`ensureEditor` 对同一实例直接返回）。于是第一个流再也没人能取消：它继续消耗 API 配额，
  `onToken` 还在往**同一个单例**里 `updateSuggestion()`，两个流的文本互相覆盖、来回跳变；
  编辑器销毁时 `hide()` 也只能 abort 到最后那个。改为换流时先取消上一个（传 `null` 表示
  「流已结束」，不 abort）。
- **`[x] ` 输入规则产出的是未勾选的任务项。** 它与 `[ ] ` 用的是**逐字相同**的 handler，
  都只调 `toggleTaskList()`，而 `taskItem.checked` 默认为 false——正则特意区分了
  `[x]`，行为却没区分。改为建好后 `updateAttributes("taskItem", { checked: true })`。
- **编辑已有链接会把原链接从光标处劈成两半。** `LinkButton.applyLink` 只按
  `selection.empty` 分流，而「点按钮编辑已有链接」时光标就停在链接里、选区为空
  ——于是掉进「插入一段新链接文本」的分支。实测 `<a href="old">旧链接</a>` 变成
  `<a href="old">旧链</a><a href="new">https://new…</a><a href="old">接</a>`，
  三个 `<a>` 并排，文字也被撑成「旧链https://new…接」。而 `handleClick` 明明把当前
  href 读进了输入框——设计意图是编辑，只是少实现了这一半。判据补上
  `|| editor.isActive("link")`，走 `extendMarkRange("link").setLink()`。
  分流逻辑抽到 `link/linkActions.ts`，测试直接测它（测试若复制一份组件逻辑，
  改回旧实现也不会转红）。
- **字号 / 字体下拉不跟随选区。** 两个组件都用
  `watch(() => editor.value?.getAttributes("textStyle")?.fontSize)` 追踪回显，
  但 **`editor.state` 不是 Vue 响应式的**：该 getter 只在 editor **实例**换掉时才重新求值。
  实测 watch 只收到 `immediate` 那一次，光标在 28px 与 12px 的文字之间来回移动
  一概读不到（连 `state.selection.from` 都不触发）。改为显式订阅
  `selectionUpdate` / `transaction`——本仓库其余 8 个需要跟随选区的组件用的都是这个写法，
  只有 font 目录这两个漏了。
- **两个设标题入口行为不一致。** 按钮组走 `toggleHeadingLevel`（裸 `toggleHeading`）、
  下拉走 `setHeadingValue`（额外清掉 textStyle）。同一个「设为 H2」，按钮做出来是
  `<h2><span style="font-size: 28px">…</span></h2>`——**残留字号盖过标题自己的字号**，
  下拉做出来才是干净的 `<h2>`。前者改为复用后者，同时保持 toggle 语义
  （已是该级别则切回段落）。
- **对齐下拉的菜单项没有选中态。** 按钮图标会跟着当前对齐变，但菜单打开后四项都不高亮，
  用户看不出当前是哪一种。补上 `active`——本仓库其它下拉（代码块 / 上下标 / 标题）都设了它。
- **inline 工具栏对键盘用户不可用。** 它带着 `role="toolbar"`，而 WAI-ARIA APG 要求
  toolbar 是**单一 tab stop**、内部用方向键移动焦点。顶栏 `ToolbarNav` 一直接着
  `useRovingTabindex`，inline 工具栏漏了——键盘用户得逐个 Tab 穿过每个按钮，方向键也不起作用。
  接上同一个 composable（项目本来就有，只是没用上）。
- **`.inline-toolbar` 的下边框用的是 `--ye-border` 而不是 `--ye-toolbar-border`。**
  同一条规则里 `background` 已经走了 `--ye-toolbar-bg`，边框漏了。两者当前解析同值
  （后者是前者的纯别名），所以**视觉零变化**；换成语义正确的 token 后，宿主单独覆盖
  `--ye-toolbar-border` 时 inline 工具栏才会跟随。浏览器实测三套外观 × 明暗两态
  边框色与各自的 `--ye-border` 完全一致，覆盖 `--ye-toolbar-border` 后如期变色。
- **斜杠菜单在编辑器销毁后留在屏上。** `BlockPickerMenu` 挂在 EditorShell 的 overlay portal 上，
  不随编辑器消失；`computeSessionKey` 变化（能力开关、locale 切换）会重建编辑器而 Shell 不卸载，
  菜单正开着时插件的 `update` 再也不会被调用，它就停在旧光标位置上。改为在扩展的 `onDestroy`
  里通知关闭。**这件事不能写在 plugin view 的 `destroy` 里**：ProseMirror 在插件集合变化时
  会销毁重建全部 plugin view，而 `editor.registerPlugin()`（`@tiptap/vue-3` 挂气泡菜单时会调）
  正走这条路——实测那样写会在每次注册插件时误发关闭通知，把 `blockMenuHost` 缓冲的
  `pendingOpen` 清掉，斜杠菜单**再也弹不出来**。→ 不变量 38
- **`AiMenuButton` 的 `requestAnimationFrame` 不留帧句柄。** 命令要等菜单关闭动画让出一帧再执行，
  而这一帧可能落在组件卸载之后：`runEditorAiChain` 第一行就是 `editor.view.focus()`，
  销毁后访问 `editor.view` 直接抛错（不变量 15），外层 try/catch 只把它压成一条 console.error
  ——用户点了菜单却什么也没发生。改为留句柄 + `onBeforeUnmount` 取消 + 帧内 `isDestroyed` 守卫；
  连点两项时前一帧也会被取消，不再有两条命令抢同一个选区。
- **`OutlinePanel` 卸载时不撤销待触发的滚动防抖。** 面板可以在编辑器还活着时卸载
  （用户点关闭 / 切到 preview），50ms 后定时器到点，`syncItems` 去读已卸载组件的 refs
  与 `props.scrollParent()`。`debounce` 改为交出 `cancel()`，由 `onBeforeUnmount` 撤掉。
- **批量上传时第一个文件成功就关掉弹窗。** antd 的 `<a-upload-dragger multiple>` 对每个文件
  各调一次 `customRequest` 且**并发**发起（实测三个文件的三次调用全部先进入，随后才逐个完成），
  而 `VideoUpload` / `ImageUpload` 都写成「成功即 `open = false`」——用户看到弹窗自己关了，
  内容却还在一个一个冒出来，且再没有取消的入口。抽出 `useBatchUploadGate`：整批结束且至少
  一个成功才关，全批失败时保持打开让用户看到错误并重试。→ 约定 29
  （`ImageUpload` 是复核中新发现的同型，此前只记录了 `VideoUpload`。）
- **`useEditorAppearance` 把系统明暗监听绑了两次。** `useResolvedColorMode` 内部在 `auto` 时
  已绑一个，第二个 watch 又绑一份，同一个 `prefers-color-scheme` 事件让 `syncDom` 跑两遍
  ——实测挂载后系统监听器 2 条、一次切换 `applyAppearanceToElement` 调用 2 次。
  `syncDom` 幂等，所以只是白跑，但它每次都 `await loadAppearance()` 并重写一整套 CSS 变量。
  删掉第二个 watch：`resolvedMode` 本来就是第一个 watch 的源，这条路径不会漏。
- **代码块内按 `Shift-Enter` 抛未捕获的 `RangeError`。** `ListShortcuts` 的候选项写成了
  `editor.commands.newlineInCode()`，它会立即 dispatch 一个独立事务，而外层 `first`
  还持有基于旧 state 的 tr，收尾 dispatch 就抛 `Applying a mismatched transaction`。
  换行本身是成功的（第一个命令已独立 dispatch 过），异常也不冒泡到按键处理器
  ——文档完全看不出问题，只会刷控制台、被宿主的错误监控当成线上故障。
  改用 `first(({ commands }) => …)` 注入的 `commands`，实测零错误、结果一字不差。→ 不变量 39
- **`readStreamLines` 在消费方提前退出时不取消底层响应流。** 真实路径不是「消费方写了
  `break`」——三个 adapter 都完整消费到底——而是 `onToken` 抛错（编辑器销毁后往文档写内容
  会抛）让异常穿过 `for await`。实测此时流的 `cancel` 回调**不被调用**：服务端仍在推、
  客户端仍在收，一段长回答就是白烧的带宽与 API 配额。补 `finally { await reader.cancel() }`
  （用 try/catch 包住，`.catch()` 挡不住同步抛，会盖掉调用方正在抛的真实错误）。
  顺带修正了两个测试桩——它们伪造的 reader 没有 `cancel`，而真实的一定有。
- **`transformRemoveLineNumberWrapper` 的测试是空操作。** 输入
  `<div style="mso-element:para-border-div">` 里根本没有 `MsoLineNumber` 类，函数对它什么也不做，
  `toContain("正文")` 恒真——把实现换成 `html => html` 也照样通过。补齐 5 条真正锁住
  unwrap 行为的用例（变异成恒等函数后 4 条转红）。
- **`mode` 从 `preview` 切回 `edit` 后撤销按钮变灰，用户撤销不了自己刚写的内容。**
  `UndoRedoButton` 把「是否发生过真正的编辑」记在组件本地的 `hasRealEdit` 上，
  与 `can().undo()` 相与后才允许撤销。而 `showEditChrome = mode === "edit"`，
  `sessionKey` **不含** `mode`——切到预览会把整个编辑 chrome 卸载，切回来重挂时
  编辑器实例与历史栈原封不动，本地标记却归零。实测：往返后 `can().undo()` 仍是 `true`、
  绕过按钮直接调 `undo()` 能正常回退，用户却只能看着灰按钮，直到再随便改一个字。
  这个守卫想挡的「初始化时的误判」根本不存在——空文档、带 `content`、带多段内容
  三种建法下 `can().undo()` 初始都是 `false`。整体删除，可用性只由 `can()` 决定。→ 不变量 43
- **宿主切换语言会丢掉用户正在编辑的全部内容。** `rebuild()` 的内容快照是「调用方先设好、
  它再读」的隐含契约，三个调用点里只有 `watch(sessionKey)` 遵守。而切语言必然连开两次
  rebuild——语言**代码**是同步的（`sessionKey` 立刻变），语言**包**是异步加载的
  （落地后 `locale` 才变）：前一次存了快照、建完就把它清空，后一次落地时快照已是 `null`，
  直接回落到空文档。改为由 `rebuild()` 自己取快照，调用方只负责触发；
  `watch(sessionKey)` 里那段与 `rebuild()` 开头逐行重复的「取旧实例→置空→等 tick→销毁」
  一并删除。→ 不变量 44
- **每切换一次语言泄漏一个完整的编辑器实例。** 销毁旧实例写在取消检查之后，
  被更新的那次 rebuild 取代时直接 `return` 走掉；而旧实例已从 `editor.value` 摘走，
  更新的那次读到的是 `null`，`onScopeDispose` 同理——再没有人持有它。
  实测遗留实例 `isDestroyed === false`，带着 ProseMirror 插件、DOM 监听与扩展定时器常驻。
  销毁提到取消检查之前，并用幂等的 `destroyPrevious()` + `finally` 兜住抛错路径。→ 不变量 44
- **切换语言后编辑器永久停在加载骨架屏，再也建不出来。** `await nextTick()` 写在
  `try` 之外，而它交出的是当次 flush 的 promise：这一轮里任何组件更新抛错都会让它 reject，
  于是 `rebuild()` 跟着抛，调用点 `void rebuild()` 无人接管，`status` 永久停在 `"loading"`。
  纳入 `try` 后，建不出来会落到 `"error"` 这个确定终态并可重试。→ 不变量 44
- **session 重建时 chrome 会带着 `editor === null` 多渲染一帧。**
  ⚠️ **第 13 棒更正**：本条原先写作「浮层在已被摘走的容器上抛 `insertBefore of null`」，
  并当成真实缺陷。补 e2e 时做了对照实验——回退本修复后在真实浏览器（Chromium）里
  切 locale 往返 3 轮、切 mode 往返 3 轮，`error` / `unhandledrejection` /
  `console.error` 全为空，编辑器也不曾卡在骨架屏。**那个错误是 jsdom 特有的。**
  修复本身保留：它消除的是一个本就没有意义的渲染帧，这个判断独立成立。原文如下—— `bubble-menu` 系
  的 5 个浮层通过 `appendTo` 把 DOM 搬进 overlay portal，Vue 的 vnode 树仍以为它在原位。
  `EditorEditChrome` 的 `:key` 变化与 `editor` 置 null 同时发生，chrome 带着
  `editor === null` 再渲染一帧时，补插 `v-if` 注释占位符的容器已经没了。
  这一帧本无意义（chrome 里每个子节点都写着 `&& editor`），把条件提到父级判一次。
  实测：改 `features` 触发的重建也会抛这个错，只是没恰好击中 `nextTick`。→ 不变量 45
- **`initialContent` 被当成受控源反复灌入。** `controlledSource = content ?? initialContent`，
  而 full 编辑器没有 `content`（它 emit `update` 让宿主自己存，不是 v-model），
  于是 `initialContent` 掉进受控源的位置：每次 `sessionReady` 由 false 翻 true
  就重灌一遍，把 `rebuild()` 刚恢复出来的用户内容盖掉。
  改为按「**这份源自己变没变**」判定，而不是「是不是第一次就绪」——后者会打穿另一条
  正当路径：`sessionReady` 这个 watch 还兜着「重建期间错过的源变更」（重建时它是 false，
  `watch(controlledSource)` 会早退），而 demo 的 `initialContent` 正是
  `computed(() => getSampleContent(preset))`，切 preset 时源变了且同时触发重建。
  inline 的 `content` 是真受控，宿主是权威，重建后照常重新应用。→ 约定 36
- **更正不变量 41 的错误归因：主 chunk 里绝大多数注释其实不吃预算。** 原文断言
  「ESM 产物不压缩，源文件里每一行注释都原样进产物」，并据此要求主 chunk 的注释一律写短。
  实测（带有效性对照：同一次实验里把一个运行时字符串加长 40 字符，hash 变、gzip +5B，
  证明构建确实响应源码改动）：`.ts` 语句之间加 30 行中文注释 **0B**、
  `.vue` `<script setup>` 里同样 **0B**，只有写在**对象字面量属性**上的注释真的进产物
  （30 行 209B）。Rollup 重新生成代码时只保留挂在输出 AST 节点上的 leading comment。
  原结论的矛盾就写在同一条里——「单独还原 `listShortcuts.ts` 只差 2B」，
  那 471B 来自整批的**代码**改动。同步更正约定 32。
- **`UndoRedoButton` 多订了一份 `update`。** `hasRealEdit` 删除后，原本用于置位它的
  `handleUpdate` 只剩转调状态同步，而 `update` 是 `transaction` 的严格子集（不变量 37），
  每次编辑白算一遍。只保留 `transaction`。唯一的例外 `setEditable`（只 emit `update`、
  不产生事务）经实测不改变 `can().undo()` / `can().redo()`，不受影响。
- **光标颜色从未跟随外观：`--ye-caret` 定义齐全却没有任何规则读它。** 它按不变量 26 的
  形状 C 在 `:root` / `.yaniv-editor` 实例作用域 / 深色段各声明了一份（值都是
  `var(--ye-primary)`），`variables.css` 的注释里还留着作者核对它渲染值的记录
  （「`--ye-caret` 是全局 `#3370ff` 而非 word 的 `#0078d4`」）——但全仓没有一条
  `caret-color` 规则消费它，那次分层「修复」因此从未生效过。补上规则后浏览器实测：
  三套外观 × 明暗六种组合的光标色全部等于各自的 `--ye-primary`，
  预览态 `caret-color: transparent` 不受影响（特异性 (0,2,0) 低于它的 (0,4,0)）。
- **`tokenConsumers` 护栏把注释和测试里的引用当成了消费方。** 「JS 字符串读写也算消费」
  那条判据的正则带反引号，而本仓库中文注释的通行写法正是 Markdown 风格的
  `` `--ye-x` ``——注释里提一句，死 token 就永久免检；测试断言里出现一次
  `var(--ye-x)` 同理。`--ye-caret` 正是这么躲过去的。扫描器改为先掩注释、
  并整体跳过 `*.test.ts`；收紧后全仓 99 个 token 只暴露出这一个。→ 不变量 42
- **受控推送后撤销按钮亮着、点一次却毫无反应。** `setContent` 换掉的是整份文档，
  prosemirror-history 会把已有历史步骤全部 rebase 成空——撤销时文档一动不动——
  但事件计数还留着，于是 `can().undo()` 仍是 `true`。按钮在说谎：亮着、点了没用、
  再看才变灰。`ContentAdapter.setContent` 现在默认连撤销历史一起清空
  （新增 `resetHistory` 选项，默认 `true`），推送后按钮直接是灰的；
  推送**之后**用户新写的内容照常可撤销。重置走 prosemirror-history 留给自己
  undo/redo 命令的入口（`tr.setMeta(historyKey, { historyState })`），干净的
  `HistoryState` 取自一个只装 history 插件的临时 `EditorState`——全程公开 API，
  不碰未导出的内部类。宿主关掉撤销能力时认不出 history 插件，静默跳过。→ 不变量 47

- **查找替换面板的「上一处 / 下一处 / 替换」不会把选区带到命中上。** 真实 Chromium 实测：
  命中在 263–268，点完之后光标仍停在原处，只有 `resultIndex` 与高亮装饰换了位置
  ——用户看到的是「按了没反应」，长文档里还不会滚过去。根因不在 `focus()`，而在
  `focusSearchHit` 于命令实现内部调用 `editor.commands.*`：tiptap 的 `CommandManager`
  在 `editor.commands` 这个 getter 里就按当前 state 造好一条事务，命令回调返回后
  **无条件派发**它。于是内层命令先派发、把选区设到命中上，外层那条随后派发、
  带着回调开始那一刻的旧选区把它原样盖回去（doc 没变，连 mismatched transaction
  都不会报）。9 个命令统一改为只写运行器给的那条 `tr`（`tr.setSelection` /
  `tr.insertText` / `tr.setMeta`），焦点交还改为在 tr 落地后的下一帧执行。
  → 不变量 58 + 静态护栏 `extensions/commandTransactionScope.test.ts`

### Changed

- **链接气泡菜单改用与工具栏同一份链接分流实现（`applyLinkToEditor`）。**
  此前它自己写了一份「按 `selection.empty` 二选一」的逻辑，正是 `linkActions`
  抽出来之前的形状——同一个决定有两份实现，修好一处不会惠及另一处。
  （气泡菜单那半实际不可达：菜单只在选区非空时显示；收敛掉是为了不再有第二份，
  顺带补上了原先漏掉的 `rel="noopener noreferrer"`。）
- **`ToolbarDropdownButton` 的两处菜单选中逻辑收敛成一个 `selectMenuItem`**
  （原先 `onMenuClick` 与 `onSplitChildSelect` 有四行逐字重复）。

- **收敛 9 处冗余的编辑器事件订阅。** 实测（tiptap 3）`transaction` 是 `update` /
  `selectionUpdate` 的超集，唯一例外是 `setEditable`——它不产生事务，只 emit `update`。
  `OutlinePanel` / `FormatPainterButton` / `useEditorColorState` 三个事件全订，
  `UndoRedoButton` / `HeadingControl` / `FontFamilySelect` / `FontSizeSelect` /
  `CodeBlockLanguageBadge` / `ZoomBar` 各订两个，于是同一次按键 handler 白跑一到两遍。
  `OutlinePanel` 最重：`syncItems` 跑 3 次，每次对所有标题 `getBoundingClientRect()`
  ——三倍的强制回流。全部收敛到能覆盖各自状态的最小事件集（`ZoomBar` 的字数只随文档变，
  收敛到 `update`），并新增静态护栏。→ 不变量 37 / 约定 28
- **`ListShortcuts` 的注释改成实测结论。** 22 个场景的带 / 不带对照（真实 DOM keydown 派发，
  覆盖三层嵌套列表、任务项、引用块、表格单元格、标题、代码块）显示：`Enter` 那条全场景与
  tiptap 内置一致，属于抢先执行了一遍相同逻辑；**`Shift-Enter` 那条不能删**——摘掉后代码块内
  换不了行，反而在文档末尾凭空多出一个空段落。此前注释说「只覆盖了三种常见场景、没有证据」，
  现在证据齐了。⚠️ 判定必须走 `view.dom.dispatchEvent(keydown)`：手工模拟 keymap 调用链
  会把这 2 个差异误判成「无差异」。
- **`.ye-dropdown-btn.is-active:hover` 确认为必需，补上判定依据。** 曾被记为「与 `.is-active`
  同值的疑似死声明」。起 examples dev server 查运行时 CSSOM 后推翻：antd v5 是 CSS-in-JS，
  它的 `:where(…).ant-btn-text:not(:disabled):hover` 是 (0,3,0)（`:where()` 特异性为 0、
  `:not(:disabled)` 计一个伪类），**高于** `.is-active` 的 (0,2,0)。删掉这 4 行，
  激活态按钮 hover 时会变回 antd 的灰色。→ 不变量 40 / 约定 31
- **`lineNumber.ts` 的子串匹配补上「为什么与隔壁口径不同」的说明**，并如实记下一条未验证的
  观察：`MsoLineNumber` 在 Word 里是字符样式，实际形态可能是行号数字本身而非包住正文的容器，
  那样 unwrap 会把行号数字留进正文。判定需要真实 Word 剪贴板样本，拿到之前不改
  ——改错的代价是丢正文。
- **主 chunk 里的长注释搬进测试文件。** 发现 ESM 产物**不做压缩**（`vite.config.ts` 的
  `minify: "terser"` 只对 CJS 生效，Vite 对 `build.lib && format === "es"` 直接
  `return null`），而 CI 的 46000B 预算量的正是 `dist/EditorShell*.js` 这个 ESM 文件
  ——主 chunk 源文件里的每行注释都原样进产物。给 `listShortcuts.ts` 加的那段约 10 行
  中文论证实测吃掉 **471B**，把余量从 521B 压到 61B。改为「结论留源码、证据搬测试」，
  主 chunk 从 45939 回落到 45545。→ 不变量 41 / 约定 32
- **格式刷双击连弹 3 个 toast。** DOM 规范里 `dblclick` 之前必然先发两次 `click`，
  于是一次双击走完「采样激活 → 取消 → 连续模式」三步，各弹一条。最终状态本来就是对的，
  但噪音大。改用 `MouseEvent.detail`（规范保证第一次 click 是 1、第二次是 2）跳过第二击，
  **单击零延迟**——不采用「把单击延后一个双击窗口」的标准修法，那会让每次普通单击都变钝。
  `dblclick` 的判定改看双击**开始前**的模式（它跑到时 storage 已被第一次 click 改过一轮），
  连续模式下双击照常退出、不会又转回连续。双击的提示从 3 条降到 2 条。
  `ToolbarButton` 随之透传原生事件（`emit("click", event)`，向后兼容的扩展）。
- **AI 文档上下文不限长，超长文档会让请求 400 失败。** 全文原样拼进 system prompt。
  新增 `aiConfig.documentContextLimit`（默认 8000 **字符**——项目同时支持
  openai / aliyun / ollama 且模型可配，各家 tokenizer 不同没有统一换算，宿主应按实际模型调整；
  传 0 或负数关闭）。超限时截断保留开头、在 prompt 末尾加标记让模型知道拿到的不是全文，
  **并给用户弹一条带实际字数的提示**——静默截断只会让用户以为「AI 这次答得不太行」。
  四条 AI 命令与 customAi 路径都已接上。
- **Word 导入替换整个文档且无确认。** 用的是 `setContent`，当前内容整份丢失且回不去。
  文档非空时先弹确认，取消则调 `onError` 让上传项落到失败态而不是一直转圈；
  空文档直接导入，不打断。
- **阿拉伯语只有文案、翻译菜单里出不来。** `editor.lang.ar` 早就写好了，
  但 `LANGUAGE_CODES` 没注册它——更像「少注册了一门语言」而非「多了个死 key」，补进列表。
  新增护栏 `languageCodes.test.ts`：列表与 locale 双向对齐，且 `docs/features/ai.md`
  里的「N 种目标语言」与语言清单必须跟着列表走（这次 `ar` 就同时要改文档两处与
  `prompts.ts` 的注释）。`editor.lang.zh` 作为显式登记的例外保留——翻译目标必须精确到
  简体 / 繁体，`zh-CN` / `zh-TW` 已覆盖。

- **`ListTools` 的 `showTaskList` 默认值从未生效。** 默认 `false`，而编辑器内部三处用法
  （顶栏 / 浮动菜单 / inline 工具栏）全都显式传 `true`——直接用 `ListTools` 的宿主
  因此拿到与编辑器不一致的表现。默认改成 `true`，三处显式传参一并删掉，行为不变。
  `TaskList` / `TaskItem` 随 `list` 能力一起注册，这个默认值是站得住的。
  **这是公开 prop 的默认值变更**：需要"默认不显示任务列表"的宿主请显式传 `false`。
- **`ColorPicker` 移出主 chunk。** 它是主 chunk 里最大的单个文件（1008 行，含 office /
  notion 两套色板数据），而按钮本身只是个图标，取色面板要等用户点开才用得上。
  改为 `defineGatedAsyncComponent` 懒加载后主 chunk gzip **45783 → 42674（-3109B）**，
  余量从 217B 回到 3326B。
  ⚠️ 两个坑：① 动态 import 必须指向 `ColorPicker.vue` 本身，走
  `@/components/editor/color` barrel 会因为同 barrel 的 `ColorIcons` 是静态引用而被
  整体留在主 chunk；② `ToolbarNav` 与 `FloatingMenu` **两处都得改**——只要还剩一个
  静态引用，Rollup 就把模块留在主 chunk，实测只改一处仅掉 33B，两处都改才掉 3109B。

- **测试与门禁**：`BlockPickerMenu` / `ColorPicker` / `AiSettingsModal` 补齐单测
  （三个组件 +58 条，连同新增的命令层护栏共 +64 条；覆盖率 Statements 77.58% → 80.43%、
  Lines 79.69% → 82.77%），
  `vitest.config.ts` 阈值提档到 78 / 80 / 67 / 76；`pnpm run lint` 加上
  `--max-warnings=0`，让「eslint 零 warning」这条既有约定真的能打断 CI
  （此前 9 条 import/order warning 照样退出 0）。
- **两处改变不了任何结果的分支已收敛**：`BlockPickerMenu` 的 `watch(query)`
  （四个写 `query` 的入口都已各自重置高亮，而它在「空串写成空串」时根本不响应，
  只盖得住其中两个入口）、`ColorPicker` 的 `indicatorBarStyle` 透明分支
  （与它下面那行返回逐字相同的对象）。

### Removed

- **删除 16 个零消费方的 `--ye-*` 设计 token。** 它们不报错、没有任何视觉表现，
  只会一直躺在 `variables.css` 里冒充「设计系统」，还会诱导后来者去覆盖
  ——覆盖一个没人 `var()` 读的自定义属性完全没有效果。三类，都不是笔误而是「写了一半」：
  - **同名近似的重复定义**：`--ye-table-selected`、`--ye-outline-offset`
    （真正在用的是 `--ye-table-selected-bg`、`--ye-media-outline-offset`）
  - **成套定义但整套没用**：`--ye-spacing-xs/sm/md/lg/xl` 全部零引用（间距一律硬编码）；
    `--ye-shadow-sm/lg`、`--ye-radius-full`、`--ye-transition-slow` 是阶梯里没轮到的档位
  - **配了值却没写规则**：`--ye-border-focus`（三套外观各配了色，而编辑区有意
    `outline: none`）、`--ye-selection`（配了亮/暗两套，全仓却没有任何 `::selection` 规则
    ——**选中色目前用的是浏览器默认**）、`--ye-toolbar-btn-bg: transparent`（等于没设）、
    `--ye-bubble-border`（纯别名）、`--ye-doc-page-cut-height`（分页线功能从未实现）

  浏览器实测零视觉影响：三套外观 × 明暗两态 × 5 个关键元素共 **30 个采样点，删除前后逐字相同**
  （同时确认被删 token 已解析为空，对照有效）。`style.css` 17296 → 17111、
  `inline.css` 9062 → 8910。→ 不变量 42 / 约定 33

  ⚠️ 若将来要让文本选中色跟随品牌，需要重新加回 `--ye-selection` 并**为三套外观 ×
  明暗两态各配值**、写 `::selection` 规则、验证选中文字的对比度——那是视觉变更，
  不在这次死代码清理的范围内。

### Docs

- **修正两处 token 分层描述与源码不符。** 第 8 棒把派生别名从 `:root` 移到
  `.yaniv-editor` 后只更新了 `ARCHITECTURE.md` 的分层表，`docs/` 下两处没跟上：
  `docs/contributing/project-structure.md` 的 Token 行只说「颜色等在 `:root`，
  z-index 在 `.yaniv-editor`」，`docs/guide/z-index.md` 更写成「z-index token **仅**定义在
  `.yaniv-editor`」——而那一段里实际还有 17 个派生别名（`--ye-toolbar-border`、
  `--ye-table-border` 等）。两处均已改正并补上原因（不变量 26）。
  `z-index.md` 的 token 表与 `variables.css` 逐条核对，17/17 完全一致。
- **写清「共 N 页」为什么固定按 A4 算。** `--ye-doc-page-min-height` 不是页高
  ——它是 `min-height`（default 480px 只表示「至少这么高」，notion 是 `calc(100vh - 100px)`
  跟着视口走），而三套外观都是连续滚动布局，全仓没有任何画分页线的规则：
  界面上根本不存在「第 2 页」这个视觉对象。`totalPages` 只出现在状态栏，是「按 A4 打印
  大约多少页」的估算，与 Word 导出同口径；换成外观的 min-height 反而会得出一个
  既不对应视觉、也不对应打印的数字。曾被记为「用 A4 给所有外观算页数」的产品语义问题，
  现确认为**有意的选择**，补上依据与两条锁住它的测试。
- 补上 `documentContextLimit`（`ai-config.md`）、Word 导入的覆盖确认
  （`word-import-export.md`）、格式刷双击的提示条数（`format-painter.md`）。

### Removed

- **删除 `normalizeTemplateHtml`（含 `EMPTY_CELL` 正则）。** 它把 `<td></td>` 补成
  `<td><p></p></td>`，理由是「满足 tableCell schema」——而 ProseMirror 自己就做了这件事：
  tableCell 的 content 是 `block+`，解析空单元格时会自动补 paragraph，实测补与不补产出的
  文档 JSON **完全相同**；全部 5 个内置模板本来就写了 `<td><p></p></td>`，函数对它们是纯 no-op。
  它不在包的 `exports` 映射能触达的任何入口上（只在 `components/editor/template/index.ts`
  导出，而那个 index 不被 `src/index.ts` 引用），因此不是公开 API 变更。
  `templates.test.ts` 锁住了删除依据：将来 tiptap 若改掉这个行为，第一条就会转红。

- **删除自建的 `BaseTooltip.vue`（126 行）与 `--ye-z-chrome-tooltip` token。**
  组件没有被 `components/base/index.ts` 导出，全仓零引用——项目所有提示都用
  antd 的 `a-tooltip`（`ToolbarButton` / `ToolbarDropdownButton` / `TableToolbar`）。
  它还带着两个从未被发现的 CSS 缺陷，正因为没人用：`--left` / `--right` 两种 placement
  没有对应的箭头规则，淡入过渡又写死了 `translateX(-50%)`（与它们定位用的
  `translateY(-50%)` 冲突，会跳位）。该 token 的唯一消费方就是它，一并删除，
  `docs/guide/z-index.md` 中英文的层级表同步更新。
- **删除 `ToolbarDivider.vue` 与 `ToolbarGroup` 的 `divider` / `dividerColor` prop。**
  全仓没有任何调用点传过 `divider`，那个 `v-if` 恒为假；`dividerDirection`、
  `computedDividerColor`，以及只有一行「不需要额外样式」注释、没有任何声明的
  `.toolbar-group--with-divider` 全是死的。项目实际用的是 `ToolbarNav` 里的
  `border-left: … var(--ye-toolbar-divider)`。
- **删除空占位组件 `components/editor/table/TableCell.vue`。** 模板里只有一个空 `<div>`
  和一句「占位组件」注释，`table/index.ts` 没导出它，全仓零引用。
- **删除 `TextFormatButtons` 里零使用的 `activeCheck`。** 类型上是可选字段、模板里有
  `format.activeCheck ? format.activeCheck() : isActive(format.name)` 的分支，
  但四个 format 没有一个定义它——那条分支永远走 else。
- **合并代码块插入的两条同义分支。** `insertCodeBlock` 里
  `language === DEFAULT ? insertDefaultCodeBlock(e) : setCodeBlock({ language })`
  两边其实都是 `setCodeBlock({ language })`，只是默认语言那条绕了个同名工具函数；
  `insertDefaultCodeBlock` 随之零消费方，一并删除。
- **删除 `ColumnExtension` 里被丢弃的 `createEmptyColumn`。** `setColumnLayout` 先用它
  造了一批 ProseMirror 节点，却只拿 `columnNodes.map(() => ({...}))` 的**长度**去生成 JSON
  ——map 回调根本不使用参数，造出来的节点整批被丢掉。改为直接按数量生成 JSON，
  并给列数补上非有限数的回退。
- **删除 `CapabilityDefinition.chrome` 死字段。** 类型里声明了 `chrome?: string[]`，
  `registry.ts` 还有一处实际写了值（`["outlinePanel"]`），但**全仓没有任何代码读它**。
  它是公开导出的类型，留着会让接入方以为可以用它声明 chrome 组件，实际毫无效果。
- **删除 `editorCommands.ts` 里零调用的 `createCommandRunnerWithoutFocus` 与 `executeCommand`。**
  两者全仓零引用，且该模块不在包的公开 exports 里（`src/index.ts` 未导出）。
  剩下两个入口各写一份的判空 + `console.warn` 收敛成共用的 `resolveEditor()`。
- **删除 `loadAppearance.ts` 的模块级 `loadedAppearances` Set。** 内置外观 CSS 由
  `style.css` 一次性提供，`loadAppearance` 本就是空操作；那个 Set 写进去的状态
  只被自己的早退判断读一次，而早退与否结果都一样，同时违反了「禁止模块级可变状态」
  （多实例共享同一份记录）。公开 API 形态（async 签名）保持不变。
- **`EDITOR_APPEARANCES` 与 `LOADABLE_APPEARANCES` 合并为一份。** 两处各写一遍
  同样的三个外观，值相同、顺序还不一样（`default/notion/word` vs `default/word/notion`）。
  现在后者是唯一定义，前者是它的公开别名。

- **删除 `appearance/styles/_shared.css`。** 文件头自称「各 appearance 通过 `@import` 引入」，
  实际只有 `word.css` 一个文件引过；而里面仅有的两条规则都已证实是死的：
  ① `.yaniv-editor .document-toolbar { padding: 6px 12px }` 与 `ToolbarNav.vue` 的 scoped 样式
  同值同特异性且更靠前，浏览器实测两个断点下生效的都是 ToolbarNav 那份（1400px → `6px 12px`，
  375px → `6px 8px`）；② `.yaniv-editor .continuous-pages { background: var(--ye-page-bg, #f5f5f5) }`
  里 `--ye-page-bg` 全仓未定义，而 default / notion 各有 (0,3,0) 的 background 覆盖它，
  word 下它虽然胜出，但 `--ye-doc-page-padding: 0` 让 `.ProseMirror`（794×1131）把
  `.continuous-pages` 完全盖住，实测四条露边全为 0。删除后 word 的 `.continuous-pages` 回落到
  `document-layout.css` 的 `var(--ye-bg)`，深色下从 `#f5f5f5` 变成 `#1e1e1e`（更正确，
  且同样看不见），几何一处未变。文件头里仍成立的架构说明并入 `word.css`。
- **删除零消费方的 `--ye-toolbar-shadow` token。** `:root` 与深色段各声明一次 `none`，
  但全仓没有任何选择器读它，也未出现在任何文档里——宿主覆盖它不会有任何效果。
- **删除三处同值死声明。** `code-block.css` 的 `.yaniv-editor .document-container
{ position: relative }`（`document-layout.css` 已声明，且是语言角标的定位祖先——
  已在那边注明承重关系）；`toolbar.css` 的 `.document-toolbar { padding: 6px 12px }`
  （永远轮不上 ToolbarNav 的 scoped 样式）；`table.css` 768px 断点里的图标字号
  （`base.css` 的 `--ye-btn-icon-size` 断点已给出同值）。
- **删除 `ai-highlight.css` 里的 CSS tooltip。** `.ai-highlight:hover::after` 一组规则
  （连同 `@keyframes tooltip-fade-in` 与一条 `[contenteditable="false"]` 的禁用规则）
  **全仓没有任何地方给它设 `content`**——没有 `content` 的伪元素根本不生成，
  浏览器实测 `getComputedStyle(el, "::after").content` 在明暗两态都是 `none`。
  `AiHighlightMark` 也只渲染 `data-original-text` / `data-suggested-text` / `data-is-streaming`，
  没有可供 `attr()` 取用的提示文案；真正的建议 UI 是 `AiSuggestionPopover.vue`。

### Security

- **链接 href 的白名单漏了 JSON 这条入口（存储型 XSS）。** `createLinkExtension()` 的
  `isAllowedUri` 只覆盖 HTML 解析 / 粘贴 / 自动链接 / `setLink()`——实测 `<a href="javascript:…">`
  经 HTML 进来会被整条 mark 丢弃，但同样的 href 经 JSON（`initialContent` / `setContent`）
  进来会**原样留在 mark attrs 里**。因为 TipTap 在 renderHTML 侧会把输出洗成 `href=""`，
  `getHTML()` 完全看不出异常，而 `getJSON()`（公开 API）会把 `javascript:alert(1)`
  原样交给宿主——宿主持久化后自行渲染即中招。这与 `0.2.0` 修过的媒体 src 是同一类问题，
  当时只补了媒体。现新增 `src/utils/linkHrefPolicy.ts`，按同一套补齐两处强制点：
  `adaptJsonToSchema` 调 `sanitizeLinkHrefMarks`，以及 `createLinkHrefGuardPlugin` 的
  `appendTransaction` 事务级兜底（补偿事务 `addToHistory: false`，撤销撤不回危险值）。
  处置与 HTML 路径一致：丢掉整个 link mark、保留文字；合法 href 不做归一化改写。
- **链接气泡的「打开链接」直接把 attrs.href 交给 `window.open`。** 同一漏洞在编辑器内部
  的利用面：`window.open("javascript:…")` 会执行脚本，无需宿主配合。现在 `openLink()`
  在打开前再过一次 `normalizeSafeUrl`——凡是「从 attrs 取 URL 再交给浏览器」的调用点
  都要如此，已写进不变量 17。
- **iframe `allow-same-origin` 收窄到已知播放器。** `allow-scripts` + `allow-same-origin`
  同时给，等于把 sandbox 让给被嵌页面自己：它保留自身源，一旦与宿主同源就能通过 `parent`
  反向操作宿主 DOM，甚至摘掉自己 iframe 上的 `sandbox`。而 embed 的 `url` 是内容属性，
  UGC 场景由使用者控制（粘贴 JSON 即可指定宿主自己的源）。现在只有 YouTube / Vimeo 这类
  src 被重写成固定官方域名、内容不受使用者控制的播放器才保留该权限，任意地址一律跑在
  不透明源里。代价是任意第三方嵌入拿不到自己的 cookie / storage——对展示型嵌入，
  这个取舍优于把宿主 DOM 暴露出去。

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

- **覆盖率阈值提档**：statements 56 → **75**、lines 56 → **77**、
  branches 44 → **63**、functions 52 → **73**。实测 77.58 / 79.69 / 65.44 / 75.51，
  各留约 2 个点余量吸收机器与依赖版本差异。阈值本身做了变异验证（抬到 90 会红）。
- 新增测试文件：`ToolbarDropdownButton`（15）、`MathNodeView`（16）、
  `wordImport`（9，此前零覆盖）、`pasteImage`（9）、`LinkBubbleMenu`（8）、
  `FindReplaceDialog`（10）、`VideoToolbar`（7）、`ImageToolbar`（7）、
  `GalleryButton`（10）、`menuItem`（6，此前零覆盖）、
  `preventCommandAutoDispatch`（3，此前零覆盖）。
- `src/testing/mountEditor.ts` 新增 `waitForLocaleMessages`：语言包是按需加载的，
  等待判据只能问 locale 上下文自己。按渲染文本判会因组件恰好没渲染文案而**一次都不等**
  ——这个坑在三个测试文件里各踩了一次，收敛成一个工具。
- ⚠️ 本轮有五条用例第一版**锁不住任何东西**，都已改写或如实标注：
  卸载清定时器（断言总数下降，而 antd/Vue 自己也会清）、
  视频删除（测试文档 HTML 写错标签，`not.toContain("video")` 恒真）、
  预览不弹窗（弹窗开着但地址为空时同样拿不到元素）、
  非法链接保留弹窗（antd 关闭是过渡动画，同一拍观察不到）、
  以及三处**不可达的双保险**（`:split-hover` 后缀早退、`!node` 与 `pos === null`
  重复、`updateAttributes` 对非 image 节点本就无效）——后者按方法论标注为
  「防御性双保险」而没有硬凑测试去覆盖。

- `src/features/ai/shared/runAiSuggestionStream.test.ts`（新增，6 条）—— 走真实入口
  验证换流后的句柄交接：旧流的 `AbortError` / `onComplete` 都不得带走新流的取消能力。
  ⚠️ 其中两条第一版锁不住东西：`onComplete` 那条没构造出「旧流收尾晚于新流启动」的
  时序（两种实现结果相同），空 token 那条断言的是文本（空串本来就不改变文本，
  改成数 `updateSuggestion` 的调用次数）。
- `src/features/ai/shared/abortControllerHandoff.test.ts`（新增护栏）——
  源码里不得出现 `setAbortController(null)`，清理必须按身份。
- `src/features/ai/translation/translateStore.test.ts`（新增，7 条）—— 持久化格式是
  语言代码；旧标签能迁移；反查不到时回到「未选择」；迁移只做一次。
- `src/features/ai/AiMenuButton.test.ts`（新增，8 条）—— 切 locale 后翻译目标的显示名
  跟着变、选中标记不丢。捕获 props 的桩写在 `render` 里，写在 `setup` 里测不出「不更新」。
- `src/utils/mediaUpload.test.ts`（新增，7 条）—— 此前零覆盖。两条路径的安全口径、
  按种类取文案、宿主未传 `translate` 时不渲染 `undefined`。
- `src/components/tools/block-menu/mediaPickFeedback.test.ts`（新增，6 条）——
  失败要提示、取消不提示、两者都不把 `<input>` 留在文档里。
- `src/components/editor/uploadFailureFeedback.test.ts`（新增，4 条）——
  两个上传组件的失败提示，以及「失败时不插入任何内容」。
- `src/locales/extensionLabelKeys.test.ts` 增加一节：按 `MediaKind` 展开
  `messages.${kind}Xxx` 逐条验证（约定 41）。

- `src/extensions/dragHandle/DragHandleExtension.test.ts`（新增，30 条）—— 此前这个文件
  1075 行**零单测**，是全仓最大的覆盖缺口（缺 387 条语句，占总缺口 1/6）。
  jsdom 里真正测不了的只有「指针落在哪个块上」这一步，把 `view.posAtCoords` 换成确定
  输入之后，块转换、菜单渲染、目标选择、插入菜单通知、拖拽生命周期与资源收回全都可测，
  断言的是扩展自己的产出而不是桩。上面四条缺陷全部由这批用例锁住。
  ⚠️ 其中两条第一版**锁不住任何东西**，已改写：用 `expect(...).not.toThrow()` 验
  「监听已摘」在 jsdom 里恒真（改成监听记账，见约定 39）；「创建副本」只断言 HTML，
  而副本与原块内容相同、插前插后 HTML 一模一样（补了光标位置断言）。
- `src/locales/extensionLabelKeys.test.ts`（新增护栏）—— 扩展层写死的 locale key
  必须在 zh-CN / en-US 都解析得出。扫全仓 16 个 key（DragHandle 15 + Toggle / AI 侧
  的 `getLocaleText`），三个来源各做了变异验证。→ 约定 40
- `e2e/drag-handle.spec.ts` 从 5 条补到 8 条：「转换为」端到端改块类型且不丢行内格式、
  鼠标移到块选择器上插入菜单不自关、**拖拽换序**（这是本扩展的主功能，此前 e2e 零覆盖）。
  三条都做了真实浏览器的变异验证。

本轮修复的新增护栏（每条都做了变异验证：把实现改回旧行为，用例确实变红）：

- `src/styles/designTokenWriteScope.test.ts`（新增）—— JS 不得用内联 style 写 `--ye-*`
  设计 token。白名单只有两条正当路径（custom 外观注入、`--ye-z-base`），且会检查白名单
  本身没有过期条目。8 条自检：抓得到三种引号形式的字面量写入、注释里的写法不算数、
  非 token 的 `setProperty` 不误报、变量名形式不静态误判、行号按原文件计、URL 里的 `//`
  不被当成行注释。
- `src/utils/zIndexTokenSync.test.ts`（新增）—— `YE_Z_BASE_OFFSETS` 与 `variables.css`
  逐条对齐：偏移量相等、token 集合完全一致（不多不少）、基准默认值相等。
  这张表是 `getYeZIndex()` 在无法解析 `calc()` 的环境下的回退值，漂移后浮层层级会悄悄错乱。
  4 条自检：认得三种派生形态（`var()` / `calc(+N)` / 独立值）、注释里的声明不算数、
  漂移能被抓到、负偏移也能解析。
- `src/capabilities/toolbarGateMap.test.ts`（新增）—— 每个 `fullToolbarSlugs` 都必须映射到
  真实存在的 gate（`ExtensionGates` 的索引签名让任何字符串都能通过类型检查，拼错就静默隐藏按钮），
  同一 slug 不得被多个 capability 用不同 gateKey 声明。除了「键存在」，还逐个 slug
  验证 gate 开/关确实改变收敛结果，并覆盖 `basic` 收敛与 `features` 覆盖两条真实路径。
- `src/core/overlayFeedback.test.ts`（新增）—— toast / 通知按 `kind` 选 aria role
  （error → `alert`，其余 → `status`）、通知带 `aria-atomic`、同类反馈复用同一个 host、
  文案走 `textContent` 不解析 HTML。
- `src/core/useEditorPagination.test.ts`（新增）—— 页码统计不得向容器写入任何
  `--ye-doc-*` 内联变量，返回值里不再有 `initPageCssVariables`。
- `src/appearance/useEditorAppearance.test.ts`（新增）—— 省略可选的 `customAppearanceVars`
  不产生 `Invalid watch source` 警告；外观常量只有一份定义。
- `src/core/session/contentAdapter.test.ts` 的「BYPASS_GUARD_META 是 Symbol」改为断言**隔离性**：
  无关 symbol / 裸对象 / 字符串 `"undefined"` 都读不到 bypass 标记，且只读守卫不被第三方 meta 绕过。
  原断言锁的恰恰是缺陷本身。
- `src/extensions/lineHeight.test.ts`（新增）—— 没设过行高的段落不得被强加内联样式，
  `getJSON()` 里的 `lineHeight` 必须是 `null`（键本身是 ProseMirror 固有的，去不掉，
  关键是值），解析外部 HTML 时保留已有行高、不给没有的补默认值，
  以及「行高挂在段落节点上而非 textStyle mark 上」这条位置契约。
- `src/extensions/formatPainter.test.ts` 增加**采样行高**四例：从段落 / 标题上采得到、
  没有行高时采到 `null`、以及端到端「采样后应用到目标段落」。
  helper 里注册齐 underline / subscript / superscript / highlight / textAlign——
  应用格式刷的命令链无条件走这几组 setMark|unsetMark，**少注册任何一个整条 chain 就 run 失败**
  （实测 `applyFormat` 返回 false、文档纹丝不动）。
- `src/extensions/markdownInput/NotionMarkdownInput.test.ts`（新增）—— `[ ] ` / `[x] ` / `[X] `
  的勾选状态、`> ` 退回引用块、`---` 产生分割线。InputRule 只在真实键入时触发，
  `insertContent` 不走这条路径，因此测试逐字符驱动 `handleTextInput`（输入规则的真正入口）。
- `src/extensions/column/ColumnExtension.test.ts`（新增）—— 默认 2 栏、列数钳制在 2~4、
  非有限数回退，以及「column 与 columnLayout 同生共死」——不注册 Column 时
  `content: "column+"` 在 **schema 构建阶段**就抛错，命令里那句 `if (!schema.nodes.column)`
  因此实际不可达，是防御性守卫而非业务分支。
- `src/features/ai/shared/abortControllerHandoff.test.ts`（新增）—— 换流时取消上一个、
  传 `null` 不 abort、重复传同一个不自我取消。
- `src/core/overlayFeedback.test.ts` 增加销毁降级两例：销毁后不抛错也不再产出节点，
  但**结构错误仍要抛**（缺 `.yaniv-editor` 祖先），那是开发期 bug，不能一起吞掉。
- `src/components/editor/link/LinkButton.test.ts`（新增，6 例）—— 直接测抽出的
  `linkActions`：光标在已有链接内（无选区）要更新原链接而不劈开它、有选区加链接、
  无选区且不在链接内插入 URL 文本、选中链接一部分时整条一起改。
- `src/components/editor/font/fontSelectSync.test.ts`（新增，3 例）—— 字号 / 字体下拉
  必须跟随选区：光标在 28px 与 12px 之间移动时回显同步更新、移到没有字号的文字上
  回落默认值。测试桩在 **render** 里捕获 props（放在 setup 里只能拿到首帧，
  这样的桩测不出「不更新」这个缺陷）。
- `src/components/editor/heading/useHeadingActions.test.ts`（新增，5 例）—— 按钮入口
  与下拉入口产出**相同的 HTML**、设为标题时清掉 textStyle、再点同级切回段落
  （保持 toggle 语义）、切到别的级别不误切回、非法级别被挡下。
- `src/components/editor/align/AlignDropdown.test.ts`（新增，2 例）—— 四个菜单项都带
  `active`，且当前对齐恰有一项选中。
- `src/components/tools/inline-toolbar/InlineToolbar.test.ts`（新增，2 例）——
  容器带 `role="toolbar"` 与 `aria-label`，且整个工具栏只有**一个** tab stop。

- `src/utils/htmlRegexSafety.test.ts`（新增）—— 用正则处理 HTML 的两条安全规则：
  ① `String.replace` 的替换串不得是运行时变量（`$&` / `` $` `` / `$'` 会被展开）；
  ② 从 HTML 摘标签不得用 `[^>]*` 当属性区（引号内的 `>` 不结束标签）。
  扫描前先把注释、字符串与模板串掩成**等长**空白（行号才算得准），正则字面量保留 ——
  逐字符状态机是必须的：TS 里 `/` 既可能开注释、开正则也可能是除号，`"https://x"` 里的 `//` 不是注释。
  规则 ① 放过同文件里定义为函数的名字：替换参数是函数时没有展开语义，
  把它抽成具名函数复用是正当写法，只认「裸标识符」会误报（实测先误报了本轮修复自己的 `insert`）。
  9 条自检：注释/字符串/模板串里的写法不算数、行号按原文件计、不被字符串里的 `//` 骗到、
  抓得到变量与字符串常量、放行字面量与函数、不被第一个实参里的逗号（`/a{1,2}/`、`build(a, b)`）骗到。
- `src/extensions/office-paste/officePasteRobustness.test.ts`（新增，18 例）—— Office 粘贴在
  **畸形与不可信输入**下不得损坏或丢弃内容：`mso-list:none` / 层级解析异常 / 层级钳制 /
  `level` 不得冒充列表 id、写死黑色的清理与 `background-color` 不误伤、`<o:p>` 三种形态、
  CSS 声明切分（data URL、引号、转义引号）、占位串 `$&` 不展开、引号内 `>` 不截断、
  `MsoNormal` 选择器口径、Excel 多类名与字体色。

- `src/styles/mediaQueryOrder.test.ts`（新增）—— `@media` 块里的声明不得被同文件后续的
  **无条件同选择器**规则盖掉（`@media` 不提升特异性）。10 条扫描器自检：抓得到「媒体块在前」
  与同值冗余，放行正确顺序 / 不同选择器 / 不同属性 / 媒体块里的 `!important` /
  后续同样在媒体块内的规则，注释里的花括号不干扰切分，跨行选择器能归一化匹配。
- `src/styles/scopedPseudoScope.test.ts`（新增）—— `:deep()` / `:slotted()` / `::v-deep` /
  `:global()` 只能出现在 `<style scoped>`（`:global()` 另放行 `<style module>`），
  `/deep/` 与 `>>>` 一律禁用。11 条自检：普通 `.css`、缺 `scoped` 的 `<style>`、
  同文件里 scoped 与非 scoped 两块只报后者、注释内不算、行号按原文件计。
- `src/styles/buttonFontInherit.test.ts`（新增）—— **会渲染文字的**原生 `<button>`
  必须有一条样式声明 `font` / `font-family`。按按钮的**整组 class** 判定
  （`class="math-btn math-btn--save"` 的字体由基类提供，拆开逐个判会误报）；
  纯图标按钮放行。12 条自检覆盖文字/插值/`<span>` 包裹、跨文件提供字体、
  `font-size` 不算字体声明、注释掉的 `font` 不算、`.x` 不误配 `.x-large`。
- `src/styles/darkTokenAliases.test.ts` 扩出**形状 C**：`:root` 上的纯别名
  （`--ye-A: var(--ye-B)`）必须在 `.yaniv-editor` 实例作用域重声明。7 条自检：
  抓得到漏声明、补上后放行、不把字面值与 `calc()` 派生当纯别名、
  复合选择器不算实例作用域、注释含花括号时仍能正确切分。
- `src/styles/darkOverrides.test.ts` 增加**深色属性挂载层级**检查：`.yaniv-editor` 不得写成
  `[data-color-mode]` 的后代。6 条自检，含「不把 `.yaniv-editor__overlay-portal` 这类
  BEM 派生类当成根节点」。
- `src/styles/darkOverrides.test.ts` / `darkTokenAliases.test.ts` 的规则切分改为**先掩码注释**，
  并各补一条回归用例（注释含花括号时仍抓得到、行号不偏）。此前两个扫描器都是逐字符找 `{`、
  之后才剥注释，注释里一个花括号就会让整份文件切分错位、静默漏报。

- `src/styles/darkTokenAliases.test.ts`（新增）—— 深色 token 表完整性，覆盖「派生 token
  在声明处求值」与「外观浅色段盖住全局深色段」两种形状，各带一组扫描器自检
  （能抓到真样本、放过已显式声明的、`@media` 内的规则不当基础值）。
- `src/styles/darkOverrides.test.ts` 扩到平铺兄弟形态（`[data-color-mode="dark"] .x` vs `.x`），
  含三条自检：抓得到同值覆盖、放过真正换了值的覆盖、不拿 `@media` 内的规则当基础值。
- `src/styles/uaResetScope.test.ts` 增加第二条规则：写了 `appearance: none` 的规则必须同时
  声明 `background`（浏览器实测 `appearance: none` 不会清掉 UA 的 `ButtonFace` 灰底）。
- `src/composables/editorListenerScope.test.ts` 增加第二条规则：**组件**订阅编辑器事件后，
  必须存在随生命周期触发的退订（`onCleanup` / `onBeforeUnmount` / `onUnmounted` / `onScopeDispose`）。
  节点视图与 manager（`.ts`）不判——它们的生命周期由 ProseMirror / 调用方的 `destroy()` 负责。
- `src/components/editor/zoom/ZoomBar.test.ts`（新增）—— 卸载后监听数回到基线、反复挂载卸载不累积、
  换实例时旧实例被摘干净。
- `src/extensions/shared/nodeViewDecorations.test.ts`（新增）—— toggle / callout 空态 placeholder
  由节点装饰驱动（收敛实现后行为不变），以及装饰同步不抹掉 dom 上别人加的类。
- `src/extensions/toggle/ToggleExtension.test.ts`（新增）—— 箭头 `aria-label` 取实例 locale、
  未注入时退回 key（不写死英文）、`aria-expanded` 跟随展开态。
- `src/styles/overlayBaseSkin.test.ts`（新增）—— 浮层容器必须在结构层样式表里就有背景色，
  含四条自检（认得出缺背景、`background`/`background-color` 都算数且不误认 `scrollbar-color`、
  只认选择器完全相同的基础规则）。

- `src/extensions/mention/mentionItems.test.ts` —— `getSuggestionItems` 真的被消费、每次现取、
  空数组回退内置数据、editor 已销毁不抛错，以及块菜单「页面链接」用的是宿主数据。
- `client.test.ts` 新增「模型调参」「client 文案跟随实例 locale」两组 —— 前者断言
  `VITE_AI_*` 进到请求体（含「凭据来自更高优先级时调参仍生效」与非数字退回默认值），
  后者断言未配置提示 / demo 流式文案 / 非 Error 兜底都走注入的解析器。
- `aiConfigResolution.test.ts` 补 `createConfiguredAiClient` 透传 `getLocaleText`。
- `AiSettingsModal.test.ts`（新增）—— 在最小 provide 环境里挂载弹窗，断言 en-US / zh-CN 下
  存储方式区块与 provider 说明都跟随语言，且不出现原始 key。
- `localeParity.test.ts` 补：每个 `AI_PROVIDERS` 条目都要有 `providerName` / `providerDesc`，
  以及 AI 子包运行时文案两包齐全。

对上一轮新增测试做的变异测试（把源码改坏看测试是否变红），修补了发现的失效覆盖：

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
- `e2e/notion-features.spec.ts` 里「notion 隐藏顶栏」的断言用的是
  `.editor-header, .toolbar-nav` —— 全仓库没有这两个 class，命中数恒为 0，断言永远不会失败。
  改为真实存在的 `.document-toolbar`（改后仍全绿，说明结论本身是对的，只是此前没被验证）。

### Build / CI

- **移除死配置 `__BUILD_TIME__` / `__VERSION__`。** 两者在 vite.config.ts 与
  vite.config.demo.ts 里声明，但全仓库无任何引用（demo 那份还硬编码着过期的 `"0.1.0"`）。
  `__BUILD_TIME__` 用 `new Date()` 求值，会让每次构建产物都不同——对已启用 npm provenance
  的发布，可复现性是负分。
- **Playwright 断言超时 5s → 15s。** webServer 的 url 探活只说明 HTML 外壳出得来，而 demo
  是 dev 模式 SPA：首次进路由时 Vite 还要现场转换懒加载页面模块与十几个门控 chunk。
  能力按 gate 分割后这部分明显变重，5s 窗口经常撞上冷启动转换耗时（实测冷启动 6 个用例
  失败、同机预热后 11/11 全过）。放宽不掩盖真失败，且比继续靠 CI 的 retries: 2 把首跑
  失败重试掉更诚实。

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

### Docs

全量复核文档与注释同源码的一致性，改掉以下失实描述（只改文字，不改行为）：

- **`notion` preset 下大纲与查找替换「无 UI 入口」是过时说法。** 大纲面板由
  `showOutlineRail`（编辑态 + `outline` gate）渲染 rail，收起时有展开把手；查找替换面板与
  Ctrl/Cmd+F 挂在 `EditorEditChrome` 上，只看 `searchReplace` gate。二者早已与顶栏解耦，
  但 README（中英）、`docs/features/feature-matrix.md`、`docs/guide/full-editor.md` 仍在说
  「隐藏顶栏 = 这两项不可达」。
- **上传回退不是 DataURL，是 `blob:` 对象 URL。** `resolveMediaUrl` 未配置上传回调时返回
  `URL.createObjectURL(file)`——刷新即失效、不可持久化，与 DataURL 的行为差别很大。
  README（中英）、`docs/api/yaniv-editor.md`、`docs/features/media.md`、
  `docs/guide/integration-props.md`、`editorTypes.ts` 的 prop 注释与两个上传组件注释一并订正。
  （从剪贴板粘贴图片走 `PasteImage`，那条路径确实是 `data:` URL。）
- **斜杠命令不要求「空行」。** 插件用 `^\/(\S*)$` 匹配光标之前的块内文本，行首即可触发，
  光标之后可以已有内容。相关文档与 `SlashCommandExtension` 的头注释统一改为「行首」。
- **`useVirtualFocusPopup` 并未导出。** `docs/api/composables.md`（中英）曾让接入方从包里
  import 它；实际只存在于 `src/composables/`。英文版此前整节缺失，一并补齐。
- **AI 配置解析实际是四级不是三级。** `getAiConfig()` 在 `getAiRequestConfig()` 落空后还有一层
  `getHostAiConfig()` 兜底（阻止宿主明确托管时悄悄下沉到 `.env`）。`client.ts` 的函数注释、
  `docs/features/ai.md`、`docs/api/ai-config.md`（中英）同步；英文版补上缺失的「同页多实例」一节。
- **`.env.example` 与实现脱节**：删掉并不存在的 `anthropic` provider 与从未被读取的
  `VITE_AI_API_SECRET`，默认模型 / 端点与 `AI_PROVIDERS` 对齐，并说明 `VITE_AI_TEMPERATURE` /
  `VITE_AI_MAX_TOKENS` 的生效范围（这两个变量本身的失效问题见 Fixed）。
- **`ARCHITECTURE.md` 的 Normative 片段与实现对齐**：`useControlledContent`（补 `sessionReady`
  门控、`controlledSource`、写回后手动补签名）、`buildExtensions`（补 `extraExtensions` 尾部追加）、
  `applyPhaseTransition`（补 `reason` 形参）、outline capability（改为 `async` + 动态 import +
  `createOutlineScrollParentBinder`）、AI capability 示例（原示例写着 `?? "openai"`，正是同页
  下文明令禁止的兜底写法）、`withTransactionGuard`（`isEditable` 是闭包参数，不是 `addOptions`）。
  另订正：sessionKey **不含** Inline 的 `editorProps`；BlockMenuHost 在实例未就绪时是**缓冲**
  而非 no-op；不变量 6 的「禁止 `commands.setContent`」范围限定为受控写入（Word 导入是用户命令，
  本就该进 undo 栈、本就该在 preview 被拦）；interaction tier 的事件入口守卫实为
  `ctx.isEditable` 与 `view.editable` 两种，取决于取值处拿得到什么。
- **`SECURITY.md` 的支持版本停留在 `0.1.x`**，改为 `0.2.x`。
- **`PUBLISH.md` 只写了手动发布**，补上「常规发布走 tag 触发的 release workflow」，
  并订正 `files` 字段（还含 LICENSE / NOTICE / 两个 README）。
- **i18n 缺口清单严重不全。** `docs/guide/i18n.md`（中英）原文说「剩余两处」却列了三行，且漏掉
  `MentionExtension` 的候选项、`OfficePaste` 图片占位，以及 AI 子包里一整片未接 locale 的 UI 文案。
  AI 那部分已在本版修掉（见 Fixed），文档改为只列**刻意不进 i18n** 的内容型文案，
  并补上「无 locale 上下文的模块只回 key」这条分层约束。
- **CSS 导入顺序的描述与实现不符。** `inline.css` 并没有「在其它规则之前」引 `content.css`；
  真正的硬约束只有「`content.css` 必须早于 `appearance/styles/*.css`」，而后者 inline 根本不引。
- 其它订正：`formatPainter` 的「清除浏览器缓存」（不存在）与 `FormatPainterFormats` 的
  「本地存储的键名」（是格式集合）；`prompts.ts` 的 `targetLanguages` 说明（内置 UI 传的是本地化
  语言名，走不到这张按 code 索引的表）；
  Word 导出的覆盖边界（图片 / 视频 / 公式 / 嵌入完全丢失，Notion 容器只留文字）；
  `virtual focus` 弹层的上下键其实由菜单组件的全局 `keydown` 消费，不是「扩展在 ProseMirror 层处理」；
  demo 的能力提示（notion 下并没有对齐 / 清除格式入口，浮动菜单里也没有插图片 / 视频 / 表格，
  大纲在右上角不在左侧）。

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
