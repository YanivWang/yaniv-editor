# 任务交接：yaniv-editor 全量源码逐行复核

**用中文回复。** 用户全程用中文，仓库注释 / CHANGELOG / ARCHITECTURE 也全是中文。

> 这份文档取代了逐棒新建的 `HANDOFF-N.md`：**每推完一个阶段就地更新它**，
> 新一轮开工先完整读完本文件，再按「当前阶段」一节继续。

## 你要做什么

仓库：`/Users/wangcheng/Documents/workSpace/frontEnd/pixelBloomSpace/tiptapCases/yaniv-editor`
（`@yanivjs/yaniv-editor` v0.2.0，Vue 3 + Tiptap 3 富文本编辑器库，分支 `main`）

原始任务（用户原话的实质）：

1. **详细阅读源码，更新文档，防止文档描述和源码不一致；同时更新代码内注释，防止注释跟实际代码不一致。**
2. **所有模块都必须逐句复核，不能机械审计。没用的文档就删除，过时的就更新。**
3. **该修复的问题就彻底修复，从根因修复，不留尾巴。**
4. **必须逐行读完，不能缩水。遇到问题就从根因修复，不能打补丁，按企业主流最佳方案来。**

第 4 条是关键：用户明确拒绝「只读注释 + 抽样」，要求**每个文件从第一行读到最后一行**（含 `<style>` 块）。

**工作节奏（用户第 9 棒明确要求）**：读交接 → 推进一个阶段 → 写交接 → 下一阶段，**一直推到全部读完为止，不要中途停下来等指令**。

> **第 9 棒已把 294 个文件全部读完。** 后续接手者的工作不再是「继续读」，
> 而是下面「尾巴清单」里那些**已定位但尚未处理**的条目，以及用户新提出的需求。

---

## 进度

口径：`src/` 下 `.ts` / `.vue` / `.css`，排除 `*.test.ts` 与 `testing/`。

|          |    文件 |        行 |
| -------- | ------: | --------: |
| 全量     |     294 |     30739 |
| 已读完   | **294** | **30739** |
| **剩余** |   **0** |     **0** |

# ✅ 全量逐行复核已完成（100%）

294 个文件（含期间新增的 3 个）全部从第一行读到最后一行。
期间删除 3 个死文件、新增 3 个抽出的模块，总数不变。

### 阶段划分与状态

| 阶段 | 范围                                                                            | 文件 | 状态           |
| ---- | ------------------------------------------------------------------------------- | ---: | -------------- |
| A    | `extensions/office-paste/` 整个子树                                             |   10 | ✅ 第 9 棒完成 |
| B    | `core/` `capabilities/` `configs/` `utils/` `appearance/` `composables/` + 入口 |   47 | ✅ 第 9 棒完成 |
| C    | `extensions/` 剩余 + `features/ai/`                                             |   32 | ✅ 第 9 棒完成 |
| D    | `components/editor/`                                                            |   40 | ✅ 第 9 棒完成 |
| E    | `components/tools/` + `components/base/`                                        |   20 | ✅ 第 9 棒完成 |

### 生成剩余清单

已读完清单在本文件末尾的「已读完文件」附录。

```bash
cd /Users/wangcheng/Documents/workSpace/frontEnd/pixelBloomSpace/tiptapCases/yaniv-editor
# 把附录里的清单粘进 /tmp/done.txt
find src -type f \( -name "*.ts" -o -name "*.vue" -o -name "*.css" \) ! -name "*.test.ts" ! -path "*/testing/*" | sort > /tmp/all.txt
grep -vxF -f /tmp/done.txt /tmp/all.txt > /tmp/remain.txt
wc -l /tmp/remain.txt && xargs wc -l < /tmp/remain.txt | sort -rn | head -30
```

### 文档层与注释层（第 1 棒已完成，不用重做）

40+ 个 `docs/` 文件 + 根目录 README/ARCHITECTURE/CHANGELOG/CONTRIBUTING/SECURITY/PUBLISH 全部核对更新过；
所有可证伪的数量断言都回代码验证过；全仓库链接与锚点扫描零断链。
`src/` 下所有注释已用脚本提取并逐条核对过（「注释级」复核，**不等于逐行**）。

---

## 方法论（九棒验证，命中率很高）

1. **逐行读，不抽样。** `cat -n <file>` 或 `sed -n 'A,Bp'` 读完整个文件，包括 `<style>` 块。
2. **把每条注释当作可证伪的断言**去对照代码。多个真 bug 都是「注释描述了正确意图，但代码没做到」。
   **测试名、CSS 注释、文件头注释都算注释**：第 3 棒靠 `it("放行相对路径")` 名实不符挖出内容损坏；
   第 7 棒靠文件头「视觉皮肤见 appearance/styles/」发现 `appearance-word` 根本没写皮肤；
   第 8 棒靠 `_shared.css` 文件头发现只有 `word.css` 引过、且两条规则都是死的。
3. **不靠推理下结论，写探针实证。** `src/__probe.test.ts` +
   `npx vitest run src/__probe.test.ts --reporter=verbose`，用完 `rm`。
   探针里 `console.log` 实际值比断言更快看清真相。
   **第 9 棒 11 条假设里有 3 条被探针推翻**——不实测就会写出假发现。
