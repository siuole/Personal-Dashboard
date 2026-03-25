import { useState } from 'react';

const LINKS = [
  {
    href: 'https://www.youtube.com',
    label: 'YouTube',
    bg: '#FF0000',
    icon: 'https://cdn.simpleicons.org/youtube/ffffff',
    svgIcon: null,
  },
  {
    href: 'https://claude.ai',
    label: 'Claude',
    bg: '#D97757',
    icon: 'https://cdn.simpleicons.org/anthropic/ffffff',
    svgIcon: null,
  },
  {
    href: 'https://gemini.google.com',
    label: 'Gemini',
    bg: '#1A73E8',
    icon: null,
    svgIcon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"/>
      </svg>
    ),
  },
  {
    href: 'https://web.whatsapp.com',
    label: 'WhatsApp',
    bg: '#25D366',
    icon: 'https://cdn.simpleicons.org/whatsapp/ffffff',
    svgIcon: null,
  },
];

export default function QuickLaunch() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {LINKS.map(({ href, label, bg, icon, svgIcon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setHovered(label)}
          onMouseLeave={() => setHovered(null)}
          title={label}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 11,
            background: bg,
            textDecoration: 'none',
            transition: 'all 0.15s ease',
            transform: hovered === label ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
            boxShadow: hovered === label
              ? `0 6px 16px ${bg}55`
              : '0 2px 6px rgba(0,0,0,0.12)',
          }}
        >
          {svgIcon ?? (
            <img src={icon!} width={20} height={20} alt={label} style={{ display: 'block' }} />
          )}
        </a>
      ))}
    </div>
  );
}
