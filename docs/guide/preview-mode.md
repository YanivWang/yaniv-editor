# 预览模式

`mode="preview"` 是内容展示态，不是特殊分支架构。

```vue
<YanivEditor mode="preview" preset="basic" :initial-content="html" />
<YanivInlineEditor :content="html" mode="preview" />
```

## 行为

| 项                | preview 行为        |
| ----------------- | ------------------- |
| 内容编辑          | ❌ `editable=false` |
| 顶栏 / 底栏       | ❌ 隐藏             |
| 浮动菜单 / 块菜单 | ❌ 隐藏             |
| 上下文编辑条      | ❌ 隐藏             |
| 链接              | ✅ 可点击           |
| 视频              | ✅ 可播放           |
| 滚动 / 选中       | ✅ 正常             |

## 实现要点

- `chromePolicy.showEditChrome=false`；编辑 chrome（顶栏、底栏、上下文条、块菜单）整体 `v-if` 卸载
- 扩展注册集合**不因** phase 变化；interaction 扩展通过 `isEditable` 守卫 + 事务过滤器拦截
- `applyPhaseTransition` 的顺序是「edit → preview：先 emit 再 `setEditable(false)`；preview → edit：先 `setEditable(true)` 再 emit」，保证订阅方的清理命令在 `editable=true` 时刻执行

::: tip 当前只有一个 phase 订阅方
`EditorShell` 订阅 `onPhaseChange`，切到 preview 时只做 `blockMenuHost.hide()`。格式刷、查找替换等**没有**注册 phase 清理回调——它们的状态复位依赖对应按钮组件随顶栏一起卸载。详见 [格式刷](../features/format-painter.md#预览切换) 与 [查找替换](../features/find-replace.md#预览切换)。
:::

## CSS 选择器

根节点绑定 `data-phase="preview"`（已移除旧 `.is-preview` class）：

```css
.yaniv-editor[data-phase="preview"] .my-overlay {
  display: none;
}
```

## 相关

- [上下文 UI](../features/contextual-ui.md)
- [架构设计 — Phase 切换](../contributing/architecture.md#phase-切换)