4. **CSS / 计算样式必须用真实浏览器验证。** CSS 虽已读完，但改动 CSS（哪怕只删死代码）仍要走这条路。
   jsdom 没有布局与 UA 样式表，问不出任何计算值。做法：
   - `pnpm run build` 拿到 `dist/style.css`，**内联**进探针页（相对 `<link>` 在预览面板里加载不到）
   - 探针文件必须放在**项目目录内**（如 `__probe.html`），否则只渲染静态快照
   - `mcp__Claude_Browser__navigate` 打开 `file:///<项目绝对路径>/__probe.html`（改内容后重开要带 `force: true`）
   - `mcp__Claude_Browser__javascript_tool` 跑 `getComputedStyle(el).xxx` / `getPropertyValue('--ye-x')`
   - 用完 `rm __probe.html`

   **把「三套外观 × 明暗两态」并排放在同一页**，一次 `javascript_exec` 取回所有属性，前后各跑一次做对照。
   DOM 结构要仿真：`.yaniv-editor.appearance-X.document-layout[data-color-mode=Y]` >
   `.yaniv-editor__chrome` > `.yaniv-editor__workspace` > `.document-body` > `.document-container` >
   `.document-pages` > `.continuous-pages` > `.document-content` > `.ProseMirror`，
   浮层放进 `.yaniv-editor__overlay-portal`。
   - ⚠️ 量几何时必须给根节点显式 `width`/`height` 并把 flex 链补全，否则容器宽度塌成 0（第 8 棒踩过）。
   - ⚠️ 预览面板隐藏时 CSS 动画会暂停，`getComputedStyle` 读到第一帧。读带 `animation` 的元素前先
     `el.getAnimations().forEach(a => a.finish())`（第 8 棒差点误报 `.ai-highlight` 失效）。
   - ⚠️ `resize_window` 到比面板更宽的尺寸不可靠：`matchMedia` 报模拟宽度但 CSS 按面板物理宽度渲染。
     窄屏断点用 `preset: "mobile"` 可信；宽屏读数要交叉验证 CSSOM。

5. **探针也用来否定假设、推翻自己。** 第 5 棒 5 处、第 6 棒 1 处、第 7 棒 1 处、第 8 棒 4 处、
   **第 9 棒 3 处**「看着像 bug」经核查确认不是。第 7 棒推翻了第 6 棒写下的注释。
   **写进 CHANGELOG 前先确认它真的可达**，否则会写出夸大的结论。
6. **每个修复都要变异验证**：备份源文件到 `$TMPDIR`，把修复改回缺陷状态，跑新测试确认**转红**，再恢复。
   没转红的测试等于没写。

   ```bash
   cp src/x/y.ts "$TMPDIR/y.keep.ts"
   # 手工把 y.ts 改回缺陷态（见下方 ⚠️）
   npx vitest run src/x/y.test.ts            # 必须失败
   cp "$TMPDIR/y.keep.ts" src/x/y.ts
   ```

   - ⚠️ **绝对不要用 `git show HEAD:<file>` 还原来做变异验证。** 复核成果**全部未提交**，
     `HEAD` 停在第 7 棒之前，这样会把前几棒的修复一起撤掉，导致无关护栏转红被误判成新发现（第 8 棒踩过）。
     正确做法：`cp` 备份当前工作区文件，**只把自己这一处**改回缺陷态。
   - ⚠️ **变异验证期间绝对不要同时在后台跑 `pnpm run verify` 或 `build`**（第 3 棒踩过）。
   - ⚠️ **改完必须 `grep` 确认变异真的写进去了。** 第 9 棒有一次 perl 替换没匹配上，
     「测试仍全过」是无效结果而不是负结果——`grep -c` 返回 0 才发现。
   - ⚠️ **没转红要先想清楚是「测试没锁住」还是「这处不可达」。** 第 9 棒两处没转红：
     一处是用例恰好绕过了差异（补用例后转红），另一处确认**不可达**（钳制生效后 early-return
     永远走不到），后者如实标注成「不变量守卫」而**没有**写进 CHANGELOG 当修复。

7. **修完就把规则钉进不变量**：`ARCHITECTURE.md` 的编号不变量列表（**现有 36 条**）+
   `CONTRIBUTING.md` 的约定列表（**现有 27 条**），并在 `CHANGELOG.md` 的 `[Unreleased]` 段登记。
   - ⚠️ **新增编号前必须 `grep -nE "^[0-9]+\. "` 核对现有最大编号。** 第 9 棒在注释里写了
     「见约定 18」，而约定 18 早被 `@media` 顺序占用，只能回头改成 22。
   - ⚠️ 往 `CHANGELOG.md` 插新分节时注意：`[Unreleased]` 的 `### Fixed` 段很长（现已 600+ 行），
     直接在 `### Fixed\n` 后面插新分节会把原有条目全挤进去。**在 Fixed 段末尾追加条目最安全**。
8. **能写成静态护栏的就写静态护栏**——对现存与未来文件同时生效，价值最高。
   **现有 17 个文件 / 28 条规则**（第 9 棒新增 4 个）：
   - `components/editor/table/tableToolLabels.test.ts`（`t()` 不得在 setup 顶层求值后冻结）
   - `locales/localeParams.test.ts`（带 `{占位符}` 的文案不得漏传 params）
   - `styles/darkOverrides.test.ts`（dark 覆盖不得与基础规则同值；三种形态；
     - `.yaniv-editor` 不得写成 `[data-color-mode]` 的后代）
   - `styles/uaResetScope.test.ts`（UA 重置不得写在状态选择器里；`appearance:none` 必须配 `background`）
   - `styles/darkTokenAliases.test.ts`（token 表完整性：形状 A/B/C）
   - `styles/overlayBaseSkin.test.ts`（浮层容器必须在结构层就有背景色）
   - `styles/mediaQueryOrder.test.ts`（`@media` 里的声明不得被同文件后续无条件同选择器规则盖掉）
   - `styles/scopedPseudoScope.test.ts`（`:deep()` 一类只能写在 `<style scoped>` 里）
   - `styles/buttonFontInherit.test.ts`（会渲染文字的 `<button>` 必须接管 `font-family`）
   - `extensions/nodeAttributeNames.test.ts`（节点属性名撞 `id`/`class`/`style` 必须自带 `renderHTML`）
   - `composables/editorListenerScope.test.ts`（退订不得就地读 `editor.value`；组件订阅必须绑生命周期）
   - **`utils/htmlRegexSafety.test.ts`（第 9 棒 A）**——① `String.replace` 的替换串不得是运行时变量
     （`$&`/`` $` ``/`$'` 会展开）；② 从 HTML 摘标签不得用 `[^>]*` 当属性区
   - **`styles/designTokenWriteScope.test.ts`（第 9 棒 B）**——JS 不得内联写 `--ye-*` 设计 token
   - **`utils/zIndexTokenSync.test.ts`（第 9 棒 B）**——`YE_Z_BASE_OFFSETS` 与 `variables.css` 逐条对齐
   - **`capabilities/toolbarGateMap.test.ts`（第 9 棒 B）**——工具栏 slug 必须映射到真实存在的 gate
   - `publicApi.test.ts`（导出快照）

   **写护栏一定要配自检用例。** 第 5 棒的自检抓到正则 bug；第 6 棒抓到扫描器把 `@import` 当选择器；
   第 8 棒抓出两个既有护栏共有的注释漏洞（逐字符找 `{` 在剥注释之前）。
   **新写扫描器时第一件事就是先掩码注释再切规则。**
   - ⚠️ **护栏判据别把正当写法也禁掉。** 第 9 棒的规则 ① 一开始只认「裸标识符」，
     把安全的 `const insert = () => placeholder` 也报了——禁止抽函数复用是错的判据，
     改成放行同文件里定义为函数的名字。**护栏第一次跑就误报自己的代码，是判据有问题的信号。**
   - ⚠️ 判定「元素是否满足条件」时按**元素**聚合，不要按单个 class 逐个判（第 8 棒踩过）。
   - ⚠️ **护栏本身也要变异验证**：把被保护的代码改回缺陷态，确认护栏转红。

