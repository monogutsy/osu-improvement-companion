export default function Input({
  label,
  error,
  as = 'input',
  className = '',
  hint,
  icon,
  ...props
}) {
  const Element = as;

  return (
    <label className="field">
      {label ? <span className="field__label">{label}</span> : null}
      <div className="field__control">
        {icon ? <span className="field__icon" aria-hidden="true">{icon}</span> : null}
        <Element className={`field__input ${icon ? 'field__input--with-icon' : ''} ${className}`.trim()} {...props} />
      </div>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
}
