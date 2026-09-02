# 块编辑

Notion 风格块编辑由 `slashCommand` 和 `dragHandle` 能力驱动，**`notion` preset 默认开启**。

```vue
<YanivEditor preset="notion" appearance="notion" />
```

也可在其它 preset 上显式开启：

```vue
<YanivEditor preset="full" :features="{ slashCommand: true, dragHandle: true }" />
```

## 斜杠命令 `/`

在块的**行首**输入 `/` 弹出块类型菜单，支持搜索过滤。

判定条件是「光标之前的块内文本恰好是 `/` + 若干非空白字符」，因此光标之后已有内容也能触发，并不要求整行为空；删掉 `/`、把光标移出该范围或形成非折叠选区都会自动关闭菜单。

### 基础块

段落、标题 H1–H3

### 列表

有序列表、无序列表、任务列表

### Notion 块

| 块类型            | 说明          | 快捷          |
| ----------------- | ------------- | ------------- |
| 标注 Callout      | 提示框块      | 行首输入 `> ` |
| 折叠列表 Toggle   | 可展开/收起   | `/` 选择      |
| 分栏 ColumnLayout | 双列布局      | `/` 选择      |
| 嵌入 Embed        | 外链书签卡片  | `/` 选择      |
| 提及 Mention      | `@` 用户/实体 | 输入 `@`      |

### 高级块

引用、代码块、表格、图片、视频、公式、分割线

块菜单按 gate 与 schema 过滤（例如无 `table` gate 时不显示表格项）。

### 提及候选数据

`@` 菜单与块菜单「页面链接」的候选项来自 `mentionItems` prop；未传时用内置占位数据
（首页 / 文档 / 路线图 / 我）。见 [集成 Props](../guide/integration-props.md)。

## 拖拽手柄

段落左侧 **六点图标**：

- 点击打开插入/操作菜单
- 拖拽块 reorder

## Markdown 输入规则

`NotionMarkdownInput` 由 `notionBlocks` capability 注册，其 `featureKey` 是 **`slashCommand`** —— 也就是说开了 `slashCommand` 就有这些规则，不限于 `notion` preset：

| 输入           | 结果                                               |
| -------------- | -------------------------------------------------- |
| `[] ` / `[x] ` | 任务列表（方括号后需一个空格，`[x]` 大小写不敏感） |
| `> `           | 标注块 Callout（schema 无 callout 时退化为引用块） |
| `---`          | 分割线（无需空格）                                 |

StarterKit 自带的 `#`、`- `、`1. `、` ``` ` 等规则在所有 preset 下都可用，不受此 gate 影响。

## 行首 `+` 按钮

段落左侧的 `+`（`drag-handle-plus`）由 **dragHandle 能力**提供，点击打开插入菜单。它和「浮动文本菜单」是两个不同的东西：

| UI                        | 由谁提供                       | 触发条件                             |
| ------------------------- | ------------------------------ | ------------------------------------ |
| 行首 `+` / 六点手柄       | `dragHandle` gate              | 鼠标悬停到块上                       |
| 浮动文本菜单 FloatingMenu | preset layout（full / notion） | **存在非空文本选区**，空行光标不触发 |

详见 [上下文 UI](./contextual-ui.md)。

## 预览模式

preview 下块菜单与拖拽交互被禁用（`chromePolicy.showBlockPicker=false` + `isEditable` 守卫）。

## 相关

- [功能对照表](./feature-matrix.md)
- [上下文 UI](./contextual-ui.md)
