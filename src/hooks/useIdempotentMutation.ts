import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Idempotent Mutation Hook
 *
 * Wraps any mutation with an idempotency key to prevent duplicate processing
 * during network retries. The key is stored server-side and checked before
 * executing the operation.
 *
 * Usage:
 *   const mutation = useIdempotentMutation({
 *     operation: "create-enrolment",
 *     mutationFn: async (vars) => { ... },
 *   });
 *   mutation.mutate(payload, { idempotencyKey: "enrol-abc-123" });
 */

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

interface IdempotentMutationOptions<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables & { idempotencyKey?: string }>, "mutationFn"> {
  operation: string;
  mutationFn: (variables: TVariables) => Promise<TData>;
}

export function useIdempotentMutation<TData = unknown, TError = Error, TVariables = void>({
  operation,
  mutationFn,
  ...options
}: IdempotentMutationOptions<TData, TError, TVariables>) {
  return useMutation<TData, TError, TVariables & { idempotencyKey?: string }>({
    mutationFn: async (variables) => {
      const key = variables.idempotencyKey ?? generateIdempotencyKey();

      // Check if this key was already processed
      const { data: existing } = await (supabase as any)
        .from("idempotency_keys")
        .select("response_body, response_status")
        .eq("idempotency_key", key)
        .maybeSingle();

      if (existing && existing.response_status === 200) {
        // Return cached response
        return existing.response_body as TData;
      }

      // Record the key before execution
      await (supabase as any).from("idempotency_keys").upsert(
        {
          idempotency_key: key,
          operation,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          response_status: null,
          response_body: null,
        },
        { onConflict: "idempotency_key" }
      );

      try {
        // Strip idempotencyKey from variables before passing to actual mutation
        const { idempotencyKey: _, ...cleanVars } = variables as any;
        const result = await mutationFn(cleanVars as TVariables);

        // Record success
        await (supabase as any)
          .from("idempotency_keys")
          .update({ response_status: 200, response_body: result })
          .eq("idempotency_key", key);

        return result;
      } catch (err: any) {
        // Record failure
        await (supabase as any)
          .from("idempotency_keys")
          .update({ response_status: 500, response_body: { error: err.message } })
          .eq("idempotency_key", key);
        throw err;
      }
    },
    ...options,
  } as any);
}
