<template>
  <div class="demo-hints">
    <Collapse v-model:active-key="activeKeys" :bordered="false">
      <Collapse.Panel
        v-for="section in sections"
        :key="section.group"
        :header="`${section.group}（${section.items.length}）`"
      >
        <ul class="demo-hints__list">
          <li v-for="item in section.items" :key="item.id" class="demo-hints__item">
            <span class="demo-hints__label">{{ item.label }}</span>
            <span class="demo-hints__text">{{ item.hint }}</span>
          </li>
        </ul>
      </Collapse.Panel>
    </Collapse>
  </div>
</template>

<script setup lang="ts">
import { Collapse } from "ant-design-vue";
import { computed, ref, watch } from "vue";

import type { EditorPreset } from "@/core/editorTypes";

import { getHintGroupsForPreset, type FeatureHintGroup } from "../config/demoFullEditor";

const props = defineProps<{
  preset: EditorPreset;
}>();

const sections = computed(() => getHintGroupsForPreset(props.preset));

const defaultOpenGroups = (): FeatureHintGroup[] => {
  const groups: FeatureHintGroup[] = ["块编辑", "智能", "集成"];
  if (props.preset === "full") groups.unshift("文档");
  return groups.filter((g) => sections.value.some((s) => s.group === g));
};

const activeKeys = ref<string[]>(defaultOpenGroups().map(String));

watch(
  () => props.preset,
  () => {
    activeKeys.value = defaultOpenGroups().map(String);
  },
);
</script>
