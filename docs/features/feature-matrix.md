# 功能对照表

按 preset 汇总编辑器能力与入口位置。`features` 可覆盖 preset 默认值。

## FeatureConfig 能力键

| 能力键          | basic | full | notion | 入口（full 顶栏）   | 入口（notion） |
| --------------- | :---: | :--: | :----: | ------------------- | -------------- |
| `image`         |  ✅   |  ✅  |   ✅   | 顶栏图片            | `/` 或悬浮菜单 |
| `video`         |  ❌   |  ✅  |   ✅   | 顶栏视频            | `/` 或悬浮菜单 |
| `table`         |  ❌   |  ✅  |   ✅   | 顶栏表格            | `/` 或悬浮菜单 |
| `math`          |  ❌   |  ✅  |   ✅   | 顶栏公式            | `/`            |
| `ai`            |  ❌   | ❌\* |   ✅   | 顶栏 AI + 悬浮菜单† | 悬浮菜单 AI    |
| `formatPainter` |  ❌   |  ✅  |   ❌   | 顶栏格式刷          | —              |
| `outline`       |  ❌   |  ✅  |  ✅‡   | 顶栏大纲            | 无入口‡        |
| `searchReplace` |  ❌   |  ✅  |  ✅‡   | 顶栏 / Ctrl+F       | 无入口‡        |
| `officePaste`   |  ❌   |  ✅  |   ✅   | 粘贴即用            | 粘贴即用       |
| `slashCommand`  |  ❌   |  ❌  |   ✅   | —                   | 空行输入 `/`   |
| `dragHandle`    |  ❌   |  ❌  |   ✅   | —                   | 段落左侧六点   |

\* full 需 `:features="{ ai: true }"` 并传入 `:ai-config`  
† full 默认关闭 AI gate；开启后顶栏「智能」区显示 `AiMenuButton`，悬浮菜单亦有 AI 入口  
‡ notion 的 gate 默认开启（扩展会注册），但大纲开关与查找替换按钮**只存在于顶栏**，而 notion 隐藏了顶栏；且 notion 的顶栏配置里 `outline` / `searchReplace` 本身也是 `false`。因此 notion 下大纲面板不会渲染、Ctrl/Cmd+F 也不会被绑定（快捷键由 `FindReplaceButton` 注册）。详见 [大纲目录](./outline.md) 与 [查找替换](./find-replace.md)。

## 非 FeatureConfig 能力（preset 工具栏）

| 功能          | basic | full | notion | 控制方式                              |
| ------------- | :---: | :--: | :----: | ------------------------------------- |
| Word 导入导出 |  ❌   |  ✅  |   ❌   | full preset 顶栏                      |
| 文档模板      |  ❌   |  ✅  |   ❌   | full preset 顶栏                      |
| 图库          |  ❌   |  ✅  |   ❌   | full preset 顶栏（依赖 `image` gate） |
| 固定顶栏      |  ✅   |  ✅  |   ❌   | preset layout                         |
| 固定底栏      |  ✅   |  ✅  |   ❌   | preset layout                         |
| 浮动文本菜单  |  ❌   |  ✅  |   ✅   | preset layout                         |
| 链接气泡      |  ✅   |  ✅  |   ✅   | preset layout                         |

## 核心编辑（始终注册）

以下能力在 Full Editor 各 preset 中**始终可用**（不受 `features` 控制）：

链接、标题 H1–H6、列表（有序/无序/任务）、引用、代码块、文本颜色与高亮、对齐、上下标（full 顶栏）、行高、字符计数等。详见 [核心编辑](./core-editing.md)。

## 布局 chrome

| 布局项      | basic | full | notion |
| ----------- | :---: | :--: | :----: |
| 顶栏 header |  ✅   |  ✅  |   ❌   |
| 底栏 footer |  ✅   |  ✅  |   ❌   |
| 浮动菜单    |  ❌   |  ✅  |   ✅   |
| 快捷键提示  |  ❌   |  ✅  |   ❌   |

## 本地 Demo

运行 `pnpm dev` 后访问 [http://localhost:9527](http://localhost:9527)：

- `/full-editor` — preset / appearance / features 切换
- `/inline-editor` — Inline toolbar 开关
- `/inline-compose` — 自定义 toolbar 插槽
- `/multi-instance` — 多实例 locale / appearance 隔离

## preset 同时决定打包体积

`preset` / `features` 关闭的能力**不会进入你的产物**：`basic` 默认关闭的能力在 capability registry 中
全部走动态 `import()`，对应的工具栏组件也是 `defineAsyncComponent`。

| 入口         | gzip 后 |
| ------------ | ------- |
| 主 chunk     | ~42 KB  |
| `style.css`  | ~18 KB  |
| `inline.css` | ~9 KB   |

table / video / math / outline / 查找替换 / 格式刷 / Office 粘贴 / AI / Notion 块 / 拖拽手柄 /
斜杠命令各自是独立 chunk，只有对应 gate 打开时才加载。

因此**用 `basic` 就真的只下载 `basic` 需要的代码**——这一点由 CI 的产物断言守着。
