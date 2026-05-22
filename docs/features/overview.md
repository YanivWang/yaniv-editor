# 功能总览

Full Editor 能力由 **preset 默认值** + **`features` 覆盖** 决定。详见 [功能对照表](./feature-matrix.md)。

## FeatureConfig 键

| 能力        | 键              |
| ----------- | --------------- |
| 图片        | `image`         |
| 视频        | `video`         |
| 表格        | `table`         |
| 公式        | `math`          |
| AI          | `ai`            |
| 格式刷      | `formatPainter` |
| 大纲        | `outline`       |
| 查找替换    | `searchReplace` |
| Office 粘贴 | `officePaste`   |
| 斜杠命令    | `slashCommand`  |
| 拖拽手柄    | `dragHandle`    |

```vue
<YanivEditor preset="full" :features="{ table: false, ai: true }" :ai-config="aiConfig" />
```

禁用某能力会移除扩展与对应 UI；**布局 chrome**（顶栏/底栏/浮动菜单）由 preset 决定，不在 `FeatureConfig` 内。

## 功能文档索引

| 分类   | 页面                                                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 基础   | [核心编辑](./core-editing.md)、[文本与排版](./text-formatting.md)                                                                                                                            |
| 媒体   | [媒体](./media.md)、[模板与图库](./templates-gallery.md)                                                                                                                                     |
| 文档   | [表格](./table.md)、[公式](./math.md)、[大纲](./outline.md)、[查找替换](./find-replace.md)、[格式刷](./format-painter.md)、[Office 粘贴](./office-paste.md)、[Word](./word-import-export.md) |
| 块编辑 | [块编辑](./block-editing.md)                                                                                                                                                                 |
| UI     | [上下文 UI](./contextual-ui.md)                                                                                                                                                              |
| 智能   | [AI 辅助](./ai.md)                                                                                                                                                                           |

Preset 默认矩阵见 [FeatureConfig API](../api/features-config.md)。
