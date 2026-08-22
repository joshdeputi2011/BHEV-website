import './DataTable.css';

export default function DataTable({ columns, data, onRowAction, actionLabel }) {
  if (!data || data.length === 0) {
    return (
      <div className="datatable__empty">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="datatable__wrapper">
      <table className="datatable">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {onRowAction && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : (
                    <span className="datatable__cell-text">
                      {row[col.key] != null ? String(row[col.key]) : '—'}
                    </span>
                  )}
                </td>
              ))}
              {onRowAction && (
                <td>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => onRowAction(row)}
                  >
                    {actionLabel || 'Edit'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
