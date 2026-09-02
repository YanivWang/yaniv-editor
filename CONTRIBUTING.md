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
   注意白名单要落在「属性进入文档」处：节点/标记的 `parseHTML` 只覆盖 HTML 这一条，
   JSON 内容与命令都绕开它（见 `utils/mediaSrcPolicy.ts`、`utils/linkHrefPolicy.ts`）。
   从 attrs 取出 URL 再交给浏览器（`window.open` 等）时也要再过一次。
4. **新增文案必须同时补 `zh-CN` 与 `en-US` 以及 `locales/types.ts`。**
   `localeParity.test.ts` 会校验两边 key 完全一致、无空值，并且每个 `AI_PROVIDERS`
   条目都有 `providerName` / `providerDesc`。
   拿不到 locale 上下文的模块（纯 composable / 纯函数）**只回 key**，翻译交给上层组件；
   需要自己产出文案的模块用入参接收解析器（见 `createAiClient({ getLocaleText })`）。
   用独立 `createApp` 挂载的浮层把 `t` 作为显式 prop 传入，不要伪造 `provide(editorLocaleKey)`。
   任何情况下都不要在这类模块里写中文常量。
5. **交互元素用原生语义标签。** `div` + `@click` 会被 `vuejs-accessibility` 拦下；
   确有必要时用 `eslint-disable-next-line` 并写明理由。
   把 `span` / `div` 换成 `<button>` 时，**浏览器默认按钮样式的重置要写在基础选择器上**，
   不能塞进 `.is-selected` / `:hover` 这类状态规则——否则元素只在该状态下才正常。
   静态护栏：`styles/uaResetScope.test.ts`。
6. **节点位置从选区推导，不要拿节点对象反查。** 「复制块」会让副本与原块共享同一批子节点实例，
   `doc.descendants` 里两处节点真的 `===`；且回调 `return false` 只是不再向下递归、
   并不终止遍历。参照 `components/tools/image-toolbar/imageToolbarActions.ts`。
   块内容末尾用 `$pos.end(depth)`，不要写 `$pos.start(depth) + parent.nodeSize`。
7. **`inline: true` 的节点必须序列化成 phrasing content。** `renderHTML` 输出 `div` / `p`
   会让 `getHTML()` 产出 `<p><div …></div></p>`，回读时段落被劈开、每轮多出两个空段落。
   块级展示交给 class + CSS `display`。见架构不变量 21。
8. **流式响应要跨 chunk 缓冲。** 解码带 `{ stream: true }`，按行切分要保留残行并在流末冲刷。
   统一走 `features/ai/adapters/readStreamLines.ts`，不要在 adapter 里另写一份。
   回归用例按**字节**切分构造 chunk——按整行切分覆盖不到这条路径。
9. **dark 覆盖不得与基础规则同值。** 主题走 CSS 变量，token 本身已在 dark 段改写过，
   再写一条同值覆盖恒为空操作。嵌套（`[data-color-mode="dark"] &`）与平铺
   （`[data-color-mode="dark"] .x { }` 单独成条）两种写法都算。
   静态护栏：`styles/darkOverrides.test.ts`。

10. **节点视图的 `update()` 一律读 `updatedNode`，不要沿用创建时的 `node`。** 返回 `true`
    表示「已自行处理」，PM 就不再重建视图，陈旧渲染会永久留在页面上。视图内持有
    `let currentNode = node`，`update()` 里先推进再渲染。
11. **要读「刚渲染出的 DOM」的 watcher 必须 `flush: "post"`。** 默认的 `pre` 跑在重渲之前，
    此刻新元素还不存在；这类 watcher 又常带「值没变就返回」的去重守卫，跳过一次就再也补不回来。
12. **组件订阅编辑器事件时，退订首选 `onCleanup`。** 回调触发时 `editor.value` 已经是新实例，
    读它去 `off()` 摘不掉旧实例上的监听；而只处理 `prev` 参数的写法又漏掉**组件卸载**
    ——watcher 停止时回调不再跑，监听就永久留在仍然活着的编辑器上。
    `onCleanup` 两种情形都覆盖。用 `prev` 参数的必须另配 `onBeforeUnmount`。
    静态护栏：`composables/editorListenerScope.test.ts`（两条规则）。
13. **节点属性不要占用 `id` / `class` / `style` 这类 HTML 全局属性名。** 默认属性渲染会把它们
    原样写成同名 HTML 属性，让文档内容溢出到宿主页面的语义层。必须自带 `renderHTML` 输出 `data-*`。
    静态护栏：`extensions/nodeAttributeNames.test.ts`。
