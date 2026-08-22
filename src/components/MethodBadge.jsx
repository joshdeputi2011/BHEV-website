import './MethodBadge.css';

export default function MethodBadge({ method = 'GET' }) {
  const m = method.toLowerCase();
  return (
    <span className={`method-badge method-badge--${m}`}>
      {method}
    </span>
  );
}
