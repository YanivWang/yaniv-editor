# 查找替换

由 `features.searchReplace` 控制。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## 使用

| preset | 打开方式                     |
| ------ | ---------------------------- |
| full   | 顶栏按钮 或 **Ctrl/Cmd+F**   |
| notion | **Ctrl/Cmd+F**（无顶栏按钮） |

功能包括：大小写敏感、高亮匹配、上一个/下一个、全部替换。

## 预览切换

切换到 `mode="preview"` 时，查找状态会被清理（phase 切换 emit 后执行 `clearSearch`）。

## 相关

- [Composables API](../api/composables.md) — `useFindReplaceHotkey`