14. **token 表要写完整，别靠继承或特异性巧合。** ① `:root` 上值形如 `var(--ye-X)` 的派生
    token，必须在深色段原样再声明一遍——自定义属性的 `var()` 在**声明处**求值，写在 `:root` 上
    就已经算成浅色值了；② 外观浅色段（`.yaniv-editor.appearance-X`，0,2,0）会盖住全局深色段
    （`[data-color-mode="dark"]`，0,1,0），凡在浅色段声明过、深色段也想改的 token，
    都要在外观自己的深色段里显式写出（哪怕值与浅色相同）；
    ③ 同理，`:root` 上的**纯别名** token（`--ye-A: var(--ye-B)`）还必须在
    `.yaniv-editor` 实例作用域再声明一遍——外观类、深色属性、`appearance="custom"`
    的内联变量三条覆盖路径全都落在编辑器根节点这一个元素上，别名只有跟它们同元素
    才跟得上（word / notion 曾各断掉 10 / 9 个 token，custom 全断）。
    静态护栏：`styles/darkTokenAliases.test.ts`。
15. **`appearance: none` 必须配套 `background`。** 它只关掉原生控件绘制，不会清掉 UA 的
    `button { background-color: ButtonFace }`，元素会一直顶着灰底。
    静态护栏：`styles/uaResetScope.test.ts`。
16. **浮层容器的基础皮肤写在结构层，不要整个推给 appearance。** 结构层用 `--ye-*` token
    给一套所有外观都能用的底色/边框/阴影，appearance 只在需要偏离 token 时覆盖。
    否则漏写皮肤的外观就是透明面板压在正文上（`appearance-word` 真出过）。
    静态护栏：`styles/overlayBaseSkin.test.ts`。
17. **`div` 改 `button` 时别忘了 `font: inherit`。** 按钮不继承字体，UA 会给一套自己的
    （Chromium 是 `Arial`）。大纲条目、块选择项、提及菜单项、公式按钮都漏过，
    结果浮层里的字体与正文对不上。**只对会渲染文字的按钮加**——纯图标按钮加了会连字号
    一起改掉、改变图标度量。静态护栏：`styles/buttonFontInherit.test.ts`。
18. **`@media` 块要写在它想覆盖的基础规则之后。** 媒体查询不提升特异性，同选择器同特异性
    只看源码顺序；写在前面会被后面的基础规则整块盖掉，而且没有任何工具会报错
    （`toolbar-dropdown.css` 的窄屏压缩曾整块失效）。
    静态护栏：`styles/mediaQueryOrder.test.ts`。
19. **`:deep()` / `:slotted()` / `::v-deep` 只能写在 `<style scoped>` 里。** 它们是
    `@vue/compiler-sfc` 的编译期标记，写进普通 `.css` 或没带 `scoped` 的 `<style>` 就没人转换，
    会原样进产物，浏览器当成无效选择器**丢弃整条规则**（`table.css` 曾有 12 条这样蒸发）。
    静态护栏：`styles/scopedPseudoScope.test.ts`。
20. **深色规则里 `.yaniv-editor` 不能写成 `[data-color-mode]` 的后代。** 该属性是
    `applyAppearanceToElement` 写在编辑器根节点**自身**上的，正确形态是
    `.yaniv-editor[data-color-mode="dark"]`（复合）或 `[data-color-mode="dark"] .某后代`。
    写成 `[data-color-mode="dark"] .yaniv-editor …` 要求另有外层祖先持有该属性，永远匹配不到。
    静态护栏：`styles/darkOverrides.test.ts`。
21. **`String.replace` 的替换串不得是运行时变量。** 字符串形式的替换参数里 `$&`、`` $` ``、
    `$'`、`$1` 是**替换模式**，会被展开。替换串一旦来自选项或宿主输入就会失控：
    `replaceImageWithPlaceholder` 曾把公开选项 `imagePlaceholderHtml` 直接当替换串，
    宿主传 `<span>$&</span>` 时 `<img src="…">` 被替换成 `<span><img src="…"></span>`——
    图片没被占位替掉，原始标签连同本地路径又被塞了回去。改用函数形式（`() => placeholder`）
    没有任何展开语义。静态护栏：`utils/htmlRegexSafety.test.ts`。
