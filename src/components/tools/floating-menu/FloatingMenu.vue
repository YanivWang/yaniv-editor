<template>
  <bubble-menu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100, placement: 'top' }"
    :should-show="shouldShow"
    class="floating-menu"
  >
    <div class="menu-content">
      <div class="menu-group">
        <HeadingControl variant="dropdown" :editor="editor" />
      </div>

      <div class="menu-group">
        <TextFormatButtons />
      </div>

      <div class="menu-group">
        <ColorPicker
          :icon="TextColorIcon"
          type="text"
          :model-value="currentTextColor"
          :title="t('editor.textColor')"
          @select="setTextColor"
        />
        <ColorPicker
          :icon="BackgroundColorIcon"
          type="background"
          :model-value="currentBgColor"
          :title="t('editor.backgroundColor')"
          @select="setHighlight"
        />
      </div>

      <div class="menu-group">
        <LinkButton />
      </div>

      <div class="menu-group">
        <ListTools :show-task-list="true" />
      </div>

      <div v-if="showAi" class="menu-group">
        <AiMenuButton
          :editor="editor"
          :icon="ThunderboltOutlined"
          :label="t('editor.ai')"
          :title="t('editor.ai')"
          placement="top"
        />
      </div>
    </div>
  </bubble-menu>
</template>

<script setup lang="ts">
/**
 * FloatingMenu - 选中文本时的浮动工具栏
 */
import { ThunderboltOutlined } from "@ant-design/icons-vue";
import { BubbleMenu } from "@tiptap/vue-3/menus";

import { BackgroundColorIcon, ColorPicker, TextColorIcon } from "@/components/editor/color";
import { HeadingControl } from "@/components/editor/heading";
import { LinkButton } from "@/components/editor/link";
import { ListTools } from "@/components/editor/list";
import { TextFormatButtons } from "@/components/editor/text-format";
import { shouldShowFloatingTextToolbar } from "@/composables/bubbleMenuShouldShow";
import { useEditorColorState } from "@/composables/useEditorColorState";
import { useYanivEditor } from "@/core/editorContext";
import { AiMenuButton } from "@/features/ai";
import { t } from "@/locales";

const props = withDefaults(
  defineProps<{
    readonly?: boolean;
    showAi?: boolean;
  }>(),
  {
    readonly: false,
    showAi: true,
  },
);

const editor = useYanivEditor();

const { currentTextColor, currentBgColor, setTextColor, setHighlight } =
  useEditorColorState(editor);

const shouldShow = (bubbleProps: { editor: any; state: any; from: number; to: number }) =>
  shouldShowFloatingTextToolbar(bubbleProps, props.readonly);
</script>