9. **发现一个 bug 就全仓搜同型。** 产出最高的一步：
   第 3 棒 dark 死 CSS 从 1 处扫出 21 处；第 5 棒扫出换实例漏退订 4 处；第 6 棒扫出 14 条；
   第 7 棒又扫出 22 条；第 8 棒从一个断掉的别名扫出 **19 个**派生 token 缺口。
   **写个 20~60 行的 node 脚本做全仓结构化扫描，比 grep 强得多**，往往能直接升级成静态护栏。
   - ⚠️ **搜同型时会搜到自己刚写的代码。** 第 9 棒搜 `[^>]*` 时发现自己新写的 `O_P_BLOCK` 也犯了同型。
10. **例外会让护栏失效，宁可把例外那处也修掉。** 第 9 棒本想给 `templates.ts` 的 `[^>]*` 开例外，
    改成抽出共享的 `TAG_INNARDS` 把它一并修掉，规则才能写成绝对的。

---

## 已发现问题的模式清单（照着找，命中率最高）

九棒共挖出 86+ 个问题。反复出现的模式：

1. **注释 / 测试名 / CSS 注释 / 文件头注释描述了正确意图，代码没实现。**
2. **守卫 / 选项 / 重置 / 皮肤只贯通了一半路径**（白名单漏掉节点视图那一行；`NaN` 守卫只加在解析路径；
   按钮重置漏掉 `background` 或 `font`；退订只覆盖换实例不覆盖卸载；三套外观只有两套写了浮层皮肤；
   派生 token 只在深色段补齐；**清理规则只对「碰巧被上一步重写过」的那一半元素生效**）。
3. **异步 watch 没有陈旧守卫 → 竞态覆盖。**
4. **同一份状态 / 同一段逻辑有多份实现。** 三个 AI adapter 各写一份 SSE 解析；
   `editorState.ts` 里 4 个函数逐字重复；`excel.ts` 的 `parseCSS` 与 `parseStyleAttribute` 重复；
   `renderMath.ts` 与 registry 各要一份 `escapeHtml`。
5. **对着不可变 / 非响应式对象做 Vue 响应式，或在 computed 里写 ref。** 必须写探针。
6. **Vue watcher 的 flush 时机。** 要读「刚渲染出的 DOM」必须 `flush: "post"`；
   这类 watcher 又常带去重守卫，跳过一次就**再也补不回来**。
7. **订阅 / 退订的身份与寿命。** 回调触发时 `editor.value` 已是新实例；订阅包进 `nextTick` 会让退订摘空；
   匿名函数订阅无法退订；只处理 `prev` 参数的写法漏掉组件卸载那一半。
8. **ProseMirror 位置算术与 schema 一致性。**
9. **节点视图 `update()` 沿用创建时的 `node`。**
10. **节点属性名撞 HTML 全局属性**（`id` / `class` / `style`）。
11. **流式 / 分块数据的边界处理。**
12. **类型说谎 / 类型与守卫矛盾。** 不要让调用方用 `!` 或 `as any` 绕过。
13. **死代码 / 无消费方的 API。** 零导入的 barrel、never-called 分支、零引用的导出、
    恒为真的 `v-else-if`、指向不存在元素的选择器、零消费方的 token、没有 `content` 的 `::after`。
    **写进 DOM 但 schema 不解析的属性也是死代码**（第 9 棒：Excel 的 `<td style="color">`）。
    - ⚠️ 「同值 ≠ 死」，判死前必须算特异性并找「中间规则」，且必须回模板确认类名能否共存。
    - ⚠️ token 层例外：`variables.css` 深色段里的别名重声明看着同值实际必需（不变量 26）。
14. **DOM 资源泄漏 / 意外请求。** `<input type=file>` 要同时听 `cancel`；`el.src = null` 会 GET `<origin>/null`；
    `requestAnimationFrame` 不留句柄；**销毁后访问 `editor.view` 直接抛错**。
15. **CSS 特异性与层叠顺序造成的静默失效。** 外观样式表在 `index.css` 里**晚于**功能样式导入；
    `@media` 不提升特异性（不变量 29）；跨文件同选择器同特异性靠 `@import` 顺序决胜。
16. **自定义属性在声明处求值。** 三种形状见不变量 26。
    边界：只有「别名声明在**祖先元素**而基础 token 改在**后代元素**」才会断。
17. **`div` 改 `button` 后字体不继承。** 必须写 `font: inherit`（约定 17）。只对会渲染文字的按钮加。
18. **写在普通 CSS 里的 SFC 编译期伪类**（`:deep()` 等）会被浏览器整条丢弃（不变量 30）。
19. **深色属性挂载层级写错**：`[data-color-mode] .yaniv-editor` 永远匹配不到（不变量 31）。
20. **硬编码颜色在另一个色彩模式下对比度崩掉。** 已抓到四次：`--ye-code-text` 1.06:1、
    `.template-card` 1.15:1、`.ai-highlight` 1.18:1、**Word 粘贴带进来的 `color:black`**。