22. **用正则从 HTML 摘标签时，属性区一律用 `TAG_INNARDS`，不得写 `[^>]*`。** 引号内的 `>`
    不结束标签：`<img alt="a>b" src="x.png">` 用 `[^>]*` 只吃到 `<img alt="a`，剩下的
    `b" src="x.png">` 作为**可见文本**留在文档里，还会把 Word 图片的本地路径泄漏成正文。
    片段在 `src/utils/htmlTagPattern.ts`。静态护栏：`utils/htmlRegexSafety.test.ts`。
23. **外部输入驱动的结构生成必须钳制取值范围。** 剪贴板 / 宿主传入的数值直接喂给建树循环时，
    畸形值就是拒绝服务：Word 列表层级 `mso-list:… level5000 …` 曾让 `transformLists`
    创建 5000 层嵌套 `<ul>`，序列化时 parse5 递归爆栈抛 `RangeError`，
    而 `transformPastedHTML` 抛异常会让整次粘贴失败。按业务上限钳制（Word 列表最深 9 级）。
24. **JS 不得用内联 style 写 `--ye-*` 设计 token。** 这些 token 归 CSS 分层所有
    （`variables.css` 给基础值、`appearance/styles/*.css` 三套外观各自覆盖），
    而内联 style 优先级高于**任何**选择器，JS 写一次就把整套外观按死。
    `useEditorPagination` 曾把 A4 常量写到 `.document-container` 上，浏览器实测
    default 外观的 900px 页宽被压成 794px、48px 内边距被压成 96px，
    notion 的 708px 同样被压成 794px，连 word 自己的 939px 最小高度也被改成 931px。
    只有两条正当路径：custom 外观的变量注入，以及 `--ye-z-base`（公开 prop `zIndexBase`）。
    静态护栏：`styles/designTokenWriteScope.test.ts`。
25. **ProseMirror 的 meta 键必须是字符串或 `PluginKey`，不能用 `Symbol()`。** 存取走
    `this.meta[typeof key == "string" ? key : key.key]`，symbol 没有 `.key` 属性，
    于是**所有** symbol 键共用 `meta["undefined"]` 这一个槽——实测任意 symbol、
    任意没有 `.key` 的裸对象、乃至字符串 `"undefined"` 都能读写它，
    只读事务守卫因此可被任何第三方 meta 意外解除。用带命名空间前缀的字符串（`"yaniv:xxx"`）。
26. **两处必须手工同步的表要配静态护栏。** `YE_Z_BASE_OFFSETS` 与 `variables.css` 的
    `calc(var(--ye-z-base) + N)` 是一例：漂移后回退值算错，表现为「浮层被别的层盖住」这类
    只在部分环境复现、又不报任何错的问题。护栏：`utils/zIndexTokenSync.test.ts`。
    工具栏 slug → gate 的映射同理，护栏：`capabilities/toolbarGateMap.test.ts`。
27. **可选的 ref 参数不能直接放进 `watch` 源数组。** 省略时数组里就是一个 `undefined`，
    Vue 报 `Invalid watch source`（`useEditorAppearance` 实测）。包成 getter：
    `() => maybeRef?.value`。

28. **同一个 handler 不要既订 `transaction` 又订 `update` / `selectionUpdate`。**
    `transaction` 是另两者的超集（不变量 37），重复订阅只会让 handler 白跑。
    需要覆盖 `setEditable`（唯一不发事务却 emit `update` 的路径）时，
    用另一个 handler 单独订 `update`。护栏 `composables/editorListenerScope.test.ts` 会挡。

29. **批量上传的弹窗要等整批结束才关。** antd 的 `<a-upload-dragger multiple>`
    对每个文件各调一次 `customRequest` 且**并发**发起（实测），
    「成功就关弹窗」会在第一个文件完成时关掉，后面的仍在后台上传并继续往文档插内容。
    用 `useBatchUploadGate`：整批结束且至少一个成功才关，全批失败时保持打开让用户看到错误。

30. **`chain` / `first` 的候选项要用注入的 `commands`，不要写 `editor.commands.x()`。**
    后者会各自立即 dispatch，让外层那个基于旧 state 的 tr 抛
    `RangeError: Applying a mismatched transaction`（不变量 39）。异常不冒泡、文档也看不出，
    只会变成未捕获错误——所以这类改动要用 `window` 的 `error` 事件来验证，光看结果不够。

31. **判断 antd 组件上的样式是否为死声明，必须起 dev server 看运行时 CSSOM。**
    antd v5 是 CSS-in-JS，规则不在 `dist/style.css` 里，只读本仓库 CSS 一定算错特异性
    （不变量 40）。⚠️ 两个探针坑：同一个同步 JS 块里注入 `<style>` 后**立刻**
    `getComputedStyle` 读到的是上一拍的旧值，必须 `await` 一次 `setTimeout` 再读；
    而预览面板隐藏时 `requestAnimationFrame` **不触发**，用它等会直接超时。

