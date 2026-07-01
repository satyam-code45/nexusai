import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PageBlockView } from "../PageBlockView";

export const PageBlock = Node.create({
  name: "pageBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      docId: {
        default: "",
        parseHTML: el => el.getAttribute("data-doc-id") ?? "",
        renderHTML: attrs => ({ "data-doc-id": attrs.docId }),
      },
      title: {
        default: "",
        parseHTML: el => el.getAttribute("data-title") ?? "",
        renderHTML: attrs => ({ "data-title": attrs.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "page-block" }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBlockView);
  },
});
