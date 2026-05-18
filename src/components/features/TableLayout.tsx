'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { updateDatabaseSchema } from '@/lib/actions/database';
import { GripHorizontal, Type, List, Hash, AlignLeft } from 'lucide-react';

function getPropertyIcon(type: string) {
  switch (type) {
    case 'text':
      return <Type size={11} className="text-neutral-600" />;
    case 'select':
      return <List size={11} className="text-neutral-600" />;
    case 'number':
      return <Hash size={11} className="text-neutral-600" />;
    default:
      return <AlignLeft size={11} className="text-neutral-600" />;
  }
}

export default function TableLayout({ database, pages }: { database: any, pages: any[] }) {
  const router = useRouter();

  const [localSchema, setLocalSchema] = useState<any[]>(database.schema || []);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  useEffect(() => {
    setLocalSchema(database.schema || []);
  }, [database.schema]);

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedColId === colId) return;
    setDragOverColId(colId);
  };

  const handleDragLeave = (colId: string) => {
    if (dragOverColId === colId) setDragOverColId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const draggedIndex = localSchema.findIndex(c => c.id === draggedColId);
    const targetIndex = localSchema.findIndex(c => c.id === targetColId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newSchema = [...localSchema];
      const [draggedItem] = newSchema.splice(draggedIndex, 1);
      newSchema.splice(targetIndex, 0, draggedItem);
      setLocalSchema(newSchema);
      try {
        await updateDatabaseSchema(database.id, newSchema);
      } catch {
        setLocalSchema(database.schema || []);
      }
    }

    setDraggedColId(null);
    setDragOverColId(null);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };

  return (
    <div className="flex-1 overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
        <thead className="border-b border-neutral-800/60 sticky top-0 z-10">
          <tr>
            {localSchema.map((col, idx) => {
              const isOver = dragOverColId === col.id;
              const isDraggingThis = draggedColId === col.id;
              const isFirst = idx === 0;
              const isLast = idx === localSchema.length - 1;

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
                    ${isFirst ? 'pl-0 pr-3' : isLast ? 'pl-3 pr-0' : 'px-3'}
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
              <td colSpan={localSchema.length} className="py-16 text-center text-neutral-600 text-sm">
                Henüz sayfa yok. "New" ile başla.
              </td>
            </tr>
          ) : (
            pages.map((page) => (
              <tr
                key={page.id}
                onClick={() => router.push(`/db/${database.id}/${page.id}`)}
                className="border-b border-neutral-800/40 hover:bg-neutral-800/20 cursor-pointer transition-colors group"
              >
                {localSchema.map((col, idx) => {
                  const val = page.properties[col.id];
                  const isFirst = idx === 0;
                  const isLast = idx === localSchema.length - 1;
                  return (
                    <td
                      key={col.id}
                      className={`py-2 whitespace-nowrap overflow-hidden text-ellipsis
                        ${isFirst ? 'pl-0 pr-3' : isLast ? 'pl-3 pr-0' : 'px-3'}
                        ${!isLast ? 'border-r border-neutral-800/40' : ''}
                      `}
                    >
                      {col.id === 'title' ? (
                        <span className="font-medium text-neutral-200">{val || 'Untitled'}</span>
                      ) : col.type === 'select' ? (
                        <span className={`text-xs ${val ? 'text-neutral-400' : 'text-neutral-700'}`}>
                          {val || '—'}
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
