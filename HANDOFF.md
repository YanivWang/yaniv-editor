# 任务交接：yaniv-editor 复核与收尾

**用中文回复。** 用户全程用中文，仓库注释 / CHANGELOG / ARCHITECTURE 也全是中文。

> 这份文档取代了逐棒新建的 `HANDOFF-N.md`：**每推完一个阶段就地更新它**，
> 新一轮开工先完整读完本文件，再按「当前阶段」一节继续。

## 你要做什么

仓库：`/Users/wangcheng/Documents/workSpace/frontEnd/pixelBloomSpace/tiptapCases/yaniv-editor`
（`@yanivjs/yaniv-editor` v0.3.2，Vue 3 + Tiptap 3 富文本编辑器库，分支 `main`）

原始任务（用户原话的实质）：

1. **详细阅读源码，更新文档，防止文档描述和源码不一致；同时更新代码内注释，防止注释跟实际代码不一致。**
2. **所有模块都必须逐句复核，不能机械审计。没用的文档就删除，过时的就更新。**
3. **该修复的问题就彻底修复，从根因修复，不留尾巴。**
4. **必须逐行读完，不能缩水。遇到问题就从根因修复，不能打补丁，按企业主流最佳方案来。**

第 4 条是关键：用户明确拒绝「只读注释 + 抽样」，要求**每个文件从第一行读到最后一行**（含 `<style>` 块）。

**工作节奏（用户第 9 棒明确要求）**：读交接 → 推进一个阶段 → 写交接 → 下一阶段，**一直推到全部读完为止，不要中途停下来等指令**。

> **第 9 棒把 294 个文件全部读完；第 10 棒把「尾巴清单」20 条全部处理完。**
> 后续接手者的工作是用户新提出的需求，或本文件末尾「仍然开着的口子」里的条目。

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

   - ⚠️ **变异验证要 `cp` 备份当前工作区文件，只把自己这一处改回缺陷态。**
     第 8 棒用 `git show HEAD:<file>` 还原，把当时未提交的前几棒修复一起撤掉，
     无关护栏转红被误判成新发现。（第 10 棒起复核成果已全部提交，`HEAD` 是干净的基线，
     用 `git show HEAD:<file>` 拿**上一次提交**的版本做对照是安全的——但仍要先确认
     该文件在本轮之前没被改过。）
   - ⚠️ **变异验证期间绝对不要同时在后台跑 `pnpm run verify` 或 `build`**（第 3 棒踩过）。
   - ⚠️ **改完必须 `grep` 确认变异真的写进去了。** 第 9 棒有一次 perl 替换没匹配上，
     「测试仍全过」是无效结果而不是负结果——`grep -c` 返回 0 才发现。
   - ⚠️ **没转红要先想清楚是「测试没锁住」还是「这处不可达」。** 第 9 棒两处没转红：
     一处是用例恰好绕过了差异（补用例后转红），另一处确认**不可达**（钳制生效后 early-return
     永远走不到），后者如实标注成「不变量守卫」而**没有**写进 CHANGELOG 当修复。

7. **修完就把规则钉进不变量**：`ARCHITECTURE.md` 的编号不变量列表（**现有 58 条**）+
   `CONTRIBUTING.md` 的约定列表（**现有 45 条**），并在 `CHANGELOG.md` 的 `[Unreleased]` 段登记。
   - ⚠️ **新增编号前必须 `grep -nE "^[0-9]+\. "` 核对现有最大编号。** 第 9 棒在注释里写了
     「见约定 18」，而约定 18 早被 `@media` 顺序占用，只能回头改成 22。
   - ⚠️ 往 `CHANGELOG.md` 插新分节时注意：`[Unreleased]` 的 `### Fixed` 段很长（现已 600+ 行），
     直接在 `### Fixed\n` 后面插新分节会把原有条目全挤进去。**在 Fixed 段末尾追加条目最安全**。
8. **能写成静态护栏的就写静态护栏**——对现存与未来文件同时生效，价值最高。
   现有 **27 个护栏文件**（第 17 棒实测：`grep -rln "readFileSync\|readdirSync" src --include="*.test.ts"`
   数得到 **23** 个静态扫描类，另有 `capabilities/toolbarGateMap`、`publicApi`、
   `locales/localeParity`、`components/editor/template/templates` 四个不读文件系统的）。
   ⚠️ 这个数字第 10~16 棒一直没跟着更新（停在 21/17），**每次新增护栏记得回来改**。
   第 9 棒新增 4 个，第 10 棒新增 4 个 + 1 条规则：
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
   - **`composables/editorListenerScope.test.ts` 的第三条规则（第 10 棒）**——同一个 handler
     不得同时订阅 `transaction` 与 `update` / `selectionUpdate`（前者是超集，不变量 37）
   - **`styles/tokenConsumers.test.ts`（第 10 棒）**——定义了的 `--ye-*` 必须有人 `var()` 引用；
     判据双向（CSS `var()` + JS 字符串读写），扫描范围含 `examples/`（不变量 42）
   - **`features/ai/translation/languageCodes.test.ts`（第 10 棒）**——`LANGUAGE_CODES` 与
     `editor.lang.*` 双向对齐，且 `docs/features/ai.md` 的「N 种目标语言」与语言清单
     必须跟着列表走
   - **`components/editor/template/templates.test.ts`（第 10 棒）**——锁住「ProseMirror 的
     `block+` 会自动补 paragraph」这个前提，它是删掉 `normalizeTemplateHtml` 的依据
   - **`core/useEditorPagination.test.ts` 的分页口径两条（第 10 棒）**——固定用 A4、
     且三套外观都不得出现画分页线的规则

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

### 第 10 棒补充的方法论（都是踩过的）

11. **探针容易只问一半问题。** 验证「这条路径会触发 X」之后，还要问
    「**还有别的路径也会触发 X 吗**」。第 10 棒给斜杠菜单加 plugin view 的 `destroy()`，
    探针证明了 `editor.destroy()` 会调它，就下手了——结果 `registerPlugin()` 也会
    销毁重建全部 plugin view，每注册一个插件就误发一次关闭通知，打穿了 `BlockPickerMenu` 的测试。
12. **对照实验必须用真实入口，不能手工模拟调用链。** 判 `ListShortcuts` 死活时先自己遍历
    各扩展的 `addKeyboardShortcuts` 做对照，得出「22 场景全同」；换成
    `view.dom.dispatchEvent(keydown)` 走 ProseMirror 真正的 `handleKeyDown` 链，
    才暴露出代码块内 Shift-Enter 的 2 个差异。**同一条尾巴上栽了两次**
    （前一次是「行为相同 ≠ 没有执行」）。
13. **未捕获异常看不见。** jsdom 里事件处理器抛出的错不冒泡到 `dispatchEvent` 的调用点，
    `try/catch` 包着也抓不到，只会变成 vitest 报的 "Unhandled Errors"。
    要验证「不再抛」得监听 `window` 的 `error` 事件。生产环境同理：控制台被刷屏、
    宿主的错误监控当成线上故障，而功能看起来完全正常。
14. **ESM 产物不压缩，主 chunk 里的注释直接吃产物预算**（不变量 41）。
    一段 10 行的中文论证注释吃掉 471B。**结论留源码，证据搬测试**。
15. **定位产物涨幅不能单文件二分。** chunk 划分是全局优化的结果：单独还原
    `listShortcuts.ts` 只差 2B，把整批改动一起还原才看得出那 471B。
    正确做法是先整批还原确认基线，再逐个加回来。
16. **`getComputedStyle` 在同一个同步块里读不到刚注入的样式。** 注入 `<style>` 后必须
    `await` 一次 `setTimeout` 再读，否则拿到的是上一拍的旧值——第 10 棒因此一度得出
    自相矛盾的 CSS 结论。⚠️ 预览面板隐藏时 `requestAnimationFrame` **不触发**，
    用它等会直接 45s 超时，只能用 `setTimeout`。
17. **zsh 默认不做 word splitting。** `for f in $FILES`（空格分隔的字符串）不会拆分，
    脚本会静默什么也没做，而你以为还原过了。用数组 `files=(a b c)`。
    这与方法论 6 的「改完必须 grep 确认」是同一类问题的两个面。
