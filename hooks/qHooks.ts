"use client";

import { getQueueTimeAction } from "@/actions/qActions";
import { useDbQuery } from "@/hooks/dbHooks";

interface QueueTime {
  queueTimeMs: number;
  printTimeMs: number;
}

export const useQueueTime = (variantIds: string[]) => {
  return useDbQuery<QueueTime>(["queue-time", ...variantIds], () =>
    getQueueTimeAction(variantIds),
  );
};
