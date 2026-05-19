/**
 * 主题与 Demo 辅助类型（编辑器能力请使用 version + features / editorPresets）
 */

/** Theme mode */
export type ThemeMode = "light" | "dark" | "auto";

/** Theme preset */
export type ThemePreset = "default" | "notion" | "typora" | "word" | "github" | "custom";

/** AI configuration（宿主应用侧，非 YanivEditor props） */
export interface AiConfig {
  provider: "openai" | "aliyun" | "ollama" | "deepseek";
  apiKey: string;
  model?: string;
  baseUrl?: string;
}
