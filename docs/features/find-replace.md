# 查找替换

由 `features.searchReplace` 控制。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## 使用

面板（`FindReplaceDialog`）与 **Ctrl/Cmd+F 快捷键**都只依赖 `features.searchReplace`，挂在 `EditorEditChrome` 上，与顶栏是否显示无关。顶栏的 `FindReplaceButton` 只是额外的点击入口，按钮不渲染时快捷键依然可用。

| preset | 打开方式                   |
| ------ | -------------------------- |
| full   | 顶栏按钮 或 **Ctrl/Cmd+F** |
| notion | **Ctrl/Cmd+F**（无顶栏）   |

功能包括：大小写敏感、高亮匹配、上一个/下一个、单个替换、全部替换。

## 预览切换

切换到 `mode="preview"` 时，编辑 chrome 整体卸载（`showEditChrome=false`），面板与快捷键随之解绑。

`SearchReplace` 扩展会在退出编辑态时**自行清空**搜索词与命中集合（plugin `view.update` 检测 `view.editable` 由 true 变 false），因此不会有高亮装饰残留到 preview。清理责任归扩展自身，不依赖面板的关闭回调。

## 相关

- [Composables API](../api/composables.md) — `useFindReplaceHotkey`
