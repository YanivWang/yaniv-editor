<template>
  <ToolbarButton
    :icon="ApartmentOutlined"
    :title="t('editor.outlineToggle')"
    :active="visible"
    @click="toggle"
  />
</template>

<script setup lang="ts">
import { ApartmentOutlined } from "@ant-design/icons-vue";

import { ToolbarButton } from "@/base";
import { t } from "@/locales";

import { useOutlinePanel } from "./useOutlinePanel";

const { visible, toggle } = useOutlinePanel();
</script>
