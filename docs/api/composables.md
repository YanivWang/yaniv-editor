# Composables

包入口导出的横切能力 composables 与工具函数。

## useFindReplaceHotkey

绑定查找替换快捷键（默认 `Mod-f`）。

```ts
import { useFindReplaceHotkey } from "yaniv-editor";

useFindReplaceHotkey({
  enabled: true,
  onOpen: () => {
    // 打开查找替换面板
  },
});
```

`FindReplaceButton` 内部已集成；自定义 UI 时可单独使用。

### 类型

```ts
interface UseFindReplaceHotkeyOptions {
  enabled?: boolean;
  onOpen?: () => void;
}
```

## scrollEditorSelectionIntoView

将当前选区滚动到可视区域。

```ts
import { scrollEditorSelectionIntoView } from "yaniv-editor";

scrollEditorSelectionIntoView(editor, { block: "nearest" });
```

适用于自定义弹层、AI 建议面板等场景。

## useAiConfig

AI 用户配置管理（localStorage）。

```ts
import { useAiConfig } from "yaniv-editor";

const { config, saveConfig, clearConfig, testConnection, isConfigured } = useAiConfig();
```

详见 [AI 辅助](/features/ai)。

## createI18n / useI18n

```ts
import { createI18n, useI18n, t } from "yaniv-editor";

createI18n({ locale: "zh-CN", fallbackLocale: "en-US" });

const i18n = useI18n();
i18n.setLocale("en-US");

const label = t("editor.bold");
```

`TiptapProEditor` 会根据 `locale` prop 自动初始化 i18n。

## 主题 API

```ts
import {
  setTheme,
  getTheme,
  toggleThemeMode,
  registerTheme,
  setDeviceView,
  setOrientation,
} from "yaniv-editor";
```

详见 [主题与样式](/guide/theming)。

## resolveExtensionGates

见 [功能配置](/api/features-config#resolveextensiongates)。

## 完整导出列表

参见 `src/index.ts` 与 `src/composables/index.ts`。
