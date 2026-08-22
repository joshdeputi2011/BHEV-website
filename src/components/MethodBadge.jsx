import './MethodBadge.css';

const methodColors = {
  GET: 'var(--method-get)',
  POST: 'var(--method-post)',
  PUT: 'var(--method-put)',
  DELETE: 'var(--method-delete)',
  PATCH: 'var(--method-patch)',
};

export default function MethodBadge({ method }) {
  const color = methodColors[method] || 'var(--text-secondary)';

  return (
    <span
      className="method-badge"
      style={{
        color,
        borderColor: color,
        background: `${color}12`,
      }}
    >
      {method}
    </span>
  );
}
