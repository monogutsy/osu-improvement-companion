export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  icon,
  iconRight,
  loading = false,
  disabled,
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={`button button--${variant} button--${size} ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {icon ? <span className="button__icon" aria-hidden="true">{icon}</span> : null}
      <span className="button__content">{children}</span>
      {iconRight ? <span className="button__icon button__icon--right" aria-hidden="true">{iconRight}</span> : null}
      {loading ? <span className="button__spinner" aria-hidden="true" /> : null}
    </button>
  );
}
