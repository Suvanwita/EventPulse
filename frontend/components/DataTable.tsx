import { EmptyState } from "./EmptyState";

type Row = Record<string, string | number>;

export function DataTable({ columns, rows, emptyMessage = "No records to show." }: { columns: string[]; rows: Row[]; emptyMessage?: string }) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing here yet">{emptyMessage}</EmptyState>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-200/12 bg-panel shadow-soft backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-cyan-300/8 text-xs uppercase tracking-[0.16em] text-cyan-100/60">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-bold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row, index) => (
              <tr key={index} className="transition hover:bg-cyan-300/6">
                {columns.map((column) => (
                  <td key={column} className="px-4 py-4 text-white/70">
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
