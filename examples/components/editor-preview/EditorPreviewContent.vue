<template>
  <div class="editor-preview__content">
    <div class="content-inner">
      <TransitionGroup name="line-enter">
        <div
          v-for="line in visibleLines"
          :key="'line-' + line.id"
          class="content-line"
          :class="line.class"
        >
          <!-- 动态 tag + HTML：仅限演示内容 -->
          <!-- eslint-disable-next-line vue/no-v-text-v-html-on-component -->
          <component :is="line.tag || 'div'" v-html="line.html"></component>
        </div>
      </TransitionGroup>
      <span class="cursor" :class="{ 'cursor--blink': !isTyping }"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ContentLine } from "./types";

defineProps<{
  visibleLines: ContentLine[];
  isTyping: boolean;
}>();
</script>
