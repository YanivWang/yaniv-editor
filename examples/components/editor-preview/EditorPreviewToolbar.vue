<template>
  <div class="editor-preview__toolbar">
    <div class="toolbar-group">
      <span class="toolbar-btn" :class="{ glow: activeFormat === 'bold' }">B</span>
      <span class="toolbar-btn" :class="{ glow: activeFormat === 'italic' }">I</span>
      <span class="toolbar-btn">U</span>
      <span class="toolbar-btn">S</span>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <span class="toolbar-btn" :class="{ glow: activeFormat === 'h1' }">H1</span>
      <span class="toolbar-btn" :class="{ glow: activeFormat === 'h2' }">H2</span>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <span class="toolbar-btn icon-btn" :class="{ glow: activeFormat === 'list' }">
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path
            fill="currentColor"
            d="M2.5 4a.5.5 0 100-1 .5.5 0 000 1zM4 3.5a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5zM4 7.5a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5zM4 11.5a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5zM2.5 8a.5.5 0 100-1 .5.5 0 000 1zM2.5 12a.5.5 0 100-1 .5.5 0 000 1z"
          />
        </svg>
      </span>
      <span class="toolbar-btn icon-btn" :class="{ glow: activeFormat === 'quote' }">
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path fill="currentColor" d="M2 3h12v1H2V3zm2 3h8v1H4V6zm-2 3h12v1H2V9zm2 3h8v1H4v-1z" />
        </svg>
      </span>
      <span class="toolbar-btn icon-btn" :class="{ glow: activeFormat === 'code' }">
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path
            fill="currentColor"
            d="M5.854 4.146a.5.5 0 010 .708L2.707 8l3.147 3.146a.5.5 0 01-.708.708l-3.5-3.5a.5.5 0 010-.708l3.5-3.5a.5.5 0 01.708 0zm4.292 0a.5.5 0 00 0 .708L13.293 8l-3.147 3.146a.5.5 0 00.708.708l3.5-3.5a.5.5 0 000-.708l-3.5-3.5a.5.5 0 00-.708 0z"
          />
        </svg>
      </span>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <span class="toolbar-btn ai-btn" :class="{ 'ai-pulse': activeFormat === 'ai' }">
        <svg viewBox="0 0 16 16" width="11" height="11">
          <path
            fill="currentColor"
            d="M8 1l1.545 4.955L14.5 7.5l-4.955 1.545L8 14l-1.545-4.955L1.5 7.5l4.955-1.545z"
          />
        </svg>
        AI
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeFormat: string;
}>();
</script>
