import { useState } from 'react';
import { trpc } from '@/lib/trpc-shim';
import { useToasts } from '@/components/Toasts';

/**
 * Manual "Sync now" — runs classification recompute (§10.3), invalidates
 * customer queries and toasts the result.
 */
export function useClassificationSync() {
  const utils = trpc.useUtils();
  const { push } = useToasts();
  const [lastResult, setLastResult] = useState<{ reclassified: number } | null>(null);

  const mutation = trpc.customers.classificationRecompute.useMutation({
    onSuccess: async (data: any) => {
      setLastResult({ reclassified: data.changed.length });
      await Promise.all([
        utils.customers.invalidate(),
        utils.analytics.invalidate(),
      ]);
      push({
        type: 'ai-insight',
        title: 'Accounting sync complete',
        body:
          data.changed.length > 0
            ? `${data.changed.length} customer${data.changed.length === 1 ? '' : 's'} reclassified · 0 duplicates merged`
            : 'All categories up to date · 0 duplicates merged',
      });
    },
    onError: (err: any) => {
      push({
        type: 'sales-drop',
        title: 'Sync failed',
        body: err.message,
      });
    },
  });

  return {
    sync: () => mutation.mutate(),
    syncing: mutation.isPending,
    lastResult,
  };
}
