interface WidgetCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function WidgetCard({ children, className = '', style }: WidgetCardProps) {
  return (
    <div
      className={className}
      style={{
        padding: '20px 24px',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
