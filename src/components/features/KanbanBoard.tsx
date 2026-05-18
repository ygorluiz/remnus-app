'use client';

import { useRouter } from 'next/navigation';

export default function KanbanBoard({ database, pages, groupByCol }: { database: any, pages: any[], groupByCol: string }) {
  const router = useRouter();
  const schema = database.schema as any[];

  const groupColumn = schema.find(col => col.id === groupByCol);
  const options: string[] = groupColumn?.options || [];
  const kanbanColumns = [...options, 'Uncategorized'];

  const groupedPages: Record<string, any[]> = {};
  kanbanColumns.forEach(col => { groupedPages[col] = []; });

  pages.forEach(page => {
    const val = page.properties[groupByCol];
    if (val && options.includes(val)) {
      groupedPages[val].push(page);
    } else {
      groupedPages['Uncategorized'].push(page);
    }
  });

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full items-start">
      {kanbanColumns.map(columnName => (
        <div key={columnName} className="flex-shrink-0 w-68 flex flex-col max-h-full">
          <div className="pb-2 mb-1 flex justify-between items-baseline border-b border-neutral-800/50">
            <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {columnName === 'Uncategorized' ? 'No Status' : columnName}
            </h3>
            <span className="text-xs text-neutral-700 tabular-nums">
              {groupedPages[columnName].length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col min-h-20">
            {groupedPages[columnName].length === 0 ? (
              <div className="text-xs text-neutral-700 py-4">
                Sayfa yok
              </div>
            ) : (
              groupedPages[columnName].map(page => (
                <div
                  key={page.id}
                  onClick={() => router.push(`/db/${database.id}/${page.id}`)}
                  className="py-3 px-3 mb-1.5 bg-neutral-800/40 cursor-pointer hover:bg-neutral-800/70 transition-colors group"
                >
                  <h4 className="text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors">
                    {page.properties['title'] || 'Untitled'}
                  </h4>

                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {schema.filter(c => c.id !== 'title' && c.id !== groupByCol).slice(0, 2).map(c => {
                      const val = page.properties[c.id];
                      if (!val) return null;
                      return (
                        <div key={c.id} className="text-xs flex items-center gap-1.5">
                          <span className="text-neutral-700">{c.name}</span>
                          <span className="text-neutral-500 truncate">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
