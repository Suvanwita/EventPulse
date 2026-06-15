import { EmptyState } from "./EmptyState";

type Row = Record<string, string | number>;

export function DataTable({ columns, rows, emptyMessage = "No records to show." }: { columns: string[]; rows: Row[]; emptyMessage?: string }) {
  if (rows.length === 0) {
    return <EmptyState title="Nothing here yet">{emptyMessage}</EmptyState>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-mist text-xs uppercase tracking-[0.16em] text-ink/55">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-bold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-mist/60">
                {columns.map((column) => (
                  <td key={column} className="px-4 py-4 text-ink/75">
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
