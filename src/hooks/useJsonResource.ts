import { useEffect, useMemo, useState } from 'react';
import type { ResourceState } from '../types';
import { buildAssetUrl, getReadableError } from '../utils/geo';

const RESOURCE_CACHE = new Map<string, unknown>();

export function useJsonResource<T = unknown>(
  filename: string | null,
  enabled = true,
): ResourceState<T> {
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceState<T>['status']>(enabled && filename ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);

  const url = useMemo(() => {
    if (!filename) return null;
    return buildAssetUrl(filename);
  }, [filename]);

  useEffect(() => {
    if (!url || !enabled) return;

    const finalUrl = url;
    const finalFilename = filename ?? 'recurso';

    const controller = new AbortController();
    let cancelled = false;

    const cached = RESOURCE_CACHE.get(finalUrl);
    if (cached) {
      setData(cached as T);
      setStatus('loaded');
      setError(null);
      return () => controller.abort();
    }

    async function load() {
      setStatus('loading');
      setError(null);

      try {
        const response = await fetch(finalUrl, {
          signal: controller.signal,
          cache: 'force-cache',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} al cargar ${finalFilename}`);
        }

        const payload = (await response.json()) as T;

        if (!cancelled) {
          RESOURCE_CACHE.set(finalUrl, payload);
          setData(payload);
          setStatus('loaded');
          setError(null);
        }
      } catch (err) {
        if (controller.signal.aborted || cancelled) return;

        setStatus('error');
        setError(getReadableError(err));
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, enabled, filename, version]);

  return {
    data,
    status,
    error,
    reload: () => {
      if (url) {
        RESOURCE_CACHE.delete(url);
      }
      setVersion((current) => current + 1);
    },
  };
}
