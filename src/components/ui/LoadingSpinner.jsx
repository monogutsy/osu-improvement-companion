export default function LoadingSpinner({ label = 'Loading...', small = false }) {
  return (
    <div
      className={`loading-spinner ${small ? 'loading-spinner--small' : ''}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="loading-spinner__ring" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
