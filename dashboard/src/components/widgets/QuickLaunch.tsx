import { useState } from 'react';

const LINKS = [
  {
    href: 'https://www.youtube.com',
    label: 'YouTube',
    bg: '#FF0000',
    icon: 'https://cdn.simpleicons.org/youtube/ffffff',
  },
  {
    href: 'https://claude.ai',
    label: 'Claude',
    bg: '#D97757',
    icon: 'https://cdn.simpleicons.org/anthropic/ffffff',
  },
  {
    href: 'https://gemini.google.com',
    label: 'Gemini',
    bg: '#1A73E8',
    icon: 'https://cdn.simpleicons.org/googlegemini/ffffff',
  },
  {
    href: 'https://web.whatsapp.com',
    label: 'WhatsApp',
    bg: '#25D366',
    icon: 'https://cdn.simpleicons.org/whatsapp/ffffff',
  },
];

export default function QuickLaunch() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {LINKS.map(({ href, label, bg, icon }) => (
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
          <img
            src={icon}
            width={20}
            height={20}
            alt={label}
            style={{ display: 'block' }}
          />
        </a>
      ))}
    </div>
  );
}
