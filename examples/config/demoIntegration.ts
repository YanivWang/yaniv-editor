import type {
  GalleryImage,
  MediaUploadHandler,
  YanivEditorAiConfig,
  YanivEditorProps,
} from "@yanivjs/yaniv-editor";

type TemplateItem = NonNullable<YanivEditorProps["customTemplates"]>[number];

export interface DemoIntegrationFlags {
  customUpload: boolean;
  galleryImages: boolean;
  customTemplates: boolean;
  aiConfig: boolean;
}

export const DEFAULT_INTEGRATION_FLAGS: DemoIntegrationFlags = {
  customUpload: false,
  galleryImages: false,
  customTemplates: false,
  aiConfig: false,
};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** 模拟接入方上传到 CDN：延迟后返回 Object URL */
export const demoUploadImage: MediaUploadHandler = async (file) => {
  await delay(400);
  return URL.createObjectURL(file);
};

export const demoUploadVideo: MediaUploadHandler = async (file) => {
  await delay(600);
  return URL.createObjectURL(file);
};

function svgDataUrl(label: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect fill="${color}" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="18" font-family="sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 外部图库数据源（不依赖文档内已有图片） */
export const DEMO_GALLERY_IMAGES: GalleryImage[] = [
  { src: svgDataUrl("Gallery A", "#0ea5e9"), alt: "演示图 A", width: 320, height: 200 },
  { src: svgDataUrl("Gallery B", "#8b5cf6"), alt: "演示图 B", width: 320, height: 200 },
  { src: svgDataUrl("Gallery C", "#10b981"), alt: "演示图 C", width: 320, height: 200 },
];

/** nameKey/descKey 直写中文；示例不做 i18n，库内 t() 找不到键时会原样显示 */
export const DEMO_CUSTOM_TEMPLATES: TemplateItem[] = [
  {
    key: "demo-product-brief",
    nameKey: "产品简报（演示）",
    descKey: "集成方 customTemplates 注入的示例模板",
    content: `
<h2>产品简报</h2>
<p><strong>版本：</strong>演示注入模板</p>
<h3>背景</h3>
<p></p>
<h3>目标用户</h3>
<ul><li><p></p></li></ul>
<h3>核心功能</h3>
<ol><li><p></p></li></ol>
`,
  },
];

/**
 * 集成方托管 AI：不写 localStorage，默认隐藏「AI 设置」。
 * 无 apiKey 时若构建启用 VITE_AI_DEMO_MODE 则走演示流。
 */
export const DEMO_HOST_AI_CONFIG: YanivEditorAiConfig = {
  provider: "openai",
  enabled: true,
  storageMode: "memory",
  model: "gpt-4o-mini",
  showSettings: false,
};

export function integrationKey(flags: DemoIntegrationFlags): string {
  return (
    [
      flags.customUpload ? "u" : "",
      flags.galleryImages ? "g" : "",
      flags.customTemplates ? "t" : "",
      flags.aiConfig ? "a" : "",
    ].join("") || "none"
  );
}

export function buildActivePropsSnippet(flags: DemoIntegrationFlags): string {
  const lines = ["<YanivEditor", '  preset="full"', "  ..."];
  if (flags.customUpload) {
    lines.push('  :upload-image="uploadImage"', '  :upload-video="uploadVideo"');
  }
  if (flags.galleryImages) {
    lines.push('  :gallery-images="galleryImages"');
  }
  if (flags.customTemplates) {
    lines.push('  :custom-templates="customTemplates"');
  }
  if (flags.aiConfig) {
    lines.push("  :ai-config=\"{ provider: 'openai', enabled: true, ... }\"");
  }
  lines.push("/>");
  return lines.join("\n");
}