21. **字符串当替换模式用**：`String.replace(re, 变量)` 里的 `$&` / `$'` 会展开（不变量 32，有护栏）。
22. **用正则解析 HTML 时不理解引号**：`[^>]*` 在引号内的 `>` 处截断（不变量 33，有护栏）。
23. **外部输入直接驱动建树循环 / 递归，没有上限**（不变量 34）。剪贴板、宿主 prop 都算外部输入。
24. **面向用户的文案硬编码，绕过 i18n。** 第 9 棒：Office 粘贴的图片占位段永远是中文，
    且宿主没有透传该选项的 prop，英文界面下把中文写进文档正文。
    **判据：这段文字会不会被用户看到？会就必须走 locale。**

---

## 硬约束（违反会打穿 CI）

- **代码分割**：`basic` preset 默认关闭的能力必须 `await import()`。CI 断言主 chunk 里不得出现
  `new PluginKey("dragHandle")` / `new PluginKey("slashCommand")` / `yanivSearchReplace` / `chat/completions`。
  **绝不能让 `core/` 或 `capabilities/` 静态 import 门控能力模块。**
- **产物预算（gzip）**：主 chunk ≤ 46000B、`dist/style.css` ≤ 19000B、`dist/inline.css` ≤ 10500B。
  ⚠️ **主 chunk 余量 758B**（第 9 棒结束时实测 45242；删死代码后从 45596 回落）。`registry.ts` / `templates.ts` /
  `core/` / `extensions/` 里 core 能力下的扩展都在主 chunk，往里加代码前先想清楚，
  加完必须 `pnpm run build` 复量。**阶段 D/E 若要新增主 chunk 代码，可能需要先腾空间。**
- **覆盖率阈值**写在 `vitest.config.ts`（statements 56 / lines 56 / branches 44 / functions 52），只能升不能降。
- **eslint 零 warning**（不只是零 error）。prettier / stylelint 也必须全过。
  stylelint 有 `order/properties-order`（recess-order），改 CSS 后跑 `npx stylelint '<glob>' --fix`；
  **改完一定要 `npx prettier --write <改过的文件>`**（第 6、8 棒都因此让 verify 红过）。
  ⚠️ **交接文档自己也要过 prettier**——第 9 棒开局就是被 `HANDOFF-9.md` 的格式打红的。
- **公开 API 变更**必须在 `CHANGELOG.md` 的 `BREAKING CHANGES` 段登记；`src/publicApi.test.ts` 有导出快照。
  ⚠️ `@yanivjs/yaniv-editor/ai` 是**独立公开入口**。包的 `exports` 映射只有 `.` / `./inline` / `./ai`
  - 两个 CSS，**无法深引用**——判断某个导出是否「对外可见」以这个映射为准。
- **新增文案**必须同时补 `zh-CN.ts` / `en-US.ts` / `types.ts`（`localeParity.test.ts` 会校验）。
  `TiptapLocale` 类型是公开导出的，但没有「注册自定义 locale」的 API，
  `createI18n({ messages })` 可覆盖文案——**所以 locale 文案拼进 HTML 前必须 `escapeHtml`**。
- **禁止模块级可变状态**。已知有意例外两处：`locales/manager.ts`、`features/ai/translation/translateStore.ts`。

---

## 验证命令与当前基线

```bash
pnpm run verify        # typecheck + test:coverage + lint + lint:style + format:check
pnpm run test:e2e      # Playwright，22 个用例
pnpm run build:check   # build + 逐条件真实加载每个入口（约 5 分钟）
pnpm run build         # 只构建（约 10~15 秒，做 CSS 探针时用这个就够）
```

**当前基线（第 9 棒全部完成时实测）：**

- `pnpm run verify` 退出 0，**834 个用例全过（89 个测试文件）**，eslint 零 warning
  —— 第 8 棒结束时是 727 / 73
- 覆盖率 Statements 65.10% / Branches 54.65% / Functions 61.30% / Lines 66.76%
- `pnpm run build` 产物预算实测：主 chunk gzip **45242 / 46000**（余量 758B）、
  `style.css` **17298 / 19000**、`inline.css` **9064 / 10500**；代码分割断言全过
- `pnpm run test:e2e` **22 passed**（改过 CSS 与多个组件，已重跑）
- `pnpm run test:e2e` 第 9 棒**没跑**（阶段 A 只动粘贴转换逻辑，未动 CSS）。
  第 8 棒结束时是 22 passed。**动了 CSS / 序列化 / 主 chunk 就必须跑。**

产物预算手动核验：

```bash
chunk=$(ls dist/EditorShell*.js | head -1)
echo "gzip: $(gzip -c "$chunk" | wc -c) / 46000"
echo "style.css: $(gzip -c dist/style.css | wc -c) / 19000"
echo "inline.css: $(gzip -c dist/inline.css | wc -c) / 10500"
```

⚠️ **`pnpm run verify` 在机器负载高时会随机挂载超时**（`编辑器在 18000ms 内未稳定就绪`）。
第 6 棒遇到两次，失败文件每次都不同，**单独重跑该文件确认再下结论**，不要当成回归。
跑 verify 期间别同时跑浏览器探针或 build。

---

## 当前工作区状态（重要）

**所有改动都还没提交。** `HEAD` 是 `9d82257`，工作区有大量修改 + 新增未跟踪文件。

- **2 个删除**：`src/features/ai/config/index.ts`（零导入的 barrel，第 5 棒）、
  `src/appearance/styles/_shared.css`（第 8 棒，两条规则都已证实是死的）
- **第 9 棒新增的源文件（3 个）**：`src/utils/htmlTagPattern.ts`、`src/utils/escapeHtml.ts`、
  `src/components/editor/link/linkActions.ts`
- **第 9 棒删除的源文件（3 个）**：`src/components/editor/table/TableCell.vue`（空占位）、
  `src/components/base/BaseTooltip.vue`（零引用 + 两处未被发现的 CSS 缺陷）、
  `src/components/base/ToolbarDivider.vue`（只被恒假的 `v-if` 引用）
- **第 9 棒新增的测试（13 个）**：`utils/htmlRegexSafety`、`utils/zIndexTokenSync`、
  `styles/designTokenWriteScope`、`capabilities/toolbarGateMap`、
  `extensions/office-paste/officePasteRobustness`、`extensions/lineHeight`、
  `extensions/column/ColumnExtension`、`extensions/markdownInput/NotionMarkdownInput`、
  `features/ai/shared/abortControllerHandoff`、`core/overlayFeedback`、
  `core/useEditorPagination`、`appearance/useEditorAppearance`、
  `components/editor/link/LinkButton`、`components/editor/font/fontSelectSync`、
  `components/editor/heading/useHeadingActions`、`components/editor/align/AlignDropdown`、
  `components/tools/inline-toolbar/InlineToolbar`

