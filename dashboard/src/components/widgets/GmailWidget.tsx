import { useState, useEffect, useCallback } from 'react';
import { fetchInboxMessages } from '../../services/gmail';
import type { GmailMessage } from '../../services/gmail';
import { SkeletonLine, SkeletonBlock } from '../layout/Skeleton';
import ErrorState from '../layout/ErrorState';
import WidgetLink from '../layout/WidgetLink';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function parseFromName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return (match ? match[1].trim() : from.split('@')[0]).trim();
}

const AVATAR_PALETTES = [
  { bg: 'rgba(99,102,241,0.14)',  text: '#4F46E5' },
  { bg: 'rgba(147,51,234,0.14)', text: '#9333EA' },
  { bg: 'rgba(16,163,74,0.14)',  text: '#16A34A' },
  { bg: 'rgba(234,88,12,0.14)',  text: '#EA580C' },
  { bg: 'rgba(225,29,72,0.14)',  text: '#E11D48' },
  { bg: 'rgba(2,132,199,0.14)',  text: '#0284C7' },
];
function avatarPalette(name: string) {
  if (!name) return AVATAR_PALETTES[0];
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];
}

function GmailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SkeletonLine className="w-24 h-3 mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <SkeletonBlock className="w-9 h-9 rounded-full flex-shrink-0" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonLine className="w-full h-3" />
            <SkeletonLine className={`h-2.5 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GmailWidget({ authenticated }: { authenticated: boolean }) {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    fetchInboxMessages(7)
      .then((data) => { setMessages(data); setLoading(false); })
      .catch(() => { setError('Gmail nicht verfügbar'); setLoading(false); });
  }, [authenticated]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <WidgetLink label="Posteingang" href="https://mail.google.com" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>
          Anmeldung erforderlich
        </div>
      </div>
    );
  }

  if (loading && messages.length === 0) return <GmailSkeleton />;

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <WidgetLink label="Posteingang" href="https://mail.google.com" />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  const unreadCount = messages.filter((m) => m.isUnread).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <WidgetLink
        label="Posteingang"
        href="https://mail.google.com"
        badge={unreadCount > 0 ? (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#6366F1',
            background: 'rgba(99,102,241,0.12)', borderRadius: 99, padding: '2px 8px',
          }}>
            {unreadCount} neu
          </span>
        ) : undefined}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>
            Keine Nachrichten
          </div>
        )}
        {messages.map((msg, idx) => {
          const name = parseFromName(msg.from);
          const palette = avatarPalette(name);
          const isHovered = hoveredId === msg.id;
          return (
            <div
              key={msg.id}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 6px',
                borderBottom: idx < messages.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                position: 'relative',
                borderRadius: 10,
                background: isHovered ? 'rgba(0,0,0,0.03)' : 'transparent',
                transition: 'background 0.15s ease',
                cursor: 'default',
                marginLeft: -6, marginRight: -6,
              }}
            >
              {/* Unread dot */}
              {msg.isUnread && (
                <div style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 7, height: 7, borderRadius: '50%', background: '#6366F1',
                  boxShadow: '0 0 6px rgba(99,102,241,0.5)',
                }} />
              )}

              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: palette.bg, color: palette.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.6)',
                backdropFilter: 'blur(4px)',
              }}>
                {name.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    fontSize: 13, fontWeight: msg.isUnread ? 600 : 500,
                    color: msg.isUnread ? '#111827' : '#6B7280',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {name}
                  </span>
                  <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
                    {formatDate(msg.date)}
                  </span>
                </div>
                <p style={{
                  fontSize: 12, fontWeight: msg.isUnread ? 500 : 400,
                  color: msg.isUnread ? '#374151' : '#9CA3AF',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  marginTop: 1,
                }}>
                  {msg.subject}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
