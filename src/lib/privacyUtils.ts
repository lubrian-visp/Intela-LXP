/**
 * PoPIA / POPI-compliant masking utilities for PII fields.
 * 
 * National ID numbers (SA ID, Nigerian NIN, etc.) must NEVER be displayed
 * in full anywhere in the UI. Use maskNationalId() for all display contexts.
 * 
 * Learner Number and Full Name are NOT restricted — show them in full.
 */

/** Mask a national ID / passport number, showing only the last 4 characters. */
export function maskNationalId(id: string | null | undefined): string {
  if (!id || id.length < 4) return "••••••••••";
  return "••••••" + id.slice(-4);
}
