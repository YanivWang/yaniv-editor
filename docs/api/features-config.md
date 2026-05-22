# FeatureConfig

`FeatureConfig` 是 `YanivEditor` 的能力覆盖层。

```ts
interface FeatureConfig {
  image?: boolean;
  video?: boolean;
  table?: boolean;
  math?: boolean;
  ai?: boolean;
  formatPainter?: boolean;
  outline?: boolean;
  searchReplace?: boolean;
  officePaste?: boolean;
  slashCommand?: boolean;
  dragHandle?: boolean;
}
```

## 解析规则

Full Editor 用一条固定规则解析能力：

```ts
import { resolveEditorProfile } from "@yanivjs/yaniv-editor";

const { features: resolvedFeatures } = resolveEditorProfile({
  preset,
  features: props.features,
});
```

内部使用 `mergeFeatures`。只有显式设置的键会覆盖 preset 默认值；`undefined` 不会替换 preset 默认。显式 `false` 可以关闭 preset 已开启的能力。

```vue
<YanivEditor preset="full" :features="{ ai: false, math: false }" />
```

关闭某能力会移除其扩展注册和所有匹配的交互入口。

## Preset 默认值

Preset 默认能力来自 `resolveEditorProfile`。工具栏按钮会再次按 active gates 过滤。

| Preset   | 默认能力                                                                                  | 布局策略                      |
| -------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| `basic`  | 图片                                                                                      | 固定页眉页脚，无浮动菜单      |
| `full`   | 图片、视频、表格、公式、格式刷、大纲、查找替换、Office 粘贴                               | 固定页眉页脚，浮动菜单        |
| `notion` | 图片、视频、表格、公式、AI、大纲、查找替换、Office 粘贴、斜杠命令、拖拽手柄（不含格式刷） | 无固定页眉页脚，浮动/块级交互 |

`full` 和 `basic` 默认关闭 AI，需显式开启：

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

`notion` 默认开启 AI，仍需传入 `:ai-config`（或 env demo 模式）才能调用 provider。

`basic` 不再默认开启表格和视频。恢复旧行为：

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

`preset` 拥有布局策略。`features` 只覆盖能力，无法重新开启页眉、页脚、浮动菜单或快捷键提示等公共布局开关。
