/**
 * 翻译语言代码配置
 * @description 定义支持的语言代码及其映射关系
 */

export interface LanguageCode {
  code: string;
  key: string;
}

/**
 * 支持的语言代码列表
 * 用于翻译功能的语言选择。
 *
 * 每一项的 `key` 都必须在 `editor.lang.*` 里有对应文案，否则菜单会渲染出原始 key
 * （`languageCodes.test.ts` 会挡）。反过来，locale 里多出的 `editor.lang.*` 不会被渲染
 * ——`ar` 就是这样漏注册的，已补进来。
 *
 * `editor.lang.zh` 是有意不注册的：它是「中文」这个笼统说法，而翻译目标必须精确到
 * 简体 / 繁体，`zh-CN` 与 `zh-TW` 已经覆盖。文案保留是为了不破坏公开的
 * `EditorLocaleMessages` 类型，宿主可以在自己的界面里用它。
 */
export const LANGUAGE_CODES: LanguageCode[] = [
  { code: "zh-CN", key: "zh-CN" },
  { code: "zh-TW", key: "zh-TW" },
  { code: "en", key: "en" },
  { code: "ja", key: "ja" },
  { code: "th", key: "th" },
  { code: "fr", key: "fr" },
  { code: "es", key: "es" },
  { code: "pt", key: "pt" },
  { code: "ko", key: "ko" },
  { code: "vi", key: "vi" },
  { code: "ru", key: "ru" },
  { code: "de", key: "de" },
  { code: "hi", key: "hi" },
  { code: "id", key: "id" },
  { code: "ar", key: "ar" },
];
