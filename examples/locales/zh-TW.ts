import type { DemoMessages } from "./types";

export const demoZhTW: DemoMessages = {
  demo: {
    appTitle: "Yaniv Editor 範例",
    subtitle: {
      fullEditor: "完整編輯器範例，支援主題切換",
      inlinePlugins: "行內編輯器與可熱插拔功能外掛",
    },
    nav: {
      fullEditor: "完整編輯器",
      inlinePlugins: "行內 + 外掛",
    },
    navAriaLabel: "範例導覽",
    themePreset: {
      default: "預設風格",
      word: "Word 風格",
      notion: "Notion 風格",
      github: "GitHub 風格",
      typora: "Typora 風格",
      custom: "自訂",
    },
    themeMode: {
      light: "淺色",
      dark: "深色",
      auto: "跟隨系統",
    },
    locale: {
      enUS: "English",
      zhCN: "简体中文",
      zhTW: "繁體中文",
    },
    inline: {
      sampleContent: `<h2>行內編輯器</h2>
<p>這是一款<strong>緊湊型</strong>富文字編輯器，專為<em>嵌入場景</em>設計——留言框、聊天氣泡、表格儲存格、卡片描述等，無需整頁編輯器也能完成格式化寫作。</p>
<h3>可插拔工具列</h3>
<p>右側「功能外掛」面板支援<strong>即時熱插拔</strong>：開啟或關閉外掛後，上方工具列會<em>即時更新</em>。試試「精簡 / 寫作 / 標準 / 完整」預設，或自由組合你需要的功能。</p>
<ul>
  <li><strong>文字格式</strong>：粗體、斜體、底線、刪除線</li>
  <li><strong>標題與清單</strong>：多級標題，項目符號 / 編號 / 任務清單</li>
  <li><strong>字級與對齊</strong>：靈活控制段落排版</li>
  <li><strong>連結與程式碼區塊</strong>：插入超連結或高亮程式碼片段</li>
</ul>
<blockquote>
  <p><strong>提示：</strong>在右側面板開啟「對齊」「連結」「程式碼區塊」等外掛後，選取文字即可使用對應工具。</p>
</blockquote>
<p>在下方繼續編輯，體驗<strong>輕量、可自訂</strong>的行內編輯——依場景裁剪工具，保持介面整潔。</p>`,
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
