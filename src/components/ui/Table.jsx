import React from 'react';
import './Table.css';

export default function Table({ columns, data, onRowClick }) {
  return (
    <div className="table-container glass-panel">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index} className={col.className || ''}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr 
              key={row.id || rowIndex} 
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={col.className || ''}>
                  {col.cell ? col.cell(row) : row[col.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center empty-state">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
