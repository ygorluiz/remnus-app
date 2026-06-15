'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckSquare, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type SelectOption,
  type StatusGroup,
  normalizeOption,
  getOptionColor,
  getOptionColorByValue,
  getStatusGroup,
  STATUS_GROUP_ORDER,
  formatDateValue,
} from '@/lib/types/properties';
import DateRangePicker from './DateRangePicker';
import { useMembers } from './MembersContext';
import { StatusChip, StatusIcon, UserAvatar, UserChip, UserTags } from './PropertyTags';

export default function InlineCellEditor({
  column,
  value,
  onSave,
  onClose,
}: {
  column: any;
  value: any;
  onSave: (val: any) => void;
  onClose: () => void;
}) {
  const t = useTranslations('Database');
  const members = useMembers();
  const [inputValue, setInputValue] = useState(value ?? '');
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setAnchorRect(rect);
      const DROPDOWN_H = 244;
      const MARGIN = 4;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= DROPDOWN_H
        ? rect.bottom + window.scrollY + MARGIN
        : rect.top + window.scrollY - DROPDOWN_H - MARGIN;
      setCoords({ top, left: rect.left + window.scrollX, width: rect.width });
    }
  }, []);

  const handleTextSave = () => { onSave(inputValue); onClose(); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTextSave();
    else if (e.key === 'Escape') onClose();
  };

  // ── SELECT ─────────────────────────────────────────────────────────────────
  if (column.type === 'select') {
    if (!mounted) return <div ref={containerRef} className="relative min-h-5" />;
    const c = value ? getOptionColorByValue(column.options || [], value) : null;
    return (
      <div ref={containerRef} className="relative w-full h-full">
        {value
          ? <span className="text-xs px-2 py-0.5 rounded-full font-medium inline-block" style={{ backgroundColor: c?.bg, color: c?.text }}>{value}</span>
          : <span className="text-neutral-700">—</span>
        }
        {createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <div className="fixed inset-0 z-9998 cursor-default" onClick={onClose} />
            <div
              className="absolute z-9999 bg-neutral-850 border border-neutral-800 py-1 rounded shadow-xl overflow-hidden min-w-40 max-h-60 overflow-y-auto text-left"
              style={{ top: coords?.top ?? 0, left: coords?.left ?? 0, width: coords ? Math.max(160, coords.width) : 160, visibility: coords ? 'visible' : 'hidden' }}
            >
              <button onClick={() => { onSave(''); onClose(); }} className="w-full text-left px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer">
                {t('empty')}
              </button>
              {(column.options || []).map((rawOpt: string | SelectOption) => {
                const opt = normalizeOption(rawOpt);
                const c = getOptionColor(opt);
                const isSelected = value === opt.value;
                return (
                  <button key={opt.value} onClick={() => { onSave(opt.value); onClose(); }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 transition-colors cursor-pointer ${isSelected ? 'bg-neutral-850' : ''}`}>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium" style={{ backgroundColor: c.bg, color: c.text }}>{opt.value}</span>
                    {isSelected && <Check size={12} className="text-neutral-400" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
      </div>
    );
  }

  // ── MULTI-SELECT ──────────────────────────────────────────────────────────
  if (column.type === 'multi_select') {
    const currentList = Array.isArray(value) ? value : [];
    const handleToggle = (optVal: string) => {
      const newList = currentList.includes(optVal)
        ? currentList.filter((v: string) => v !== optVal)
        : [...currentList, optVal];
      onSave(newList);
    };
    if (!mounted) return <div ref={containerRef} className="relative min-h-5" />;
    return (
      <div ref={containerRef} className="relative w-full h-full">
        <span className="flex flex-wrap gap-1">
          {currentList.length > 0
            ? currentList.map((optVal: string) => {
                const c = getOptionColorByValue(column.options || [], optVal);
                return <span key={optVal} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: c.bg, color: c.text }}>{optVal}</span>;
              })
            : <span className="text-neutral-700">—</span>
          }
        </span>
        {createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <div className="fixed inset-0 z-9998 cursor-default" onClick={onClose} />
            <div
              className="absolute z-9999 bg-neutral-850 border border-neutral-800 py-1 rounded shadow-xl overflow-hidden min-w-45 max-h-60 overflow-y-auto text-left"
              style={{ top: coords?.top ?? 0, left: coords?.left ?? 0, width: coords ? Math.max(180, coords.width) : 180, visibility: coords ? 'visible' : 'hidden' }}
            >
              <div className="px-3 py-1 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-850 mb-1">
                {t('toggleOptions')}
              </div>
              {(column.options || []).map((rawOpt: string | SelectOption) => {
                const opt = normalizeOption(rawOpt);
                const c = getOptionColor(opt);
                const isSelected = currentList.includes(opt.value);
                return (
                  <button key={opt.value} onClick={() => handleToggle(opt.value)}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 transition-colors cursor-pointer ${isSelected ? 'bg-neutral-850' : ''}`}>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium" style={{ backgroundColor: c.bg, color: c.text }}>{opt.value}</span>
                    {isSelected && <Check size={12} className="text-neutral-400" />}
                  </button>
                );
              })}
              {(!column.options || column.options.length === 0) && (
                <div className="px-3 py-2 text-xs text-neutral-600">{t('noOptionsConfigured')}</div>
              )}
            </div>
          </div>,
          document.body,
        )}
      </div>
    );
  }

  // ── STATUS ────────────────────────────────────────────────────────────────
  if (column.type === 'status') {
    if (!mounted) return <div ref={containerRef} className="relative min-h-5" />;
    const opts = (column.options || []).map(normalizeOption);
    const grouped: Record<StatusGroup, SelectOption[]> = { todo: [], in_progress: [], complete: [] };
    opts.forEach((o: SelectOption) => grouped[getStatusGroup(o)].push(o));
    const groupLabel: Record<StatusGroup, string> = {
      todo: t('statusGroupTodo'),
      in_progress: t('statusGroupInProgress'),
      complete: t('statusGroupComplete'),
    };
    return (
      <div ref={containerRef} className="relative w-full h-full">
        {value ? <StatusChip value={value} options={column.options} /> : <span className="text-neutral-700">—</span>}
        {createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <div className="fixed inset-0 z-9998 cursor-default" onClick={onClose} />
            <div
              className="absolute z-9999 bg-neutral-850 border border-neutral-800 py-1 rounded shadow-xl overflow-hidden min-w-48 max-h-72 overflow-y-auto text-left"
              style={{ top: coords?.top ?? 0, left: coords?.left ?? 0, width: coords ? Math.max(192, coords.width) : 192, visibility: coords ? 'visible' : 'hidden' }}
            >
              <button onClick={() => { onSave(''); onClose(); }} className="w-full text-left px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer">
                {t('empty')}
              </button>
              {STATUS_GROUP_ORDER.map((g) => grouped[g].length > 0 && (
                <div key={g}>
                  <div className="px-3 pt-1.5 pb-0.5 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">{groupLabel[g]}</div>
                  {grouped[g].map((opt) => {
                    const c = getOptionColor(opt);
                    const isSelected = value === opt.value;
                    return (
                      <button key={opt.value} onClick={() => { onSave(opt.value); onClose(); }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 transition-colors cursor-pointer ${isSelected ? 'bg-neutral-850' : ''}`}>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full font-medium" style={{ backgroundColor: c.bg, color: c.text }}>
                          <StatusIcon group={g} color={c.dot} size={12} />
                          {opt.value}
                        </span>
                        {isSelected && <Check size={12} className="text-neutral-400" />}
                      </button>
                    );
                  })}
                </div>
              ))}
              {opts.length === 0 && (
                <div className="px-3 py-2 text-xs text-neutral-600">{t('noOptionsConfigured')}</div>
              )}
            </div>
          </div>,
          document.body,
        )}
      </div>
    );
  }

  // ── USER / MULTI-USER ─────────────────────────────────────────────────────
  if (column.type === 'user' || column.type === 'multi_user') {
    if (!mounted) return <div ref={containerRef} className="relative min-h-5" />;
    const isMulti = column.type === 'multi_user';
    const currentList: string[] = isMulti
      ? (Array.isArray(value) ? value : [])
      : (value ? [String(value)] : []);
    const toggle = (id: string) => {
      if (isMulti) {
        const next = currentList.includes(id) ? currentList.filter((x) => x !== id) : [...currentList, id];
        onSave(next);
      } else {
        onSave(currentList[0] === id ? '' : id);
        onClose();
      }
    };
    return (
      <div ref={containerRef} className="relative w-full h-full">
        {currentList.length > 0
          ? (isMulti ? <UserTags value={currentList} /> : <UserChip userId={currentList[0]} />)
          : <span className="text-neutral-700">—</span>}
        {createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <div className="fixed inset-0 z-9998 cursor-default" onClick={onClose} />
            <div
              className="absolute z-9999 bg-neutral-850 border border-neutral-800 py-1 rounded shadow-xl overflow-hidden min-w-52 max-h-72 overflow-y-auto text-left"
              style={{ top: coords?.top ?? 0, left: coords?.left ?? 0, width: coords ? Math.max(208, coords.width) : 208, visibility: coords ? 'visible' : 'hidden' }}
            >
              {!isMulti && (
                <button onClick={() => { onSave(''); onClose(); }} className="w-full text-left px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer">
                  {t('unassigned')}
                </button>
              )}
              {members.length === 0 && (
                <div className="px-3 py-2 text-xs text-neutral-600">{t('noMembers')}</div>
              )}
              {members.map((m) => {
                const isSelected = currentList.includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggle(m.id)}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-neutral-800 transition-colors cursor-pointer ${isSelected ? 'bg-neutral-850' : ''}`}>
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <UserAvatar member={m} size={18} />
                      <span className="text-xs text-neutral-200 truncate">{m.name || m.email}</span>
                    </span>
                    {isSelected && <Check size={12} className="text-neutral-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
      </div>
    );
  }

  // ── TITLE ─────────────────────────────────────────────────────────────────
  if (column.id === 'title') {
    return (
      <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleTextSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="bg-transparent text-neutral-200 font-medium text-sm w-full focus:outline-none border-none p-0 m-0"
          style={{ fontFamily: 'inherit' }}
        />
      </div>
    );
  }

  // ── CHECKBOX ─────────────────────────────────────────────────────────────
  if (column.type === 'checkbox') {
    const isChecked = value === true || value === 'true';
    return (
      <div className="relative w-full flex items-center cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onSave(!isChecked); onClose(); }}>
        {isChecked
          ? <CheckSquare size={14} className="text-blue-400" />
          : <Square size={14} className="text-neutral-500" />
        }
      </div>
    );
  }

  // ── DATE / DATETIME ───────────────────────────────────────────────────────
  if (column.type === 'date' || column.type === 'datetime') {
    if (!mounted) return <div ref={containerRef} className="relative min-h-5 w-full" />;
    const displayVal = typeof value === 'string' ? value : '';
    return (
      <div ref={containerRef} className="relative w-full">
        <span className="text-xs text-neutral-400 pointer-events-none">
          {displayVal ? formatDateValue(displayVal, column.type as 'date' | 'datetime', column.dateFormat) : '—'}
        </span>
        <DateRangePicker
          value={displayVal}
          showTime={column.type === 'datetime'}
          anchorRect={anchorRect}
          onChange={onSave}
          onClose={onClose}
        />
      </div>
    );
  }

  // ── TEXT / NUMBER / URL / EMAIL / PHONE ───────────────────────────────────
  return (
    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
      <input
        type={column.type === 'number' ? 'number' : column.type === 'url' ? 'url' : column.type === 'email' ? 'email' : column.type === 'phone' ? 'tel' : 'text'}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleTextSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className="bg-transparent text-white text-xs w-full focus:outline-none border-none p-0 m-0"
        style={{ fontFamily: 'inherit' }}
      />
    </div>
  );
}