用户尚未决定如何提交（前几棒问过多次没得到答复）。**在用户明确要求之前不要提交。**
用户的全局约定是「在哪个分支改就在哪个分支提交，不要为了提交单独开分支」——真要提交时直接提到 `main`。

---

## 阶段 A 做了什么（第 9 棒，已完成）

读完 `src/extensions/office-paste/` 全部 10 个文件 517 行。**11 条假设里 3 条被探针推翻。**

### 修复（11 项，全部已登记进 CHANGELOG）

1. **`level5000` 抛 `RangeError` 打断整次粘贴。** 层级来自剪贴板却无上限，实测创建 5000 层嵌套
   `<ul>`，parse5 递归爆栈（2.4s）。钳制到 Word 自身上限 `[1, 9]`。→ 不变量 34
2. **`level0` / `levelX` 静默丢整段内容。** 实测输出**空字符串**：两个 `while` 都不进、栈为空，
   段落被 `el.remove()` 删掉而内容没有去处。
3. **`mso-list:none` 被误转成列表。** Word 用它声明「本段不是列表项」。改为解析不出 id 就放过。
   同时 id 正则 `/l[0-9]+/` → `/^l\d+$/`（未锚定时 `level1` 会冒充 id）。
4. **写死的 `color:black` 只清掉一半。** 用 `[style*="color: black"]` 匹配子串，
   而带空格的形态只在元素**恰好含 `mso-`、被上一步重写过**之后才出现。改走 CSSOM 判定。
5. **`split(";")` 把 data URL 的 base64 截断后写回 style。** 新增引号/括号感知的 `splitCssDeclarations`。
6. **占位串里的 `$&` 把刚摘掉的 `<img>` 又塞回去。** 改用函数形式。→ 不变量 32
7. **`[^>]*` 在引号内 `>` 处截断，`file:///C:/Users/…` 泄漏成正文。** → 不变量 33
8. **`<o:p>` 只清掉最窄的一种形态**（带属性/跨行/自闭合都漏）。
9. **`transformMsoHtmlClasses` 选择器与操作两套口径**（`class*=` 子串 vs `classList.remove` 精确）。
10. **Excel 多类名单元格样式全丢** + **字体色写在 `<td>` 上被 schema 丢弃**（改为裹进 `<span>`）。
11. **图片占位段永远是中文**，宿主无法覆盖。新增 `editor.officePasteImagePlaceholder`，
    由 registry 按 locale 拼装并 `escapeHtml`。→ 模式 24

### 阶段 A 的负结果（有价值，别重复走）

- **CRLF 不是问题** —— 曾以为 `(.|\n)*` 遇到 Word 的 `\r\n` 会断，实测 **DOMParser 在解析阶段
  就把 `\r\n` 规范化成 `\n`**，正则根本读不到 `\r`。
- **`parse()` 返回 doc 节点没问题** —— 曾以为 `replaceSelectionWith(doc)` 会插入失败，
  实测 ProseMirror 的 fitter 能正确「打开」doc 节点，表格插入完全正确、前后段落正常分裂。
- **Excel 的 `cell.style.color` 确实是死代码** —— 用**完整扩展集**（含 `TextStyle` + `Color`）
  复验，文本仍无 textStyle mark：Color 的 parseHTML 认的是 `<span>`，`<td>` 上的 color 不产生 mark。
- **`el.remove()` 的 early-return 不可达** —— 变异验证没转红。层级钳制到 ≥1 后栈必非空。
  已如实标注为「不变量守卫」，**没有**写进 CHANGELOG 当修复。
- **`lineNumber.ts` 的 `[class*="MsoLineNumber"]` 未改** —— 与 htmlClasses 的口径不一致不同，
  这里操作是 unwrap 整个元素，子串匹配只是范围偏宽；没有证据表明 Word 输出了别的 `MsoLineNumber*` 类，
  改成精确匹配反而可能漏处理。**记为观察，未下结论。**

---

## 阶段 B 做了什么（第 9 棒，已完成）

读完 `core/` `capabilities/` `configs/` `utils/` `appearance/` `composables/` + 两个入口，
共 47 个文件 1950 行。**5 条假设被探针推翻。**

### 修复（9 项，全部已登记进 CHANGELOG）

1. **三套外观的文档尺寸全部被 JS 内联样式压掉。** `initPageCssVariables()` 把 A4 常量
   内联写到 `.document-container`，而 `--ye-doc-*` 是 appearance 层的设计 token。
   浏览器实测 default 900px→794px、48px→96px，notion 708px→794px，word 939px→931px。
   删除该函数 + 变成零引用的 4 个常量。→ 不变量 35 + 护栏 `designTokenWriteScope`
2. **只读事务守卫可被任意第三方 meta 解除。** `BYPASS_GUARD_META` 是 `Symbol()`，
   而 ProseMirror 的 symbol meta 全部落进 `meta["undefined"]` 一个槽。
   实测任意 symbol / 裸对象 / 字符串 `"undefined"` 都能读写它。改成字符串。→ 不变量 36
3. **`useEditorAppearance` 省略可选参数报 Vue 警告**（`Invalid watch source`）。→ 约定 27
4. **toast/通知的 aria role 恒为 polite**，错误提示屏幕阅读器可能听不到。→ 补 `alert` + `aria-atomic`
5. **`CapabilityDefinition.chrome` 死字段**（有声明、有赋值、零读取）——删除
6. **`editorCommands.ts` 两个零调用导出**——删除，4 份重复判空收敛成一处
7. **`loadAppearance` 的模块级 Set**——违反硬约束且完全多余，删除
8. **`EDITOR_APPEARANCES` / `LOADABLE_APPEARANCES` 两处定义**——合并
9. **`scrollEditorSelectionIntoView` 注释谎称有复用场景**——实际零内部调用，改成诚实描述

### 阶段 B 的负结果（有价值，别重复走）

