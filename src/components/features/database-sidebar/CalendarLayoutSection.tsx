'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { GripVertical, ArrowLeft, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { getPropertyIcon, Checkbox, selectCls, CollapsibleSection } from './shared';
import type { SchemaColumn } from '@/lib/templates';

interface CalendarLayoutSectionProps {
  schema: SchemaColumn[];
  dateCol?: string;
  onDateColChange?: (colId: string) => void;
  viewMode?: 'month' | 'week';
  onViewModeChange?: (mode: 'month' | 'week') => void;
  firstDayOfWeek?: 'sunday' | 'monday';
  onFirstDayOfWeekChange?: (day: 'sunday' | 'monday') => void;
  cardColorCol?: string;
  onCardColorColChange?: (colId: string) => void;
  cardBorderSide?: 'left' | 'top' | 'right' | 'bottom';
  onCardBorderSideChange?: (side: 'left' | 'top' | 'right' | 'bottom') => void;
  cardBgCol?: string;
  onCardBgColChange?: (colId: string) => void;
  cardProperties?: string[];
  onCardPropertiesChange?: (props: string[]) => void;
  showPropertyLabels?: boolean;
  onShowPropertyLabelsChange?: (show: boolean) => void;
  propertyTextClamp?: 'truncate' | 'wrap';
  onPropertyTextClampChange?: (clamp: 'truncate' | 'wrap') => void;
}

