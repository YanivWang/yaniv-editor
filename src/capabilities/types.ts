import type {
  FeatureConfig,
  GalleryImage,
  MediaUploadHandler,
  YanivEditorAiConfig,
} from "@/core/editorTypes";
import type { EditorRuntimeProfile, ExtensionGates } from "@/core/runtime/types";
import type { BlockMenuHost } from "@/core/shell/useBlockMenuHost";
import type { MentionItem } from "@/extensions/mention";
import type { TiptapLocale } from "@/locales/types";

import type { AnyExtension } from "@tiptap/core";
import type { Ref } from "vue";

export type ExtensionTier = "core" | "content" | "interaction" | "auxiliary" | "chromeCoupled";

export interface BuildExtensionsCtx {
  locale: TiptapLocale;
  gates: ExtensionGates;
  isEditable: Readonly<Ref<boolean>>;
  blockMenuHost: BlockMenuHost;
  upload: {
    image: () => MediaUploadHandler | undefined;
    video: () => MediaUploadHandler | undefined;
  };
  galleryImages: () => GalleryImage[];
  /** `@` 提及候选项 — getter 模式，未注入时返回 undefined 由扩展回退到内置占位数据 */
  mentionItems: () => MentionItem[] | undefined;
  officePaste: {
    onPasteFromOfficeWithImages: () => (() => void) | undefined;
  };
  outline: {
    scrollParent: () => HTMLElement | null;
    bindScrollParent: (el: HTMLElement | null) => void;
  };
  aiConfig: () => YanivEditorAiConfig | undefined;
  inlinePlaceholder?: string;
  extraExtensions?: AnyExtension[];
}

export interface CapabilityDefinition {
  id: string;
  tier: ExtensionTier;
  order: number;
  featureKey?: keyof FeatureConfig;
  schemaSignature?: (profile: EditorRuntimeProfile) => string;
  extensions: (ctx: BuildExtensionsCtx) => AnyExtension[] | Promise<AnyExtension[]>;
  fullToolbarSlugs?: string[];
  inlineToolbarSlugs?: ReadonlyArray<string>;
  /** Inline host 下始终注册（如 inline-starter） */
  inlineAlways?: boolean;
}
