<template>
  <div class="editor-preview__labels editor-preview__labels--desktop">
    <div class="floating-label label--themes" :class="{ 'pop-in': entered }">
      <span class="floating-label__icon">
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path
            fill="currentColor"
            d="M8 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm4.5 3a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM3.5 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2 4.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
          />
        </svg>
      </span>
      <span class="floating-label__text">5 Themes</span>
    </div>
    <div
      class="floating-label label--ai"
      :class="{ 'pop-in': entered }"
      style="animation-delay: 0.2s"
    >
      <span class="floating-label__icon">
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path
            fill="currentColor"
            d="M8 1l1.545 4.955L14.5 7.5l-4.955 1.545L8 14l-1.545-4.955L1.5 7.5l4.955-1.545z"
          />
        </svg>
      </span>
      <span class="floating-label__text">AI Powered</span>
    </div>
    <div
      class="floating-label label--word"
      :class="{ 'pop-in': entered }"
      style="animation-delay: 0.4s"
    >
      <span class="floating-label__icon">
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path
            fill="currentColor"
            d="M14 4.5V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 008 1.5V3h1.5zm-2.394 6.966a.492.492 0 00-.062.037L5.5 13.25l-1.544-3.247a.497.497 0 00-.062-.037L3 6h1.073l.858 3.076L6.323 6h1.354l1.392 3.076L9.927 6H11l-.894 3.966a.492.492 0 00-.062.037L8.5 13.25l-1.394-3.284z"
          />
        </svg>
      </span>
      <span class="floating-label__text">Word Export</span>
    </div>
  </div>

  <div class="editor-preview__labels editor-preview__labels--mobile">
    <div v-for="label in mobileLabels" :key="label.text" class="mobile-label">
      <span class="mobile-label__dot" :style="{ background: label.color }"></span>
      <span class="mobile-label__text">{{ label.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mobileLabels } from "./demoScript";

defineProps<{
  entered: boolean;
}>();
</script>
