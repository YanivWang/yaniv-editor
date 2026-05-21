import {
  computed,
  onBeforeUnmount,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
} from "vue";

import { setHostAiConfig } from "@/features/ai/config/hostConfig";

import { provideYanivAiShowSettings } from "./aiContext";

import type { YanivEditorProps } from "./editorTypes";

export function useYanivAiConfig(propsSource: MaybeRefOrGetter<YanivEditorProps | undefined>): {
  showAiSettings: ComputedRef<boolean>;
} {
  const props = computed(() => toValue(propsSource));

  const showAiSettings = computed(() => {
    if (props.value?.aiConfig) {
      return props.value.aiConfig.showSettings ?? false;
    }
    return true;
  });

  provideYanivAiShowSettings(showAiSettings);

  watch(
    () => props.value?.aiConfig,
    () => setHostAiConfig(props.value?.aiConfig),
    { deep: true, immediate: true },
  );

  onBeforeUnmount(() => {
    setHostAiConfig(null);
  });

  return { showAiSettings };
}
