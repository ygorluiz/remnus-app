'use client';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';
import PagePickerPanel from './PagePickerPanel';
import type { PageLinkItem } from './pageLinkData';

// Imperatively opens the block "Link to page" picker anchored at the current
// editor selection. Used by the slash command — inserts a link-only childBlock
// pointing at the chosen existing page/database.
export function openPagePicker(editor: any) {
  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);

  let popup: Instance[] | null = null;
  let component: ReactRenderer | null = null;

  const close = () => {
    popup?.[0]?.destroy();
    component?.destroy();
    popup = null;
    component = null;
    document.removeEventListener('mousedown', onOutside, true);
  };

  const onOutside = (e: MouseEvent) => {
    const el = component?.element;
    if (el && !el.contains(e.target as Node)) close();
  };

  const handleSelect = (item: PageLinkItem) => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'childBlock',
        attrs: {
          itemId: item.id,
          databaseId: item.databaseId,
          title: item.title,
          itemType: item.type,
          icon: item.icon,
          iconColor: item.iconColor,
          linkOnly: true,
        },
      })
      .run();
    close();
  };

  component = new ReactRenderer(PagePickerPanel, {
    props: { onSelect: handleSelect, onClose: close },
    editor,
  });

  popup = tippy('body', {
    getReferenceClientRect: () =>
      ({
        width: 0,
        height: 0,
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
        right: coords.left,
        x: coords.left,
        y: coords.top,
      }) as DOMRect,
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

  // Defer so the click that opened the picker doesn't immediately close it.
  setTimeout(() => document.addEventListener('mousedown', onOutside, true), 0);
}
