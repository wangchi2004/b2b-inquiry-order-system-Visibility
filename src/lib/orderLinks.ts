import { createSupabaseAdminClient } from "@/lib/supabase";
import type { OrderCustomerInput } from "@/lib/types";

export type OrderLinkLookup =
  | {
      status: "valid" | "expired";
      token: string;
      customerId: string;
      customer: Partial<OrderCustomerInput>;
      message?: string;
    }
  | {
      status: "invalid";
      token: string;
      message: string;
    };

type OrderLinkRow = {
  customer_id: string;
  status: string;
  expires_at: string | null;
  customers:
    | {
        name: string | null;
        email: string;
        country: string | null;
        whatsapp: string | null;
        company: string | null;
      }
    | {
        name: string | null;
        email: string;
        country: string | null;
        whatsapp: string | null;
        company: string | null;
      }[]
    | null;
};

export async function getOrderLinkByToken(token: string): Promise<OrderLinkLookup> {
  const safeToken = token.trim();

  if (!safeToken) {
    return {
      status: "invalid",
      token: safeToken,
      message: "Invalid order link."
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_links")
    .select(
      "customer_id,status,expires_at,customers(name,email,country,whatsapp,company)"
    )
    .eq("token", safeToken)
    .maybeSingle<OrderLinkRow>();

  if (error) {
    console.warn("Failed to look up order link", {
      token: safeToken,
      error: error.message
    });

    return {
      status: "invalid",
      token: safeToken,
      message: "Unable to verify this order link."
    };
  }

  if (!data || data.status === "disabled") {
    return {
      status: "invalid",
      token: safeToken,
      message: "This order link is not valid."
    };
  }

  const customer = readCustomer(data.customers);

  if (data.status === "expired" || isExpired(data.expires_at)) {
    return {
      status: "expired",
      token: safeToken,
      customerId: data.customer_id,
      customer,
      message: "This private order link has expired, but you can still submit an inquiry."
    };
  }

  return {
    status: "valid",
    token: safeToken,
    customerId: data.customer_id,
    customer
  };
}

function readCustomer(value: OrderLinkRow["customers"]): Partial<OrderCustomerInput> {
  const customer = Array.isArray(value) ? value[0] : value;

  if (!customer) {
    return {};
  }

  return {
    email: customer.email,
    country: customer.country ?? undefined,
    whatsapp: customer.whatsapp ?? undefined,
    name: customer.name ?? undefined,
    company: customer.company ?? undefined
  };
}

function isExpired(value: string | null) {
  return Boolean(value && new Date(value).getTime() < Date.now());
}
