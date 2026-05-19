import type { DemoMessages } from "./types";

export const demoEnUS: DemoMessages = {
  demo: {
    appTitle: "yaniv-editor Examples",
    subtitle: {
      fullEditor: "Full editor example with themes and device preview",
      inlinePlugins: "Inline editor with hot-swappable feature plugins",
    },
    nav: {
      fullEditor: "Full Editor",
      inlinePlugins: "Inline + Plugins",
    },
    navAriaLabel: "Examples",
    theme: {
      dark: "Dark",
      light: "Light",
      switchToDark: "Switch to Dark",
      switchToLight: "Switch to Light",
    },
    themePreset: {
      word: "Word Style",
      notion: "Notion Style",
      github: "GitHub Style",
      typora: "Typora Style",
    },
    locale: {
      enUS: "English",
      zhCN: "简体中文",
      zhTW: "繁體中文",
    },
    autoDemo: {
      play: "Watch Auto Demo",
      stop: "Stop",
      replay: "Replay Demo",
    },
    device: {
      desktop: "Desktop",
      tablet: "Tablet (iPad)",
      mobile: "Mobile (iPhone)",
    },
    inline: {
      title: "Inline Editor",
      subtitle: "Compact inline editor with hot-swappable feature plugins",
      emptyToolbar: "Toggle plugins from the panel to add toolbar features",
      stats: "{characters} characters · {words} words",
      pluginsActive: "{enabled}/{total} plugins active",
      panel: {
        title: "Feature Plugins",
        allOn: "All On",
        allOff: "All Off",
      },
      presets: {
        minimal: "Minimal",
        writer: "Writer",
        standard: "Standard",
        full: "Full",
      },
      plugins: {
        undoRedo: { name: "Undo / Redo", description: "History navigation" },
        heading: { name: "Heading", description: "H1-H6 titles" },
        textFormat: { name: "Text Format", description: "Bold, italic, underline, strike" },
        fontSize: { name: "Font Size", description: "Adjust text size" },
        list: { name: "Lists", description: "Bullet, numbered, task list" },
        align: { name: "Alignment", description: "Left, center, right, justify" },
        link: { name: "Link", description: "Insert hyperlinks" },
        codeBlock: { name: "Code Block", description: "Syntax highlighted code" },
        formatClear: { name: "Clear Format", description: "Remove all formatting" },
      },
    },
    landing: {
      hero: {
        subtitle: "A production-ready, AI-powered rich text editor for Vue 3",
        starGithub: "Star on GitHub",
        mitLicense: "MIT License",
        openSource: "🔥 Open Source",
        tryDemo: "Try Live Demo",
        viewGithub: "View on GitHub",
      },
      stats: {
        themes: "Themes",
        features: "Features",
        languages: "Languages",
        free: "Free",
      },
      features: {
        title: "Why Choose yaniv-editor?",
        themes: {
          title: "5 Beautiful Themes",
          description: "From Notion-like to Word-style. Each theme has perfect dark mode support.",
        },
        ai: {
          title: "AI-Powered",
          description:
            "Smart writing assistance with continue writing, polish, translate, and summarize.",
        },
        darkMode: {
          title: "Perfect Dark Mode",
          description:
            "Seamless light/dark theme switching. Every detail looks great in both modes.",
        },
        wordMode: {
          title: "Word Mode",
          description:
            "Professional A4 paper layout with automatic pagination for document editing.",
        },
        i18n: {
          title: "i18n Ready",
          description: "Built-in support for Chinese (Simplified/Traditional) and English.",
        },
      },
      themes: {
        title: "Explore Themes",
        subtitle: "Choose the perfect theme for your application",
        word: { name: "Word", description: "Professional document style with A4 layout" },
        notion: { name: "Notion", description: "Modern, distraction-free writing" },
        github: { name: "GitHub", description: "Developer-friendly markdown style" },
        typora: { name: "Typora", description: "Elegant reading and writing" },
        default: { name: "Default", description: "Clean and minimal design" },
      },
      tech: {
        title: "Built With Modern Technologies",
      },
      cta: {
        title: "Ready to Start?",
        subtitle: "Install via npm and start building amazing editors in minutes",
        copyTitle: "Copy to clipboard",
        tryDemo: "Try Live Demo",
      },
      footer: {
        text: "Made with ❤️ by the open source community",
        github: "GitHub",
        issues: "Issues",
        license: "MIT License",
      },
    },
  },
};