- **销毁后调用 `createCommandRunner` 不抛错** —— 曾以为要补 `isDestroyed` 守卫，
  实测 tiptap 自身有保护，`executeBatchCommands` 返回 false。**不是 bug。**
- **`zIndexBase` 不会写出 `"undefined"`** —— `EditorShell` 有 `?? YE_Z_INDEX_DEFAULT_BASE` 兜底，
  且与 `editorTypes.ts` 注释的「默认 1000」一致。
- **full 与 inline 的默认语言一致** —— `normalizeLocaleCode` 默认返回 `"zh-CN"`，
  与 `YanivInlineEditor` 的 `locale: "zh-CN"` 默认相同，不存在不一致。
- **`basic.toolbar.table = true` 不是死配置** —— `applyGatesToToolbarConfig` 会按 gate 收敛，
  而 `features` prop 能把 gate 打开，所以这个配置表达的是「能力开启时要显示按钮」。
- **`CODE_LANGUAGES` 的 20 种语言全部可高亮** —— lowlight `common` 覆盖 38 种，
  `html` 别名已在 `codeBlockLowlight.ts` 注册。注释完全准确。
- **`applyAppearanceToElement` 收到 `"auto"` 是正确的** —— 它内部自己调 `resolveColorMode`。
- **`overlayFeedback` 的 180ms 移除延迟 > CSS 的 160ms 过渡** —— 是有意留的余量，不是漂移。
- **工具栏 slug → gate 映射当前无缺失、无冲突** —— 但已升级成护栏（类型的索引签名挡不住拼错）。
- **`ant-design-vue` 的「唯一入口」断言成立** —— 全仓只有 `shared/antd.ts` 直接 import。
- **`tiptapExtensions.ts` 不是死文件** —— 被 2 个组件 import（注释说「入口或扩展聚合处」，
  实际在组件里，位置与注释描述略有出入，不影响正确性）。

### 阶段 B 遗留的观察（未改，证据不足或收益太低）

- `lineNumber.ts` 的 `[class*="MsoLineNumber"]` 子串匹配范围偏宽（阶段 A 遗留）。
- `useEditorAppearance` 里 `useResolvedColorMode` 与第二个 watch **都**绑了系统明暗监听，
  同一个系统事件会触发两次 `syncDom`。`syncDom` 幂等，只是冗余。
- `calculatePages` 用 A4 高度给**所有**外观算页数，notion / default 的页高并非 A4。
  但 `totalPages` 只用于状态栏「共 N 页」，属产品语义问题而非缺陷。
- `YanivEditorExpose` 与 `YanivInlineEditorExpose` 结构完全相同、各自定义；
  分属两个包入口，独立定义有隔离价值，未合并。

---

## 阶段 C 做了什么（第 9 棒，已完成）

读完 `extensions/` 剩余 + `features/ai/`，共 32 个文件 992 行。

### 修复（6 项，全部已登记进 CHANGELOG）

1. **行高扩展给每个段落强加内联 `line-height: 1.5`**（`default` 填了具体值）。
   盖掉 appearance 的 `--ye-line-height`（default 外观的 1.7 被压成 1.5）、
   污染 `getJSON()`、解析外部 HTML 时硬塞。改 `default: null`。**与不变量 35 同型**，
   只是内联样式来自 schema 属性的 `renderHTML` 而非 `setProperty`。
2. **格式刷的「复制行高」从未生效** —— 从 `getAttributes("textStyle")` 读，
   而行高是段落级节点属性，实测恒为 `undefined`。根因是借用了
   `@tiptap/extension-text-style` 的全局命令类型声明，那里语义是 mark 属性。
3. **AI 流式回调在编辑器销毁后抛未捕获异常** —— `showEditorNotice` 走 `editor.view.dom`，
   销毁后实测抛错，而它大量出现在 6 个 AI 扩展的 `onError` 里且无人捕获。
   在 `overlayFeedback` 层加销毁降级（结构错误仍抛）。
4. **连续两次 AI 操作留下无法取消的孤儿流** —— `setAbortController` 直接覆盖不 abort。
   孤儿流继续消耗 API，`onToken` 还在往同一个单例写，两个流的文本互相覆盖。
5. **`[x] ` 输入规则产出未勾选的任务项** —— 与 `[ ] ` 用逐字相同的 handler。
6. **删除 `ColumnExtension` 里被整批丢弃的 `createEmptyColumn`**。

### 阶段 C 的负结果与自我纠正（重要）

- **⚠️ 我差点误删 `ListShortcuts`。** 对照测试显示「带不带它，Enter / Shift-Enter 行为完全相同」，
  据此几乎判定为死代码。**上 spy 后发现 handler 确实被调用了 3 次**——
  `Enter` 抢先执行了 `splitListItem`（只是效果与 tiptap 默认重合），
  `Shift-Enter` 执行后返回 false 才让给 `hardBreak`。
  **教训：「行为相同」≠「没有执行」。判死之前必须证明它没被调用，而不是证明结果没变。**
  最终只修正了注释（写明实测结论），保留扩展。
- **销毁后 `view.dispatch` 不抛错** —— 曾以为 `pasteImage` 的 `FileReader.onload` 异步
  dispatch 有风险，实测 ProseMirror 自身有处理。
- **销毁后 `createCommandRunner` 也不抛错**（阶段 B 已验，此处复用结论）。
- **`core` capability 无条件注册** —— 格式刷命令链依赖的 underline / subscript /
  superscript / highlight / textAlign 总是存在，不会因缺扩展而静默失败。
- **`CODE_LANGUAGES`、`DEFAULT_KATEX_OPTIONS.trust: false`、`ai/shared/index.ts` barrel**
  三处核查均正常（barrel 有消费方，不是死 barrel）。
- **4 个 AI 扩展的结构相似但各有实质差异**（回退策略：polish 用选区、summarize 回退全文、
  continueWriting 回退到块首、customAi 走另一条路径），不属于需要收敛的重复。

### 阶段 C 遗留的观察（未改，需产品决策或证据不足）

- **`buildDocumentContextPrompt` 不限长**：`documentContext` 直接把全文拼进 prompt，
  超长文档会让 AI 请求 400 失败。截断阈值依赖具体模型（项目支持 openai/aliyun/ollama
  且模型可配），而静默截断会无声降低回答质量——属于产品决策，没有依据不擅自加。
