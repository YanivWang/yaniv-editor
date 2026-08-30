import { Node, mergeAttributes } from "@tiptap/core";

import { normalizeSafeFrameUrl, normalizeSafeMediaUrl, normalizeSafeUrl } from "@/utils/safeUrl";

export type EmbedProvider = "bookmark" | "iframe";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      setEmbed: (options: {
        url: string;
        title?: string;
        description?: string;
        image?: string | null;
        provider?: EmbedProvider;
      }) => ReturnType;
    };
  }
}

function resolveEmbedProvider(url: string): EmbedProvider {
  if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com|figma\.com/i.test(url)) {
    return "iframe";
  }
  return "bookmark";
}

/**
 * 已知播放器：src 由本文件重写成固定的官方域名，内容不由使用者控制。
 * 只有这一类才配拿 `allow-same-origin`（见 {@link sandboxFor}）。
 */
type IframeTarget = { src: string; knownProvider: boolean };

/**
 * 解析可嵌入的 iframe 地址；不可安全嵌入时返回 `null`（调用方降级为 bookmark 卡片）。
 *
 * `provider` 是节点属性，可由粘贴的 JSON 或 `setEmbed({ provider: "iframe" })` 直接指定，
 * 因此 `resolveEmbedProvider` 的域名判断**不能**作为安全边界——真正的边界是这里的
 * `normalizeSafeFrameUrl`（仅放行 http/https）。
 */
function resolveIframeSrc(url: string): IframeTarget | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/i);
  if (youtubeMatch) {
    return { src: `https://www.youtube.com/embed/${youtubeMatch[1]}`, knownProvider: true };
  }

  if (/vimeo\.com/i.test(url)) {
    const id = url.split("/").pop();
    if (id && /^\d+$/.test(id)) {
      return { src: `https://player.vimeo.com/video/${id}`, knownProvider: true };
    }
  }

  const safe = normalizeSafeFrameUrl(url);
  return safe ? { src: safe, knownProvider: false } : null;
}

/**
 * sandbox 按来源可信度分级。
 *
 * `allow-scripts` + `allow-same-origin` 同时给，等于**把 sandbox 让给了被嵌页面自己**：
 * 被嵌文档保留自身源，一旦它与宿主同源，就能通过 `parent` 反向操作宿主 DOM，
 * 甚至直接摘掉自己 iframe 上的 `sandbox` 属性——这是该组合公认的逃逸路径。
 *
 * 而 embed 的 `url` 是内容属性，UGC 场景下由使用者控制（粘贴 JSON 即可指定任意
 * http/https 地址，包括宿主自己的源），所以**任意地址一律不给 `allow-same-origin`**，
 * 让它跑在不透明源里。只有 YouTube / Vimeo 这类 src 被本文件重写成固定官方域名、
 * 内容不受使用者控制的已知播放器才保留该权限（播放器需要它读 localStorage）。
 *
 * 代价是可预期的：任意第三方嵌入拿不到自己的 cookie / storage。对一个所见即所得
 * 编辑器里的展示型嵌入，这个取舍优于把宿主页面的 DOM 暴露出去。
 */
function sandboxFor(knownProvider: boolean): string {
  const base = "allow-scripts allow-presentation allow-popups-to-escape-sandbox";
  return knownProvider ? `${base} allow-same-origin` : base;
}

export const Embed = Node.create({
  name: "embed",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      url: { default: null },
      title: { default: "" },
      description: { default: "" },
      image: { default: null },
      provider: { default: "bookmark" as EmbedProvider },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "embed",
        class: "embed-block",
      }),
    ];
  },

  addCommands() {
    return {
      setEmbed:
        (options) =>
        ({ chain }) => {
          const provider = options.provider ?? resolveEmbedProvider(options.url);
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                url: options.url,
                title: options.title ?? options.url,
                description: options.description ?? "",
                image: options.image ?? null,
                provider,
              },
            })
            .run();
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "embed-block embed-wrapper";
      dom.dataset.type = "embed";
      dom.contentEditable = "false";

      const renderBookmark = () => {
        dom.replaceChildren();
        const card = document.createElement("a");
        card.className = "embed-block__bookmark";
        // 未通过白名单的地址退化为不可点击的卡片，避免 javascript: 点击执行
        const safeHref = normalizeSafeUrl(String(node.attrs.url ?? ""));
        if (safeHref) {
          card.href = safeHref;
          card.target = "_blank";
          card.rel = "noopener noreferrer";
        }

        const safeImage = node.attrs.image
          ? normalizeSafeMediaUrl(String(node.attrs.image), "image")
          : null;
        if (safeImage) {
          const image = document.createElement("img");
          image.className = "embed-block__image";
          image.src = safeImage;
          image.alt = node.attrs.title || "";
          card.appendChild(image);
        }

        const body = document.createElement("div");
        body.className = "embed-block__body";

        const title = document.createElement("div");
        title.className = "embed-block__title";
        title.textContent = node.attrs.title || node.attrs.url || "";

        const description = document.createElement("div");
        description.className = "embed-block__description";
        description.textContent = node.attrs.description || node.attrs.url || "";

        body.appendChild(title);
        if (node.attrs.description) body.appendChild(description);
        card.appendChild(body);
        dom.appendChild(card);
      };

      const renderIframe = () => {
        const target = resolveIframeSrc(String(node.attrs.url ?? ""));
        // 地址不可安全嵌入时退化为 bookmark 卡片，而不是渲染一个空/危险的 iframe
        if (!target) {
          renderBookmark();
          return;
        }

        dom.replaceChildren();
        const iframe = document.createElement("iframe");
        iframe.className = "embed-block__iframe";
        iframe.src = target.src;
        // 第三方内容按最小权限沙箱运行：禁止导航顶层窗口、弹窗、下载与表单提交；
        // allow-same-origin 只给已知播放器，理由见 sandboxFor
        iframe.setAttribute("sandbox", sandboxFor(target.knownProvider));
        // 用 setAttribute 而非 IDL 属性：部分环境（含 jsdom）不反射这两个属性到 DOM
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        iframe.setAttribute("loading", "lazy");
        // 仅保留播放所需能力；移除 accelerometer / gyroscope / clipboard-write 等传感器与剪贴板权限
        iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        iframe.allowFullscreen = true;
        iframe.title = node.attrs.title || "Embedded content";
        dom.appendChild(iframe);
      };

      if (node.attrs.provider === "iframe") {
        renderIframe();
      } else {
        renderBookmark();
      }

      dom.addEventListener("click", () => {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos == null) return;
        editor.commands.setNodeSelection(pos);
      });

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value != null) dom.setAttribute(key, String(value));
      });

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== "embed") return false;
          if (updatedNode.attrs.provider === "iframe") {
            renderIframe();
          } else {
            renderBookmark();
          }
          return true;
        },
      };
    };
  },
});

export { resolveEmbedProvider };
