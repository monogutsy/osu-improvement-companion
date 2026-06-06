import { useState } from 'react';

export default function ProfileAvatar({ src, name, className = '' }) {
  const [failed, setFailed] = useState(false);
  const label = String(name ?? '').trim() || 'User';
  const initials = label
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src && !failed) {
    return <img src={src} alt={label} className={className} onError={() => setFailed(true)} />;
  }

  return (
    <div className={`profile-avatar-fallback ${className}`.trim()} aria-label={label} role="img">
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{ width: '60%', height: '60%', opacity: 0.7 }}
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}
