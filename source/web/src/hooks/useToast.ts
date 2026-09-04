import { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 5000;

export interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

export type ToastInput = string | ToastState;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(
      () => setToast(null),
      DEFAULT_DURATION_MS
    );

    return () => window.clearTimeout(timeout);
  }, [toast]);

  function showToast(input: ToastInput) {
    setToast(typeof input === 'string' ? { message: input } : input);
  }

  async function runToastAction() {
    if (!toast?.onAction) return;
    const action = toast.onAction;
    setToast(null);
    await action();
  }

  return {
    toast,
    showToast,
    runToastAction
  };
}
