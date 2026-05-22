<template>
  <div class="demo-page demo-page--split">
    <DemoSidebar storage-key="yaniv-demo:sidebar:multi-instance">
      <DemoSubnav title="多实例隔离" :description="entry?.description" />
      <div class="demo-sidebar__body">
        <DemoMultiInstancePanel
          v-model:locale-a="localeA"
          v-model:locale-b="localeB"
          v-model:appearance-a="appearanceA"
          v-model:appearance-b="appearanceB"
          v-model:color-mode-a="colorModeA"
          v-model:color-mode-b="colorModeB"
          :probe-a="probeA"
          :probe-b="probeB"
        />
      </div>
    </DemoSidebar>

    <main class="demo-main demo-main--multi">
      <section class="demo-multi__column">
        <header class="demo-multi__label">编辑器 A</header>
        <div ref="hostARef" class="demo-multi__host yaniv-editor-host">
          <YanivEditor
            preset="basic"
            mode="edit"
            :locale="localeA"
            :appearance="appearanceA"
            :color-mode="colorModeA"
            :custom-appearance-vars="customVarsA"
            :initial-content="contentA"
            :features="{ table: false, video: false, ai: false }"
          />
        </div>
      </section>

      <section class="demo-multi__column">
        <header class="demo-multi__label">编辑器 B</header>
        <div ref="hostBRef" class="demo-multi__host yaniv-editor-host">
          <YanivEditor
            preset="basic"
            mode="edit"
            :locale="localeB"
            :appearance="appearanceB"
            :color-mode="colorModeB"
            :custom-appearance-vars="customVarsB"
            :initial-content="contentB"
            :features="{ table: false, video: false, ai: false }"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

import DemoMultiInstancePanel from "../components/DemoMultiInstancePanel.vue";
import DemoSidebar from "../components/DemoSidebar.vue";
import DemoSubnav from "../components/DemoSubnav.vue";
import { getDemoEntry } from "../config/demoCatalog";
import {
  MULTI_INSTANCE_CONTENT_EN,
  MULTI_INSTANCE_CONTENT_ZH,
  MULTI_INSTANCE_CUSTOM_VARS_A,
  MULTI_INSTANCE_CUSTOM_VARS_B,
} from "../config/demoMultiInstance";

import type { MultiInstanceProbe } from "../components/DemoMultiInstancePanel.vue";
import type { EditorAppearance, EditorColorMode } from "@yanivjs/yaniv-editor";

const entry = getDemoEntry("multi-instance");

const hostARef = ref<HTMLElement | null>(null);
const hostBRef = ref<HTMLElement | null>(null);

const localeA = ref<"zh-CN" | "en-US">("zh-CN");
const localeB = ref<"zh-CN" | "en-US">("en-US");
const appearanceA = ref<EditorAppearance>("custom");
const appearanceB = ref<EditorAppearance>("custom");
const colorModeA = ref<EditorColorMode>("light");
const colorModeB = ref<EditorColorMode>("dark");

const contentA = MULTI_INSTANCE_CONTENT_ZH;
const contentB = MULTI_INSTANCE_CONTENT_EN;

const customVarsA = computed(() =>
  appearanceA.value === "custom" ? MULTI_INSTANCE_CUSTOM_VARS_A : undefined,
);
const customVarsB = computed(() =>
  appearanceB.value === "custom" ? MULTI_INSTANCE_CUSTOM_VARS_B : undefined,
);

const probeA = ref<MultiInstanceProbe>({ colorMode: null, primary: null });
const probeB = ref<MultiInstanceProbe>({ colorMode: null, primary: null });

function readProbe(host: HTMLElement | null): MultiInstanceProbe {
  const root = host?.querySelector(".yaniv-editor");
  if (!root) return { colorMode: null, primary: null };
  const styles = getComputedStyle(root);
  return {
    colorMode: root.getAttribute("data-color-mode"),
    primary: styles.getPropertyValue("--ye-primary").trim() || null,
  };
}

function refreshProbes(): void {
  probeA.value = readProbe(hostARef.value);
  probeB.value = readProbe(hostBRef.value);
}

let probeTimer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  refreshProbes();
  probeTimer = setInterval(refreshProbes, 400);
});

onUnmounted(() => {
  if (probeTimer) clearInterval(probeTimer);
});

watch([localeA, localeB, appearanceA, appearanceB, colorModeA, colorModeB], () => {
  requestAnimationFrame(refreshProbes);
});
</script>

<style scoped>
.demo-main--multi {
  flex-direction: row;
  gap: 12px;
  padding: 12px;
}

.demo-multi__column {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.demo-multi__label {
  flex-shrink: 0;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.demo-multi__host {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.demo-multi__host :deep(.yaniv-editor) {
  height: 100%;
}
</style>
