# Math Formulas

Controlled by `features.math`, rendered with KaTeX.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
<YanivEditor preset="basic" :features="{ math: true }" />
```

The host must import KaTeX styles separately (peer dependency):

```ts
import "katex/dist/katex.min.css";
```

## Usage

- **full**: insert LaTeX formulas from the header
- **notion**: `/` → formula block
- Supports inline and block-level formulas
- Select a formula block to edit the LaTeX source

## InputRule and Shortcuts

Typing `$latex$` converts in place into an inline formula (`find: /\$([^$]+)\$$/` matches the text before the cursor — the line does not have to be empty). Block formulas are inserted from the header, the `/` menu, or a shortcut.

| Shortcut               | Command            |
| ---------------------- | ------------------ |
| `Ctrl/Cmd + M`         | `insertInlineMath` |
| `Ctrl/Cmd + Shift + M` | `insertBlockMath`  |

::: tip Lazy loaded
The `math` capability's `extensions` is `async` and `MathExtension` is loaded through a dynamic `import()`, so KaTeX-related code stays out of the initial chunk when `features.math` is off.
:::

## Related

- [Block Editing](./block-editing.md)
