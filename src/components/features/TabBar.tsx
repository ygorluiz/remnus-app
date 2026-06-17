'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PageIcon from './PageIcon';
import { useTabs, type Tab } from '@/components/providers/TabsContext';

export default function TabBar() {
  const tabs = useTabs();
  const t = useTranslations('Layout');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  if (!tabs || tabs.tabs.length === 0) return null;

  const { tabs: list, activeId, resolveMeta, activateTab, closeTab, closeOthers, closeAll, reorderTabs, openInNewTab } = tabs;

  const displayMeta = (tab: Tab) => {
    const live = resolveMeta(tab.href);
    return {
      title: live?.title || tab.title || t('tabUntitled'),
      icon: live ? live.icon : tab.icon,
      iconColor: live ? live.iconColor : tab.iconColor,
      isDatabase: tab.href.startsWith('/db/') && tab.href.split('/').filter(Boolean).length === 2,
    };
  };

  return (
    <div className="shrink-0 flex items-stretch h-9 bg-neutral-900 border-b border-neutral-800 select-none">
      <div className="flex-1 flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((tab) => {
          const meta = displayMeta(tab);
          const isActive = tab.id === activeId;
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={() => setDragId(tab.id)}
              onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== tab.id) setOverId(tab.id); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== tab.id) reorderTabs(dragId, tab.id);
                setDragId(null);
                setOverId(null);
              }}
              onClick={() => activateTab(tab.id)}
              onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.id); } }}
              onContextMenu={(e) => { e.preventDefault(); setMenu({ id: tab.id, x: e.clientX, y: e.clientY }); }}
              title={meta.title}
              className={`group/tab relative flex items-center gap-1.5 pl-3 pr-2 max-w-[200px] min-w-[120px] cursor-default border-r border-neutral-800 transition-colors ${
                isActive ? 'bg-neutral-850 text-neutral-50' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800/40'
              } ${overId === tab.id ? 'border-l-2 border-l-blue-500' : ''}`}
            >
              <PageIcon
                icon={meta.icon}
                iconColor={meta.iconColor}
                size={14}
                fallbackType={meta.isDatabase ? 'database' : 'page'}
              />
              <span className="truncate flex-1 min-w-0 text-xs">{meta.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                title={t('tabClose')}
                className="shrink-0 p-0.5 rounded text-neutral-500 hover:text-neutral-100 hover:bg-neutral-700 opacity-0 group-hover/tab:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => openInNewTab('/app')}
        title={t('tabNewTooltip')}
        className="shrink-0 px-2.5 flex items-center justify-center text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800/40 border-l border-neutral-800 transition-colors"
      >
        <Plus size={15} />
      </button>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[120] min-w-[160px] bg-neutral-900 border border-neutral-800 rounded-md py-1 shadow-xl text-xs"
          style={{ top: menu.y, left: menu.x }}
        >
          <button
            onClick={() => { closeTab(menu.id); setMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50"
          >
            {t('tabClose')}
          </button>
          <button
            onClick={() => { closeOthers(menu.id); setMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50"
          >
            {t('tabCloseOthers')}
          </button>
          <button
            onClick={() => { closeAll(); setMenu(null); }}
            className="w-full text-left px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50"
          >
            {t('tabCloseAll')}
          </button>
        </div>
      )}
    </div>
  );
}
