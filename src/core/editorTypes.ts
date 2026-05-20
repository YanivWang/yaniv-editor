/**
 * Yaniv Editor Types
 * @description 功能开关（features）驱动扩展注册与 UI
 */
import type { TemplateItem } from "@/components/editor/template/templates";
import type { ThemeMode, ThemePreset } from "@/configs/editorConfig";
import type { AiProvider, AiStorageMode } from "@/features/ai/config/types";

import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/vue-3";

/** 集成方通过 YanivEditor `ai-config` 注入的 AI 配置（不写入 localStorage） */
export interface YanivEditorAiConfig {
  provider: AiProvider;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeout?: number;
  enabled?: boolean;
  /** @default 'memory' */
  storageMode?: AiStorageMode;
  /** 是否显示工具栏「AI 设置」菜单项；有 ai-config 时默认 false */
  showSettings?: boolean;
}

export interface GalleryImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export type MediaUploadHandler = (file: File) => Promise<string>;

/** 大纲悬浮面板锚点位置 */
export type OutlinePlacement = "top-left" | "top-right";

/**
 * 编辑器功能配置
 * @description 所有布尔开关均为 opt-in，须显式 `true` 才开启；推荐使用 editorPresets
 */
export interface FeatureConfig {
  /** 是否启用表格功能 */
  table?: boolean;
  /** 是否注册数学公式扩展 */
  math?: boolean;
  /** 是否注册 AI 相关扩展 */
  ai?: boolean;
  /** 是否注册格式刷扩展 */
  formatPainter?: boolean;
  /** 标题锚点 UniqueID + 目录（TableOfContents）扩展 */
  outline?: boolean;
  /** 查找替换扩展 */
  searchReplace?: boolean;
  /** 强化 Office/WPS HTML 粘贴 */
  officePaste?: boolean;
  /** 是否启用表格工具栏 */
  tableToolbar?: boolean;
  /** 是否启用斜杠命令菜单（输入 / 弹出块类型选择） */
  slashCommand?: boolean;
  /** 是否启用左侧六点拖拽手柄（块添加、菜单与拖拽排序） */
  dragHandle?: boolean;
  /** 是否启用悬浮框功能 */
  floatingMenu?: boolean;
  /** 是否启用图片扩展、粘贴图片与上下文工具栏 */
  image?: boolean;
  /** 是否启用视频扩展与上下文工具栏 */
  video?: boolean;
  /** 是否启用链接悬浮框功能 */
  linkBubbleMenu?: boolean;
  /** 是否启用头部导航 */
  headerNav?: boolean;
  /** 是否启用底部导航 */
  footerNav?: boolean;
  /** 底部状态栏是否显示常用快捷键说明（与缩放、字数并列） */
  statusShortcutHints?: boolean;
  /** 工具栏密度：compact 仅保留基础排版工具 */
  toolbar?: "full" | "compact";
}

/**
 * 编辑器 Props
 */
export interface YanivEditorProps {
  /** 缩放条位置：底部固定或工具栏下方 */
  zoomBarPlacement?: "bottom" | "belowToolbar";
  /** 是否为只读模式 */
  readonly?: boolean;
  /** 是否为预览模式（无头部/底部导航，不可编辑，不可点击） */
  previewMode?: boolean;
  /** 初始内容 — HTML 字符串或 ProseMirror JSON（type: doc） */
  initialContent?: string | JSONContent;
  /** 表格悬浮框显示模式：1=聚焦显示；2=单元格选中显示 */
  tableMenuShowMode?: 1 | 2;
  /** 功能开关：控制扩展注册与 UI 显隐 */
  features?: FeatureConfig;
  /** 图片上传函数；未传时本地上传回退为 DataURL */
  uploadImage?: MediaUploadHandler;
  /** 视频上传函数；未传时本地上传回退为 DataURL */
  uploadVideo?: MediaUploadHandler;
  /** 外部图库图片源；未传时图库从当前文档收集图片 */
  galleryImages?: GalleryImage[];
  /** 自定义模板列表，会追加到内置模板后面 */
  customTemplates?: TemplateItem[];
  /** 语言设置 */
  locale?: string;
  /**
   * 视觉主题预设（皮肤 CSS，按需加载）
   * @default 'default'
   */
  themePreset?: ThemePreset;
  /**
   * 明暗模式；`auto` 跟随系统（见 watchSystemTheme）
   * @default 'light'
   */
  themeMode?: ThemeMode;
  /**
   * 大纲悬浮面板位置
   * @default 'top-left'
   */
  outlinePlacement?: OutlinePlacement;
  /**
   * 集成方注入的 AI 配置；传入后完全托管（忽略 localStorage 与 .env），默认隐藏「AI 设置」
   */
  aiConfig?: YanivEditorAiConfig;
}

/**
 * 编辑器暴露的方法
 */
export interface YanivEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
