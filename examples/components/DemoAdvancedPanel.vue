<template>
  <section class="demo-advanced">
    <h2 class="demo-advanced__title">高级接入（代码参考）</h2>
    <Collapse v-model:active-key="activeKeys" :bordered="false">
      <Collapse.Panel key="full-ext" header="Full：buildEditorExtensions">
        <pre class="demo-advanced__code">{{ SNIPPET_BUILD_EDITOR_EXTENSIONS }}</pre>
      </Collapse.Panel>
      <Collapse.Panel key="inline-ext" header="Inline：buildInlineExtensions">
        <pre class="demo-advanced__code">{{ SNIPPET_INLINE_EXTENSIONS }}</pre>
      </Collapse.Panel>
      <Collapse.Panel key="appearance" header="自定义外观：registerAppearance">
        <p class="demo-advanced__note">
          完整编辑器页选择 appearance「Custom」时会自动调用下方变量注册演示皮肤。
        </p>
        <pre class="demo-advanced__code">{{ SNIPPET_REGISTER_APPEARANCE }}</pre>
      </Collapse.Panel>
    </Collapse>
  </section>
</template>

<script setup lang="ts">
import { Collapse } from "ant-design-vue";
import { ref } from "vue";

import {
  SNIPPET_BUILD_EDITOR_EXTENSIONS,
  SNIPPET_INLINE_EXTENSIONS,
  SNIPPET_REGISTER_APPEARANCE,
} from "../config/demoAdvanced";

const activeKeys = ref<string[]>([]);
</script>
