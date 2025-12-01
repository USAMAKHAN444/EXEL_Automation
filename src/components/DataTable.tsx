import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { DocumentRow } from '@/types/document';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DataTableProps {
  data: DocumentRow[];
  onUpdateCell: (rowId: string, field: 'actualOutput' | 'actualGroup', value: string) => void;
}

export const DataTable = ({ data, onUpdateCell }: DataTableProps) => {
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);

  const columns: ColumnDef<DocumentRow>[] = [
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="font-medium text-sm max-w-[200px] truncate">
          {row.original.customer}
        </div>
      ),
    },
    {
      accessorKey: 'file',
      header: 'File',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-[180px] truncate">
          {row.original.file}
        </div>
      ),
    },
    {
      accessorKey: 'expectedOutput',
      header: 'Expected Output',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.expectedOutput}
        </Badge>
      ),
    },
    {
      accessorKey: 'actualOutput',
      header: 'Actual Output',
      cell: ({ row }) => {
        const isEditing =
          editingCell?.rowId === row.original.id &&
          editingCell?.field === 'actualOutput';

        return isEditing ? (
          <Input
            defaultValue={row.original.actualOutput}
            onBlur={(e) => {
              onUpdateCell(row.original.id, 'actualOutput', e.target.value);
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateCell(row.original.id, 'actualOutput', e.currentTarget.value);
                setEditingCell(null);
              }
            }}
            autoFocus
            className="h-8"
          />
        ) : (
          <div
            onClick={() =>
              setEditingCell({ rowId: row.original.id, field: 'actualOutput' })
            }
            className={cn(
              'cursor-pointer px-2 py-1 rounded hover:bg-muted min-h-[32px] flex items-center',
              row.original.actualOutput ? 'text-foreground' : 'text-muted-foreground italic'
            )}
          >
            {row.original.actualOutput || 'Click to edit'}
          </div>
        );
      },
    },
    {
      accessorKey: 'expectedGroup',
      header: 'Expected Group',
      cell: ({ row }) =>
        row.original.expectedGroup ? (
          <Badge variant="secondary" className="font-normal">
            {row.original.expectedGroup}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      accessorKey: 'actualGroup',
      header: 'Actual Group',
      cell: ({ row }) => {
        const isEditing =
          editingCell?.rowId === row.original.id &&
          editingCell?.field === 'actualGroup';

        return isEditing ? (
          <Input
            defaultValue={row.original.actualGroup}
            onBlur={(e) => {
              onUpdateCell(row.original.id, 'actualGroup', e.target.value);
              setEditingCell(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateCell(row.original.id, 'actualGroup', e.currentTarget.value);
                setEditingCell(null);
              }
            }}
            autoFocus
            className="h-8"
          />
        ) : (
          <div
            onClick={() =>
              setEditingCell({ rowId: row.original.id, field: 'actualGroup' })
            }
            className={cn(
              'cursor-pointer px-2 py-1 rounded hover:bg-muted min-h-[32px] flex items-center',
              row.original.actualGroup ? 'text-foreground' : 'text-muted-foreground italic'
            )}
          >
            {row.original.actualGroup || 'Click to edit'}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-foreground"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b transition-colors hover:bg-muted/30',
                  idx % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No data loaded. Upload an Excel file to begin.
        </div>
      )}
    </div>
  );
};
