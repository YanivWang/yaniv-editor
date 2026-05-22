# Features Overview

Full Editor capabilities are determined by **preset defaults** + **`features` overrides**. See [Feature Matrix](./feature-matrix.md) for details.

## FeatureConfig Keys

| Capability       | Key             |
| ---------------- | --------------- |
| Image            | `image`         |
| Video            | `video`         |
| Table            | `table`         |
| Math             | `math`          |
| AI               | `ai`            |
| Format painter   | `formatPainter` |
| Outline          | `outline`       |
| Find and replace | `searchReplace` |
| Office paste     | `officePaste`   |
| Slash command    | `slashCommand`  |
| Drag handle      | `dragHandle`    |

```vue
<YanivEditor preset="full" :features="{ table: false, ai: true }" :ai-config="aiConfig" />
```

Disabling a capability removes its extension and matching UI. **Layout chrome** (header/footer/floating menu) is determined by preset and is not part of `FeatureConfig`.

## Feature Documentation Index

| Category      | Pages                                                                                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basics        | [Core Editing](./core-editing.md), [Text Formatting](./text-formatting.md)                                                                                                                                        |
| Media         | [Media](./media.md), [Templates and Gallery](./templates-gallery.md)                                                                                                                                              |
| Document      | [Table](./table.md), [Math](./math.md), [Outline](./outline.md), [Find and Replace](./find-replace.md), [Format Painter](./format-painter.md), [Office Paste](./office-paste.md), [Word](./word-import-export.md) |
| Block editing | [Block Editing](./block-editing.md)                                                                                                                                                                               |
| UI            | [Contextual UI](./contextual-ui.md)                                                                                                                                                                               |
| AI            | [AI Assistance](./ai.md)                                                                                                                                                                                          |

Preset default matrix: [FeatureConfig API](../api/features-config.md).