32. **主 chunk 里，只有写在对象字面量属性上的注释吃预算。**
    ESM 产物不压缩，但 Rollup 只保留附着在输出节点上的注释：`.ts` / `.vue` 里
    语句之间的注释实测 **0 B**，而 `addAttributes()` 这类返回对象里逐属性写的注释
    30 行要 **209 B**（不变量 41 有实测表）。所以给 `core/` / `capabilities/` /
    core 能力下的扩展写**函数体内的论证注释不必克制**——该写清楚就写清楚；
    真正要留神的是 schema 定义那种对象字面量。
    长篇的时序论证仍建议放不变量条目或测试注释里：那里读者更容易找到，
    也不用担心哪天位置一挪就开始计费。

33. **新增 `--ye-*` token 的同时就要写用到它的规则。** 零消费方的 token 没有任何效果，
    却会被后来者当成"可覆盖的设计系统接口"（不变量 42）。
    护栏 `styles/tokenConsumers.test.ts` 会挡；`examples/` 里的使用也算数。

34. **基础组件的事件要透传原生事件对象。** `ToolbarButton` 此前 `emit("click")` 不带 payload，
    调用方拿不到 `MouseEvent.detail`，就没法识别双击序列里的第二次 click
    ——只能退回"给每次单击加一个双击窗口延迟"的做法。给 emit 加 payload 是向后兼容的扩展。

35. **写工具栏组件时，先问「这个状态在组件重挂后还成立吗」。** 编辑器活得比工具栏久：
    `mode` 在 edit / preview 之间往返就会把整个编辑 chrome 卸载重挂，而编辑器实例、
    历史栈、内容都不变。凡是能从编辑器当场问出来的（`can()` / `isActive()` / `getAttributes()`），
    就当场问，不要在组件里另记一份"发生过什么"的标记——那份标记重挂即失效（不变量 43）。
    写测试时把「挂载在一个已经有状态的编辑器上」当成必测场景，
    而不是只测「从空编辑器开始操作」。

36. **区分「受控内容」与「初始内容」，但判据要用「源变没变」而不是「第几次」。**
    `useControlledContent` 的 `controlledSource = content ?? initialContent`：inline 的
    `content` 是真受控（v-model，宿主是权威，session 重建后重新应用是对的），
    而 full 的 `initialContent` 是一次性初始值——它 emit `update` 让宿主自己存。
    让它掉进受控源的位置，就会在每次 `sessionReady` 翻转时重灌一遍，
    把刚从快照恢复的用户内容盖掉。
    ⚠️ 但**不能**因此改成「只在首次就绪时应用」：`sessionReady` 这个 watch 还兜着
    「重建期间错过的源变更」——重建时它是 false，`watch(controlledSource)` 会早退。
    demo 的 `initialContent` 是 `computed(() => getSampleContent(preset))`，
    切 preset 时源变了且同时触发重建，按「只灌一次」写会让新内容永远进不去
    （实测打穿 6 个 e2e）。两条路径要各有一个用例，改一边必须看另一边有没有转红。
    **改动会话重建路径时，必测「切换 locale」**：它是唯一会让语言代码同步变、
    语言包异步落地的入口，两次 rebuild 重叠，是这一带最容易漏的时序（不变量 44）。

37. **判一个 token 死活之前，先确认「消费方」不是注释或测试。** `tokenConsumers`
    的字符串判据带反引号，而中文注释里写 `` `--ye-x` `` 是本仓库的通行写法——
    第 13 棒的 `--ye-caret` 就是这么躲过护栏的：三处分层声明齐全，却没有任何规则读它。
    反过来也要留意：**死 token 未必该删**。`--ye-caret` 按形状 C 分层声明得很规范，
    注释里还留着作者核对它渲染值的记录，说明是「写了一半」而不是「不需要」——
    这种补规则，不要删。删之前先问一句：它是从来没人要，还是有人要了但没接上？

38. **加间距时先看 `styles/spacingScale.test.ts` 的清单，不要随手写新值。**
    写出清单外的值测试会红。那不是在为难你，是让你停下来想一次：
    这个场景真的需要一个新档位，还是复用已有的就行？确实需要就加进清单并写清理由
    （例外清单里每一条都有理由，见不变量 48）。
    反过来，**不要为了让间距「成体系」就去 token 化**——组件内部的 padding / gap
    没有消费方，包一层 `var()` 只会多一层间接并吃掉产物预算。

