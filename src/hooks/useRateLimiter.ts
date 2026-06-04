import { useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

interface RateLimiterOptions {
  maxAttempts?: number;
  windowMs?: number;
  message?: string;
}

/**
 * Client-side rate limiter for sensitive mutations.
 * Returns a guard function that returns true if the action is allowed.
 */
export function useRateLimiter(options: RateLimiterOptions = {}) {
  const { maxAttempts = 5, windowMs = 60_000, message = "Too many attempts. Please wait a moment." } = options;
  const timestamps = useRef<number[]>([]);

  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    timestamps.current = timestamps.current.filter((t) => now - t < windowMs);

    if (timestamps.current.length >= maxAttempts) {
      toast({ title: "Rate limited", description: message, variant: "destructive" });
      return false;
    }

    timestamps.current.push(now);
    return true;
  }, [maxAttempts, windowMs, message]);

  const reset = useCallback(() => {
    timestamps.current = [];
  }, []);

  return { checkLimit, reset };
}
