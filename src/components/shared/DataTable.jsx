import { Pencil, Trash2 } from 'lucide-react';

const DataTable = ({ columns, data, onEdit, onDelete, emptyMessage = 'No data available' }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-brand-border">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50/50">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-3 py-3 sm:px-6 sm:py-4 text-left text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-3 py-3 sm:px-6 sm:py-4 text-right text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                ACTIONS
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {!data || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-4 py-8 text-center text-brand-textMuted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-3 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm text-brand-textPrimary font-medium">
                    {col.render ? col.render(row) : row[col.accessor] || '-'}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2 sm:space-x-3">
                      {onEdit && (
                        <button onClick={() => onEdit(row)} className="text-brand-blue hover:text-blue-700 transition-colors p-1">
                          <Pencil size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row)} className="text-red-500 hover:text-red-700 transition-colors p-1">
                          <Trash2 size={16} />
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
