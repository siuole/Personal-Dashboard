import { useState } from 'react';

const LINKS = [
  {
    href: 'https://www.youtube.com',
    label: 'YouTube',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <rect width="24" height="24" rx="6" fill="#FF0000"/>
        <path d="M19.6 8.2a2 2 0 0 0-1.4-1.4C16.8 6.5 12 6.5 12 6.5s-4.8 0-6.2.3A2 2 0 0 0 4.4 8.2 20 20 0 0 0 4 12a20 20 0 0 0 .4 3.8 2 2 0 0 0 1.4 1.4c1.4.3 6.2.3 6.2.3s4.8 0 6.2-.3a2 2 0 0 0 1.4-1.4A20 20 0 0 0 20 12a20 20 0 0 0-.4-3.8Z" fill="white"/>
        <path d="M10.5 14.5v-5l4.5 2.5-4.5 2.5Z" fill="#FF0000"/>
      </svg>
    ),
  },
  {
    href: 'https://claude.ai',
    label: 'Claude',
    icon: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <rect width="24" height="24" rx="6" fill="#D97757"/>
        <path d="M14.67 6.5h-1.56l-3.7 11h1.56l.9-2.75h4.04l.9 2.75h1.56l-3.7-11Zm-2.36 6.9 1.58-4.83 1.58 4.83h-3.16Z" fill="white"/>
      </svg>
    ),
  },
  {
    href: 'https://gemini.google.com',
    label: 'Gemini',
    icon: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <rect width="24" height="24" rx="6" fill="#1A73E8"/>
        <path d="M12 4c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" fill="white"/>
      </svg>
    ),
  },
  {
    href: 'https://web.whatsapp.com',
    label: 'WhatsApp',
    icon: (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <rect width="24" height="24" rx="6" fill="#25D366"/>
        <path d="M12 4.5a7.5 7.5 0 0 0-6.5 11.22L4 20l4.4-1.47A7.5 7.5 0 1 0 12 4.5Zm0 13.5a6 6 0 0 1-3.06-.84l-.22-.13-2.27.75.76-2.22-.14-.23A6 6 0 1 1 12 18Zm3.3-4.48c-.18-.09-1.07-.53-1.24-.59-.16-.06-.28-.09-.4.09-.12.18-.46.59-.56.71-.1.12-.21.13-.39.04a4.94 4.94 0 0 1-1.45-.9 5.44 5.44 0 0 1-1-1.26c-.1-.18-.01-.28.08-.37.08-.08.18-.21.27-.32.09-.1.12-.18.18-.3.06-.12.03-.22-.01-.31-.05-.09-.4-.97-.55-1.33-.14-.35-.29-.3-.4-.3h-.34c-.12 0-.31.04-.47.22-.16.18-.62.6-.62 1.47s.63 1.7.72 1.82c.09.12 1.24 1.9 3.01 2.66.42.18.75.29 1.01.37.42.13.81.11 1.11.07.34-.05 1.05-.43 1.2-.84.15-.41.15-.76.1-.84-.04-.07-.16-.12-.34-.21Z" fill="white"/>
      </svg>
    ),
  },
];

export default function QuickLaunch() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center',
    }}>
      {LINKS.map(({ href, label, icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setHovered(label)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 12,
            background: hovered === label ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.06)',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
            transform: hovered === label ? 'translateY(-2px)' : 'translateY(0)',
            boxShadow: hovered === label ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
          }}
          title={label}
        >
          {icon}
        </a>
      ))}
    </div>
  );
}
