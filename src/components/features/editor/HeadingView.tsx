'use client';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  node: any;
  getPos: () => number | undefined;
  editor: any;
  decorations: readonly any[];
}

export default function HeadingView({ node, getPos, editor, decorations }: Props) {
  const level = node.attrs.level;
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
  const isCollapsed = decorations.some((d) => d.spec?.headingIsCollapsed === true);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPos();
    if (pos === undefined) return;
    editor.commands.toggleHeadingCollapse(pos);
  };

  return (
    <NodeViewWrapper as={Tag}>
      <button
        contentEditable={false}
        onClick={handleToggle}
        className="heading-collapse-btn"
        aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
        title={isCollapsed ? 'Expand section' : 'Collapse section'}
      >
        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
      </button>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <NodeViewContent as={'span' as any} />
    </NodeViewWrapper>
  );
}
