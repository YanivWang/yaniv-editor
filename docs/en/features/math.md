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

## InputRule

Specific input patterns can shortcut formula insertion (defined inside the extension).

## Related

- [Block Editing](./block-editing.md)
