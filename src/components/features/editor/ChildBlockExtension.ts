import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ChildBlockView from './ChildBlockView';

export const ChildBlock = Node.create({
  name: 'childBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      workspaceId: null as string | null,
      parentId: null as string | null,
      onImmediateSave: null as ((md: string) => Promise<void>) | null,
    };
  },

  addAttributes() {
    return {
      itemId: { default: null },
      title: { default: 'Untitled' },
      itemType: { default: 'page' },
      icon: { default: null },
      iconColor: { default: null },
    };
  },

  // @tiptap/markdown v3: DOM parseHTML — used by generateJSON inside parseHTMLToken
  parseHTML() {
    return [
      {
        tag: 'div[data-cb-id]',
        priority: 1000,
        getAttrs(el) {
          const e = el as HTMLElement;
          return {
            itemId: e.getAttribute('data-cb-id'),
            itemType: e.getAttribute('data-cb-type') || 'page',
            title: e.getAttribute('data-cb-title') || 'Untitled',
            icon: e.getAttribute('data-cb-icon') || null,
            iconColor: e.getAttribute('data-cb-iconcolor') || null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    return [
      'div',
      {
        'data-cb-id': node.attrs.itemId,
        'data-cb-type': node.attrs.itemType,
        'data-cb-title': node.attrs.title,
        'data-cb-icon': node.attrs.icon || '',
        'data-cb-iconcolor': node.attrs.iconColor || '',
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChildBlockView);
  },

  // @tiptap/markdown v3 serializer — read via getExtensionField(ext, "renderMarkdown")
  // Outputs a <div data-cb-id> block; "div" is in marked's known block-HTML tag list
  // so marked tokenizes it as an HTML block, and parseHTMLToken re-parses it via
  // generateJSON + our parseHTML rule above.
  // @ts-ignore — renderMarkdown is a @tiptap/markdown extension field, not in Tiptap core types
  renderMarkdown(node: any) {
    const { itemId, itemType, title, icon, iconColor } = node.attrs;
    const safeTitle = (title || '').replace(/"/g, '&quot;');
    return `<div data-cb-id="${itemId}" data-cb-type="${itemType}" data-cb-title="${safeTitle}" data-cb-icon="${icon || ''}" data-cb-iconcolor="${iconColor || ''}"></div>`;
  },
});
