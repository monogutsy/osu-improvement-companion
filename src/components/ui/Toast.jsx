export default function Toast({ message, type = 'success' }) {
  return <div className={`toast toast--${type}`}>{message}</div>;
}