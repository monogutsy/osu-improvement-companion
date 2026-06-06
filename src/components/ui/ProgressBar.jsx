export default function ProgressBar({ value, max = 100, color = 'gradient', label }) {
  const numericValue = Number(value);
  const numericMax = Number(max);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const safeMax = Number.isFinite(numericMax) && numericMax > 0 ? numericMax : 100;
  const percentage = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));

  return (
    <div className="progress">
      {label ? <div className="progress__label">{label}</div> : null}
      <div className="progress__track" aria-hidden="true">
        <div
          className={`progress__fill progress__fill--${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
