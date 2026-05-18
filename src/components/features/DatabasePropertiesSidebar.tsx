'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Columns3, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Trash2, 
  Type, 
  List, 
  Hash, 
  Calendar, 
  Clock, 
  AlignLeft, 
  Tags,
  Database
} from 'lucide-react';
import { updateDatabaseSchema } from '@/lib/actions/database';
import type { 
  DatabaseView, 
  ViewFilter, 
  ViewSort, 
  FilterOperator 
} from '@/lib/types/views';

interface DatabasePropertiesSidebarProps {
  database: any;
  activeView: DatabaseView;
  activeTab: 'properties' | 'layout';
  setActiveTab: (tab: 'properties' | 'layout') => void;
  onClose: () => void;
  
  // Columns visibility & order (Table view only)
  columnOrder: string[];
  hiddenColumns: string[];
  onToggleHideColumn: (colId: string) => void;
  onHiddenColumnsChange: (hidden: string[]) => void;
  
  // Filters & Sorts
  filters: ViewFilter[];
  sorts: ViewSort[];
  onFiltersChange: (filters: ViewFilter[]) => void;
  onSortsChange: (sorts: ViewSort[]) => void;

  // Page Open behavior
  openBehavior: 'center' | 'side' | 'full';
  onOpenBehaviorChange: (behavior: 'center' | 'side' | 'full') => void;

  // Kanban Group by
  groupByCol?: string;
  onGroupByColChange?: (colId: string) => void;

  // Calendar settings
  dateCol?: string;
  onDateColChange?: (colId: string) => void;
  viewMode?: 'month' | 'week';
  onViewModeChange?: (mode: 'month' | 'week') => void;
  firstDayOfWeek?: 'sunday' | 'monday';
  onFirstDayOfWeekChange?: (day: 'sunday' | 'monday') => void;
}

const OPERATORS: { value: FilterOperator; label: string; needsValue: boolean }[] = [
  { value: 'contains',     label: 'contains',         needsValue: true  },
  { value: 'not_contains', label: 'does not contain',  needsValue: true  },
  { value: 'equals',       label: 'is',               needsValue: true  },
  { value: 'not_equals',   label: 'is not',           needsValue: true  },
  { value: 'is_empty',     label: 'is empty',         needsValue: false },
  { value: 'is_not_empty', label: 'is not empty',     needsValue: false },
];

function getPropertyIcon(type: string) {
  switch (type) {
    case 'text':         return <Type size={12} className="text-neutral-500" />;
    case 'select':       return <List size={12} className="text-neutral-500" />;
    case 'multi_select': return <Tags size={12} className="text-neutral-500" />;
    case 'number':       return <Hash size={12} className="text-neutral-500" />;
    case 'date':         return <Calendar size={12} className="text-neutral-500" />;
    case 'datetime':     return <Clock size={12} className="text-neutral-500" />;
    default:             return <AlignLeft size={12} className="text-neutral-500" />;
  }
}

