# 大纲目录

由 `features.outline` 控制，基于 UniqueID + TableOfContents。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## 使用

面板只取决于 `features.outline` 是否开启，与顶栏无关。

| preset | 入口                         | 行为                                      |
| ------ | ---------------------------- | ----------------------------------------- |
| full   | 顶栏大纲开关 + rail 展开把手 | 右侧/顶部大纲面板，点击跳转标题；默认收起 |
| notion | rail 展开把手（无顶栏）      | 同上                                      |

面板收起时，大纲 rail 的锚点位置会渲染一个展开把手（`.outline-rail__handle`）。顶栏的 `OutlineToggleButton` 只是 full preset 的额外便捷入口，隐藏顶栏的 preset 依然可以从把手展开。

初始展开可通过 `:default-outline-expanded="true"` 控制（不触发 session rebuild）。

大纲展开状态（`outlinePanel.expanded`）是用户 UI 状态，**不属于** `chromePolicy`，与 preset 推导解耦。

## 预览模式

`mode="preview"` 下大纲容器不渲染（`showOutlineRail=false`）。

## 技术说明

面板的滚动同步由 `OutlinePanel` 自己完成：`EditorWorkspace` 通过 `:scroll-parent` prop 把 `.document-container` 传进来，面板监听它的 `scroll` 事件更新高亮，并用 `scrollToOutlineHeading` 实现点击跳转。标题列表本身来自 `TableOfContents` 扩展的 storage。

扩展侧的滚动容器则走 late-binding：`EditorWorkspace` mount 后调用 `editor.commands.bindOutlineScrollParent(el)`，该 command 由 `createOutlineScrollParentBinder` 提供，把容器写回 `BuildExtensionsCtx.outline`（实例作用域），registry 的 `TableOfContents.scrollParent` getter 再从那里读取；未绑定前回退 `window`。

## 相关

- [上下文 UI](./contextual-ui.md)