18. **判「死代码」时要想清楚谁是消费方。** `--ye-radius-lg` 在库内零引用，
    但两个 demo 页面拿它做 `border-radius`——`examples/` 是宿主用法的正式示范，
    被它用到就有对外价值。护栏的扫描范围因此含 `examples/`。

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
  ⚠️ **主 chunk 余量 3305B**（第 17 棒实测 42695；第 13 棒把 ColorPicker 移出主 chunk
  腾出了 3109B）。注释基本**不**吃预算（不变量 41 已在第 12 棒更正：`.ts` / `.vue`
  语句之间的注释进不了产物，只有写在对象字面量属性上的才进）。`registry.ts` / `templates.ts` /
  `core/` / `extensions/` 里 core 能力下的扩展都在主 chunk，往里加代码前先想清楚，
  加完必须 `pnpm run build` 复量。**阶段 D/E 若要新增主 chunk 代码，可能需要先腾空间。**
- **覆盖率阈值**写在 `vitest.config.ts`（第 17 棒起 statements 78 / lines 80 / branches 67 / functions 76），只能升不能降。
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
- **禁止模块级可变状态**。⚠️ 第 17 棒实测：实际有 **12 处**声明，集中在三个模块（`locales/manager.ts` 5 处、`features/ai/translation/translateStore.ts` 2 处、`features/ai/config/` 5 处——最后这组一直没写进例外清单）。现已全部登记进静态护栏 `src/moduleLevelState.test.ts` 并逐条写了理由，**清单以那里为准**，新增未登记的会转红。

---

## 验证命令与当前基线

```bash
pnpm run verify        # typecheck + test:coverage + lint + lint:style + format:check
pnpm run test:e2e      # Playwright，34 个用例
pnpm run build:check   # build + 逐条件真实加载每个入口（约 5 分钟）
pnpm run build         # 只构建（约 10~15 秒，做 CSS 探针时用这个就够）
```

**当前基线（第 17 棒全部完成时实测）：**

- `pnpm run verify` 退出 0，**1177 个用例全过（122 个测试文件）**，eslint 零 warning
  —— 第 16 棒 1109 / 119，第 15 棒 1009 / 108，第 14 棒 966 / 102，第 13 棒 933 / 100
- 覆盖率 Statements **80.43%** / Branches **69.05%** / Functions **78.69%** / Lines **82.77%**
  （`vitest.config.ts` 的阈值第 17 棒已提档到 **78 / 80 / 67 / 76**，各留约 2 个点余量；
  阈值本身做过变异验证——抬到 90 会红，不是摆设）
- ⚠️ `pnpm run lint` 第 17 棒起带 `--max-warnings=0`。此前「eslint 零 warning」只是文档
  里的约定：实测 9 条 `import/order` warning 照样让 verify 退出 0，硬约束根本没生效。
- `pnpm run build` 产物预算实测：主 chunk gzip **42695 / 46000**（余量 **3305B**）、
  `style.css` **17193 / 19000**、`inline.css` **8938 / 10500**；代码分割断言全过
- `pnpm run test:e2e` **34 passed**（第 17 棒从 28 补到 34：查找替换 2、图片改尺寸 2、AI 浮层 2）
- `pnpm run build:check` 通过（三个入口 × ESM/CJS 共 6 种加载方式 + 两个 CSS）
- ARCHITECTURE 不变量 **58 条**，CONTRIBUTING 约定 **45 条**
- ⚠️ 注释基本不吃产物预算（不变量 41 已更正）：`.ts` / `.vue` 语句之间的注释进不了
  产物（30 行 0B），只有写在**对象字面量属性上**的才进（30 行 209B）。

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

## 当前工作区状态

**工作区干净，全部已提交。**

- `c59f6e0` / `f5f88d9` —— 第 9 棒的全量逐行复核（37 处修复）
- `e17928b` —— 第 10 棒尾巴清单 16 条 + 6 个新发现的缺陷 + 4 条护栏
- `cf79661` —— 第 10 棒删除 16 个零消费 token + 尾巴 #16 / #17
- `6c3d545` / `c238fb7` —— 第 11 棒修复撤销按钮在 `mode` 往返后变灰（口子 #4 结清）
- `0b571f3` / `c998f11` —— 第 12 棒修复切换语言的内容丢失 / 白屏卡死 / 编辑器泄漏（5 处）
- `2e702b9` / `c2f7b47` —— 第 13 棒选中底色 + 光标色，堵上 token 护栏的反引号漏洞
- `b3617a4` / `e6f7ccd` —— 第 13 棒续：撤销历史清空 + 间距棘轮护栏 + ColorPicker 移出主 chunk
- `fa87674` —— 第 13 棒收尾：补 3 条会话重建 e2e，并更正一条被误判为真实缺陷的 jsdom 现象
- `58062ba` —— 第 14 棒 DragHandle：5 个缺陷 + 30 条单测 + 1 条全仓护栏 + e2e 25→28
- `54e7a4e` —— 第 15 棒 AI 与媒体链路：4 个缺陷 + 38 条用例 + 2 条护栏
- `570e654` —— 第 16 棒剩余组件：4 个缺陷 + 100 条用例 + 阈值提档
- 第 17 棒 —— 覆盖率补到 80%、查找替换选区缺陷（真实浏览器复验后定性）+ 1 条全仓护栏

用户的全局约定是「在哪个分支改就在哪个分支提交，不要为了提交单独开分支」——直接提到 `main`。

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

## 尾巴清单（第 10 棒已全部处理）

20 条全部有了结论。**其中 4 条的结论与原判断相反**——都是实证推翻的，别照原判断行事。

| #   | 条目                          | 结论                                                                 |
| --- | ----------------------------- | -------------------------------------------------------------------- |
| 1   | 格式刷双击连弹 3 个 toast     | 修：`MouseEvent.detail` 跳过第二击，单击零延迟，提示降到 2 条        |
| 2   | 冗余订阅                      | 修：**实际 9 处**（原记 5 处），收敛 + 护栏                          |
| 3   | OutlinePanel debounce 未清    | 修：`debounce` 交出 `cancel()`                                       |
| 4   | SlashCommand 缺 destroy       | 修：**改用扩展的 `onDestroy`**，不能写在 plugin view 里（不变量 38） |
| 5   | AiMenuButton rAF 无句柄       | 修：留句柄 + 卸载取消 + 帧内 `isDestroyed` 守卫                      |
| 6   | docs 与第 3/6/7/8 棒行为核对  | 修：找到 2 处 token 分层描述与源码不符                               |
| 7   | `prompts.ts` 的 `en` 变体     | **用户决定保留**（文档化而不删除）                                   |
| 8   | `editor.lang.zh` / `ar`       | 修：`ar` 补进 `LANGUAGE_CODES`；`zh` 作为显式例外保留                |
| 9   | `.inline-toolbar` 边框 token  | 第 9 棒已修                                                          |
| 10  | `.is-active:hover` 疑似死声明 | **推翻**：它是必需的，antd 的规则是 (0,3,0)（不变量 40）             |
| 11  | `normalizeTemplateHtml` 多余  | 证实并删除；`templates.test.ts` 锁住删除依据                         |
| 12  | AI prompt 不限长              | 修：`aiConfig.documentContextLimit`（默认 8000 字符）+ 明确提示      |
| 13  | `readStreamLines` 不释放      | **推翻转述**：四种路径 `locked` 都是 true；真实路径是回调抛错，已修  |
| 14  | `ListShortcuts` 疑似冗余      | **推翻**：`Shift-Enter` 不能删；顺带挖出未捕获的 `RangeError`        |
| 15  | 系统明暗监听绑两次            | 修：实测监听器 2 条 / apply 2 次，删掉冗余 watch                     |
| 16  | `calculatePages` 用 A4 高度   | **推翻**：是有意的——三套外观都不画分页线，min-height 不是页高        |
| 17  | `ListTools.showTaskList`      | 修：默认改 `true`（公开 prop 默认值变更），删掉三处显式传参          |
| 18  | Word 导入无确认               | 修：文档非空时先确认；`<img src>` 那半是虚惊，parseHTML 已覆盖       |
| 19  | VideoUpload modal 提前关      | 修：**同型 2 处**（ImageUpload 也是），抽 `useBatchUploadGate`       |
| 20  | `lineNumber` 子串匹配         | 不改（差异面无害），但发现**它的测试是空操作**，已补 5 条真用例      |

### 第 10 棒顺带扫出并处理的

- **16 个零消费方的 `--ye-*` token**（查 #16 时从 `--ye-doc-page-cut-height` 扫同型扫出）。
  浏览器实测 30 个采样点零视觉差异后删除，新增护栏（不变量 42）。
- **主 chunk 里的注释直接吃产物预算**（ESM 不压缩），一段注释吃掉 471B（不变量 41）。

---

## 仍然开着的口子（下一棒可以从这里挑）

