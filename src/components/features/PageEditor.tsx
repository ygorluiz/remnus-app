'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { updatePageContent, updatePageProperties } from '@/lib/actions/page';
import { ArrowLeft, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import BlockEditor from '@/components/features/editor/BlockEditor';
import {
  type SelectOption,
  normalizeOption,
  getOptionColorByValue,
  getOptionColor,
} from '@/lib/types/properties';

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function PageEditor({
  database,
  initialPage,
  isPeek = false,
  onClose,
  onPageUpdated,
}: {
  database: any;
  initialPage: any;
  isPeek?: boolean;
  onClose?: () => void;
  onPageUpdated?: (updatedPage: any) => void;
}) {
  const [properties, setProperties] = useState<Record<string, any>>(initialPage.properties || {});
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const selectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openSelectId) return;
    const handler = (e: MouseEvent) => {
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(e.target as Node)) {
        setOpenSelectId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openSelectId]);

  const schema = database.schema as any[];
  const pageTitle = properties['title'] || 'Untitled';

  useEffect(() => {
    if (!isPeek) {
      document.title = `${pageTitle} | Remna`;
    }
  }, [pageTitle, isPeek]);

  const handleContentChange = useMemo(
    () =>
      debounce((md: string) => {
        updatePageContent(initialPage.id, md);
        if (onPageUpdated) {
          onPageUpdated({ ...initialPage, properties, content: md });
        }
      }, 1000),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialPage.id]
  );

  // Debounced save for free-text and number fields
  const debouncedSaveProps = useMemo(
    () =>
      debounce((props: Record<string, any>) => {
        updatePageProperties(initialPage.id, props);
        onPageUpdated?.({ ...initialPage, properties: props });
      }, 600),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialPage.id]
  );

  // For text/number inputs: update state immediately, persist after pause
  const handleTextPropertyChange = (colId: string, value: any) => {
    const newProps = { ...properties, [colId]: value };
    setProperties(newProps);
    debouncedSaveProps(newProps);
  };

  // For discrete controls (select, date, multi_select): save immediately
  const handlePropertyChange = async (colId: string, value: any) => {
    const newProps = { ...properties, [colId]: value };
    setProperties(newProps);
    await updatePageProperties(initialPage.id, newProps);
    if (onPageUpdated) {
      onPageUpdated({ ...initialPage, properties: newProps });
    }
  };

  const handleMultiSelectToggle = async (colId: string, option: string) => {
    const current: string[] = Array.isArray(properties[colId]) ? properties[colId] : [];
    const newVal = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option];
    await handlePropertyChange(colId, newVal);
  };

  return (
    <div className={`${isPeek ? 'p-6 md:p-8 lg:p-10' : 'max-w-4xl mx-auto p-8 lg:p-12'}`}>
      {!isPeek && (
        <Link href={`/db/${database.id}`} className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-10 transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Back to {database.name}
        </Link>
      )}

      {/* Properties Section */}
      <div className="mb-12 space-y-4">
        {schema.map((col) => {
          const val = properties[col.id];

          return (
            <div key={col.id} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8 border-b border-neutral-800/60 pb-3 group">
              <div className="text-neutral-500 w-32 shrink-0 text-sm font-medium group-hover:text-neutral-400 transition-colors pt-1">{col.name}</div>

              {col.id === 'title' ? (
                <input
                  type="text"
                  value={val || ''}
                  onChange={(e) => handleTextPropertyChange(col.id, e.target.value)}
                  placeholder="Untitled"
                  className="bg-transparent text-white focus:outline-none rounded p-1 -ml-1 font-bold text-4xl flex-1 placeholder:text-neutral-800 tracking-tight"
                />
              ) : col.type === 'select' ? (
                <div className="relative flex-1 max-w-xs pt-0.5" ref={openSelectId === col.id ? selectDropdownRef : undefined}>
                  <button
                    onClick={() => setOpenSelectId(openSelectId === col.id ? null : col.id)}
                    className="flex items-center gap-1.5 text-sm focus:outline-none cursor-pointer"
                  >
                    {val ? (() => {
                      const c = getOptionColorByValue(col.options || [], val);
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-sm" style={{ backgroundColor: c.bg, color: c.text }}>
                          {val}
                        </span>
                      );
                    })() : (
                      <span className="text-neutral-600 text-sm">Empty</span>
                    )}
                    <ChevronDown size={12} className="text-neutral-600" />
                  </button>
                  {openSelectId === col.id && (
                    <div className="absolute z-50 top-full left-0 mt-1 bg-neutral-900 border border-neutral-700 min-w-32 py-1" style={{ minWidth: 140 }}>
                      <button
                        onClick={() => { handlePropertyChange(col.id, ''); setOpenSelectId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        Empty
                      </button>
                      {(col.options || []).map((rawOpt: string | SelectOption) => {
                        const opt = normalizeOption(rawOpt);
                        const c = getOptionColor(opt);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => { handlePropertyChange(col.id, opt.value); setOpenSelectId(null); }}
                            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-sm" style={{ backgroundColor: c.bg, color: c.text }}>
                              {opt.value}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : col.type === 'multi_select' ? (
                <div className="flex-1 flex flex-col gap-2 pt-0.5">
                  {Array.isArray(val) && val.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {val.map((optVal: string) => {
                        const c = getOptionColorByValue(col.options || [], optVal);
                        return (
                          <span key={optVal} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm" style={{ backgroundColor: c.bg, color: c.text }}>
                            {optVal}
                            <button
                              onClick={() => handleMultiSelectToggle(col.id, optVal)}
                              className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {col.options && (col.options as (string | SelectOption)[])
                    .filter((o) => !(Array.isArray(val) && val.includes(normalizeOption(o).value))).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(col.options as (string | SelectOption)[])
                        .filter((o) => !(Array.isArray(val) && val.includes(normalizeOption(o).value)))
                        .map((rawOpt) => {
                          const opt = normalizeOption(rawOpt);
                          const c = getOptionColor(opt);
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleMultiSelectToggle(col.id, opt.value)}
                              className="text-xs px-2 py-0.5 rounded-sm border border-neutral-700/40 opacity-50 hover:opacity-80 transition-opacity cursor-pointer"
                              style={{ backgroundColor: c.bg, color: c.text }}
                            >
                              + {opt.value}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : col.type === 'date' ? (
                <input
                  type="date"
                  value={val || ''}
                  onChange={(e) => handlePropertyChange(col.id, e.target.value)}
                  className="bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-neutral-700 rounded p-1 -ml-1 text-sm transition-shadow scheme-dark"
                />
              ) : col.type === 'datetime' ? (
                <input
                  type="datetime-local"
                  value={val || ''}
                  onChange={(e) => handlePropertyChange(col.id, e.target.value)}
                  className="bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-neutral-700 rounded p-1 -ml-1 text-sm transition-shadow scheme-dark"
                />
              ) : (
                <input
                  type={col.type === 'number' ? 'number' : 'text'}
                  value={val || ''}
                  onChange={(e) => handleTextPropertyChange(col.id, e.target.value)}
                  placeholder="Empty"
                  className="bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-neutral-700 rounded p-1 -ml-1 flex-1 text-sm placeholder:text-neutral-700 transition-shadow"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Content Editor */}
      <BlockEditor
        key={initialPage.id}
        initialContent={initialPage.content || ''}
        onChange={handleContentChange}
        placeholder="Press '/' for commands or start writing..."
      />
    </div>
  );
}
