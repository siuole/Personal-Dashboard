export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ background: 'rgba(255,255,255,0.08)' }}
    />
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className}`}
      style={{ background: 'rgba(255,255,255,0.08)' }}
    />
  );
}
