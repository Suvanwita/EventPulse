"use client";

import { useEffect, useState } from "react";
import { get } from "./api";
import { unwrapData } from "./adapters";

export function useAutocomplete(query, options = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const delay = options.delay ?? 280;
  const limit = options.limit ?? 8;

  useEffect(() => {
    const trimmedQuery = String(query || "").trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");

      try {
        const payload = await get(`/api/search/suggestions?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`, {
          signal: controller.signal,
        });
        const data = unwrapData(payload);
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setError(err instanceof Error ? err.message : "Autocomplete unavailable");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, delay, limit]);

  return {
    suggestions,
    isLoading,
    error,
  };
}

