import { Fragment, Schema, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";

import { CONTAINER_PLACEHOLDER_TYPES, isVisuallyEmpty } from "@/extensions/shared/isVisuallyEmpty";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM: () => ["p", 0],
    },
    toggleBlock: {
      group: "block",
      content: "block+",
      toDOM: () => ["div", { "data-type": "toggle" }, 0],
    },
    callout: {
      group: "block",
      content: "block+",
      toDOM: () => ["div", { "data-type": "callout" }, 0],
    },
  },
});

function emptyParagraph(): ProseMirrorNode {
  return schema.nodes.paragraph.create();
}

function paragraphWithText(text: string): ProseMirrorNode {
  return schema.nodes.paragraph.create(null, schema.text(text));
}

describe("isVisuallyEmpty", () => {
  it("treats empty paragraph as empty", () => {
    expect(isVisuallyEmpty(emptyParagraph())).toBe(true);
  });

  it("treats paragraph with text as non-empty", () => {
    expect(isVisuallyEmpty(paragraphWithText("hi"))).toBe(false);
  });

  it("treats toggle with only empty paragraph as empty", () => {
    const toggle = schema.nodes.toggleBlock.create(null, emptyParagraph());
    expect(isVisuallyEmpty(toggle, CONTAINER_PLACEHOLDER_TYPES)).toBe(true);
  });

  it("treats toggle with text as non-empty", () => {
    const toggle = schema.nodes.toggleBlock.create(null, paragraphWithText("x"));
    expect(isVisuallyEmpty(toggle, CONTAINER_PLACEHOLDER_TYPES)).toBe(false);
  });

  it("treats callout with nested empty blocks as empty", () => {
    const callout = schema.nodes.callout.create(
      null,
      Fragment.from([emptyParagraph(), emptyParagraph()]),
    );
    expect(isVisuallyEmpty(callout)).toBe(true);
  });
});
