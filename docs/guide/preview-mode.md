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

- `chromePolicy.showEditChrome=false`
- 扩展注册集合**不因** phase 变化；interaction 扩展通过 `isEditable` 守卫 + 事务过滤器拦截
- 切到 preview 前先 emit phase 事件清理格式刷、查找等状态，再 `setEditable(false)`

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