**原来的 4 条已全部结案**（用户第 13 棒授权「你替我决定」，下列决定与理由均已落地）：

| #   | 条目                      | 决定                                                                 |
| --- | ------------------------- | -------------------------------------------------------------------- |
| 1   | 文本选中色 `::selection`  | **已做**（第 13 棒）。连带补上了 `--ye-caret`——见下                  |
| 2   | `--ye-spacing-*` 间距体系 | **决定不做**，理由见下。这不是缺陷，是重构                           |
| 3   | `lineNumber.ts` 的观察    | **仍然阻塞**：拿到真实 Word 剪贴板样本之前不要动，改错的代价是丢正文 |
| 4   | `UndoRedoButton`          | 第 11 棒已结清                                                       |

### 为什么不做间距体系（第 13 棒的判断，可推翻）

- 现有硬编码间距**本身没有缺陷**——没有视觉 bug、没有不一致的报告，纯粹是「设计系统
  看起来不完整」。修的是观感，不是问题。
- 建立体系必须**连规则一起改**（不变量 42 会挡住「只加 token 不加规则」），
  意味着要动几十个选择器的 `margin` / `padding`，而这些值大量出现在 appearance 层，
  三套外观 × 明暗两态都要回归——**改动面和回归风险远大于收益**。
- 真要做，先决定用在哪一层（只覆盖新写的组件？还是全量替换？），
  再一个模块一个模块推，每步都要浏览器实测三套外观。不要一次性铺开。

### 用户第 13 棒的指示：按企业最佳方案来，不要拿「代价」当理由

这句话推翻了本棒前半段两个「不做」的结论，也确实各暴露出一个问题：

- **撤销按钮那条是调研不足。** 原话是「修法需要 prosemirror 未导出的 `HistoryState`
  / `Branch`」——实际上 `EditorState.create` 重新 init 插件、再用 plugin 实例的
  `getState()` 取出来就行，全程公开 API。我把「我没想到解法」写成了「代价大于收益」。
  **下次说「代价大」之前，先确认自己真的把解法找全了。**
- **间距那条经得起复查，但理由要换。** 重新调研后结论不变（不做 token 化），
  但依据不再是「改动面大」，而是**那个方案本身不对**：需要可变的间距早已 token 化，
  剩下的包一层 `var()` 换不来任何可覆盖性。改为做棘轮护栏挡熵增（不变量 48）。

**教训：「代价大」和「方案不对」是两回事，不能混为一谈。** 前者常常是调研不足的托辞，
后者才是可以拿出来讨论的判断——而且必须给出证据。

## 第 11 棒做了什么（已完成，提交 `6c3d545`）

结清「仍然开着的口子」#4。**推翻了第 10 棒对该条根因的判断**（见上）。

### 修复

1. **`mode` 从 `preview` 切回 `edit` 后撤销按钮变灰。** `showEditChrome = mode === "edit"`
   而 `computeSessionKey` **不含 `mode`**——切换 mode 会把整个编辑 chrome 卸载重挂，
   编辑器实例与历史栈却原样活着。`UndoRedoButton` 把「发生过编辑」记在组件本地 ref 上，
   重挂即归零，用户撤销不了自己刚写的内容。真实入口实测：往返后同一实例、
   `can().undo()` 仍为 true、绕过按钮直接 `undo()` 能回退，按钮却是 disabled。
   → 不变量 43 + 约定 35
2. **顺带删掉多订的一份 `update`**（`transaction` 的严格子集，不变量 37）。

### 负结果 / 已实证的边界（别重复走）

- **初始化时 `can().undo()` 恒为 false** —— 空文档、带 `content`、带多段内容三种建法
  实测都是 false。`hasRealEdit` 想挡的场景不存在。
- **`ContentAdapter.setContent`（受控推送）不进 history** —— 一直带 `addToHistory: false`。
  只 emit 一次 `update`。
- **`setEditable` 不影响撤销可用性** —— 它确实只 emit `update`、零 `transaction`
  （证实不变量 37 那个例外），但 `can().undo()` / `can().redo()` 在它前后完全不变，
  所以退掉 `update` 订阅不造成回归。**这一步是方法论 11「还有别的路径吗」救回来的**：
  不变量 37 自己写着这个例外，不查就会漏。
- **全仓搜同型只此一处** —— 扫「在 `watch(editor)` / `attach*` 里被重置的组件本地 ref」
  共 3 处，另两处（`LinkBubbleMenu` 的 `linkModalOpen`、`useControlledContent` 的
  `lastEmittedSignature`）重置的是瞬态 UI 与新实例的新基线，都是正当的。

### 新的观察（未改，属产品语义）

- **受控推送后撤销按钮会亮着，但点一下什么也不发生。** 实测：用户编辑 → 宿主推新内容
  （`v-model` 受控）→ `can().undo()` 仍是 `true`（history 里留着被 rebase 成空的那一步）
  → 点撤销文档不变 → 再看按钮才灰。这是 prosemirror-history 的固有行为，
  **修复前也存在**（当时 `hasRealEdit` 同样是 true），不是本次改动引入的。
  要修得决定「受控推送后是否清空用户的撤销历史」——属产品取舍。

### 第 11 棒踩的坑（方法论补充）

19. **测试里别随手加 `.focus()`。** tiptap 的 focus 命令把 `view.focus()` 丢进
    `requestAnimationFrame`，里面只守 `editor.isDestroyed`。回调跑在测试收尾清空
    `document.body` 之后，view.dom 已脱离文档就抛——而这个错**不冒泡**，
    单跑该文件完全看不见（7 用例全绿），跑全量才变成 vitest 的 "Unhandled Errors"
    并让 verify 退出 1。**方法论 13 的又一次现身：用例全过 ≠ 退出码 0。**
20. **替换脚本会替换到自己刚写的那一行。** 把 `editor.chain().insertContent(…)` 统一
    抽成 `makeEdit()` 时，替换串把 `makeEdit` 函数体里的那一行也换掉了，变成自递归，
    `Maximum call stack size exceeded`。抽公共函数时，**先写函数体、再做全局替换，
    且替换后 `grep` 看函数体本身有没有被殃及**。

---

## 第 12 棒做了什么（已完成，提交 `0b571f3`）

不挑既有口子，换新维度找缺陷。**从「切换 locale」这一个入口挖出 5 处缺陷，
外加一条被错误归因的不变量。**

### 怎么找到的

第 11 棒的切入角度是「状态的寿命：什么活得比组件久」。这一棒沿着它往下问：
**跨会话边界的隐含契约**——`rebuild()` 依赖调用方先设好 `contentSnapshot`，
三个调用点只有一个遵守。顺着这条线一路验下去，牵出全部 5 处。

关键在于**切 locale 是唯一会让「语言代码同步变、语言包异步落地」的入口**，
两次 rebuild 必然重叠，把平时藏着的时序问题全部暴露出来。改这一带必测它。

### 修复（5 项，全部登记进 CHANGELOG）

1. **切语言丢掉用户全部内容** —— 快照是隐含契约，前一次用完清空、后一次拿不到。
   改为 `rebuild()` 自己取；`watch(sessionKey)` 里与 `rebuild()` 开头逐行重复的
   「取旧实例→置空→等 tick→销毁」一并删除。→ 不变量 44
2. **每切一次语言泄漏一个完整编辑器** —— 销毁写在取消检查之后，被取代就直接 return，
   而旧实例已从 `editor.value` 摘走、再无人持有。实测 `isDestroyed === false`。→ 不变量 44
3. **编辑器永久停在加载骨架屏** —— `await nextTick()` 在 try 之外，它交出的是当次
   flush 的 promise，任何组件更新抛错都让它 reject，经 `void rebuild()` 逃逸，
   `status` 永久卡在 `"loading"`。→ 不变量 44
4. **浮层抛 `insertBefore of null`** —— 5 个 bubble-menu 系浮层把 DOM 搬进 overlay
   portal，Vue 的 vnode 树仍以为它在原位；chrome 带着 `editor === null` 再渲染的
   那一帧要在已被摘走的容器上补插占位符。把 `editor` 提到父级 v-if 判一次。→ 不变量 45
5. **`initialContent` 被当受控源反复灌入** —— 盖掉刚恢复的用户内容。→ 约定 36

### ⚠️ 顺带更正了不变量 41（原文是错误归因）

原文：「ESM 产物不压缩，源文件里**每一行**注释都原样进产物、直接吃预算；
一段 10 行的中文注释吃掉 471B」，并据此立了约定 32「主 chunk 的注释要短」。

