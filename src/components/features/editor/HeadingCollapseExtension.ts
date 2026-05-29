import Heading from '@tiptap/extension-heading';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { ReactNodeViewRenderer } from '@tiptap/react';
import HeadingView from './HeadingView';

export const headingCollapseKey = new PluginKey<{
  collapsed: Set<number>;
  decorations: DecorationSet;
}>('headingCollapse');

function buildDecorations(doc: PMNode, collapsed: Set<number>): DecorationSet {
  if (collapsed.size === 0) return DecorationSet.empty;

  const children: Array<{ node: PMNode; offset: number }> = [];
  doc.forEach((node, offset) => children.push({ node, offset }));

  const decos: Decoration[] = [];

  for (let i = 0; i < children.length; i++) {
    const { node, offset } = children[i];
    if (node.type.name !== 'heading' || !collapsed.has(offset)) continue;

    // Spec decoration on the heading itself → signals the NodeView it's collapsed
    decos.push(Decoration.node(offset, offset + node.nodeSize, {}, { headingIsCollapsed: true }));

    const level = node.attrs.level as number;
    for (let j = i + 1; j < children.length; j++) {
      const s = children[j];
      if (s.node.type.name === 'heading' && (s.node.attrs.level as number) <= level) break;
      decos.push(
        Decoration.node(s.offset, s.offset + s.node.nodeSize, { class: 'heading-collapsed-child' }),
      );
    }
  }

  return DecorationSet.create(doc, decos);
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    headingCollapse: {
      toggleHeadingCollapse: (pos: number) => ReturnType;
    };
  }
}

export const CollapsibleHeading = Heading.configure({ levels: [1, 2, 3] }).extend({
  addNodeView() {
    return ReactNodeViewRenderer(HeadingView);
  },
});

export const HeadingCollapsePlugin = Extension.create({
  name: 'headingCollapse',

  addCommands() {
    return {
      toggleHeadingCollapse:
        (pos: number) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(headingCollapseKey, { toggle: pos });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: headingCollapseKey,
        state: {
          init: () => ({ collapsed: new Set<number>(), decorations: DecorationSet.empty }),
          apply(tr, prev) {
            // Map existing positions through the transaction to keep them stable during edits
            const mapped = new Set<number>();
            for (const p of prev.collapsed) {
              const mp = tr.mapping.map(p);
              if (mp >= 0) mapped.add(mp);
            }
            const meta = tr.getMeta(headingCollapseKey) as { toggle?: number } | undefined;
            if (meta?.toggle !== undefined) {
              if (mapped.has(meta.toggle)) mapped.delete(meta.toggle);
              else mapped.add(meta.toggle);
            }
            return { collapsed: mapped, decorations: buildDecorations(tr.doc, mapped) };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
