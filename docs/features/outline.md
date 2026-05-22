# 大纲目录

由 `features.outline` 控制，基于 UniqueID + TableOfContents。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## 使用

| preset | 入口           | 行为                            |
| ------ | -------------- | ------------------------------- |
| full   | 顶栏大纲开关   | 右侧/顶部大纲面板，点击跳转标题 |
| notion | 工作区左侧大纲 | 无顶栏按钮，面板默认可展开      |

大纲展开状态（`outlinePanel.expanded`）是用户 UI 状态，**不属于** `chromePolicy`，与 preset 推导解耦。

## 预览模式

`mode="preview"` 下大纲容器不渲染（`showOutlineRail=false`）。

## 技术说明

滚动容器在 `EditorWorkspace` mount 后通过 `bindOutlineScrollParent` 注入，避免扩展初始化时 DOM 未就绪。

## 相关

- [上下文 UI](./contextual-ui.md)