实测（**先做有效性对照**：同一实验里把一个运行时字符串加长 40 字符 → hash 变、
gzip +5B，证明构建确实响应源码改动）：

| 注释位置                         | 30 行中文注释 | 文本进产物 |
| -------------------------------- | ------------: | ---------- |
| `.ts` 语句之间                   |       **0 B** | 否         |
| `.vue` `<script setup>` 语句之间 |       **0 B** | 否         |
| 对象字面量的属性上               |     **209 B** | 是         |

Rollup 重新生成代码时只保留挂在输出 AST 节点上的 leading comment。
**原结论的矛盾就写在同一条里**——「单独还原 `listShortcuts.ts` 只差 2B」，
那 471B 其实来自整批的**代码**改动。已同步更正约定 32。

### 负结果（有价值，别重复走）

- **「订阅了编辑器事件却不做首次同步」全仓零违规。** 扫出 4 个候选全是误报：
  `CodeBlockLanguageBadge` 的首次同步写在 bind 函数的**调用点**、
  `MentionSuggestionMenu` 的 handler 是匿名箭头（调的是 `syncFromEditor` 不是 handler）、
  `resizableImage` 的同步写在订阅**之前**、`useControlledContent` 首次同步反而是错的。
- **「延迟回调碰编辑器却无守卫」全仓只有 1 处且无害。** `formatPainter` 的 rAF
  没查 `isDestroyed`，但整段被 `try/catch` 包着。（同文件 `view().update()` 里
  写了 `!editor.isDestroyed`，口径不一致，不构成缺陷。）
- **`EditorWorkspace` 不是缺陷 4 的同型。** 它同样带 `:key="sessionKey"`，
  但零个 bubble-menu / teleport，内容全在自己的 DOM 树里，没有 DOM 搬迁。

### 第 12 棒踩的坑（方法论补充）

21. **「只做一次」几乎总是错的判据，要问的是「这个东西变了吗」。**
    修 `initialContent` 重灌时我写成「非受控源只在首次就绪时应用」，单测全过、
    **打穿 6 个 e2e**。因为 `watch(sessionReady)` 不只管首次初始化，它还兜着
    「重建期间错过的源变更」（重建时 `sessionReady` 为 false，
    `watch(controlledSource)` 会早退），而 demo 的 `initialContent` 是
    `computed(() => getSampleContent(preset))`，切 preset 时源**变了**且同时触发重建。
    改成按「这份源灌过没有」判定，两条路径各写一个用例**双向变异验证**才算锁住。
22. **变异验证要覆盖「改错的方向」，不只是「原始缺陷态」。**
    上面这条如果只测「原始缺陷（每次都重灌）」，我的错误实现照样全绿。
    一个守卫有两个失效方向时，两个方向都要有用例。
23. **单测全绿不等于没回归，动了会话/渲染时序就必须跑 e2e。**
    这次是 e2e 抓到的，且失败集中在一个 spec 文件里（6 个全在 notion-features），
    这种「扎堆失败」是强信号：先 `git stash` 整批对比确认是不是自己引入的，
    再逐文件 stash 定位，比读代码猜快得多。
24. **产物实验必须先验证「实验方法有效」。** 我一度用 `const X = 1; void X;`
    当探针，它是死代码会被 treeshaking 摇掉，标记只进了 `.map`——连着几轮
    「0 字节差异」全是**无效结果**而非负结果。正确做法是先改一处**一定进产物**的东西
    （加长一个运行时字符串），确认 hash 与体积真的变了，再测要问的那个变量。
25. **扫描器在掩码后的文本上匹配，会把要找的字符串本身也掩掉。**
    扫 `.on("transaction", handler)` 时我先掩码字符串再匹配，事件名变成空白，
    整个扫描静默零输出。**在原文匹配、在掩码文本上做括号配平。**

---

## 第 13 棒做了什么（已完成，提交 `2e702b9`）

用户授权「三条口子你替我决定」。决定与理由见上面「仍然开着的口子」一节。
本棒做了 **#1 选中色**，并在做的过程中牵出两个此前没人发现的问题。

### 做了什么

1. **选中底色跟随品牌主色**（新特性）。三套外观 × 明暗两态各配一份 `--ye-selection`，
   RGB 恒等于同作用域的 `--ye-primary`，只有透明度分档（亮 30% / 暗 40%）。
   浏览器实测六种组合：选中文字对比度 7.08~~13.92（AA 要求 4.5），可辨识度 1.45~~1.97。
2. **`--ye-caret` 是个真死 token，但补规则而不是删**（顺带发现）。它按形状 C 在三处
   分层声明齐全、值都是 `var(--ye-primary)`，全仓却没有一条 `caret-color` 规则读它
   ——那次分层「修复」从未生效过。补规则后实测六种组合的光标色全部等于各自的主色。
3. **`tokenConsumers` 护栏有个反引号漏洞**（顺带发现，见下）。

### 关键决策与依据

- **用字面值而不是 `color-mix(… var(--ye-primary) …)`。** 后者能让六种组合自动跟随、
  只写一行，但构建 target 是 `chrome105 / safari16 / firefox110`，**都低于 color-mix
  的支持线**（Chrome 111+）。选中色是每次选文字都会看到的核心视觉，不能降级。
  代价是与主色脱钩，用护栏 `selectionColor.test.ts` 补回这份一致性。
- **`::selection` 只设 `background-color`、不设 `color`。** 压掉文字色会把代码块的
  语法高亮、链接色、AI 高亮一起抹平。实测确认选中态下文字仍是各外观原色。
- **透明度必须分明暗两档。** 同一个半透明蓝叠在 `#1e1e1e` 上比叠在白底上弱得多，
  word 深色 30% 时可辨识度只有 1.39。深色统一给到 40%。
- **对比度不是约束，可辨识度才是。** 六种组合在任何 α 下文字对比度都远超 AA，
  卡住取值的是「选中背景 vs 正常背景」能不能看出区别。**先算清楚哪个是约束再调参。**

### ⚠️ 发现：`tokenConsumers` 护栏（不变量 42）有个反引号漏洞

