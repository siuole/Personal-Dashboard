export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ background: 'rgba(0,0,0,0.07)' }}
    />
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className}`}
      style={{ background: 'rgba(0,0,0,0.07)' }}
    />
  );
}
