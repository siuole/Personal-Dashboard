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
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