「JS 里以字符串形式读写也算消费」那条判据的正则是 ``/["'`](--ye-[\w-]+)["'`]/g``
——**带反引号**。而本仓库中文注释的通行写法正是 Markdown 风格的 `` `--ye-x` ``。
于是**注释里提一句 token 名，它就永久免检**；测试断言里出现一次 `var(--ye-x)` 同理。

`--ye-caret` 正是这么躲过去的：`variables.css` 有段注释写着
「`--ye-caret` 是全局 `#3370ff` 而非 word 的 `#0078d4`」。

扫描器已改为**先掩注释、并整体跳过 `*.test.ts`**。收紧后全仓 99 个 token 只暴露出
这一个——说明漏洞真实存在但影响面小。

### 第 13 棒踩的坑（方法论补充）

26. **死 token 未必该删——先问「是从来没人要，还是有人要了但没接上」。**
    第 10 棒删掉的 16 个是前者；`--ye-caret` 是后者：分层声明得很规范、注释里还留着
    作者核对渲染值的记录，只是规则没写。**看它周围有没有「曾经有人认真对待过」的痕迹**
    （规范的分层、专门的注释、配套的深色值），有就补规则，没有才删。
27. **python 脚本的 `assert` 失败会让 `write_text` 整个不执行。**
    往 CHANGELOG 插两段时锚点被 prettier 重排过，assert 抛异常 → 文件一个字没改，
    而同一条命令里的 `verify` 照常跑出全绿——又一次「测试全过的无效结果」。
    **多段插入用段落边界（`### Added` / `### Fixed` 的行号）定位，别用长文本锚点**，
    且插入后必须 `grep` 确认每一段都落在正确的段里。
28. **别在跑 verify 时又起一个 verify。** 后台 `verify` 未结束就又跑一次，
    出现 4~6 个用例失败、失败文件每次不同；单独重跑全绿。这就是交接文档里
    「机器负载高时随机挂载超时」的现象，**连跑四轮、只有并发那两轮失败**才敢下结论。

---

### 第 13 棒后半段做了什么（提交 `b3617a4`）

1. **受控推送清空撤销历史**（不变量 47）——修好「按钮亮着点一次没反应」。
2. **间距棘轮护栏**（不变量 48）——`spacingScale.test.ts` 锁住值集合，
   新值必须显式加进清单并写理由。**不做 token 化**，理由见不变量 48。
3. **ColorPicker 移出主 chunk**（不变量 49）——主 chunk **45783 → 42674（-3109B）**，
   余量 217B → 3326B。

### 第 13 棒后半段踩的坑（方法论补充）

29. **移模块出主 chunk，静态引用必须一个不剩。** 只改了 `ToolbarNav`，主 chunk 只掉
    **33B**；把 `FloatingMenu` 里那处也改掉才掉 **3109B** 并生成独立 chunk。
    **「省了几十字节」就是没分割成功的信号**，别以为是「本来就没多大」。
    动态 import 还要指向具体文件而非 barrel——同 barrel 里有静态引用会整体连带。
30. **python 切片改文件要用两个锚点夹，且改完检查有没有误删。**
    我用 `s.index(A)` 到 `s.index("export function parseContentToDoc")` 切掉一段，
    把中间的 `adaptJsonToSchema` 整个函数一并删了。grep 只确认了「新代码写进去了」，
    没确认「别的没少」——测试直接 `ReferenceError`。
    **改完看一眼 `git diff --stat`：预期只增不删时，出现删除行数就是信号。**
31. **长任务要中途汇报。** 连着跑 build / verify / e2e 十几分钟不出声，
    用户会以为卡住了。**每完成一个可验证的小结果就说一句**，
    尤其是在做耗时的产物实验时。

---

## 第 13 棒收尾做了什么（提交 `fa87674`）

补 e2e，并抓出**我自己的一个误判**。

### 补了 3 条会话重建 e2e（22 → 25），逐条变异验证

第 11~13 棒在会话重建这一带修了三个用户可感知的缺陷，却**一条 e2e 都没有**
——全靠 jsdom 单测发现，而问题的本质恰恰是渲染时序。

| 用例                                   | 变异                    | 结果                       |
| -------------------------------------- | ----------------------- | -------------------------- |
| 切语言：内容保留 + 编辑器就绪 + 无错误 | rebuild 不自取内容快照  | 转红                       |
| 切语言只影响被切的那个实例             | 同上                    | 转红                       |
| mode 往返后撤销按钮仍可用且真能撤销    | 退回 `hasRealEdit` 守卫 | 转红（toBeEnabled failed） |

### ⚠️⚠️ 重要更正：第 12 棒的「缺陷 4」是 jsdom 特有的

原记录：「session 重建时浮层在已被摘走的容器上抛 `insertBefore of null`」，
当成真实缺陷写进了 CHANGELOG 和不变量 45。

**补 e2e 时做了对照实验**：把那处修复（`showEditChrome && editor`）回退掉，
在**真实浏览器**（Chromium）里切 locale 往返 3 轮、切 mode 往返 3 轮，
`error` / `unhandledrejection` / `console.error` **全为空**，编辑器也从未卡在骨架屏。

修复本身**保留**，但两处修复的理由都要换成独立成立的那个：

- `&& editor` —— 消除的是一个**本就没有意义的渲染帧**（chrome 里 9 个子节点都写着
  `&& editor`，条件本就该提到父级判一次），不是「修了浏览器里的崩溃」。
- `await nextTick()` 放进 `try` —— **错误处理的完整性与触发源是什么无关**：
  rebuild 不该因为任何一个异常就永久停在 `"loading"`。

不变量 44 / 45、CHANGELOG 对应条目、e2e 文件头注释均已更正。

**教训（已钉进不变量 45）：jsdom 里观察到的渲染错误，必须在真实浏览器里复验后
才能称为「缺陷」。** jsdom 没有真实布局、patch 时序也不同，它报的错可能是它自己的。

### 写 e2e 踩的坑

32. **`locator.click()` 默认点元素中心。** full-editor 的示例文档中部是表格，
    点中心会落进不可编辑处，`keyboard.type()` 一个字也进不去，而报错信息只说
    「文本不匹配」，看不出是落点问题。**点最后一个顶层段落（`editor.locator("> p").last()`）
    再按 `End`。** 现有的 `focusEditorEnd`（`Meta+ArrowDown`）在这个文档上也带不到文末
    ——它能用在 notion-features 里，是因为那些用例先切了 preset、文档已经不一样了。
    诊断办法：起 dev server 用浏览器手动把选区放到文末再输入，能进就是落点问题。

---

## 第 14 棒做了什么（已完成）

按计划补 `DragHandleExtension`（1075 行、此前**零单测**、缺 387 条语句占总缺口 1/6）。
**「借补测试把没执行过的路径走一遍」这个赌注赢了：翻出 5 个缺陷，其中 3 个是内容损坏。**

### 修复（5 项，全部登记进 CHANGELOG）

1. **「转换为」把行内格式整个吃掉**（不变量 50）—— 转换项按 `node.textContent`
   重建纯文本，mark（加粗/斜体）、链接 `href`、`<br>`、mention 全丢；多块源
   （列表/表格/引用）还把各块文字粘成一段。改为搬运行内 `Fragment` 并按源块切分。
2. **多行代码块转正文后换行永久丢失**（不变量 50）—— 输出 `<p>a\nb</p>`，
   `getHTML()` → `setContent()` 往返一次变 `<p>a b</p>`。改为还原成 `hardBreak`。
3. **块菜单一移上去就消失，「转换为」根本点不到**（不变量 51）—— 真实浏览器实测：
   段落 26px、菜单 139px，指针 Y 越过块底 +12px 就按坐标重新命中，命中菜单**下方**
   的块而关掉菜单。**+ 号的块选择器更严重**（340px，连「是自己的浮层」都不在判定里）。
4. **拖拽影像泄漏**（不变量 52）—— 挂在 `document.body` 的整块深拷贝，`destroy()`
   完全没收；拖拽中会话重建就永久留在页面上。
5. **`dragend` 的全局清理误删别的实例的影像**（同上）—— 实测 A 仍在拖拽、影像已被
   B 的 `dragend` 抹掉。4 与 5 同根因：没持有自己创建的那份引用。

### 测试

- `DragHandleExtension.test.ts`（新增 30 条）、`locales/extensionLabelKeys.test.ts`
  （新增全仓护栏，约定 40）、`e2e/drag-handle.spec.ts` 5 → 8 条。
- **做了 14 次变异验证**（10 次 jsdom + 4 次真实浏览器），全部转红才收工。

### ⚠️ 推翻了此前「DragHandle 只能靠 E2E」的判断

`vitest.config.ts` 与 `e2e/drag-handle.spec.ts` 的文件头原先都写着
「整个扩展是纯浏览器几何逻辑，强行做单测只能断言自己写的桩」，据此让它长期零单测。
**实际上该文件里与布局无关的部分占绝大多数**——块转换、菜单渲染、目标选择、
插件生命周期与资源收回，把 `view.posAtCoords` 换成确定输入之后全都可测，
断言的是扩展自己的产出而不是桩。两处注释已更正。

**判据是「这段逻辑要不要布局」，不是「这个文件属不属于交互层」。**
把整个模块推给 E2E，等于让它一条都测不到。

### 负结果 / 被探针否定的假设（别重复走）

- **转换后末尾多出的 `<p></p>` 不是缺陷** —— StarterKit 3 自带 `trailingNode`
  （文档最后一个块不是段落时自动补一个）。写断言时要把它算进去。
- **「根节点存在但 portal 不存在会抛错」是我的测试桩缺 portal** —— 真实
  `EditorShell` 里 portal 是根节点的静态首子节点，根在则 portal 必在。
- **菜单用到的 15 个 locale key 当前全部存在** —— 但零护栏，已补上（约定 40）。
- **`getMenuLabel` 全仓只有 DragHandle 用**，但同型的 `getLocaleText` 还有
  Toggle 与 AI 侧两处，护栏已扫全仓。

### 第 14 棒踩的坑（方法论补充）

33. **打过桩的探针会给出假阴性。** 我用「把 `view.posAtCoords` 换成固定返回值」驱动
    hover，然后拿同一个探针去问「指针移到菜单上菜单会不会关」——桩恒返回同一个 pos，
    命中永远不变，探针当然说「不关」。**真实浏览器里一移就关。**
    桩固定了哪个输入，就不能再用它去问依赖那个输入的问题。
34. **管道会吞掉退出码。** `pnpm run verify 2>&1 | tail -60` 的退出码是 `tail` 的，
    eslint warning 与 prettier 失败被完全掩盖，我一度以为 verify 过了。
    **要判退出码就别接管道**，写进文件再 grep（`> log 2>&1; echo EXIT=$?`）。
    这是「单测全绿 ≠ 退出码 0」的又一种形态。
35. **变异验证要挑「能让缺陷显形」的数据。** 「鼠标移到块选择器上不自关」这条 e2e
    第一版用了文档第一个块（h1，较高），回退修复后**照样绿**——块够高时指针还没
    离开判定范围。换成 26px 的段落才转红。**变异不转红时，先问是不是自己选的
    输入让缺陷够不着**，而不只是问用例写没写对。
36. **恒真用例有两种典型长相**，本棒各踩一个：
    ① `expect(...).not.toThrow()` 验「监听已摘」——jsdom 里处理器抛错不冒泡（约定 39）；
    ② 断言的对象在两种实现下**长得一样**——「创建副本」插在原块前后 HTML 完全相同，
    要靠光标位置才区分得开。**写完问一句：如果实现是错的，这条断言会变吗？**

---

## 第 15 棒做了什么（已完成）

按计划补 AI 与媒体链路。**4 个缺陷，其中 3 个是「用户什么也看不到」的静默失败。**

### 修复（5 项，全部登记进 CHANGELOG）

1. **换流后「取消」再也停不下正在跑的 AI 流**（不变量 53）—— 旧流的 `AbortError`
   回调无条件清句柄，而此刻句柄已是新流的。**根因很典型**：`aiSuggestionManager`
   内部本来就有按身份清的 `clearAbortController` 并且用对了（`executeCustomPrompt`），
   只有 `runStream` 那半没跟上——同一仓库两套写法，一对一错。已公开该方法并立护栏。
2. **翻译目标语言把显示名当标识符持久化**（不变量 54）—— 切界面语言后按钮显示
   「Translate to 英语」/「翻译为 English」，选中标记双向丢失。改存代码 + 旧值自动迁移。
   ⚠️ 这条动了公开 API 语义（`AiUserConfig.translateTargetLang` 的取值域），**先问过用户**。
3. **图片/视频本地上传失败完全无声**（不变量 55）—— `show-upload-list` 关着，
   `catch` 里只有 `onError?.(e)`。文案 `messages.imageUploadFailed` 早就写好、**零消费**。
4. **块菜单插入媒体失败同样无声，且 `videoUploadFailed` 文案根本不存在**（约定 41）——
   `null` 同时表示「用户取消」和「上传失败」，调用方分不开。
5. **`resolveMediaUrl` 的 `!` 非空断言在类型上说谎** —— 会把 `src: null` 写进文档。
   顺带删掉 `runStream` 的死参数 `handlers`（两个调用点都没传过）。

### 负结果 / 被探针推翻的假设（别重复走）

- **`pasteImage` 里解构的 `dispatch` 不会丢 `this`** —— ProseMirror 构造时就把它绑在
  实例上了（`Object.hasOwn(view, "dispatch") === true`）。看着像坑，实测不是。
- **`data:` URL 不是绕过了媒体白名单** —— `normalizeSafeMediaUrl` 对它有按 kind
  收敛的显式分支（`data:image/` / `data:video/`），是有意放行。
- **`schema.nodes.image` 缺失那条分支库内不可达** —— `PasteImage` 与 image 节点在
  同一个 capability 里注册，关掉 image 两者一起消失。那是防御性守卫，不是缺陷。
- **`AiMenuButton` 的 `savedSelection` 没有残留风险** —— split 主按钮只在菜单打开时
  可达，而每次打开都会重设选区。
- **`pickMediaUrl` 的 `.catch()` 不是 unhandledrejection** —— rejection 有处理，
  问题在于处理得太安静。
- **「异步回调里无条件清共享句柄」全仓只此一处** —— 结构化扫描零命中。

### 第 15 棒踩的坑（方法论补充）

37. **打桩要打得够窄。** `vi.stubGlobal("URL", { ...URL, createObjectURL })` 把 `URL`
    构造函数一起换掉了，而被测代码内部要 `new URL()`——于是每条用例都"失败"，
    **失败的是桩不是代码**。只替换要替换的那一个方法，用完恢复。
38. **等待的判据不能恒真，也不能依赖被测组件恰好渲染了什么。** 等语言包加载时我先写了
    `!portal.ownerDocument`（恒真，等于没等），改成「渲染文本里还有没有 `editor.`」后
    `ImageUpload` 过了而 `VideoUpload` 没过——它的弹窗里压根没有那种文案，判据一开始
    就满足。最后改成直接问 locale 上下文自己（`ctx.messages.value !== null`）。
    **写等待循环时先问：这个条件在「还没就绪」时真的为假吗？**
39. **「零消费」不等于「不存在」。** 我查 `videoUploadFailed` 时只 grep 了「非 locale
    消费方 0 处」，就默认它在语言包里存在——其实它根本没有。测试报
    `expected 'messages.videoUploadFailed' to contain '视频上传失败'` 才发现。
    **grep 排除了某个目录时，别把"没在别处出现"读成"在那个目录里存在"。**
40. **切片改文件又踩了一次（教训 30 的重演）。** 用 `s.index()` 夹两个位置删 `.catch`
    块，残留了半截 `resolve(null); });`，测试报的是 esbuild 语法错误——
    那是**无效变异**而不是负结果。改用精确字符串替换，并在变异后先看一眼语法。

---

## 第 16 棒做了什么（已完成）

剩余组件 + 阈值提档 + 收尾。**4 个缺陷，都是「说了做不到」或「清理只做一半」。**

### 修复（5 项，全部登记进 CHANGELOG）

1. **子菜单收起定时器在组件卸载后仍会触发**（不变量 56）——关菜单时清了，卸载路径漏了。
2. **公式块的键盘用户没有编辑入口**（不变量 57）——`<button aria-label="编辑公式">`
   按 Enter 只会选中节点，真正的入口只有 `dblclick`（没有键盘等价物）；
   空公式占位文案还写着「点击编辑公式」而单击并不进编辑。补键盘路径 + 改文案。
3. **Mac 上按不了 Cmd+Enter**——Vue 模板的 `.ctrl` 修饰符不匹配 Cmd，两处各补 `.meta`。
4. **链接气泡菜单输入非法地址时完全无提示**（不变量 55）——弹窗不关、链接不变、
   什么也不说；同仓库 `ImageUpload` 的同类弹窗一直有这条提示。
5. **链接气泡菜单收敛到 `applyLinkToEditor`**——它自己写了一份第 9 棒修复前形状的分流。

### 覆盖率与阈值

- Statements **72.89% → 77.58%**，Lines **74.85% → 79.69%**，用例 1009 → **1109**。
- 阈值 56/56/44/52 → **75/77/63/73**（各留约 2 点余量）。**阈值做过变异验证**：
  抬到 90 会红，确认它真的在把关。
- ⚠️ **没有达到「Statements 80% 上下」这个终点判据**（差 2.4 个点）。
  剩下的大头写在 `vitest.config.ts` 的注释里：`BlockPickerMenu.vue`（99 行）、
  `aiSuggestionManager` 的浮层挂载与定位（92）、`ColorPicker.vue`（50）、
  `resizableImage.ts` 的拖拽改尺寸（48）、`AiSettingsModal.vue`（44）。
  其中拖拽与浮层定位属于「要布局才能测」的部分，另外三个是常规组件逻辑，可以继续补。

### 负结果 / 被推翻的判断（别重复走）

- **`LinkBubbleMenu` 的「裸 setLink」分支不可达** —— 我一度以为第 9 棒那个
  「编辑已有链接把原链接劈成两半」的缺陷在这里还活着（代码形状一模一样）。
  实证：`shouldShowLinkBubbleMenu` 要求选区非空才显示，所以永远走 `extendMarkRange`
  那一支。**收敛仍然做了**，但理由是「不该有第二份实现」，不是「修了一个 bug」。
- **`wordImport` 的 `<img src>` 确实是虚惊**（复核第 10 棒结论）——
  `ResizableImage.src` 的 `parseHTML` 过 `normalizeSafeMediaUrl`，schema 层兜住了。
- **三处「不可达的双保险」**，变异不转红，已如实标注而非硬凑测试：
  `onMenuClick` 的 `:split-hover` 后缀早退（`findMenuItemByKey` 本来就找不到）、
  `VideoToolbar` / `ImageToolbar` 的 `!node || pos === null`（两者恒同真同假；
  且 `updateAttributes("image", …)` 对非 image 节点本就无效）。
- **`aiSuggestionManager` 不是好的补测目标** —— 已有 399 行测试覆盖了核心，
  剩下的 92 行几乎都是浮层挂载与定位，jsdom 里测不出价值。

### 一条待复验的观察（第 17 棒已结案：是真缺陷）

原文：`FindReplaceDialog` 点「替换」之后，jsdom 下选区没有落到剩下的那个命中上
（直接调 `searchReplaceSelectCurrent()` 能选中 5-6，经组件的 `handleReplace`
走同一条路却停在 1-1）。当时按不变量 45 留作待复验，没写成断言——**这个处理是对的**。

**第 17 棒在真实 Chromium 里复验：复现，而且比原描述更大**（「上一处 / 下一处」同样
不动）。但**归因错了**：不是 `editor.commands.focus()` 本身，而是「命令里再调命令」
导致外层事务带着旧选区盖回来。详见下面第 17 棒一节与不变量 58。

### 第 16 棒踩的坑（方法论补充）

41. **否定断言前要先站住肯定的那一半。** `expect(html).not.toContain("<video")`
    在文档压根没解析出 video 节点时恒真——测试文档的 HTML 标签写错（`Video` 认的是
    `video[src]`，我写的是 `div[data-type]`）就是这样，而它看起来一切正常。
    加一条 `expectHasVideo` 前置断言，当场就暴露了。
42. **桩要装在被测代码真正拿到的那个对象上。** `vi.spyOn(editor.commands, "x")`
    对 tiptap 无效：`commands` 是每次访问都新建对象的 getter，spy 装在临时对象上，
    组件拿到的是另一个，断言永远是「没被调用」。改成断言真实效果
    （storage / 选区 / 文档），也更贴近用户能看到的东西。
43. **「总数下降」不是「我那个被清了」。** 验卸载清定时器时用
    `vi.getTimerCount()` 的总数，而 antd 与 Vue 自己也会清一批，没写清理照样绿。
    要盯组件排的那一个（按它独有的延时值认出来），看它的 id 有没有被 `clearTimeout`。
44. **同一个等待判据坑踩了三次才收敛。** 「语言包加载完了没有」写成
    「渲染文本里还有没有 `editor.`」，会因为组件恰好渲染的是公式 / 图标 / 空弹窗
    而**一次都不等**。判据只能问 locale 上下文自己，已抽成
    `waitForLocaleMessages` 放进 `src/testing/mountEditor.ts`。
45. **按文案找元素要当心子串与自动空格。** 「替换」是「全部替换」的子串（用
    `includes` 会点到「全部替换」上去）；antd 还会给两个汉字的按钮自动插一个空格
    （实际文本是「替 换」）。精确比较 + 去空白，并在找不到时把现有文案打出来。

---

## 第 17 棒做了什么（已完成）

三件事：把 Statements 补到 80%、给「挂起的观察」结案、收尾。

### 一、覆盖率补到 80.43%（+64 条用例）

按第 16 棒点名的三个常规组件补，**目的不是刷数字，是把没执行过的路径走一遍**。

| 文件                  | 补的用例 | 变异验证                         |
| --------------------- | -------: | -------------------------------- |
| `BlockPickerMenu.vue` |      +20 | 12 处变异，12 转红               |
| `ColorPicker.vue`     |      +24 | 19 处变异，18 转红（1 处是发现） |
| `AiSettingsModal.vue` |      +14 | 15 处变异，15 转红（1 条补用例） |

- 阈值 75/77/63/73 → **78/80/67/76**，抬到 90 会红（变异验证过）。
- 这三个文件此前分别是 42.4% / 46.8% / 54.6%，其中 `ColorPicker` **一条测试都没有**。
- 挑法沿用第 14~16 棒：`ColorPicker` 直接挂组件本体（antd Popover 在 jsdom 里能真开，
  弹层首开之后一直留在 portal 里，改 props 不必重开）；`BlockPickerMenu` 也改成直挂，
  因为完整挂载既慢又拿不到 `uploadImage` / `uploadVideo` 这两个宿主 prop。

**这一轮的产出率印证了「缺陷密度跟覆盖率相关」，但也划出了边界**：三个文件翻出的是
**两处「改变不了任何结果」的分支**，而不是第 14~16 棒那种内容损坏——因为这三个文件
本来就有人用、有人看，真正的缺陷早被用户用出来了。真正的收获来自第二件事。

### 二、给挂起的观察结案：是真缺陷，而且比原描述大

第 16 棒留下「`FindReplaceDialog` 点替换后选区没落到剩下的命中上（jsdom）」。
按不变量 45 去真实浏览器复验，**复现**，并且顺带发现「上一处 / 下一处」同样不动。

**根因不是 `focus()`，是「命令里再调命令」**：tiptap 的 `CommandManager` 在
`editor.commands` 这个 getter 里就按当前 state 造好一条 tr，命令回调返回后
**无条件派发**（不看它有没有内容）。于是排成：外层 tr 先造好（带着那一刻的选区）→
内层 `editor.commands.setTextSelection()` 现造一条、立刻派发、选区落到命中 →
外层随后派发，把旧选区原样盖回去。doc 没变，所以连 `mismatched transaction` 都不报，
只表现为「点了没反应」。

修复：9 个命令统一改为只写运行器给的那条 `tr`；焦点交还放到 tr 落地后的下一帧。
→ 不变量 58 + 约定 45 + 静态护栏 `extensions/commandTransactionScope.test.ts`

- e2e `find-replace.spec.ts`（2 条，变异验证转红）+ jsdom 侧补了 3 条选区断言。

### 三、收尾

- `pnpm run lint` 加 `--max-warnings=0`：此前「eslint 零 warning」只是文档里的话，
  实测 9 条 `import/order` warning 照样退出 0。加完做了变异验证（造一条 warning → 退出 1）。
- 删掉两处改变不了结果的分支（见下方负结果）。

### 三（续）、补两处真实的验收空白 + 给不变量 15 装上护栏

第一轮收尾时核对自己写下的断言，发现**「该走 E2E」被我写成了「已经有 E2E」**——
`resizableImage` 的拖拽改尺寸与 `aiSuggestionManager` 的浮层定位，两处都是**零验收**
（既没单测也没 e2e）。当场补上：

| 新增 e2e                     | 锁住什么                                                  | 变异 |
| ---------------------------- | --------------------------------------------------------- | ---- |
| `resize-image.spec.ts`（2）  | 拖手柄真的放大 + **尺寸写进文档**；只点不拖则文档一字不变 | 3/3  |
| `ai-suggestion.spec.ts`（2） | 浮层挂进 overlay portal、贴着选区定位；接受把改写写进正文 | 3/4  |

`ai-suggestion` 那条没转红的变异是 `accept()` 里的 `removeAiHighlight(editor)`：
接受时 `insertContent` 会把带高亮的那段整个替换掉，标记自然消失，**在本场景下它是
无差别的双保险**。如实标注，没有硬凑一条测试去"覆盖"它（参见方法论第 6 条的三种情况）。
| `find-replace.spec.ts`（2） | 见上（第二件事） | 2/2 |

另外给**不变量 15（禁止模块级可变状态）**补了静态护栏 `src/moduleLevelState.test.ts`：
这条不变量有三次历史事故，却一直只写在文档里没有检查。实测全仓 **12 处**模块级可变状态，
而交接文档一直写着「已知有意例外两处」——`features/ai/config/` 那 5 处从没被登记过。
护栏逐条登记并要求写明「为什么它不该按实例隔离」，双向可打红（新增未登记的、清单留过期条目）。

### 负结果（这两条扫描没有产出，别重复走）

- **「捕获快照 → 中途派发 → 又用旧快照」全仓零命中。** 2 条候选都是误报：
  `blockMenuActions` 捕获的是 `schema`（跨事务不变）、`AiHighlightMark` 那条是扫描窗口
  跨了函数边界。因为零真命中且判据有两处已知误报源，**没有**把它升级成护栏
  ——真正咬到我们的那个机制已由 `commandTransactionScope` 覆盖。
- **DOM watcher 的 flush 时机全仓零违规。** 唯一候选 `CustomAiPopover` 用的是
  `nextTick(() => input.focus())`，与 `flush: "post"` 等价。

### 终点判据达成情况（如实）

- ✅ **Statements 80.43%**（目标 80%），Lines 82.77%、Branches 69.05%、Functions 78.69%
- ✅ 阈值提档到 78/80/67/76，并做过变异验证
- ✅ 挂起的观察已结案：真缺陷，按根因修完并用护栏 + e2e 锁住
- ✅ 两处零验收的几何逻辑补上 e2e（e2e 28 → 34），不变量 15 补上静态护栏（护栏总数 26 → 27）
- ✅ 变异验证：**55 次运行，48 次直接转红**；没转红的 7 次逐条查清，没有一条含糊过去
  - 2 次是**代码本身改变不了结果**（`BlockPickerMenu` 的 `watch(query)`、
    `ColorPicker` 的 `indicatorBarStyle` 透明分支）→ 删掉 / 收敛
  - 2 次是**两个入口互为兜底**（`hide()` 与 `openInsert()` 各自重置高亮），
    去掉任一处都还有另一处兜着，两处都去掉才红 → 在用例注释里写明它锁的是结果
  - 1 次是**用例缺失**（重新打开弹窗要清掉上次的连接测试结果）→ 补用例后转红
  - 1 次是**用例太弱**（嵌入块那条：`promptEmbedUrl` 交出的是已决议的 Promise，
    「期间光标被挪走」写在 await 之后根本没赶上）→ 把挪选区放进 prompt 桩后转红
  - 1 次是**护栏判据太窄**（只扫 `addCommands()` 块内，抓不到辅助函数里的违规）
    → 改成跟随同文件调用关系后转红

### 负结果与发现（别重复走）

- **`BlockPickerMenu` 的 `watch(query)` 是护不住一半路径的网。** 四个写 `query` 的入口
  （`activate` / `openInsert` / `hide` / `updateQuery`）都已各自把高亮归零，而 watcher
  只在 `query` **真的变化**时触发——`openInsert` / `hide` 把空串写成空串，它根本不响应。
  一张只盖住一半的网比没有更危险（会让人以为重置已经集中在一处），已删除并把规则写在
  `updateQuery` 的注释里。⚠️ 补的那条用例锁的是**用户可见的不变量**（关掉再打开高亮回到
  第一项），不指认是哪一行做的：实测 `hide()` 与 `openInsert()` 各去掉一处仍然全绿，
  两处都去掉才转红。
- **`ColorPicker` 的 `indicatorBarStyle` 透明分支与它下面那行返回逐字相同的对象**，
  `normalizeColor` 又保证了 `!color` 恒假——去掉整段守卫 24 条用例全绿，已收敛成一行。
  ⚠️ 同文件的 `getTextColorForBackground` 开头那个 `transparent` 早退**不要照着删**：
  它虽然与后面的长度校验结果相同，但那是「transparent 恰好 11 个字符」的巧合，
  留着早退是写明意图。
- **`AiSettingsModal` 重新打开时清测试状态**这条没有用例——变异不转红是因为**测试缺了**，
  不是不可达，已补。（三种情况里的第 ①种，别一律当成「不可达」放过。）
- **`useAiConfig` 的状态是模块级的**（同页多实例共享同一份用户配置，属有意例外），
  用例之间必须自己 `clearConfig()`，不能依赖执行顺序。

### 第 17 棒踩的坑（方法论补充）

46. **`vi.spyOn` 对已经被 spy 的属性会复用同一个 mock，调用记录跨用例累积。**
    上一条用例里调过一次 `window.prompt`，下一条 `toHaveBeenCalledTimes(1)` 就读成 2。
    有 spy 的测试文件必须在 `afterEach` 里 `vi.restoreAllMocks()`。
47. **「浏览器里复验」之前要先确认这个浏览器可信。** Claude 的浏览器预览面板里
    `requestAnimationFrame` **不触发**（面板隐藏时被节流，交接文档坑 16 记的是超时，
    这里是更隐蔽的一面）——而 tiptap 的 `focus()` 正好走 rAF。用它当"真实浏览器"
    会得到和 jsdom 一样的假象，等于白复验。**先在页面里跑一次 rAF 探针**，
    不触发就换 Playwright（`npx playwright test`，真实 Chromium，rAF 正常）。
48. **护栏第一次跑就漏掉自己人，和第一次跑就误报自己人一样，都是判据不对。**
    `commandTransactionScope` 的第一版只扫 `addCommands()` 块内，拿修复前的代码做变异
    **没有转红**——真实事故正藏在被命令调用的辅助函数 `focusSearchHit` 里。
    改成顺着同文件的调用关系再走一层才抓得到。**护栏写完必须拿"历史事故的那份代码"
    做变异验证**，只跑自检样本会给出假绿。
49. **exposed 的 ref 会被 Vue 解包。** `defineExpose({ isVisible })` 之后，
    `menu.isVisible` 是布尔值不是 ref，`menu.isVisible.value` 恒为 `undefined`
    ——断言 `toBe(false)` 会因为 `undefined !== false` 而红得莫名其妙。
50. **`Element.prototype.scrollIntoView` 在 jsdom 里根本不存在**（不是空实现）。
    写在 `nextTick` 回调里的调用会变成未处理的 Promise 拒绝，让整轮 verify 退出 1
    而不是某条用例转红。已补进 `installLayoutStubs()`。

### 第 17 棒续踩的坑（方法论补充）

51. **e2e 的变异验证要打在「真正决定观察量的那一行」上。** 我把 AI 浮层的
    `container.append` 换成 `document.body` 想验「挂载点」，用例照样绿——因为浮层是
    antd popup，落点由 `getPopupContainer` 决定，`container` 只是 Vue app 的根。
    换成改 `getPopupContainer` 才转红。**没转红先问「我改的这行真的能改变我断言的那个量吗」。**
52. **看着像样的几何断言可能是恒真的。** 「x ≥ 0、没超出视口、与锚点垂直距离小于一屏」
    在把定位整个换成 `{top:0,left:0}` 之后**全部满足**。真正区分得开的是
    「水平方向贴着选区起点」（实测差 12px，缩到角落差 500 余）。**先量真实数值再定阈值。**
53. **整篇 HTML 里找子串会被 base64 误伤。** `expect(html).not.toContain("NaN")` 挂了，
    因为测试用图的 base64 里恰好有 `…RSNaNKJ…`。断言范围要收到 `<img>` 标签内。
    这是「否定断言前先站住肯定的一半」（约定 43）的近亲：**否定断言还要限定作用域**。
54. **antd 会在两个汉字之间插空格**（「接 受」「替 换」「取 消」），
    `hasText: "接受"` 匹配不上。一律用 `/^接\s*受$/` 这类正则。（约定 45 的老坑又踩一次。）
55. **护栏要能先抓住自己。** 「每条例外都要写理由」这条自检，第一次跑就把我
    敷衍写的「同上，全局兜底语言」判红了——**给护栏加一条针对"填表人"的检查**，
    比只检查被扫代码更能防住清单退化成摆设。

### 下一棒可以从哪儿挑

**规律仍然成立：缺陷密度与「这段代码被执行过没有」强相关**，但第 17 棒补充了一条边界
——**常规组件补到后期，翻出来的多是「不可达 / 无差别」的分支，而不是真缺陷**。
第 14~16 棒那种内容损坏集中在零覆盖的交互层。

按未覆盖行数排的剩余候选（第 17 棒末实测，`vitest.config.ts` 注释里有同一份）：

```
缺  92 行 (67.4%)  features/ai/shared/aiSuggestionManager.ts   ← 浮层挂载与定位，走 e2e
缺  66 行 (86.5%)  extensions/dragHandle/DragHandleExtension.ts ← 拖拽几何，走 e2e
缺  48 行 (75.6%)  extensions/resizableImage.ts                 ← 拖拽改尺寸，走 e2e
缺  40 行 (75.2%)  components/tools/block-menu/blockMenuActions.ts
缺  37 行 (62.2%)  extensions/video.ts
缺  31 行 (55.1%)  components/tools/mention-suggestion/MentionSuggestionMenu.vue
```

**更值得做的是换维度找缺陷**，第 17 棒的经验是：一条「命令层的写法约定」牵出的缺陷
（查找替换整条链路都不落选区）比三个组件的补测加起来更有价值。可以继续问的问题：
还有哪些「意图写在代码里、但被框架的执行顺序悄悄抵消」的地方？
（不变量 58 是命令层的；订阅层、watcher flush 时机、节点视图 update 都出过同类事故。）

### 仍然挂起的任务

`src/extensions/office-paste/lineNumber.ts` 的 `MsoLineNumber` 形态判定，
需要一份**真实的 Word 剪贴板 HTML**（不是 `.doc` 文件——`MsoLineNumber` 只存在于
剪贴板的 `text/html` 里）。拿到之前不要动，改错的代价是丢正文。

## 附录：文件清单口径

全量复核已完成，**不再需要「剩余清单」**。要重新核对口径时：

```bash
find src -type f \( -name "*.ts" -o -name "*.vue" -o -name "*.css" \) \
  ! -name "*.test.ts" ! -path "*/testing/*" | sort | wc -l   # 应为 294
```

第 9 棒结束时：294 个文件 / 30739 行，全部逐行读完（提交 `c59f6e0`）。

第 10 棒之后是 **295 个**：新增 `composables/useBatchUploadGate.ts`。
（上表的 294 是第 9 棒逐行复核的口径，保留作历史记录。）
