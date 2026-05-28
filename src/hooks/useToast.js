import { useState, useCallback } from 'react';

export function useToast(duration = 4000) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  }, [duration]);

  return { toast, showToast };
}
