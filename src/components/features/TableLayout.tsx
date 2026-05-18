'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GripHorizontal, GripVertical, Settings, Trash2, Type, List, Hash, AlignLeft, Calendar, Clock, Tags } from 'lucide-react';

function getPropertyIcon(type: string) {
  switch (type) {
    case 'text':         return <Type size={11} className="text-neutral-600" />;
    case 'select':       return <List size={11} className="text-neutral-600" />;
    case 'multi_select': return <Tags size={11} className="text-neutral-600" />;
    case 'number':       return <Hash size={11} className="text-neutral-600" />;
    case 'date':         return <Calendar size={11} className="text-neutral-600" />;
    case 'datetime':     return <Clock size={11} className="text-neutral-600" />;
    default:             return <AlignLeft size={11} className="text-neutral-600" />;
  }
}

function formatDate(val: string) {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime())
    ? val
    : d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDatetime(val: string) {
  if (!val) return '';
  const d = new Date(val);
  return isNaN(d.getTime())
    ? val
    : d.toLocaleString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
}

function getVisibleColumns(schema: any[], columnOrder: string[], hiddenColumns: string[]): any[] {
  const hiddenSet = new Set(hiddenColumns ?? []);
  const visible = schema.filter((c) => !hiddenSet.has(c.id));
  if (!columnOrder || columnOrder.length === 0) return visible;

  const orderIndex = new Map(columnOrder.map((id, i) => [id, i]));
  return [...visible].sort((a, b) => {
    const ai = orderIndex.has(a.id) ? orderIndex.get(a.id)! : Infinity;
    const bi = orderIndex.has(b.id) ? orderIndex.get(b.id)! : Infinity;
    return ai - bi;
  });
}

