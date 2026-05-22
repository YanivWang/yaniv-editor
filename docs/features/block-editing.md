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

空行输入 `/` 弹出块类型菜单，支持搜索过滤。

### 基础块

段落、标题 H1–H3

### 列表

有序列表、无序列表、任务列表

### Notion 块

| 块类型            | 说明          | 快捷          |
| ----------------- | ------------- | ------------- |
| 标注 Callout      | 提示框块      | 空行输入 `> ` |
| 折叠列表 Toggle   | 可展开/收起   | `/` 选择      |
| 分栏 ColumnLayout | 双列布局      | `/` 选择      |
| 嵌入 Embed        | 外链书签卡片  | `/` 选择      |
| 提及 Mention      | `@` 用户/实体 | 输入 `@`      |

### 高级块

引用、代码块、表格、图片、视频、公式、分割线

块菜单按 gate 与 schema 过滤（例如无 `table` gate 时不显示表格项）。

## 拖拽手柄

段落左侧 **六点图标**：

- 点击打开插入/操作菜单
- 拖拽块 reorder

## Markdown 输入规则

`notion` 方案下支持部分 Markdown 快捷输入：

- `[]` / `[x]` → 任务列表
- `>` → 标注块
- `---` → 分割线

## 行首悬浮菜单

`full` 与 `notion` 在空行行首显示 `+` 或格式按钮，与块菜单互补。

## 预览模式

preview 下块菜单与拖拽交互被禁用（`chromePolicy.showBlockPicker=false` + `isEditable` 守卫）。

## 相关

- [功能对照表](./feature-matrix.md)
- [上下文 UI](./contextual-ui.md)