- **`readStreamLines` 没有 `try/finally { reader.releaseLock() }`**：abort 路径由
  `AbortController` 传给 fetch，body 流会 error，reader 随之释放；但消费方主动
  `break` 出 for-await 的路径没有验证过。
- **`ListShortcuts` 的 `Enter` 与 tiptap 内置重复**（见上，已确认在执行，未删）。
- **`summarize` 全文路径用 `{from: 0, to: docSize}` 作高亮范围**，位置算术未逐一验证。

---

## 阶段 D 做了什么（第 9 棒，已完成）

读完 `components/editor/` 全部 40 个文件 1341 行。

### 修复（7 项，全部已登记进 CHANGELOG）

1. **编辑已有链接会把原链接劈成两半。** `applyLink` 只按 `selection.empty` 分流，
   而「点按钮编辑已有链接」时光标就在链接里、选区为空，掉进「插入新文本」分支。
   实测 `<a>旧链接</a>` → 三个 `<a>` 并排、文字变「旧链https://new…接」。**内容损坏。**
   分流逻辑抽到 `link/linkActions.ts` 以便真正可测。
2. **字号 / 字体下拉不跟随选区。** `watch(() => editor.value?.getAttributes(...))`
   ——**`editor.state` 不是 Vue 响应式的**，实测 watch 只收到 immediate 那一次。
   改为显式订阅 `selectionUpdate`/`transaction`。全仓同型只有 font 目录这两个，
   其余 8 个组件本来就是对的。
3. **两个设标题入口行为不一致**：按钮组不清 textStyle，残留字号盖过标题字号。
4. **对齐下拉菜单项缺 `active`**，打开后看不出当前对齐。
5. **删除 `TextFormatButtons` 的 `activeCheck`**（可选字段 + 模板分支，零使用）。
6. **合并代码块插入的两条同义分支**，`insertDefaultCodeBlock` 随之删除。
7. **删除空占位组件 `table/TableCell.vue`**（只有空 div + 「占位组件」注释，零引用）。

### 阶段 D 的负结果与教训

- **⚠️ 又踩了「替换没写进去」的坑。** 给 `AlignDropdown.test.ts` 加 Host wrapper 的
  python 替换没匹配上，我没 grep 确认就跑测试，白跑两轮才发现文件根本没变。
  **改完必须 `grep -c` 确认**——这条在方法论第 6 条里已经写了，仍然踩了。
- **测试桩要在 render 里捕获 props**：写在 `setup` 里只能拿到首帧，
  那样的桩**测不出「不更新」这类缺陷**（字号跟随选区的测试一开始就是这么假过的）。
- **`ListShortcuts` 的教训延续**：判死之前要证明「没被调用」，而不是「结果没变」。

### 阶段 D 遗留的观察（未改）

- `ListTools` 的 `showTaskList` 默认 `false`，但**全部 4 个调用点都显式传 `true`**，
  默认值从未生效。它是公开 API 的 prop（`inline.ts` 导出 ListTools），保留合理。
- `VideoUpload` 批量上传时，第一个文件成功就关闭 modal，后续文件仍在后台上传。
- `wordImport.importWordFile` 用 `setContent` **替换整个文档**（当前内容全部丢失），
  且没有确认提示；`sanitizeImportedHtml` 只清理了 `<a href>`，`<img src>` 没走
  `mediaSrcPolicy`——不过那条策略有事务级守卫插件兜底，未验证是否覆盖 setContent 路径。
- `VideoUpload.handleVideoUpload(options: any)` 用了 `any`（antd customRequest 无好类型）。

---

## 阶段 E 做了什么（第 9 棒，已完成）

读完 `components/tools/` + `components/base/` 全部 20 个文件 531 行。

### 修复（4 项，全部已登记进 CHANGELOG）

1. **inline 工具栏对键盘用户不可用。** 它带 `role="toolbar"`，而 WAI-ARIA APG 要求
   toolbar 是**单一 tab stop**、内部方向键导航。顶栏 `ToolbarNav` 一直接着
   `useRovingTabindex`，inline 漏了。项目本来就有这个 composable，只是没用上。
2. **删除自建的 `BaseTooltip.vue`（126 行）+ `--ye-z-chrome-tooltip` token。**
   全仓零引用（项目全用 antd `a-tooltip`），且带着两个**从未被发现的** CSS 缺陷
   ——`--left`/`--right` 没有箭头规则、淡入过渡的 transform 与它们的定位冲突。
   零使用的代码会一直带着没人发现的缺陷，这是个很好的例子。
3. **删除 `ToolbarDivider.vue` + `ToolbarGroup` 的 divider 相关 props。**
   `divider` 全仓零传入，`v-if` 恒假；项目实际用 `ToolbarNav` 的 `border-left`。
4. **尾巴 #9 已结**：`.inline-toolbar` 的下边框从 `--ye-border` 换成
   `--ye-toolbar-border`。浏览器实测三套外观 × 明暗两态边框色不变（零视觉变化），
   而覆盖 `--ye-toolbar-border` 后如期变色——这正是改动换来的能力。
   顺带独立复验了第 8 棒「形状 C」修复仍然有效。

### 阶段 E 的负结果

- **`imageToolbarActions.ts` 零缺陷** —— 位置算术用 `$pos.end(depth)` 正确，
  `findSelectedImage` 从选区推位置而非按节点身份搜，注释把两个坑都写清楚了。
- **`--ye-toolbar-divider` / `--ye-toolbar-border` 当前都是 `--ye-border` 的纯别名**，
  三套外观下解析同值（浏览器实测），不存在不变量 26 的断裂。

---

## 尾巴清单（已定位、尚未处理）

1. **格式刷按钮双击会连弹 3 个 toast。** `FormatPainterButton` 同时绑 `@click` 与 `@dblclick`，
   而 DOM 规范里 `dblclick` 前必然先发两次 `click`，于是双击走完
   采样→激活（toast A）→取消（toast B）→连续模式（toast C）。**最终状态是对的**，只是噪音。
   标准修法（把单击延后一个双击窗口）会给每次单击加约 200ms 延迟——产品取舍，
   `docs/features/format-painter.md` 明确写了「单击单次 / 双击连续」。**建议先问用户。**
