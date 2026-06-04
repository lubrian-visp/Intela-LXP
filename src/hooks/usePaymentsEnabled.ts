import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/usePlatformSettings";

export function usePaymentsEnabled() {
  const { data: flags = [], isLoading } = useFeatureFlags("payments_");
  const toggleMutation = useToggleFeatureFlag();

  const paymentsFlag = flags.find((f) => f.flag_key === "payments_enabled");
  const isEnabled = paymentsFlag?.is_enabled ?? true; // default enabled if flag not found

  const toggle = () => {
    if (!paymentsFlag) return;
    toggleMutation.mutate({ id: paymentsFlag.id, is_enabled: !isEnabled });
  };

  return {
    isEnabled,
    isLoading,
    flagId: paymentsFlag?.id ?? null,
    toggle,
    isToggling: toggleMutation.isPending,
  };
}
