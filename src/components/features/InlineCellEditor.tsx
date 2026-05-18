'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import {
  type SelectOption,
  normalizeOption,
  getOptionColor,
  getOptionColorByValue,
} from '@/lib/types/properties';

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
  const [inputValue, setInputValue] = useState(value ?? '');
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (mounted && (column.type === 'date' || column.type === 'datetime') && dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        // Fallback for browsers that do not support it
      }
    }
  }, [mounted, column.type]);

  const handleTextSave = () => {
    onSave(inputValue);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (column.type === 'select') {
    if (!mounted) {
      return <div ref={containerRef} className="relative min-h-5" />;
    }
    const c = value ? getOptionColorByValue(column.options || [], value) : null;

    return (
      <div ref={containerRef} className="relative w-full h-full">
        {value ? (
          <span className="text-xs px-1.5 py-0.5 rounded-sm inline-block" style={{ backgroundColor: c?.bg, color: c?.text }}>
            {value}
          </span>
        ) : (
          <span className="text-neutral-700">—</span>
        )}
        {createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <div className="fixed inset-0 z-9998 cursor-default" onClick={onClose} />
            <div
              className="absolute z-9999 bg-neutral-900 border border-neutral-800 py-1 rounded shadow-xl overflow-hidden min-w-40 max-h-60 overflow-y-auto text-left"
              style={{
                top: coords ? coords.top + 4 : 0,
                left: coords ? coords.left : 0,
                width: coords ? Math.max(160, coords.width) : 160,
                visibility: coords ? 'visible' : 'hidden',
              }}
            >
              <button
                onClick={() => {
                  onSave('');
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Empty
              </button>
              {(column.options || []).map((rawOpt: string | SelectOption) => {
                const opt = normalizeOption(rawOpt);
                const c = getOptionColor(opt);
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSave(opt.value);
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 transition-colors cursor-pointer ${
                      isSelected ? 'bg-neutral-850' : ''
                    }`}
                  >
                    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded" style={{ backgroundColor: c.bg, color: c.text }}>
                      {opt.value}
                    </span>
                    {isSelected && <Check size={12} className="text-neutral-400" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  if (column.type === 'multi_select') {
    const currentList = Array.isArray(value) ? value : [];
    const handleToggle = (optVal: string) => {
      const newList = currentList.includes(optVal)
        ? currentList.filter((v: string) => v !== optVal)
        : [...currentList, optVal];
      onSave(newList);
    };

    if (!mounted) {
      return <div ref={containerRef} className="relative min-h-5" />;
    }

    return (
      <div ref={containerRef} className="relative w-full h-full">
        <span className="flex flex-wrap gap-1">
          {currentList.length > 0 ? (
            currentList.map((optVal: string) => {
              const c = getOptionColorByValue(column.options || [], optVal);
              return (
                <span key={optVal} className="text-xs px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: c.bg, color: c.text }}>
                  {optVal}
                </span>
              );
            })
          ) : (
            <span className="text-neutral-700">—</span>
          )}
        </span>
        {createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <div className="fixed inset-0 z-9998 cursor-default" onClick={onClose} />
            <div
              className="absolute z-9999 bg-neutral-900 border border-neutral-800 py-1 rounded shadow-xl overflow-hidden min-w-45 max-h-60 overflow-y-auto text-left"
              style={{
                top: coords ? coords.top + 4 : 0,
                left: coords ? coords.left : 0,
                width: coords ? Math.max(180, coords.width) : 180,
                visibility: coords ? 'visible' : 'hidden',
              }}
            >
              <div className="px-3 py-1 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-850 mb-1">
                Toggle Options
              </div>
              {(column.options || []).map((rawOpt: string | SelectOption) => {
                const opt = normalizeOption(rawOpt);
                const c = getOptionColor(opt);
                const isSelected = currentList.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-neutral-800 transition-colors cursor-pointer ${
                      isSelected ? 'bg-neutral-850' : ''
                    }`}
                  >
                    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded" style={{ backgroundColor: c.bg, color: c.text }}>
                      {opt.value}
                    </span>
                    {isSelected && <Check size={12} className="text-neutral-400" />}
                  </button>
                );
              })}
              {(!column.options || column.options.length === 0) && (
                <div className="px-3 py-2 text-xs text-neutral-600">No options configured</div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

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

  if (column.type === 'date' || column.type === 'datetime') {
    return (
      <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
        <input
          ref={dateInputRef}
          type={column.type === 'datetime' ? 'datetime-local' : 'date'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleTextSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="bg-transparent text-white text-xs w-full focus:outline-none border-none p-0 m-0 scheme-dark cursor-pointer"
          style={{ fontFamily: 'inherit' }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
      <input
        type={column.type === 'number' ? 'number' : 'text'}
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
