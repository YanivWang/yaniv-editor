# 数学公式

由 `features.math` 控制，基于 KaTeX 渲染。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
<YanivEditor preset="basic" :features="{ math: true }" />
```

宿主需自行引入 KaTeX 样式（peer dependency）：

```ts
import "katex/dist/katex.min.css";
```

## 使用

- **full**：顶栏插入 LaTeX 公式
- **notion**：`/` → 公式块
- 支持行内与块级公式
- 双击公式进入 LaTeX 源码编辑（单击仅选中节点）；`Ctrl/Cmd + Enter` 保存，`Esc` 取消

## InputRule 与快捷键

输入 `$latex$` 即可就地转成行内公式（`find: /\$([^$]+)\$$/`，匹配光标前的文本，不要求整行为空）。块级公式通过顶栏、`/` 菜单或快捷键插入。

| 快捷键                 | 命令               |
| ---------------------- | ------------------ |
| `Ctrl/Cmd + M`         | `insertInlineMath` |
| `Ctrl/Cmd + Shift + M` | `insertBlockMath`  |

::: tip 按需加载
`math` capability 的 `extensions` 是 `async`，`MathExtension` 通过动态 `import()` 懒加载；未开启 `features.math` 时 KaTeX 相关代码不会进入首屏 chunk。
:::

## 相关

- [块编辑](./block-editing.md)
