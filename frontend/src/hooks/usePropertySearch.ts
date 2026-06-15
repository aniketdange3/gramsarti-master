/**
 * usePropertySearch – Backend-powered search hook
 *
 * Replaces frontend filtering of 5000 records.
 * Sends query params to GET /api/properties/search and returns paginated results.
 *
 * Features:
 *  - 300ms debounce (fast feel, no extra API calls)
 *  - Redis-cached on backend (60s TTL)
 *  - Falls back to all records from parent if backend search is unavailable
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/utils/config';

interface SearchParams {
  q?: string;
  wasti?: string;
  khasra?: string;
  plotNo?: string;
  wardNo?: string;
  layout?: string;
  page?: number;
  limit?: number;
}

interface SearchResult {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const DEBOUNCE_MS = 300;

export function usePropertySearch() {
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((params: SearchParams) => {
    // Clear existing timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // If no real filter → clear results (caller can show all records from cache)
    const hasFilter = Object.values(params).some(v => v !== undefined && v !== '' && v !== 1 && v !== 25);
    if (!hasFilter) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const token = localStorage.getItem('gp_token');
        const qs = new URLSearchParams();
        if (params.q)      qs.set('q',      params.q);
        if (params.wasti)  qs.set('wasti',  params.wasti);
        if (params.khasra) qs.set('khasra', params.khasra);
        if (params.plotNo) qs.set('plotNo', params.plotNo);
        if (params.wardNo) qs.set('wardNo', params.wardNo);
        if (params.layout) qs.set('layout', params.layout);
        qs.set('page',  String(params.page  || 1));
        qs.set('limit', String(params.limit || 25));

        const res = await fetch(`${API_BASE_URL}/api/properties/search?${qs}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error('Search failed');
        const data: SearchResult = await res.json();
        setResults(data);
        setError(null);
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Ignore aborted requests
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const clearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setResults(null);
    setLoading(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { results, loading, error, search, clearSearch };
}
