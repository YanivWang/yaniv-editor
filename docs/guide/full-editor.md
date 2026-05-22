# Full Editor 指南

Full Editor 有四个明确的配置维度：

- `mode` 控制运行状态。
- `preset` 控制功能方案。
- `appearance` 控制视觉皮肤。
- `colorMode` 控制浅色、深色或跟随系统。

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
```

## Preset

`basic` 面向常见写作场景，默认仅开启图片。文本格式和链接始终可用，保留固定页眉页脚，但不默认开启视频、表格、AI、Office 粘贴、公式、大纲、查找替换、格式刷、斜杠命令或拖拽手柄。

`full` 开启表格、视频、公式、Office 粘贴、大纲、查找替换和格式刷，保留固定页眉页脚、浮动菜单、上下文工具和快捷键提示。斜杠命令、拖拽手柄和 AI 默认不开启。

`notion` 开启块编辑（斜杠命令、拖拽手柄），以及视频、公式、大纲、查找替换、Office 粘贴和 AI（格式刷关闭）。隐藏固定顶部工具栏和页脚，依赖浮动/块级交互。

## 能力覆盖

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
<YanivEditor preset="full" :features="{ table: false }" />
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

preset 仍然生效，但被禁用的能力会移除对应扩展和相关 UI 入口。

`features` 不控制布局 chrome。页眉、页脚、浮动菜单和快捷键提示由 preset 的布局策略决定。

## 预览

```vue
<YanivEditor mode="preview" preset="basic" :initial-content="html" />
```

预览模式展示内容但不显示编辑 UI。链接、视频播放、滚动和文本选择仍然可用。
