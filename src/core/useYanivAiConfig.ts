import { computed, onBeforeUnmount, watch, type ComputedRef } from "vue";

import { setHostAiConfig } from "@/features/ai/config/hostConfig";

import { provideYanivAiShowSettings } from "./aiContext";

import type { YanivEditorProps } from "./editorTypes";

export function useYanivAiConfig(props: YanivEditorProps): {
  showAiSettings: ComputedRef<boolean>;
} {
  const showAiSettings = computed(() => {
    if (props.aiConfig) {
      return props.aiConfig.showSettings ?? false;
    }
    return true;
  });

  provideYanivAiShowSettings(showAiSettings);

  const syncHostConfig = () => {
    setHostAiConfig(props.aiConfig);
  };

  watch(() => props.aiConfig, syncHostConfig, { deep: true, immediate: true });

  onBeforeUnmount(() => {
    setHostAiConfig(null);
  });

  return { showAiSettings };
}
