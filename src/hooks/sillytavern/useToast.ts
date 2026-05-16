import { useCallback, useRef, useState } from 'react';

export interface UseToast {
  toast: string | null;
  showToast: (message: string) => void;
}

export function useToast(durationMs = 2000): UseToast {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  return { toast, showToast };
}
