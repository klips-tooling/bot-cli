import { useState, useEffect } from 'react';
import { subscribe, dismissToast, type Toast } from '../lib/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = subscribe(setToasts);
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  const iconMap: Record<string, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    pending: '○',
  };

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className="toast-icon">{iconMap[t.type]}</span>
          <span className="toast-msg">
            {t.message}
            {t.txHash && (
              <a
                href={`${getExplorer(t.txHash)}`}
                target="_blank"
                rel="noopener"
                className="toast-link"
              >
                View
              </a>
            )}
          </span>
          <button className="toast-close" onClick={() => dismissToast(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function getExplorer(txHash: string) {
  const chainId = Number(import.meta.env.VITE_BOT_CHAIN_ID || 968);
  const base = chainId === 677 ? 'https://scan.botchain.ai' : 'https://scan.bohr.life';
  return `${base}/tx/${txHash}`;
}