export default function TableLayout({
  database,
  pages,
  columnOrder,
  hiddenColumns,
  onColumnOrderChange,
  onRowClick,
  onRowReorder,
  onDeletePage,
  hasSorts,
}: {
  database: any;
  pages: any[];
  columnOrder: string[];
  hiddenColumns: string[];
  onColumnOrderChange: (order: string[]) => void;
  onRowClick: (pageId: string) => void;
  onRowReorder: (orderedIds: string[]) => void;
  onDeletePage: (pageId: string) => void;
  hasSorts: boolean;
}) {
  const router = useRouter();
  const schema: any[] = database.schema ?? [];

  const visibleCols = getVisibleColumns(schema, columnOrder, hiddenColumns);

  // Column drag and drop states
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Row drag and drop states
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [isDragReady, setIsDragReady] = useState(false);

  // Settings menu state
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedColId !== colId) setDragOverColId(colId);
  };

  const handleDragLeave = (colId: string) => {
    if (dragOverColId === colId) setDragOverColId(null);
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const fromIdx = visibleCols.findIndex((c) => c.id === draggedColId);
    const toIdx = visibleCols.findIndex((c) => c.id === targetColId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newOrder = visibleCols.map((c) => c.id);
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      onColumnOrderChange(newOrder);
    }

    setDraggedColId(null);
    setDragOverColId(null);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };

  // Row drag and drop handlers
  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRowDragOver = (e: React.DragEvent, rowId: string) => {
    e.preventDefault();
    if (draggedRowId !== rowId) {
      setDragOverRowId(rowId);
    }
  };

  const handleRowDragLeave = (rowId: string) => {
    if (dragOverRowId === rowId) {
      setDragOverRowId(null);
    }
  };

  const handleRowDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    if (!draggedRowId || draggedRowId === targetRowId) {
      setDraggedRowId(null);
      setDragOverRowId(null);
      return;
    }

    const fromIdx = pages.findIndex((p) => p.id === draggedRowId);
    const toIdx = pages.findIndex((p) => p.id === targetRowId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newOrder = pages.map((p) => p.id);
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      onRowReorder(newOrder);
    }

    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  const handleRowDragEnd = () => {
    setDraggedRowId(null);
    setDragOverRowId(null);
    setIsDragReady(false);
  };

  return (
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead className="border-b border-neutral-800/60 sticky top-0 z-10">
          <tr>
            {/* Sticky Action Column Header */}
            <th className="w-12 sticky left-0 bg-neutral-950/90 backdrop-blur-xs z-20 border-r border-neutral-800/40"></th>
            
            {visibleCols.map((col, idx) => {
              const isOver = dragOverColId === col.id;
              const isDraggingThis = draggedColId === col.id;
              const isFirst = idx === 0;
              const isLast = idx === visibleCols.length - 1;
              return (
                <th
                  key={col.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.id)}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={() => handleDragLeave(col.id)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  onDragEnd={handleDragEnd}
                  className={`group py-2 font-medium whitespace-nowrap cursor-grab active:cursor-grabbing transition-colors w-48
                    ${isFirst ? 'pl-3 pr-3' : isLast ? 'pl-3 pr-3' : 'px-3'}
                    ${!isLast ? 'border-r border-neutral-800/40' : ''}
                    ${isOver ? 'border-l-2 border-l-blue-500/60' : ''}
                    ${isDraggingThis ? 'opacity-25' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {getPropertyIcon(col.type)}
                      <span className="truncate text-neutral-600 group-hover:text-neutral-400 text-xs uppercase tracking-wider transition-colors">
                        {col.name}
                      </span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-40 text-neutral-600 cursor-grab transition-opacity pl-1">
                      <GripHorizontal size={11} />
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {pages.length === 0 ? (
            <tr>
              <td
                colSpan={visibleCols.length + 1}
                className="py-16 text-center text-neutral-600 text-sm"
              >
                No pages yet. Use "New" to get started.
              </td>
            </tr>
          ) : (
            pages.map((page) => (
              <tr
                key={page.id}
                onClick={() => onRowClick(page.id)}
                draggable={!hasSorts && isDragReady}
                onDragStart={(e) => handleRowDragStart(e, page.id)}
                onDragOver={(e) => handleRowDragOver(e, page.id)}
                onDragLeave={() => handleRowDragLeave(page.id)}
                onDrop={(e) => handleRowDrop(e, page.id)}
                onDragEnd={handleRowDragEnd}
                className={`border-b border-neutral-800/40 hover:bg-neutral-800/20 cursor-pointer transition-colors group
                  ${dragOverRowId === page.id ? 'border-t-2 border-t-blue-500/60' : ''}
                  ${draggedRowId === page.id ? 'opacity-25' : ''}
                `}
              >
                {/* Sticky Action Column Body */}
                <td
                  className="w-12 sticky left-0 bg-neutral-950 group-hover:bg-neutral-900/50 backdrop-blur-xs z-10 text-center select-none pr-0 border-r border-neutral-800/40 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                    {/* Settings button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuRowId(activeMenuRowId === page.id ? null : page.id);
                      }}
                      className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer rounded-sm"
                      title="Page actions"
                    >
                      <Settings size={13} />
                    </button>
                    {/* Drag handle button */}
                    <button
                      draggable={!hasSorts}
                      onDragStart={(e) => {
                        if (hasSorts) {
                          e.preventDefault();
                          return;
                        }
                      }}
                      onMouseDown={() => {
                        if (!hasSorts) setIsDragReady(true);
                      }}
                      onMouseLeave={() => {
                        setIsDragReady(false);
                      }}
                      className={`p-1 text-neutral-600 hover:text-neutral-400 transition-colors rounded-sm ${
                        hasSorts ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing'
                      }`}
                      title={hasSorts ? 'Sorting is active, cannot reorder' : 'Drag to reorder'}
                    >
                      <GripVertical size={13} />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {activeMenuRowId === page.id && (
                    <>
                      {/* Invisible click-away backdrop */}
                      <div
                        className="fixed inset-0 z-20 cursor-default"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuRowId(null);
                        }}
                      />
                      <div className="absolute left-8 top-6 z-30 bg-neutral-900 border border-neutral-800 shadow-xl py-1 w-36 rounded-none text-left animate-fade-in animate-duration-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this page?')) {
                              onDeletePage(page.id);
                            }
                            setActiveMenuRowId(null);
                          }}
                          className="w-full px-3 py-2 text-xs text-red-400 hover:bg-neutral-800 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                          <span>Delete page</span>
                        </button>
                      </div>
                    </>
                  )}
                </td>

                {visibleCols.map((col, idx) => {
                  const val = page.properties[col.id];
                  const isFirst = idx === 0;
                  const isLast = idx === visibleCols.length - 1;
                  return (
                    <td
                      key={col.id}
                      className={`py-2 whitespace-nowrap overflow-hidden text-ellipsis
                        ${isFirst ? 'pl-3 pr-3' : isLast ? 'pl-3 pr-3' : 'px-3'}
                        ${!isLast ? 'border-r border-neutral-800/40' : ''}
                      `}
                    >
                      {col.id === 'title' ? (
                        <span className="font-medium text-neutral-200">{val || 'Untitled'}</span>
                      ) : col.type === 'select' ? (
                        <span className={`text-xs ${val ? 'text-neutral-400' : 'text-neutral-700'}`}>
                          {val || '—'}
                        </span>
                      ) : col.type === 'multi_select' ? (
                        <span className="flex flex-wrap gap-1">
                          {Array.isArray(val) && val.length > 0 ? (
                            val.map((opt: string) => (
                              <span
                                key={opt}
                                className="text-xs bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-700/50"
                              >
                                {opt}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-700">—</span>
                          )}
                        </span>
                      ) : col.type === 'date' ? (
                        <span className="text-xs text-neutral-400">{val ? formatDate(val) : '—'}</span>
                      ) : col.type === 'datetime' ? (
                        <span className="text-xs text-neutral-400">
                          {val ? formatDatetime(val) : '—'}
                        </span>
                      ) : (
                        <span className="text-neutral-500">{val || ''}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
