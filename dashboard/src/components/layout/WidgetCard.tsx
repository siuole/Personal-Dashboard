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
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
