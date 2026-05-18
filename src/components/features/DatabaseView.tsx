'use client';
import { useState } from 'react';
import { createPage } from '@/lib/actions/page';
import { Plus, Settings, LayoutList, KanbanSquare } from 'lucide-react';
import SchemaEditorModal from './SchemaEditorModal';
import TableLayout from './TableLayout';
import KanbanBoard from './KanbanBoard';

export default function DatabaseView({ database, initialPages }: { database: any, initialPages: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingSchema, setIsEditingSchema] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'kanban'>('table');

  const schema = database.schema as any[];
  const selectColumns = schema.filter(col => col.type === 'select');
  const [groupByCol, setGroupByCol] = useState<string>(selectColumns.length > 0 ? selectColumns[0].id : '');

  const handleAddRow = async () => {
    setIsAdding(true);
    await createPage(database.id, 'New Page');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View toggle — underline style */}
          <div className="flex items-center border-b border-neutral-800">
            <button
              onClick={() => setActiveView('table')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeView === 'table'
                  ? 'border-neutral-300 text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <LayoutList size={15} /> Table
            </button>
            <button
              onClick={() => setActiveView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeView === 'kanban'
                  ? 'border-neutral-300 text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <KanbanSquare size={15} /> Kanban
            </button>
          </div>

          {activeView === 'kanban' && selectColumns.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">Group by</span>
              <select
                value={groupByCol}
                onChange={(e) => setGroupByCol(e.target.value)}
                className="bg-transparent border border-neutral-800 text-xs text-neutral-300 px-2 py-1 outline-none hover:border-neutral-600 transition-colors cursor-pointer"
              >
                {selectColumns.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeView === 'kanban' && selectColumns.length === 0 && (
            <span className="text-xs text-amber-500/80">
              Kanban için bir "Select" özelliği ekle
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditingSchema(true)}
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-200 px-3 py-2 transition-colors text-sm"
          >
            <Settings size={15} /> Properties
          </button>
          <button
            onClick={handleAddRow}
            disabled={isAdding}
            className="flex items-center gap-1.5 bg-neutral-100 text-neutral-900 hover:bg-white px-4 py-2 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Plus size={15} /> New
          </button>
        </div>
      </div>

      {isEditingSchema && (
        <SchemaEditorModal
          database={database}
          onClose={() => setIsEditingSchema(false)}
        />
      )}

      <div className="flex-1 min-h-0">
        {activeView === 'table' ? (
          <TableLayout database={database} pages={initialPages} />
        ) : (
          <KanbanBoard database={database} pages={initialPages} groupByCol={groupByCol} />
        )}
      </div>
    </div>
  );
}
