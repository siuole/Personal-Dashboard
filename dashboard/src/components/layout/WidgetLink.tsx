interface WidgetLinkProps {
  label: string;
  href: string;
  badge?: React.ReactNode;
}

export default function WidgetLink({ label, href, badge }: WidgetLinkProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          textDecoration: 'none',
          color: '#6B7280',
        }}
        className="group"
      >
        <span
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}
          className="group-hover:text-gray-500 transition-colors duration-200"
        >
          {label}
        </span>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0, transition: 'opacity 0.2s ease' }}
          className="group-hover:opacity-100"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
      {badge}
    </div>
  );
}
