'use client';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy, { type Instance } from 'tippy.js';
import PageMentionList from './PageMentionList';
import { searchPageItems, type PageLinkItem } from './pageLinkData';

// Inline page links: typing "@" opens a searchable picker of existing pages /
// databases. Selecting one inserts a normal inline link mark (href = internal
// route), so it round-trips cleanly through markdown as [Title](/page/id) and is
// clickable — the user never types a URL.
export const PageMention = Extension.create({
  name: 'pageMention',

  addProseMirrorPlugins() {
    return [
      Suggestion<PageLinkItem>({
        editor: this.editor,
        char: '@',
        // Allow spaces in nothing — keep default word matching; query is the
        // text after "@" up to whitespace.
        command: ({ editor, range, props }) => {
          const item = props as PageLinkItem;
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              { type: 'text', text: item.title, marks: [{ type: 'link', attrs: { href: item.href } }] },
              { type: 'text', text: ' ' },
            ])
            .run();
        },

        items: ({ query }: { query: string }) => searchPageItems(query),

        render: () => {
          let component: ReactRenderer<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }>;
          let popup: Instance[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(PageMentionList, {
                props,
                editor: props.editor,
              });
              if (!props.clientRect) return;
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                zIndex: 9999,
                animation: false,
                maxWidth: 'none',
              }) as Instance[];
            },
            onUpdate: (props: any) => {
              component.updateProps(props);
              if (!props.clientRect) return;
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                popup[0]?.hide();
                return true;
              }
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popup[0]?.destroy();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
