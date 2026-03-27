interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-4">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-gray-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 4, padding: '0.3em 0.9em', fontSize: '0.75rem', fontWeight: 600,
            color: '#242424', background: '#f0f0f0', border: 0, borderRadius: '0.5em',
            cursor: 'pointer', fontFamily: 'inherit',
            textShadow: '0 0.0625em 0 #fff',
            boxShadow: 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece',
            transition: '0.15s ease',
          }}
          onMouseDown={e => {
            e.currentTarget.style.translate = '0 0.225em';
            e.currentTarget.style.boxShadow = 'inset 0 0.03em 0 0 #f4f4f4, 0 0.03em 0 0 #efefef, 0 0.0625em 0 0 #ececec, 0 0.125em 0 0 #e0e0e0, 0 0.125em 0 0 #dedede, 0 0.2em 0 0 #dcdcdc, 0 0.225em 0 0 #cacaca, 0 0.225em 0.375em 0 #cecece';
          }}
          onMouseUp={e => { e.currentTarget.style.translate = ''; e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece'; }}
          onMouseLeave={e => { e.currentTarget.style.translate = ''; e.currentTarget.style.boxShadow = 'inset 0 0.0625em 0 0 #f4f4f4, 0 0.0625em 0 0 #efefef, 0 0.125em 0 0 #ececec, 0 0.25em 0 0 #e0e0e0, 0 0.3125em 0 0 #dedede, 0 0.375em 0 0 #dcdcdc, 0 0.425em 0 0 #cacaca, 0 0.425em 0.5em 0 #cecece'; }}
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