export default function DatabasePropertiesSidebar({
  database,
  activeView,
  activeTab,
  setActiveTab,
  onClose,
  columnOrder,
  hiddenColumns,
  onToggleHideColumn,
  onHiddenColumnsChange,
  filters,
  sorts,
  onFiltersChange,
  onSortsChange,
  openBehavior,
  onOpenBehaviorChange,
  groupByCol,
  onGroupByColChange,
  dateCol,
  onDateColChange,
  viewMode,
  onViewModeChange,
  firstDayOfWeek,
  onFirstDayOfWeekChange,
}: DatabasePropertiesSidebarProps) {
  const [schema, setSchema] = useState<any[]>(() => database.schema || []);
  const [isSavingSchema, setIsSavingSchema] = useState(false);

  useEffect(() => {
    setSchema(database.schema || []);
  }, [database.schema]);

  const isSchemaDirty = JSON.stringify(schema) !== JSON.stringify(database.schema);
  const selectColumns = schema.filter((c: any) => c.type === 'select');
  const dateColumns = schema.filter((c: any) => c.type === 'date' || c.type === 'datetime');

  // --- Schema mutations ---
  const addColumn = () => {
    setSchema([
      ...schema,
      { id: `col_${crypto.randomUUID().slice(0, 8)}`, name: 'New Column', type: 'text', options: [] }
    ]);
  };

  const updateColumn = (index: number, updates: any) => {
    const newSchema = [...schema];
    newSchema[index] = { ...newSchema[index], ...updates };
    setSchema(newSchema);
  };

  const removeColumn = (index: number) => {
    if (schema[index].id === 'title') return; // Cannot delete title
    const newSchema = [...schema];
    newSchema.splice(index, 1);
    setSchema(newSchema);
  };

  const handleSaveSchema = async () => {
    setIsSavingSchema(true);
    await updateDatabaseSchema(database.id, schema);
    setIsSavingSchema(false);
  };

  // --- Filter mutations ---
  const addFilter = () => {
    const col = schema[0];
    if (!col) return;
    onFiltersChange([
      ...filters,
      { id: crypto.randomUUID(), columnId: col.id, operator: 'contains', value: '' },
    ]);
  };

  const updateFilter = (id: string, patch: Partial<ViewFilter>) =>
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const deleteFilter = (id: string) =>
    onFiltersChange(filters.filter((f) => f.id !== id));

  // --- Sort mutations ---
  const addSort = () => {
    const usedIds = new Set(sorts.map((s) => s.columnId));
    const col = schema.find((c) => !usedIds.has(c.id));
    if (!col) return;
    onSortsChange([...sorts, { id: crypto.randomUUID(), columnId: col.id, direction: 'asc' }]);
  };

  const updateSort = (id: string, patch: Partial<ViewSort>) =>
    onSortsChange(sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const deleteSort = (id: string) =>
    onSortsChange(sorts.filter((s) => s.id !== id));

  // --- Columns Visibility ---
  const handleShowAll = () => onHiddenColumnsChange([]);
  const handleHideAll = () => {
    const allIds = schema.map((c) => c.id).filter((id) => id !== 'title');
    onHiddenColumnsChange(allIds);
  };

  const tabs = [
    { id: 'properties', label: 'Properties', icon: Database },
    { id: 'layout',     label: 'Layout',     icon: Settings },
  ] as const;

  return (
    <div className="w-80 shrink-0 bg-neutral-950 border-l border-neutral-800 rounded-none flex flex-col h-full overflow-hidden z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/30">
        <h2 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
          <span>Settings</span>
          <span className="text-[10px] bg-neutral-800 text-neutral-400 font-medium py-0.5 px-2 rounded-none border border-neutral-700/40">
            {activeView.name}
          </span>
        </h2>
        <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 transition-colors p-1 cursor-pointer">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 bg-neutral-950 shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2 text-[10px] font-medium border-b-2 transition-all duration-150 rounded-none cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-neutral-100 bg-neutral-800/10'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/5'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-0">
        {/* --- PROPERTIES / SCHEMA TAB --- */}
        {activeTab === 'properties' && (
          <div className="flex flex-col">
            <button 
              onClick={addColumn}
              className="w-full flex items-center gap-2 py-3 px-4 bg-transparent hover:bg-neutral-800/30 border-b border-neutral-850 text-xs text-neutral-400 hover:text-neutral-200 transition-all font-semibold cursor-pointer text-left"
            >
              <Plus size={13} />
              <span>Add Property</span>
            </button>

            <div className="flex flex-col pb-24 border-t border-neutral-850">
              {schema.map((col, idx) => {
                const isTitle = col.id === 'title';
                return (
                  <div 
                    key={col.id} 
                    className="p-4 bg-transparent border-b border-neutral-850 flex flex-col gap-2.5 relative group/prop hover:bg-neutral-800/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input 
                        type="text" 
                        value={col.name} 
                        onChange={(e) => updateColumn(idx, { name: e.target.value })}
                        disabled={isTitle}
                        placeholder="Property Name"
                        className="bg-transparent text-neutral-200 text-xs font-semibold focus:outline-none focus:border-neutral-700 border-b border-transparent flex-1 py-0.5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-none"
                      />
                      
                      {!isTitle && (
                        <button 
                          onClick={() => removeColumn(idx)}
                          className="text-neutral-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 shrink-0">
                        {getPropertyIcon(col.type)}
                        <span>Type</span>
                      </div>
                      <select
                        value={col.type}
                        onChange={(e) => updateColumn(idx, { type: e.target.value, options: [] })}
                        disabled={isTitle}
                        className="flex-1 bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1 px-1.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <option value="text">Text</option>
                        <option value="select">Select</option>
                        <option value="multi_select">Multi-Select</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="datetime">Date & Time</option>
                      </select>
                    </div>

                    {/* Select/Multi-select options */}
                    {(col.type === 'select' || col.type === 'multi_select') && (
                      <div className="pt-3 mt-1 border-t border-neutral-850/60">
                        <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider block mb-1.5">Options</span>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(col.options || []).map((opt: string, optIdx: number) => (
                            <span 
                              key={optIdx} 
                              className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded-none text-[10px] flex items-center gap-1 border border-neutral-850"
                            >
                              <span>{opt}</span>
                              <button 
                                onClick={() => {
                                  const newOpts = [...(col.options || [])];
                                  newOpts.splice(optIdx, 1);
                                  updateColumn(idx, { options: newOpts });
                                }}
                                className="text-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Add option and press Enter..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val && !(col.options || []).includes(val)) {
                                updateColumn(idx, { options: [...(col.options || []), val] });
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                          className="w-full bg-neutral-950 border border-neutral-850 rounded-none px-2 py-1.5 text-[10px] text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Flat Save Banner */}
            {isSchemaDirty && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end gap-3 z-30 animate-in slide-in-from-bottom duration-200">
                <button 
                  onClick={() => setSchema(database.schema || [])}
                  disabled={isSavingSchema}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors rounded-none cursor-pointer"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveSchema}
                  disabled={isSavingSchema}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-none text-xs font-semibold shadow-md disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSavingSchema ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- LAYOUT TAB --- */}
        {activeTab === 'layout' && (
          <div className="flex flex-col pb-24 divide-y divide-neutral-850">
            {/* Section 1: Page Opening Behavior */}
            <div className="p-4 flex flex-col gap-2 bg-neutral-900/10">
              <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Page Opening Behavior</span>
              <select
                value={openBehavior}
                onChange={(e) => onOpenBehaviorChange(e.target.value as 'center' | 'side' | 'full')}
                className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1.5 px-2.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors cursor-pointer"
              >
                <option value="full">Full page (Default)</option>
                <option value="side">Side peek</option>
                <option value="center">Center peek</option>
              </select>
            </div>

            {/* Section 1.5: Group by (Kanban view only) */}
            {activeView.config.type === 'kanban' && (
              <div className="p-4 flex flex-col gap-2 bg-neutral-900/10">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Group by</span>
                {selectColumns.length > 0 ? (
                  <select
                    value={groupByCol}
                    onChange={(e) => onGroupByColChange?.(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1.5 px-2.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors cursor-pointer"
                  >
                    {selectColumns.map((col: any) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-amber-500/80">
                    Add a Select property to enable grouping
                  </span>
                )}
              </div>
            )}

            {/* Section 1.6: Date Column (Calendar view only) */}
            {activeView.config.type === 'calendar' && (
              <div className="p-4 flex flex-col gap-2 bg-neutral-900/10">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Date Property</span>
                {dateColumns.length > 0 ? (
                  <select
                    value={dateCol}
                    onChange={(e) => onDateColChange?.(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1.5 px-2.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors cursor-pointer"
                  >
                    <option value="">Select a date property...</option>
                    {dateColumns.map((col: any) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-amber-500/80">
                    Add a Date or Date & Time property to enable calendar
                  </span>
                )}
              </div>
            )}

            {/* Section 1.7: View Mode (Calendar view only) */}
            {activeView.config.type === 'calendar' && (
              <div className="p-4 flex flex-col gap-2 bg-neutral-900/10">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Calendar View Mode</span>
                <select
                  value={viewMode}
                  onChange={(e) => onViewModeChange?.(e.target.value as 'month' | 'week')}
                  className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1.5 px-2.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors cursor-pointer"
                >
                  <option value="month">Month</option>
                  <option value="week">Week</option>
                </select>
              </div>
            )}

            {/* Section 1.8: First Day of Week (Calendar view only) */}
            {activeView.config.type === 'calendar' && (
              <div className="p-4 flex flex-col gap-2 bg-neutral-900/10">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Start Week On</span>
                <select
                  value={firstDayOfWeek || 'sunday'}
                  onChange={(e) => onFirstDayOfWeekChange?.(e.target.value as 'sunday' | 'monday')}
                  className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1.5 px-2.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors cursor-pointer"
                >
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                </select>
              </div>
            )}

            {/* Section 2: Columns Visibility (Table view only) */}
            {activeView.config.type === 'table' && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/5">
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Columns</span>
                  <div className="flex gap-2.5">
                    <button onClick={handleShowAll} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer">Show all</button>
                    <button onClick={handleHideAll} className="text-[10px] text-neutral-500 hover:text-neutral-300 font-medium cursor-pointer">Hide all</button>
                  </div>
                </div>

                <div className="flex flex-col border-t border-neutral-850/60">
                  {schema.map((col) => {
                    const isHidden = hiddenColumns.includes(col.id);
                    const isTitle = col.id === 'title';
                    return (
                      <button
                        key={col.id}
                        onClick={() => !isTitle && onToggleHideColumn(col.id)}
                        disabled={isTitle}
                        className={`w-full flex items-center justify-between py-2 px-4 text-left border-b border-neutral-850/30 transition-all rounded-none ${
                          isTitle 
                            ? 'opacity-50 cursor-not-allowed bg-neutral-900/10'
                            : 'hover:bg-neutral-800/15 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getPropertyIcon(col.type)}
                          <span className="text-xs text-neutral-300 font-medium">{col.name}</span>
                        </div>
                        
                        <span className={`w-3.5 h-3.5 rounded-none border flex items-center justify-center transition-all ${
                          !isHidden 
                            ? 'bg-blue-500 border-blue-500 text-white' 
                            : 'border-neutral-700 text-transparent'
                        }`}>
                          {!isHidden && <span className="text-[9px] font-bold leading-none">✓</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Filters */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/5">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Filters</span>
                <button 
                  onClick={addFilter}
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Add Filter</span>
                </button>
              </div>

              {filters.length === 0 ? (
                <p className="text-[11px] text-neutral-600 text-center py-6 border-t border-neutral-850/60">No filters applied.</p>
              ) : (
                <div className="flex flex-col border-t border-neutral-850/60 divide-y divide-neutral-850/40 bg-neutral-900/5">
                  {filters.map((filter) => {
                    const opDef = OPERATORS.find((o) => o.value === filter.operator);
                    return (
                      <div 
                        key={filter.id} 
                        className="p-4 flex flex-col gap-2 relative group/item hover:bg-neutral-800/5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-neutral-500 uppercase font-semibold tracking-wider">Filter rule</span>
                          <button 
                            onClick={() => deleteFilter(filter.id)} 
                            className="text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={filter.columnId}
                            onChange={(e) => updateFilter(filter.id, { columnId: e.target.value })}
                            className="bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1 px-1.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors cursor-pointer"
                          >
                            {schema.map((col) => (
                              <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                          </select>

                          <select
                            value={filter.operator}
                            onChange={(e) =>
                              updateFilter(filter.id, { operator: e.target.value as FilterOperator })
                            }
                            className="bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1 px-1.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors cursor-pointer"
                          >
                            {OPERATORS.map((op) => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </div>

                        {opDef?.needsValue && (
                          <input
                            type="text"
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            placeholder="Value..."
                            className="w-full bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1.5 px-2 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 4: Sorts */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/5">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Sorts</span>
                <button 
                  onClick={addSort}
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Add Sort</span>
                </button>
              </div>

              {sorts.length === 0 ? (
                <p className="text-[11px] text-neutral-600 text-center py-6 border-t border-neutral-850/60">No sorts applied.</p>
              ) : (
                <div className="flex flex-col border-t border-neutral-850/60 divide-y divide-neutral-850/40 bg-neutral-900/5">
                  {sorts.map((sort) => (
                    <div 
                      key={sort.id} 
                      className="p-4 flex flex-col gap-2 relative group/item hover:bg-neutral-800/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-neutral-500 uppercase font-semibold tracking-wider">Sort rule</span>
                        <button 
                          onClick={() => deleteSort(sort.id)} 
                          className="text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={sort.columnId}
                          onChange={(e) => updateSort(sort.id, { columnId: e.target.value })}
                          className="bg-neutral-950 border border-neutral-850 text-neutral-300 text-xs py-1 px-1.5 rounded-none outline-none hover:border-neutral-750 focus:border-neutral-600 transition-colors cursor-pointer"
                        >
                          {schema.map((col) => (
                            <option key={col.id} value={col.id}>{col.name}</option>
                          ))}
                        </select>

                        <button
                          onClick={() =>
                            updateSort(sort.id, {
                              direction: sort.direction === 'asc' ? 'desc' : 'asc',
                            })
                          }
                          className="bg-neutral-950 hover:bg-neutral-850 border border-neutral-850 text-neutral-300 text-xs py-1 px-2 rounded-none text-center transition-colors font-medium shrink-0 cursor-pointer"
                        >
                          {sort.direction === 'asc' ? 'A → Z' : 'Z → A'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
