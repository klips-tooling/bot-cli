export type ToastType = 'success' | 'error' | 'info' | 'pending';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  txHash?: string;
}

let toastId = 0;
let listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function addToast(message: string, type: ToastType, txHash?: string) {
  const id = ++toastId;
  toasts = [...toasts, { id, message, type, txHash }];
  notify();
  const delay = type === 'pending' ? 8000 : 5000;
  setTimeout(() => dismissToast(id), delay);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function subscribe(fn: (toasts: Toast[]) => void) {
  listeners.push(fn);
  fn([...toasts]);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
