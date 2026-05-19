import type { DemoMessages } from "./types";

export const demoZhTW: DemoMessages = {
  demo: {
    appTitle: "Yaniv Editor 範例",
    subtitle: {
      fullEditor: "完整編輯器範例，支援主題與裝置預覽",
      inlinePlugins: "行內編輯器與可熱插拔功能外掛",
    },
    nav: {
      fullEditor: "完整編輯器",
      inlinePlugins: "行內 + 外掛",
    },
    navAriaLabel: "範例導覽",
    theme: {
      dark: "深色",
      light: "淺色",
      switchToDark: "切換到深色模式",
      switchToLight: "切換到淺色模式",
    },
    themePreset: {
      word: "Word 風格",
      notion: "Notion 風格",
      github: "GitHub 風格",
      typora: "Typora 風格",
    },
    locale: {
      enUS: "English",
      zhCN: "简体中文",
      zhTW: "繁體中文",
    },
    autoDemo: {
      play: "觀看自動演示",
      stop: "停止",
      replay: "重新播放",
    },
    device: {
      desktop: "桌面",
      tablet: "平板 (iPad)",
      mobile: "手機 (iPhone)",
    },
    inline: {
      title: "行內編輯器",
      subtitle: "緊湊型行內編輯器，支援功能外掛熱插拔",
      emptyToolbar: "在右側面板開啟外掛以顯示工具列功能",
      stats: "{characters} 字元 · {words} 詞",
      pluginsActive: "{enabled}/{total} 個外掛已啟用",
      panel: {
        title: "功能外掛",
        allOn: "全部開啟",
        allOff: "全部關閉",
      },
      presets: {
        minimal: "精簡",
        writer: "寫作",
        standard: "標準",
        full: "完整",
      },
      plugins: {
        undoRedo: { name: "復原 / 重做", description: "歷史記錄導覽" },
        heading: { name: "標題", description: "H1-H6 標題" },
        textFormat: { name: "文字格式", description: "粗體、斜體、底線、刪除線" },
        fontSize: { name: "字級", description: "調整文字大小" },
        list: { name: "清單", description: "項目符號、編號、任務清單" },
        align: { name: "對齊", description: "靠左、置中、靠右、左右對齊" },
        link: { name: "連結", description: "插入超連結" },
        codeBlock: { name: "程式碼區塊", description: "語法高亮程式碼" },
        formatClear: { name: "清除格式", description: "移除所有格式" },
      },
    },
  },
};
