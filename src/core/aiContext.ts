import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue";

const YANIV_AI_SHOW_SETTINGS_KEY: InjectionKey<ComputedRef<boolean>> =
  Symbol("yanivAiShowSettings");

export function provideYanivAiShowSettings(showSettings: ComputedRef<boolean>): void {
  provide(YANIV_AI_SHOW_SETTINGS_KEY, showSettings);
}

export function useYanivAiShowSettings(): ComputedRef<boolean> {
  return inject(
    YANIV_AI_SHOW_SETTINGS_KEY,
    computed(() => true),
  );
}
