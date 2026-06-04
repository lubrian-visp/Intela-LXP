import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Transactional Outbox Consumer Hook
 *
 * Subscribes to the transactional_outbox table via Realtime and processes
 * pending events. Used by admin dashboards to trigger side effects
 * (notifications, cache invalidation) reliably.
 *
 * Events are written inside the same DB transaction as the state change,
 * ensuring at-least-once delivery even if the app crashes mid-operation.
 */

type OutboxEventHandler = (event: {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
}) => void;

export function useTransactionalOutbox(onEvent?: OutboxEventHandler) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("outbox-consumer")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactional_outbox",
          filter: "status=eq.pending",
        },
        (payload) => {
          const record = payload.new as any;

          // Invalidate relevant caches based on event type
          if (record.event_type?.startsWith("credential.")) {
            queryClient.invalidateQueries({ queryKey: ["credentials"] });
            queryClient.invalidateQueries({ queryKey: ["issued-credentials"] });
          }
          if (record.event_type?.startsWith("approval.")) {
            queryClient.invalidateQueries({ queryKey: ["approval-tasks"] });
          }

          // Fire custom handler
          onEvent?.({
            id: record.id,
            event_type: record.event_type,
            aggregate_type: record.aggregate_type,
            aggregate_id: record.aggregate_id,
            payload: record.payload ?? {},
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, onEvent]);
}
