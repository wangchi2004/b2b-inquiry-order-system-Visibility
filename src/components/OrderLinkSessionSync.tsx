"use client";

import { useEffect } from "react";
import { setOrderLinkSession } from "@/lib/cart";
import type { OrderCustomerInput } from "@/lib/types";

type OrderLinkSessionSyncProps = {
  session:
    | {
        token: string;
        status: "valid" | "expired";
        message?: string;
        customer: Partial<OrderCustomerInput>;
      }
    | null;
};

export function OrderLinkSessionSync({ session }: OrderLinkSessionSyncProps) {
  useEffect(() => {
    setOrderLinkSession(session);
  }, [session]);

  return null;
}
