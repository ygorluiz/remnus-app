'use client';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import tippy, { type Instance } from 'tippy.js';
import EmojiList from './EmojiList';
import { EMOJI_LIST, type EmojiEntry } from './emojiData';

function searchEmoji(query: string): EmojiEntry[] {
  if (!query) return EMOJI_LIST.slice(0, 40);
  const q = query.toLowerCase();
  return EMOJI_LIST.filter(
    (e) => e.name.includes(q) || e.keywords.some((k) => k.includes(q))
  ).slice(0, 40);
}

// Inline ":" emoji picker (Slack/Notion-style): typing ":" opens a searchable
// emoji list; selecting one replaces ":query" with the plain emoji character
// so it round-trips through markdown as ordinary unicode text.
export const EmojiSuggestion = Extension.create({
  name: 'emojiSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion<EmojiEntry>({
        editor: this.editor,
        pluginKey: new PluginKey('emojiSuggestion'),
        char: ':',
        command: ({ editor, range, props }) => {
          const item = props as EmojiEntry;
          editor.chain().focus().deleteRange(range).insertContent(item.emoji + ' ').run();
        },

        items: ({ query }: { query: string }) => searchEmoji(query),

        render: () => {
          let component: ReactRenderer<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }>;
          let popup: Instance[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(EmojiList, {
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
