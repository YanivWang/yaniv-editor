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
- 选中公式块可编辑 LaTeX 源码

## InputRule

空行输入 `$...$` 可快捷插入行内公式；块级公式通过顶栏或 `/` 菜单插入。

## 相关

- [块编辑](./block-editing.md)
