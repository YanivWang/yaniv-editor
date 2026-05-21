<template>
  <div class="demo-integration">
    <div class="demo-integration__head">
      <span class="demo-integration__title">集成方 API</span>
      <span class="demo-integration__sub">对应 YanivEditor props，可随时开关对比默认行为</span>
    </div>
    <div class="demo-integration__switches">
      <label class="demo-integration__item">
        <Switch v-model:checked="flags.customUpload" size="small" />
        <span class="demo-integration__label">uploadImage / uploadVideo</span>
      </label>
      <label class="demo-integration__item">
        <Switch v-model:checked="flags.galleryImages" size="small" />
        <span class="demo-integration__label">galleryImages</span>
      </label>
      <label class="demo-integration__item">
        <Switch v-model:checked="flags.customTemplates" size="small" />
        <span class="demo-integration__label">customTemplates</span>
      </label>
      <label class="demo-integration__item">
        <Switch v-model:checked="flags.aiConfig" size="small" />
        <span class="demo-integration__label">ai-config</span>
      </label>
    </div>
    <ul class="demo-integration__hints">
      <li v-if="flags.customUpload">
        上传图片/视频：模拟约 400–600ms 延迟后返回 <code>Object URL</code>（非默认 DataURL 直读）。
        <span v-if="uploadStatus" class="demo-integration__status">{{ uploadStatus }}</span>
      </li>
      <li v-if="flags.galleryImages">图库按钮展示 3 张外部 SVG 演示图，不依赖文档内已插入图片。</li>
      <li v-if="flags.customTemplates">
        模板列表末尾追加「产品简报（演示）」；需 <code>preset="full"</code> 且工具栏含模板。
      </li>
      <li v-if="flags.aiConfig">
        托管 AI 配置并隐藏「AI 设置」；无 Key 时需
        <code>VITE_AI_DEMO_MODE=true</code> 才能体验演示流。
      </li>
      <li v-if="!anyEnabled" class="demo-integration__muted">开启上方开关以注入对应 props。</li>
    </ul>
    <pre v-if="anyEnabled" class="demo-integration__code">{{ activePropsSnippet }}</pre>
  </div>
</template>

<script setup lang="ts">
import { Switch } from "ant-design-vue";
import { computed } from "vue";

import type { DemoIntegrationFlags } from "../config/demoIntegration";

const flags = defineModel<DemoIntegrationFlags>("flags", { required: true });

defineProps<{
  uploadStatus?: string;
  activePropsSnippet: string;
}>();

const anyEnabled = computed(
  () =>
    flags.value.customUpload ||
    flags.value.galleryImages ||
    flags.value.customTemplates ||
    flags.value.aiConfig,
);
</script>
