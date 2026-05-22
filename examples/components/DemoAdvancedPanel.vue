<template>
  <section class="demo-advanced">
    <h2 class="demo-advanced__title">高级接入（代码参考）</h2>
    <Collapse v-model:active-key="activeKeys" :bordered="false">
      <Collapse.Panel key="full-ext" header="Full：buildExtensions">
        <pre class="demo-advanced__code">{{ SNIPPET_BUILD_EDITOR_EXTENSIONS }}</pre>
      </Collapse.Panel>
      <Collapse.Panel key="inline-ext" header="Inline：buildExtensions + resolveInlineGates">
        <pre class="demo-advanced__code">{{ SNIPPET_INLINE_EXTENSIONS }}</pre>
      </Collapse.Panel>
      <Collapse.Panel key="inline-compose" header="Inline：#toolbar 插槽拼装">
        <p class="demo-advanced__note">
          推荐接入方式：用 YanivInlineEditor 插槽自定义工具栏，扩展仍由 toolbar 配置驱动。
        </p>
        <pre class="demo-advanced__code">{{ SNIPPET_INLINE_COMPOSE }}</pre>
      </Collapse.Panel>
      <Collapse.Panel key="appearance" header="自定义外观：custom-appearance-vars">
        <p class="demo-advanced__note">
          完整编辑器页选择 appearance「Custom」时会通过 props 注入演示 CSS 变量。
        </p>
        <pre class="demo-advanced__code">{{ SNIPPET_CUSTOM_APPEARANCE }}</pre>
      </Collapse.Panel>
    </Collapse>
  </section>
</template>

<script setup lang="ts">
import { Collapse } from "ant-design-vue";
import { ref } from "vue";

import {
  SNIPPET_BUILD_EDITOR_EXTENSIONS,
  SNIPPET_INLINE_COMPOSE,
  SNIPPET_INLINE_EXTENSIONS,
  SNIPPET_CUSTOM_APPEARANCE,
} from "../config/demoAdvanced";

const activeKeys = ref<string[]>([]);
</script>