39. **别用 `expect(...).not.toThrow()` 验「销毁后监听已摘掉」。** jsdom 里事件处理器
    抛出的异常**不冒泡到 `dispatchEvent` 的调用点**，那样写恒真——测试永远绿，
    监听漏摘也照样绿。要验就直接记账：临时替换 `addEventListener` /
    `removeEventListener` 记录注册与注销，销毁后断言账本清零
    （`DragHandleExtension.test.ts` 的 `trackDocumentListeners`）。
    同一个坑的另一面是：那种异常最终会变成 vitest 的 "Unhandled Errors"
    并让 `verify` 退出 1，而单跑那个文件完全看不见。

40. **扩展里写死的 locale key 走护栏，不指望类型系统。** 扩展拿不到 Vue 的 inject，
    文案经选项回调注入（`getMenuLabel` / `getLocaleText`），registry 的实现是
    `resolveMessage(locale, key) ?? key`——**未命中静默回退成 key 本身**，
    界面上直接出现 `slashCommand.heading1`。回调签名收的是 `string`，TS 拦不住；
    `localeParity` 只保证两份语言包彼此对齐，也管不到「代码引用的 key 存不存在」。
    `locales/extensionLabelKeys.test.ts` 扫全仓源码逐条解析，新增这类 key 时它会兜住。

41. **模板拼出来的 locale key 要把取值域展开验证。** `messages.${kind}UploadFailed`
    这类写法字面量扫描器认不出，于是「image 有、video 没有」能一直藏着
    ——`videoUploadFailed` 就是这么漏的，界面上直接显示原始 key。
    护栏对 `MediaKind` 的两个取值各展开一遍。新增按枚举拼 key 的写法时，
    要么把取值域加进护栏，要么改成字面量。

42. **改文案前先查它有没有消费方。** 文案齐全（zh / en / types 三处都有）但零引用，
    通常不是「多余」而是**「有人要了但没接上」**——`imageUploadFailed` 写好之后
    从来没被 `catch` 用过，于是上传失败一直是无声的。判断方法同不变量 26：
    看它周围有没有「曾经有人认真对待过」的痕迹（成对的兄弟 key、types 里的声明、
    同类场景里已经接上的写法）。

43. **写「某某不会发生」的断言前，先确认「它会发生」的那一半站得住。**
    `expect(html).not.toContain("<video")` 在文档里压根没解析出 video 节点时恒真
    ——测试文档的 HTML 写错标签（`Video` 认的是 `video[src]`）就会这样，
    而它看起来一切正常。**在否定断言之前加一条肯定的前置断言**
    （`expectHasVideo`），让「素材根本不对」当场暴露。

44. **jsdom 里有些事实观察不到，说清楚比硬测强。**
    已知的三处：antd 关闭弹窗依赖 CSS 过渡结束事件（jsdom 不触发，
    `.ant-modal-wrap` 的 class 与 style 一个字都不变）；tiptap 的 `focus()`
    走 `requestAnimationFrame` 且 jsdom 没有真实焦点管理；嵌套 dropdown 的
    overlay 停在测量阶段不渲染内容。碰到这类情况**在测试里写明为什么没测**，
    并把验收交给 e2e 或组件自己的插槽契约——留一条恒真的断言比没有更糟。

45. **挂起的 jsdom 观察要么去真实浏览器结案，要么别留着。**
    第 16 棒留下「替换后选区没落到命中上（jsdom）」这条观察，第 17 棒在 Playwright
    里复验：**复现**，而且比原描述更大（「上一处 / 下一处」同样不动）。
    ⚠️ 复验环境本身要先自证可信：在 Claude 的浏览器预览面板里
    `requestAnimationFrame` 不触发（面板隐藏时被节流），而 tiptap 的 `focus()`
    正好走 rAF——拿它当"真实浏览器"会得到与 jsdom 一样的假象。判据：
    先在页面里跑一次 rAF 探针，不触发就换 Playwright。

## 测试

- 单测：`src/**/*.test.ts`（vitest + jsdom）。纯函数与扩展行为优先。
- 组件测试：`@vue/test-utils`，覆盖 gate 过滤、条件渲染与无障碍属性。
- E2E：`e2e/*.spec.ts`（Playwright，chromium）。

覆盖率阈值配置在 `vitest.config.ts`，不要为了让 CI 通过而下调阈值。

## 发布

见 `PUBLISH.md`。`prepublishOnly` 会自动构建。
