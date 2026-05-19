# 功能总览

本文档列出 Yaniv Editor 当前已实现的能力、版本差异，以及需要业务层自行接入的部分。

## 能力矩阵

### 文本与排版

| 能力                                     | basic | advanced | 扩展门控                         |
| ---------------------------------------- | :---: | :------: | -------------------------------- |
| 标题 H1–H6                               |  ✅   |    ✅    | StarterKit                       |
| 粗体 / 斜体 / 下划线 / 删除线 / 行内代码 |  ✅   |    ✅    | StarterKit + Underline           |
| 字体 / 字号 / 行距                       |   —   |    ✅    | FontFamily, FontSize, LineHeight |
| 文字颜色 / 背景高亮                      |  ✅   |    ✅    | Color, Highlight                 |
| 对齐（左/中/右/两端）                    |  ✅   |    ✅    | TextAlign                        |
| 上标 / 下标                              |   —   |    ✅    | Subscript, Superscript           |
| 有序 / 无序 / 任务列表                   |  ✅   |    ✅    | TaskList, TaskItem               |
| 撤销 / 重做                              |  ✅   |    ✅    | StarterKit History               |
| 格式刷                                   |   —   |    ✅    | `features.formatPainter`         |
| 清除格式                                 |   —   |    ✅    | 工具栏                           |
| 查找替换                                 |   —   |    ✅    | `features.searchReplace`         |
| 占位符                                   |  ✅   |    ✅    | Placeholder                      |

### 插入与媒体

| 能力                  | basic | advanced | 说明                       |
| --------------------- | :---: | :------: | -------------------------- |
| 链接                  |   —   |    ✅    | Link + 可选 linkBubbleMenu |
| 表格                  |   —   |    ✅    | `features.table`           |
| 图片（上传/URL/缩放） |  ✅   |    ✅    | `features.image`           |
| 视频                  |   —   |    ✅    | 与 image 同门控            |
| 代码块                |   —   |    ✅    | CodeBlockLowlight 语法高亮 |
| 数学公式              |  ✅   |    ✅    | `features.math`            |
| 分隔线                |  ✅   |    ✅    | StarterKit HorizontalRule  |
| 引用块                |  ✅   |    ✅    | StarterKit Blockquote      |

### 编辑体验

| 能力                | 默认        | 开启方式                            |
| ------------------- | ----------- | ----------------------------------- |
| 顶部工具栏          | 关          | `features.headerNav: true`          |
| 底部缩放/字数       | 关          | `features.footerNav: true`          |
| 浮动格式化菜单      | 关          | `features.floatingMenu: true`       |
| 斜杠命令 `/`        | 关          | `features.slashCommand: true`       |
| 链接气泡菜单        | 关          | `features.linkBubbleMenu: true`     |
| 表格工具栏          | 关          | `features.tableToolbar: true`       |
| 图片工具栏          | 关          | 随 image 扩展 + Demo 配置           |
| 块拖拽排序          | 开          | `features.dragHandle !== false`     |
| Office/WPS 粘贴增强 | 开          | `features.officePaste !== false`    |
| 标题大纲/锚点       | advanced 开 | `features.outline`                  |
| 分页视图            | 开          | Word 模式 CSS + useEditorPagination |

### 文档与 AI

| 能力                  | advanced | 说明                      |
| --------------------- | :------: | ------------------------- |
| Word 导入/导出        |    ✅    | 工具栏 WordButton         |
| 模板插入              |    ✅    | TemplateButton            |
| 图库                  |    ✅    | GalleryButton             |
| AI 续写               |    ✅    | 需配置 API，`features.ai` |
| AI 润色 / 摘要 / 翻译 |    ✅    | 同上                      |
| 自定义 AI 指令        |    ✅    | CustomAiExtension         |

### 未实现 / 需自行扩展

| 能力                | 状态                       |
| ------------------- | -------------------------- |
| 多人实时协作        | ❌ 未内置                  |
| @提及               | ❌ 类型预留，无扩展实现    |
| 评论 / 批注         | ❌                         |
| 版本历史 / 自动保存 | ❌ UI 文案存在，无内置逻辑 |
| Markdown 双向编辑   | ❌ Typora 仅为视觉主题     |
| 内容持久化 API      | ❌ 业务层实现              |

## 适用场景评估

| 场景                | 是否满足            |
| ------------------- | ------------------- |
| CMS / 博客 / 知识库 | ✅                  |
| 内网单人文档        | ✅（需自建保存）    |
| 评论 / 聊天         | ⚠️ 建议 Inline 模式 |
| Google Docs 式协作  | ❌                  |
| Markdown 优先工作流 | ❌                  |

## 预设 editorPresets

| 名称         | 用途                              |
| ------------ | --------------------------------- |
| `production` | 生产推荐（完整工具栏 + 常用模块） |
| `full`       | 同 `production`                   |
| `basic`      | 基础档位 + 顶栏                   |
| `minimal`    | 基础档位，无顶栏                  |
| `notion`     | Notion 风格（浮动菜单，无顶栏）   |

```vue
<script setup>
import { editorPresets } from "@yanivjs/yaniv-editor";
</script>

<template>
  <YanivEditor v-bind="editorPresets.production" />
</template>
```

详见 [功能配置 — editorPresets](/api/features-config#editorpresets-推荐)。

## 详细文档

- [功能缺口与半成品](/features/incomplete-features)
- [文本与排版](/features/text-formatting)
- [媒体](/features/media)
- [表格](/features/table)
- [AI 辅助](/features/ai)
- [Word 导入导出](/features/word-import-export)