export default function CalendarLayoutSection({
  schema,
  dateCol,
  onDateColChange,
  viewMode,
  onViewModeChange,
  firstDayOfWeek,
  onFirstDayOfWeekChange,
  cardColorCol,
  onCardColorColChange,
  cardBorderSide = 'left',
  onCardBorderSideChange,
  cardBgCol,
  onCardBgColChange,
  cardProperties,
  onCardPropertiesChange,
  showPropertyLabels = true,
  onShowPropertyLabelsChange,
  propertyTextClamp = 'truncate',
  onPropertyTextClampChange,
}: CalendarLayoutSectionProps) {
  const t = useTranslations('Database');

  const dateColumns = schema.filter((c) => c.type === 'date' || c.type === 'datetime');
  const colorColumns = schema.filter((c) => c.type === 'select' || c.type === 'multi_select' || c.type === 'status');
  const calAvailableCardProps = schema.filter((c) => c.id !== 'title' && c.id !== dateCol);
  const effectiveCalVisible: string[] =
    cardProperties !== undefined
      ? cardProperties.filter((id) => calAvailableCardProps.some((c) => c.id === id))
      : calAvailableCardProps.slice(0, 1).map((c) => c.id);

  const visibleCalCardProps = effectiveCalVisible.map((id) => calAvailableCardProps.find((c) => c.id === id)).filter(Boolean) as SchemaColumn[];
  const hiddenCalCardProps = calAvailableCardProps.filter((c) => !effectiveCalVisible.includes(c.id));

  const toggleCalCardProp = (colId: string) => {
    onCardPropertiesChange?.(
      effectiveCalVisible.includes(colId)
        ? effectiveCalVisible.filter((id) => id !== colId)
        : [...effectiveCalVisible, colId],
    );
  };

  const [draggingCalProp, setDraggingCalProp] = useState<string | null>(null);
  const [dragOverCalProp, setDragOverCalProp] = useState<string | null>(null);

  const handleDrop = (targetColId: string) => {
    if (!draggingCalProp || draggingCalProp === targetColId) return;
    const current = [...effectiveCalVisible];
    const fromIdx = current.indexOf(draggingCalProp);
    const toIdx = current.indexOf(targetColId);
    if (fromIdx !== -1 && toIdx !== -1) {
      const [moved] = current.splice(fromIdx, 1);
      current.splice(toIdx, 0, moved);
      onCardPropertiesChange?.(current);
    }
    setDraggingCalProp(null);
    setDragOverCalProp(null);
  };

  return (
    <>
      {/* Calendar settings */}
      <CollapsibleSection label={t('sectionCalendar')}>
        <div className="px-4 pb-3 flex flex-col gap-2">
          <div>
            <span className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">{t('calendarBy')}</span>
            {dateColumns.length > 0 ? (
              <select value={dateCol} onChange={(e) => onDateColChange?.(e.target.value)} className={`${selectCls} w-full`}>
                <option value="">Select property…</option>
                {dateColumns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            ) : (
              <span className="text-xs text-amber-500/80">{t('addDateForCalendar')}</span>
            )}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <span className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">View</span>
              <select value={viewMode} onChange={(e) => onViewModeChange?.(e.target.value as 'month' | 'week')} className={`${selectCls} w-full`}>
                <option value="month">Month</option>
                <option value="week">Week</option>
              </select>
            </div>
            <div className="flex-1">
              <span className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">{t('weekStart')}</span>
              <select value={firstDayOfWeek || 'sunday'} onChange={(e) => onFirstDayOfWeekChange?.(e.target.value as 'sunday' | 'monday')} className={`${selectCls} w-full`}>
                <option value="sunday">{t('sunday')}</option>
                <option value="monday">{t('monday')}</option>
              </select>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Cards */}
      <CollapsibleSection label={t('sectionCards')}>
        {calAvailableCardProps.length === 0 ? (
          <p className="text-[11px] text-neutral-700 text-center pb-3">{t('noAdditionalProperties')}</p>
        ) : (
          <div className="flex flex-col">
            {visibleCalCardProps.map((col) => (
              <div
                key={col.id}
                draggable
                onDragStart={() => setDraggingCalProp(col.id)}
                onDragOver={(e) => { e.preventDefault(); if (draggingCalProp && draggingCalProp !== col.id) setDragOverCalProp(col.id); }}
                onDrop={() => handleDrop(col.id)}
                onDragEnd={() => { setDraggingCalProp(null); setDragOverCalProp(null); }}
                className={`flex items-center gap-2 px-4 py-2 border-b border-neutral-800/30 hover:bg-neutral-800/10 transition-colors cursor-default ${draggingCalProp === col.id ? 'opacity-30' : ''} ${dragOverCalProp === col.id ? 'border-t-2 border-t-blue-500/50' : ''}`}
              >
                <GripVertical size={11} className="text-neutral-600 cursor-grab shrink-0" />
                {getPropertyIcon(col.type)}
                <span className="flex-1 text-xs text-neutral-300 truncate">{col.name}</span>
                <button onClick={() => toggleCalCardProp(col.id)} className="cursor-pointer"><Checkbox checked={true} /></button>
              </div>
            ))}
            {hiddenCalCardProps.map((col) => (
              <button key={col.id} onClick={() => toggleCalCardProp(col.id)} className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800/30 hover:bg-neutral-800/10 transition-colors cursor-pointer text-left">
                <span className="w-2.75 shrink-0" />
                {getPropertyIcon(col.type)}
                <span className="flex-1 text-xs text-neutral-500 truncate">{col.name}</span>
                <Checkbox checked={false} />
              </button>
            ))}
          </div>
        )}
        <div className="px-4 py-2.5 flex flex-col gap-2">
          <button onClick={() => onShowPropertyLabelsChange?.(!showPropertyLabels)} className="w-full flex items-center justify-between cursor-pointer">
            <span className="text-xs text-neutral-300">{t('showLabels')}</span>
            <Checkbox checked={showPropertyLabels} />
          </button>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-300 shrink-0">{t('propertyText')}</span>
            <select value={propertyTextClamp} onChange={(e) => onPropertyTextClampChange?.(e.target.value as 'truncate' | 'wrap')} className={`${selectCls} w-28 shrink-0 cursor-pointer`}>
              <option value="truncate">{t('truncate')}</option>
              <option value="wrap">{t('wrap')}</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Card colors */}
      {colorColumns.length > 0 && (
        <CollapsibleSection label={t('cardColors')} defaultOpen={false}>
          <div className="px-4 pb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-300 shrink-0">{t('cardBackground')}</span>
              <select value={cardBgCol ?? ''} onChange={(e) => onCardBgColChange?.(e.target.value)} className={`${selectCls} w-32 shrink-0 cursor-pointer truncate`}>
                <option value="">None</option>
                {colorColumns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-300 shrink-0">{t('accentLine')}</span>
              <select value={cardColorCol ?? ''} onChange={(e) => onCardColorColChange?.(e.target.value)} className={`${selectCls} w-32 shrink-0 cursor-pointer truncate`}>
                <option value="">None</option>
                {colorColumns.map((col) => <option key={col.id} value={col.id}>{col.name}</option>)}
              </select>
            </div>
            {cardColorCol && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-neutral-500 shrink-0 pl-3">{t('accentPosition')}</span>
                <div className="flex gap-1">
                  {([
                    { side: 'left', Icon: ArrowLeft },
                    { side: 'top', Icon: ArrowUp },
                    { side: 'right', Icon: ArrowRight },
                    { side: 'bottom', Icon: ArrowDown },
                  ] as const).map(({ side, Icon }) => (
                    <button
                      key={side}
                      onClick={() => onCardBorderSideChange?.(side)}
                      className={`w-7 h-7 flex items-center justify-center border rounded transition-colors cursor-pointer ${
                        cardBorderSide === side
                          ? 'border-blue-500/60 text-blue-400 bg-blue-500/10'
                          : 'border-neutral-700 text-neutral-500 hover:border-neutral-600 hover:text-neutral-400'
                      }`}
                    >
                      <Icon size={12} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}
