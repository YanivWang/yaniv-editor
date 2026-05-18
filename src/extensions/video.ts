/**
 * Video Extension - 视频节点扩展
 * @description 支持在编辑器中插入和播放视频
 */

import { Node, mergeAttributes } from "@tiptap/core";

export interface VideoOptions {
  HTMLAttributes: Record<string, any>;
  inline: boolean;
  allowBase64: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      /**
       * 插入视频
       */
      setVideo: (options: { src: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

export const Video = Node.create<VideoOptions>({
  name: "video",

  addOptions() {
    return {
      HTMLAttributes: {},
      inline: false,
      allowBase64: true,
    };
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  inline() {
    return this.options.inline;
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("width");
          return value ? parseInt(value, 10) : null;
        },
        renderHTML: (attributes) => {
          return attributes.width ? { width: attributes.width } : {};
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("height");
          return value ? parseInt(value, 10) : null;
        },
        renderHTML: (attributes) => {
          return attributes.height ? { height: attributes.height } : {};
        },
      },
      align: {
        default: null,
        parseHTML: (element) => {
          const align =
            element.getAttribute("data-align") ||
            element.style.textAlign ||
            element.parentElement?.style.textAlign;
          return align === "left" || align === "center" || align === "right" ? align : null;
        },
        renderHTML: (attributes) => {
          return attributes.align ? { "data-align": attributes.align } : {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { align, ...restAttributes } = HTMLAttributes;
    const style = ["max-width: 100%;"];
    if (align === "left" || align === "center" || align === "right") {
      style.push("display: block;");
      style.push(`margin-left: ${align === "right" || align === "center" ? "auto" : "0"};`);
      style.push(`margin-right: ${align === "left" || align === "center" ? "auto" : "0"};`);
    }

    return [
      "video",
      mergeAttributes(this.options.HTMLAttributes, restAttributes, {
        controls: "true",
        style: style.join(" "),
      }),
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "video-wrapper";
      dom.setAttribute("data-type", "video-wrapper");
      dom.setAttribute("contenteditable", "false");

      const video = document.createElement("video");
      video.src = node.attrs.src;
      video.controls = true;
      video.style.maxWidth = "100%";

      const updateVideoSize = (attrs = node.attrs) => {
        if (attrs.width) {
          video.style.width = `${attrs.width}px`;
        } else {
          video.style.width = "";
        }

        if (attrs.height) {
          video.style.height = `${attrs.height}px`;
        } else {
          video.style.height = "";
        }
      };

      const updateAlign = (attrs = node.attrs) => {
        if (attrs.align) {
          dom.setAttribute("data-align", attrs.align);
        } else {
          dom.removeAttribute("data-align");
        }
      };

      updateVideoSize();
      updateAlign();

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (key !== "src" && key !== "width" && key !== "height" && key !== "align") {
          video.setAttribute(key, value);
        }
      });

      const stopVideoPlayback = () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };

      const selectVideo = () => {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos !== null && pos !== undefined) {
          editor.commands.setNodeSelection(pos);
        }
      };

      dom.addEventListener("mousedown", selectVideo, true);
      dom.addEventListener("click", selectVideo, true);
      dom.appendChild(video);

      return {
        dom,
        contentDOM: null,
        selectNode: () => {
          dom.classList.add("ProseMirror-selectednode");
          video.setAttribute("data-selected", "true");
        },
        deselectNode: () => {
          dom.classList.remove("ProseMirror-selectednode");
          video.removeAttribute("data-selected");
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== "video") return false;

          if (updatedNode.attrs.src !== node.attrs.src) {
            video.pause();
            video.src = updatedNode.attrs.src;
          }

          if (
            updatedNode.attrs.width !== node.attrs.width ||
            updatedNode.attrs.height !== node.attrs.height
          ) {
            updateVideoSize(updatedNode.attrs);
          }

          if (updatedNode.attrs.align !== node.attrs.align) {
            updateAlign(updatedNode.attrs);
          }

          node = updatedNode;
          return true;
        },
        ignoreMutation: () => true,
        destroy: () => {
          dom.removeEventListener("mousedown", selectVideo, true);
          dom.removeEventListener("click", selectVideo, true);
          stopVideoPlayback();
        },
      };
    };
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
