<template>
  <header class="demo-header">
    <div class="demo-header__content">
      <RouterLink class="demo-header__title" :to="{ name: 'home' }">
        <span class="demo-header__icon">Y</span>
        {{ t("demo.appTitle") }}
      </RouterLink>
      <p class="demo-header__subtitle">{{ t(subtitleKey) }}</p>
    </div>

    <div class="demo-header__actions">
      <nav class="demo-mode-switcher" :aria-label="t('demo.navAriaLabel')">
        <RouterLink class="demo-mode-btn" :to="{ name: 'full-editor' }">
          {{ t("demo.nav.fullEditor") }}
        </RouterLink>
        <RouterLink class="demo-mode-btn" :to="{ name: 'inline-plugins' }">
          {{ t("demo.nav.inlinePlugins") }}
        </RouterLink>
      </nav>

      <DeviceSwitcher
        v-if="showDeviceSwitcher"
        :model-value="deviceView"
        :orientation="deviceOrientation"
        :labels="deviceLabels"
        @update:model-value="emit('update:deviceView', $event)"
        @update:orientation="emit('update:deviceOrientation', $event)"
        @change="emit('deviceChange', $event)"
        @orientation-change="emit('orientationChange', $event)"
      />

      <button class="demo-theme-toggle" :title="themeToggleTitle" @click="emit('toggleTheme')">
        {{ theme === "light" ? t("demo.theme.dark") : t("demo.theme.light") }}
      </button>

      <select
        v-if="showThemePreset"
        :value="themePreset"
        class="demo-theme-select"
        @change="handleThemePresetChange"
      >
        <option value="word">{{ t("demo.themePreset.word") }}</option>
        <option value="notion">{{ t("demo.themePreset.notion") }}</option>
        <option value="github">{{ t("demo.themePreset.github") }}</option>
        <option value="typora">{{ t("demo.themePreset.typora") }}</option>
      </select>

      <select
        v-if="showLocaleSelect"
        :value="locale"
        class="demo-locale-select"
        @change="handleLocaleChange"
      >
        <option value="en-US">{{ t("demo.locale.enUS") }}</option>
        <option value="zh-CN">{{ t("demo.locale.zhCN") }}</option>
        <option value="zh-TW">{{ t("demo.locale.zhTW") }}</option>
      </select>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import {
  DeviceSwitcher,
  type DeviceView,
  type Orientation,
} from "../../src/components/tools/device-switcher";
import { t, type LocaleCode } from "../../src/locales";

import type { ThemePreset } from "../../src/configs/editorConfig";

const props = withDefaults(
  defineProps<{
    subtitleKey: string;
    theme: "light" | "dark";
    showLocaleSelect?: boolean;
    showDeviceSwitcher?: boolean;
    showThemePreset?: boolean;
    themePreset?: ThemePreset;
    locale?: LocaleCode;
    deviceView?: DeviceView;
    deviceOrientation?: Orientation;
  }>(),
  {
    showLocaleSelect: false,
    showDeviceSwitcher: false,
    showThemePreset: false,
    themePreset: "word",
    locale: "zh-CN",
    deviceView: "pc",
    deviceOrientation: "portrait",
  },
);

const emit = defineEmits<{
  toggleTheme: [];
  "update:locale": [value: LocaleCode];
  "update:themePreset": [value: ThemePreset];
  "update:deviceView": [value: DeviceView];
  "update:deviceOrientation": [value: Orientation];
  deviceChange: [value: DeviceView];
  orientationChange: [value: Orientation];
}>();

const deviceLabels = computed(() => ({
  pc: t("demo.device.desktop"),
  pad: t("demo.device.tablet"),
  mobile: t("demo.device.mobile"),
}));

const themeToggleTitle = computed(() =>
  props.theme === "light" ? t("demo.theme.switchToDark") : t("demo.theme.switchToLight"),
);

const handleThemePresetChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:themePreset", target.value as ThemePreset);
};

const handleLocaleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit("update:locale", target.value as LocaleCode);
};
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
