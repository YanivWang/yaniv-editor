<template>
  <bubble-menu
    v-if="floatingEditor"
    :editor="floatingEditor!"
    :options="bubbleBindings.options"
    :append-to="bubbleBindings.appendTo"
    :should-show="shouldShow"
    class="floating-menu"
    :class="appearanceClass"
    :data-color-mode="resolvedColorMode"
  >
    <div class="menu-content">
      <div class="menu-group">
        <HeadingControl variant="dropdown" :editor="floatingEditor!" />
      </div>

      <div class="menu-group">
        <TextFormatButtons />
      </div>

      <div class="menu-group">
        <ColorPicker
          :icon="TextColorIcon"
          type="text"
          :palette="colorPalette"
          :model-value="currentTextColor"
          :title="t('editor.textColor')"
          @select="setTextColor"
        />
        <ColorPicker
          :icon="BackgroundColorIcon"
          type="background"
          :palette="colorPalette"
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
          :editor="floatingEditor!"
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
import { computed } from "vue";

import { getAppearanceClassName, useInjectEditorAppearance } from "@/appearance";
import { BackgroundColorIcon, ColorPicker, TextColorIcon } from "@/components/editor/color";
import { HeadingControl } from "@/components/editor/heading";
import { LinkButton } from "@/components/editor/link";
import { ListTools } from "@/components/editor/list";
import { TextFormatButtons } from "@/components/editor/text-format";
import { shouldShowFloatingTextToolbar } from "@/composables/bubbleMenuShouldShow";
import { useEditorColorState } from "@/composables/useEditorColorState";
import { useOverlayTippyOptions } from "@/composables/useOverlayTippyOptions";
import { useYanivEditor } from "@/core/editorContext";
import { useEditorT } from "@/core/infra/useEditorLocale";
import { AiMenuButton } from "@/features/ai";

const t = useEditorT();

const appearanceCtx = useInjectEditorAppearance();
const appearanceClass = computed(() =>
  getAppearanceClassName(appearanceCtx?.appearance.value ?? "default"),
);
const resolvedColorMode = computed(() => appearanceCtx?.resolvedMode.value ?? "light");
const colorPalette = computed(() =>
  appearanceCtx?.appearance.value === "notion" ? "notion" : "office",
);

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    showAi?: boolean;
  }>(),
  {
    disabled: false,
    showAi: true,
  },
);

const editor = useYanivEditor();
const floatingEditor = computed(
  () => editor.value as unknown as import("@tiptap/vue-3").Editor | null,
);

const { currentTextColor, currentBgColor, setTextColor, setHighlight } =
  useEditorColorState(editor);

const shouldShow = (bubbleProps: { editor: any; state: any; from: number; to: number }) =>
  shouldShowFloatingTextToolbar(bubbleProps, props.disabled);

const bubbleBindings = useOverlayTippyOptions("--ye-z-floating-menu", {
  placement: "top",
});
</script>
