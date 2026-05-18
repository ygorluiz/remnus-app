'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GripVertical, Settings, Trash2 } from 'lucide-react';

function getEffectiveGroupOrder(options: string[], groupOrder: string[]): string[] {
  if (!groupOrder || groupOrder.length === 0) return options;
  const optSet = new Set(options);
  const ordered = groupOrder.filter((g) => optSet.has(g));
  const extras = options.filter((o) => !groupOrder.includes(o));
  return [...ordered, ...extras];
}

export default function KanbanBoard({
  database,
  pages,
  groupByCol,
  groupOrder,
  onGroupOrderChange,
  onCardClick,
  onCardMove,
  onDeletePage,
  hasSorts,
}: {
  database: any;
  pages: any[];
  groupByCol: string;
  groupOrder: string[];
  onGroupOrderChange: (order: string[]) => void;
  onCardClick: (pageId: string) => void;
  onCardMove: (pageId: string, targetGroupId: string, targetPageId?: string) => void;
  onDeletePage: (pageId: string) => void;
  hasSorts: boolean;
}) {
  const router = useRouter();
  const schema = database.schema as any[];

  const groupColumn = schema.find((col) => col.id === groupByCol);
  const options: string[] = groupColumn?.options ?? [];
  const orderedOptions = getEffectiveGroupOrder(options, groupOrder);
  const allColumns = [...orderedOptions, 'Uncategorized'];

  const groupedPages: Record<string, any[]> = {};
  allColumns.forEach((col) => { groupedPages[col] = []; });
  pages.forEach((page) => {
    const val = page.properties[groupByCol];
    if (val && options.includes(val)) {
      groupedPages[val].push(page);
    } else {
      groupedPages['Uncategorized'].push(page);
    }
  });

  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  // Card dragging states
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverColumnName, setDragOverColumnName] = useState<string | null>(null);
  const [isCardDragReady, setIsCardDragReady] = useState(false);
  const [activeMenuCardId, setActiveMenuCardId] = useState<string | null>(null);

  const handleGroupDragStart = (e: React.DragEvent, group: string) => {
    if (group === 'Uncategorized') return;
    setDraggedGroup(group);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGroupDragOver = (e: React.DragEvent, group: string) => {
    e.preventDefault();
    if (draggedGroup && draggedGroup !== group && group !== 'Uncategorized') {
      setDragOverGroup(group);
    }
  };

  const handleGroupDrop = (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault();
    if (!draggedGroup || draggedGroup === targetGroup || targetGroup === 'Uncategorized') {
      setDraggedGroup(null);
      setDragOverGroup(null);
      return;
    }

    const current = orderedOptions;
    const fromIdx = current.indexOf(draggedGroup);
    const toIdx = current.indexOf(targetGroup);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newOrder = [...current];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      onGroupOrderChange(newOrder);
    }

    setDraggedGroup(null);
    setDragOverGroup(null);
  };

  const handleGroupDragEnd = () => {
    setDraggedGroup(null);
    setDragOverGroup(null);
  };

  // Card drag and drop handlers
  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragOver = (e: React.DragEvent, targetCardId: string, columnName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCardId && draggedCardId !== targetCardId) {
      setDragOverCardId(targetCardId);
      setDragOverColumnName(columnName);
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetCardId: string, targetColumnName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const cardId = draggedCardId || e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    onCardMove(cardId, targetColumnName, targetCardId);

    setDraggedCardId(null);
    setDragOverCardId(null);
    setDragOverColumnName(null);
    setIsCardDragReady(false);
  };

  const handleCardDragEnd = () => {
    setDraggedCardId(null);
    setDragOverCardId(null);
    setDragOverColumnName(null);
    setIsCardDragReady(false);
  };

  const handleColumnCardAreaDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    if (draggedCardId) {
      setDragOverColumnName(columnName);
    }
  };

  const handleColumnCardAreaDrop = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    const cardId = draggedCardId || e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    onCardMove(cardId, columnName);

    setDraggedCardId(null);
    setDragOverCardId(null);
    setDragOverColumnName(null);
    setIsCardDragReady(false);
  };

  if (!groupByCol) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-600 text-sm">
        Select a property to group by using the &ldquo;Group by&rdquo; selector above.
      </div>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full items-start">
      {allColumns.map((columnName) => {
        const isUncategorized = columnName === 'Uncategorized';
        const isDraggingThis = draggedGroup === columnName;
        const isOver = dragOverGroup === columnName;

        return (
          <div
            key={columnName}
            draggable={!isUncategorized}
            onDragStart={(e) => handleGroupDragStart(e, columnName)}
            onDragOver={(e) => handleGroupDragOver(e, columnName)}
            onDrop={(e) => handleGroupDrop(e, columnName)}
            onDragEnd={handleGroupDragEnd}
            className={`flex-shrink-0 w-68 flex flex-col max-h-full transition-opacity ${
              isDraggingThis ? 'opacity-30' : ''
            } ${isOver ? 'ring-1 ring-blue-500/40 rounded' : ''}`}
          >
            <div
              className={`pb-2 mb-1 flex justify-between items-baseline border-b border-neutral-800/50 ${
                !isUncategorized ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
            >
              <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                {isUncategorized ? 'No Status' : columnName}
              </h3>
              <span className="text-xs text-neutral-700 tabular-nums">
                {groupedPages[columnName].length}
              </span>
            </div>

            <div
              onDragOver={(e) => handleColumnCardAreaDragOver(e, columnName)}
              onDrop={(e) => handleColumnCardAreaDrop(e, columnName)}
              className={`flex-1 overflow-y-auto flex flex-col min-h-20 transition-colors ${
                dragOverColumnName === columnName && !dragOverCardId ? 'bg-neutral-800/10' : ''
              }`}
            >
              {groupedPages[columnName].length === 0 ? (
                <div className="text-xs text-neutral-700 py-4">No pages</div>
              ) : (
                groupedPages[columnName].map((page) => (
                  <div
                    key={page.id}
                    onClick={() => onCardClick(page.id)}
                    draggable={isCardDragReady}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleCardDragStart(e, page.id);
                    }}
                    onDragOver={(e) => handleCardDragOver(e, page.id, columnName)}
                    onDrop={(e) => handleCardDrop(e, page.id, columnName)}
                    onDragEnd={handleCardDragEnd}
                    className={`relative py-3 px-3 mb-1.5 bg-neutral-800/40 cursor-pointer hover:bg-neutral-800/70 transition-colors group
                      ${draggedCardId === page.id ? 'opacity-25' : ''}
                      ${dragOverCardId === page.id ? 'border-t-2 border-t-blue-500/60' : ''}
                    `}
                  >
                    {/* Hover Card Actions */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                      {/* Settings button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuCardId(activeMenuCardId === page.id ? null : page.id);
                        }}
                        className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-200 transition-colors rounded-sm cursor-pointer"
                        title="Page actions"
                      >
                        <Settings size={12} />
                      </button>
                      {/* Drag handle */}
                      <button
                        draggable={true}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleCardDragStart(e, page.id);
                        }}
                        onMouseDown={() => {
                          setIsCardDragReady(true);
                        }}
                        onMouseLeave={() => {
                          setIsCardDragReady(false);
                        }}
                        className="p-1 text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing transition-colors rounded-sm"
                        title="Drag to move"
                      >
                        <GripVertical size={12} />
                      </button>
                    </div>

                    {/* Card Dropdown Menu */}
                    {activeMenuCardId === page.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20 cursor-default"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuCardId(null);
                          }}
                        />
                        <div className="absolute right-0 top-7 z-30 bg-neutral-900 border border-neutral-800 shadow-xl py-1 w-36 rounded-none text-left animate-fade-in animate-duration-100" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this page?')) {
                                onDeletePage(page.id);
                              }
                              setActiveMenuCardId(null);
                            }}
                            className="w-full px-3 py-2 text-xs text-red-400 hover:bg-neutral-800 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Trash2 size={13} />
                            <span>Delete page</span>
                          </button>
                        </div>
                      </>
                    )}

                    <h4 className="text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors pr-12">
                      {page.properties['title'] || 'Untitled'}
                    </h4>

                    <div className="mt-1.5 flex flex-col gap-0.5">
                      {schema
                        .filter((c) => c.id !== 'title' && c.id !== groupByCol)
                        .slice(0, 2)
                        .map((c) => {
                          const val = page.properties[c.id];
                          const isEmpty =
                            val === undefined ||
                            val === null ||
                            val === '' ||
                            (Array.isArray(val) && val.length === 0);
                          if (isEmpty) return null;

                          let display: React.ReactNode;
                          if (c.type === 'multi_select' && Array.isArray(val)) {
                            display = (
                              <span className="flex flex-wrap gap-1">
                                {val.map((opt: string) => (
                                  <span
                                    key={opt}
                                    className="bg-neutral-700/50 text-neutral-400 text-xs px-1.5 py-0 rounded"
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </span>
                            );
                          } else if (c.type === 'date' && val) {
                            const d = new Date(val);
                            display = (
                              <span className="text-neutral-500 truncate">
                                {isNaN(d.getTime())
                                  ? val
                                  : d.toLocaleDateString('en-US', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                              </span>
                            );
                          } else if (c.type === 'datetime' && val) {
                            const d = new Date(val);
                            display = (
                              <span className="text-neutral-500 truncate">
                                {isNaN(d.getTime())
                                  ? val
                                  : d.toLocaleString('en-US', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                              </span>
                            );
                          } else {
                            display = (
                              <span className="text-neutral-500 truncate">{String(val)}</span>
                            );
                          }

                          return (
                            <div key={c.id} className="text-xs flex items-center gap-1.5">
                              <span className="text-neutral-700 shrink-0">{c.name}</span>
                              {display}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
