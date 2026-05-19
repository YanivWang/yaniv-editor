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
    landing: {
      hero: {
        subtitle: "面向 Vue 3 的生產級 AI 富文字編輯器",
        starGithub: "在 GitHub 上 Star",
        mitLicense: "MIT 授權",
        openSource: "🔥 開源",
        tryDemo: "體驗線上演示",
        viewGithub: "在 GitHub 查看",
      },
      stats: {
        themes: "主題",
        features: "功能",
        languages: "語言",
        free: "免費",
      },
      features: {
        title: "為什麼選擇 Yaniv Editor？",
        themes: {
          title: "5 款精美主題",
          description: "從 Notion 風格到 Word 風格，每款主題均完美支援深色模式。",
        },
        ai: {
          title: "AI 賦能",
          description: "智慧寫作輔助：續寫、潤色、翻譯與摘要。",
        },
        darkMode: {
          title: "完美深色模式",
          description: "明暗主題無縫切換，每個細節在兩種模式下都表現出色。",
        },
        wordMode: {
          title: "Word 模式",
          description: "專業 A4 紙張版面，支援自動分頁的文件編輯體驗。",
        },
        i18n: {
          title: "國際化就緒",
          description: "內建簡體中文、繁體中文與英文支援。",
        },
      },
      themes: {
        title: "探索主題",
        subtitle: "為你的應用選擇最合適的主題",
        word: { name: "Word", description: "專業文件風格，A4 版面" },
        notion: { name: "Notion", description: "現代、無干擾的寫作體驗" },
        github: { name: "GitHub", description: "開發者友善的 Markdown 風格" },
        typora: { name: "Typora", description: "優雅的閱讀與寫作體驗" },
        default: { name: "預設", description: "簡潔極簡設計" },
      },
      tech: {
        title: "基於現代技術構建",
      },
      cta: {
        title: "準備開始？",
        subtitle: "透過 npm 安裝，幾分鐘內即可構建出色的編輯器",
        copyTitle: "複製到剪貼簿",
        tryDemo: "體驗線上演示",
      },
      footer: {
        text: "由開源社群用 ❤️ 打造",
        github: "GitHub",
        issues: "Issues",
        license: "MIT 授權",
      },
    },
  },
};
