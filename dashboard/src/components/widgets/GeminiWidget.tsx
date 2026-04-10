import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

function GeminiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
      <defs>
        <linearGradient id="gem-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M14 2C14 2 16.5 9.5 20 13C23.5 16.5 26 14 26 14C26 14 23.5 18.5 20 22C16.5 25.5 14 26 14 26C14 26 11.5 25.5 8 22C4.5 18.5 2 14 2 14C2 14 4.5 16.5 8 13C11.5 9.5 14 2 14 2Z"
        fill="url(#gem-grad)"
      />
    </svg>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px' }}>
      <style>{`
        @keyframes gem-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }
        .gem-dot { width: 6px; height: 6px; border-radius: 50%; background: #9B72CB; animation: gem-bounce 1.2s ease-in-out infinite; }
        .gem-dot:nth-child(2) { animation-delay: 0.15s; }
        .gem-dot:nth-child(3) { animation-delay: 0.30s; }
      `}</style>
      <div className="gem-dot" />
      <div className="gem-dot" />
      <div className="gem-dot" />
    </div>
  );
}

function renderText(text: string) {
  // Simple markdown: bold, inline code, line breaks
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={j} style={{ background: 'rgba(0,0,0,0.07)', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', fontSize: '0.88em' }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
    return (
      <span key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function GeminiWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(`Fehler ${res.status}: ${data.error ?? 'Unbekannter Fehler'}`);
        return;
      }
      setMessages([...newMessages, { role: 'model', text: data.text }]);
    } catch (err) {
      setError(`Verbindungsfehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <GeminiIcon />
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3, color: '#1A1D23' }}>Gemini</span>
        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, marginLeft: 2 }}>2.5 Flash</span>
      </div>

      {/* Messages */}
      <div style={{
        flex: '1 1 0',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        paddingRight: 2,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0,0,0,0.1) transparent',
      }}>
        {isEmpty && !loading && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: 0.45,
            userSelect: 'none',
          }}>
            <GeminiIcon />
            <span style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 1.5 }}>
              Stell mir eine Frage
            </span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '82%',
              padding: '9px 13px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              fontSize: 13,
              lineHeight: 1.55,
              color: msg.role === 'user' ? '#fff' : '#1A1D23',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(0,0,0,0.05)',
              boxShadow: msg.role === 'user'
                ? '0 2px 8px rgba(102,126,234,0.35)'
                : 'none',
              border: msg.role === 'model' ? '1px solid rgba(0,0,0,0.06)' : 'none',
              wordBreak: 'break-word',
            }}>
              {renderText(msg.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '9px 13px',
              borderRadius: '16px 16px 16px 4px',
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: '#EF4444', textAlign: 'center', padding: '4px 0' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        marginTop: 12,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        paddingTop: 12,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Frag mich etwas… (Enter zum Senden)"
          rows={1}
          disabled={loading}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 12,
            padding: '9px 12px',
            fontSize: 13,
            fontFamily: 'inherit',
            lineHeight: 1.5,
            background: 'rgba(255,255,255,0.7)',
            outline: 'none',
            color: '#1A1D23',
            transition: 'border-color 0.15s',
            maxHeight: 120,
            overflowY: 'auto',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(102,126,234,0.5)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: 'none',
            background: input.trim() && !loading
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'rgba(0,0,0,0.08)',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s, transform 0.1s',
            boxShadow: input.trim() && !loading ? '0 2px 8px rgba(102,126,234,0.4)' : 'none',
          }}
          onMouseDown={e => { if (input.trim() && !loading) e.currentTarget.style.transform = 'scale(0.93)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = ''; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke={input.trim() && !loading ? '#fff' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim() && !loading ? '#fff' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
