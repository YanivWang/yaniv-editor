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

      <button class="demo-theme-toggle" :title="themeToggleTitle" @click="emit('toggleTheme')">
        {{ theme === "light" ? t("demo.theme.dark") : t("demo.theme.light") }}
      </button>

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

import type { ThemePreset } from "../../src/configs/editorConfig";
import type { MenuInfo } from "ant-design-vue/es/menu/src/interface";

const props = withDefaults(
  defineProps<{
    subtitleKey: string;
    theme: "light" | "dark";
    showLocaleSelect?: boolean;
    showThemePreset?: boolean;
    themePreset?: ThemePreset;
    locale?: LocaleCode;
  }>(),
  {
    showLocaleSelect: false,
    showThemePreset: false,
    themePreset: "word",
    locale: "zh-CN",
  },
);

const emit = defineEmits<{
  toggleTheme: [];
  "update:locale": [value: LocaleCode];
  "update:themePreset": [value: ThemePreset];
}>();

const themeToggleTitle = computed(() =>
  props.theme === "light" ? t("demo.theme.switchToDark") : t("demo.theme.switchToLight"),
);

const themePresetOptions = computed(() => [
  { value: "word" as const, label: t("demo.themePreset.word") },
  { value: "notion" as const, label: t("demo.themePreset.notion") },
  { value: "github" as const, label: t("demo.themePreset.github") },
  { value: "typora" as const, label: t("demo.themePreset.typora") },
]);

const localeOptions = computed(() => [
  { value: "en-US" as const, label: t("demo.locale.enUS") },
  { value: "zh-CN" as const, label: t("demo.locale.zhCN") },
  { value: "zh-TW" as const, label: t("demo.locale.zhTW") },
]);

const currentThemePresetLabel = computed(
  () => themePresetOptions.value.find((option) => option.value === props.themePreset)?.label ?? "",
);

const currentLocaleLabel = computed(
  () => localeOptions.value.find((option) => option.value === props.locale)?.label ?? "",
);

const handleThemePresetMenuClick = ({ key }: MenuInfo) => {
  emit("update:themePreset", key as ThemePreset);
};

const handleLocaleMenuClick = ({ key }: MenuInfo) => {
  emit("update:locale", key as LocaleCode);
};
</script>

<style scoped>
@import "../styles/example-shell.css";
</style>
