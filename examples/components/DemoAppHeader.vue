<template>
  <header class="demo-header">
    <div class="demo-header__content">
      <RouterLink class="demo-header__title" :to="{ name: 'full-editor' }">
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

      <a-dropdown v-if="showThemeMode" :trigger="['click']" placement="bottomLeft">
        <button type="button" class="demo-header-select">
          <span>{{ currentThemeModeLabel }}</span>
          <DownOutlined class="demo-header-select__arrow" />
        </button>
        <template #overlay>
          <a-menu :selected-keys="[themeMode]" @click="handleThemeModeMenuClick">
            <a-menu-item v-for="option in themeModeOptions" :key="option.value">
              {{ option.label }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <a-dropdown v-if="showThemePreset" :trigger="['click']" placement="bottomLeft">
        <button type="button" class="demo-header-select">
          <span>{{ currentThemePresetLabel }}</span>
          <DownOutlined class="demo-header-select__arrow" />
        </button>
        <template #overlay>
          <a-menu :selected-keys="[themePreset]" @click="handleThemePresetMenuClick">
            <a-menu-item v-for="option in themePresetOptions" :key="option.value">
              {{ option.label }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <a-dropdown v-if="showLocaleSelect" :trigger="['click']" placement="bottomLeft">
        <button type="button" class="demo-header-select">
          <span>{{ currentLocaleLabel }}</span>
          <DownOutlined class="demo-header-select__arrow" />
        </button>
        <template #overlay>
          <a-menu :selected-keys="[locale]" @click="handleLocaleMenuClick">
            <a-menu-item v-for="option in localeOptions" :key="option.value">
              {{ option.label }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { DownOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";
import { RouterLink } from "vue-router";

import { t, type LocaleCode } from "../../src/locales";

import type { ThemeMode, ThemePreset } from "../../src/configs/editorConfig";
import type { MenuInfo } from "ant-design-vue/es/menu/src/interface";

const props = withDefaults(
  defineProps<{
    subtitleKey: string;
    showLocaleSelect?: boolean;
    showThemePreset?: boolean;
    showThemeMode?: boolean;
    themePreset?: ThemePreset;
    themeMode?: ThemeMode;
    locale?: LocaleCode;
  }>(),
  {
    showLocaleSelect: false,
    showThemePreset: false,
    showThemeMode: false,
    themePreset: "default",
    themeMode: "light",
    locale: "zh-CN",
  },
);

const emit = defineEmits<{
  "update:locale": [value: LocaleCode];
  "update:themePreset": [value: ThemePreset];
  "update:themeMode": [value: ThemeMode];
}>();

const themePresetOptions = computed(() => [
  { value: "default" as const, label: t("demo.themePreset.default") },
  { value: "word" as const, label: t("demo.themePreset.word") },
  { value: "notion" as const, label: t("demo.themePreset.notion") },
  { value: "github" as const, label: t("demo.themePreset.github") },
  { value: "typora" as const, label: t("demo.themePreset.typora") },
  { value: "custom" as const, label: t("demo.themePreset.custom") },
]);

const themeModeOptions = computed(() => [
  { value: "light" as const, label: t("demo.themeMode.light") },
  { value: "dark" as const, label: t("demo.themeMode.dark") },
  { value: "auto" as const, label: t("demo.themeMode.auto") },
]);

const localeOptions = computed(() => [
  { value: "en-US" as const, label: t("demo.locale.enUS") },
  { value: "zh-CN" as const, label: t("demo.locale.zhCN") },
  { value: "zh-TW" as const, label: t("demo.locale.zhTW") },
]);

const currentThemePresetLabel = computed(
  () => themePresetOptions.value.find((option) => option.value === props.themePreset)?.label ?? "",
);

const currentThemeModeLabel = computed(
  () => themeModeOptions.value.find((option) => option.value === props.themeMode)?.label ?? "",
);

const currentLocaleLabel = computed(
  () => localeOptions.value.find((option) => option.value === props.locale)?.label ?? "",
);

const handleThemePresetMenuClick = ({ key }: MenuInfo) => {
  emit("update:themePreset", key as ThemePreset);
};

const handleThemeModeMenuClick = ({ key }: MenuInfo) => {
  emit("update:themeMode", key as ThemeMode);
};

const handleLocaleMenuClick = ({ key }: MenuInfo) => {
  emit("update:locale", key as LocaleCode);
};
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