2. **`OutlinePanel` 同时订阅 `transaction` + `update` + `selectionUpdate`，三者冗余。**
   已从 tiptap 源码确认 `transaction` 是另两者的超集（唯一例外是 `setEditable` 只发 `update`）。
   每次按键 `syncItems` 跑 3 次，每次对所有标题 `getBoundingClientRect()`（强制回流）。
   **性能问题不是正确性问题**。同型也在 `FormatPainterButton` / `UndoRedoButton` /
   `useEditorColorState` / `HeadingControl`。
3. **`OutlinePanel` 的 debounce pending timer 在 `onBeforeUnmount` 未 `clearTimeout`。** 影响极小。
4. **`SlashCommandExtension` 的 plugin view 只有 `update` 没有 `destroy`。**
   编辑器在斜杠菜单开着时被销毁不会触发 `onDeactivate`，菜单可能留在屏上。路径很窄。
5. **`AiMenuButton.runAiCommandAfterMenuClose` 用 `nextTick + requestAnimationFrame` 且不留帧句柄。**
   卸载后回调仍会跑到 `editor.view.focus()`。外层有 `try/catch`，只打一条 `console.error`，不崩。
6. **`docs/` 里是否有描述第 3 棒那 8 个修复所涉行为的段落，仍未回头核对。**
   重点看 `docs/features/media.md`（相对路径 src）、`docs/api/ai-config.md`
   （`useAiConfig` 返回值、`isConfigured` 语义）、`docs/features/ai.md`（流式行为）。
   第 6/7/8 棒大改了深色 token 与 CSS 分层，`docs/` 与 `ARCHITECTURE.md` 的「CSS 分层」表
   若有描述「appearance 提供浮层皮肤」或 token 作用域的段落，必须一并核对。
   第 8 棒只更新了 `ARCHITECTURE.md` 的分层表 token 行，`docs/` 下的对应段落**没查**。
7. **`prompts.ts` 里 4 段 `en` prompt 变体确认全仓零引用**（文件头注释已写明）。
   第 1 棒选择「文档化而不删除」，第 3–9 棒尊重了这个决定。你若认为该删，注意它不是公开 API。
8. **`editor.lang.zh` / `editor.lang.ar` 无人渲染**（`LANGUAGE_CODES` 只有 14 项、不含这两个）。
   它们在公开的 `EditorLocaleMessages` 类型里，删除属于公开 API 变更，
   且更像「少注册了阿拉伯语」而非「多了死 key」。留给你判断。
9. ~~`inline.css` 的 `.inline-toolbar` 用 `--ye-border`~~ —— **第 9 棒阶段 E 已修**，
   浏览器实测三套外观 × 明暗两态零视觉变化。
10. **`.ye-dropdown-btn.is-active:hover` 与 `.is-active` 同值，疑似死声明。**
    静态分析显示两种情况下 `.is-active:hover`(0,3,0) 都不改变结果，但**需要真实 ant 运行时样式验证**
    （起 examples dev server 查 CSSOM）。收益仅 4 行 CSS。
11. **`templates.ts` 的 `normalizeTemplateHtml` 可能整体多余** —— ProseMirror 解析空 `<td>` 时
    schema 的 `block+` 会自动补 paragraph。第 9 棒只修了它的正则，**没验证这个函数是否还有必要**。

### 第 9 棒新增的观察（已定位，未改；理由都写在各阶段小节里）

12. **`buildDocumentContextPrompt` 不限长** —— 全文直接拼进 AI prompt，超长文档会让请求
    400 失败。截断阈值依赖具体模型（项目支持 openai/aliyun/ollama 且模型可配），
    静默截断又会无声降低回答质量，属产品决策。
13. **`readStreamLines` 没有 `try/finally { reader.releaseLock() }`** —— abort 路径由
    `AbortController` 传给 fetch、body 流会 error 从而释放；但消费方主动 `break`
    出 for-await 的路径没验证过。
14. **`ListShortcuts` 的 `Enter` 与 tiptap 内置的 `splitListItem` 重复** —— 已用 spy
    确认 handler 确实在执行（不是死代码），只是效果与默认重合。三种场景实测行为一致，
    但嵌套列表 / 代码块内没逐一验证，**没有证据不删**。
15. **`useEditorAppearance` 里系统明暗监听绑了两次** —— `useResolvedColorMode` 内部一次、
    第二个 watch 又一次，同一个系统事件触发两次 `syncDom`。`syncDom` 幂等，只是冗余。
16. **`calculatePages` 用 A4 高度给所有外观算页数** —— notion / default 的页高并非 A4。
    `totalPages` 只用于状态栏「共 N 页」，属产品语义问题。
17. **`ListTools` 的 `showTaskList` 默认 `false` 但 4 个调用点全传 `true`** ——
    默认值从未生效。它是公开 API 的 prop，保留合理。
18. **`wordImport.importWordFile` 用 `setContent` 替换整个文档**（当前内容全部丢失）
    且无确认提示；`sanitizeImportedHtml` 只清理了 `<a href>`，`<img src>` 没走
    `mediaSrcPolicy`——那条策略有事务级守卫插件兜底，但未验证是否覆盖 setContent 路径。
19. **`VideoUpload` 批量上传时第一个文件成功就关闭 modal**，后续文件仍在后台上传。
20. **`lineNumber.ts` 的 `[class*="MsoLineNumber"]` 子串匹配范围偏宽** —— 与
    `htmlClasses` 那处「口径不一致」不同，这里操作是 unwrap 整个元素，改成精确匹配
    反而可能漏处理，没有证据表明 Word 会输出别的 `MsoLineNumber*` 类。

---

## 附录：文件清单口径

全量复核已完成，**不再需要「剩余清单」**。要重新核对口径时：

```bash
find src -type f \( -name "*.ts" -o -name "*.vue" -o -name "*.css" \) \
  ! -name "*.test.ts" ! -path "*/testing/*" | sort | wc -l   # 应为 294
```

第 9 棒结束时：294 个文件 / 30739 行，全部逐行读完（提交 `c59f6e0`）。
