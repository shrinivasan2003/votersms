import { Pencil, Trash2 } from 'lucide-react';

const DataTable = ({ columns, data, onEdit, onDelete, emptyMessage = 'No data available' }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-brand-border">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50/50">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-8 py-5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-8 py-5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                ACTIONS
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {!data || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-6 py-8 text-center text-brand-textMuted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-8 py-5 whitespace-nowrap text-sm text-brand-textPrimary font-medium">
                    {col.render ? col.render(row) : row[col.accessor] || '-'}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      {onEdit && (
                        <button onClick={() => onEdit(row)} className="text-brand-blue hover:text-blue-700 transition-colors">
                          <Pencil size={18} />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row)} className="text-red-500 hover:text-red-700 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
