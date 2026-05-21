<template>
  <ToolbarButton
    :icon="ApartmentOutlined"
    :title="t('editor.outlineToggle')"
    :active="expanded"
    @click="toggle"
  />
</template>

<script setup lang="ts">
import { ApartmentOutlined } from "@ant-design/icons-vue";

import { ToolbarButton } from "@/components/base";
import { useEditorT } from "@/core/infra/useEditorLocale";

import { useOutlinePanel } from "./useOutlinePanel";

const t = useEditorT();

const { expanded, toggle } = useOutlinePanel();
</script>
