export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      {icon ? (
        <div className="empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h3>{title}</h3>
      <p>{message}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
