# Features Overview

Full Editor feature availability is selected by `preset` and then refined by `features`.

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
<YanivEditor preset="full" :features="{ table: false, officePaste: false }" />
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

Disabling a capability removes its extension and matching UI entry points. Preset-owned layout chrome, such as fixed header/footer or floating menu availability, is not part of `FeatureConfig`.

AI is disabled in all presets by default.

See [FeatureConfig](/api/features-config) for preset default ability tables.
