import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin";
import { getTemplateCustomers } from "@/lib/adminEmailTemplates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const access = checkAdminAccess(searchParams.get("password") ?? undefined);

  if (!access.ok) {
    return NextResponse.json(
      {
        error:
          access.reason === "missing_config"
            ? "ADMIN_PASSWORD is not configured."
            : "Invalid admin password."
      },
      {
        status: access.reason === "missing_config" ? 500 : 401
      }
    );
  }

  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const status = searchParams.get("status") ?? "";
  const country = searchParams.get("country") ?? "";
  const businessType = searchParams.get("business_type") ?? "";
  const source = searchParams.get("source") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const customers = await getTemplateCustomers();
  const filteredCustomers = customers.filter((customer) => {
    const searchable = [
      customer.email,
      customer.name,
      customer.shop_name,
      customer.company,
      customer.country,
      customer.city,
      customer.whatsapp,
      customer.instagram,
      customer.website,
      ...customer.tags
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!status || customer.status === status) &&
      (!country || customer.country === country) &&
      (!businessType || customer.business_type === businessType) &&
      (!source || customer.source === source) &&
      (!tag || customer.tags.includes(tag)) &&
      (!q || searchable.includes(q))
    );
  });

  const rows = [
    [
      "email",
      "status",
      "stage",
      "score",
      "tags",
      "shop_name",
      "name",
      "country",
      "city",
      "business_type",
      "phone",
      "whatsapp",
      "shipping_recipient_name",
      "shipping_phone",
      "shipping_country",
      "shipping_address",
      "customer_note",
      "source",
      "source_url",
      "instagram",
      "website",
      "email_valid",
      "unsubscribed",
      "last_contacted_at",
      "updated_at"
    ],
    ...filteredCustomers.map((customer) => [
      customer.email,
      customer.status ?? "",
      customer.stage ?? "",
      customer.score ?? "",
      customer.tags.join(", "),
      customer.shop_name ?? "",
      customer.name ?? "",
      customer.country ?? "",
      customer.city ?? "",
      customer.business_type ?? "",
      customer.phone ?? "",
      customer.whatsapp ?? "",
      customer.shipping_recipient_name ?? "",
      customer.shipping_phone ?? "",
      customer.shipping_country ?? "",
      customer.shipping_address ?? "",
      customer.customer_note ?? "",
      customer.source ?? "",
      customer.source_url ?? "",
      customer.instagram ?? "",
      customer.website ?? "",
      customer.email_valid === null ? "" : String(customer.email_valid),
      customer.unsubscribed === null ? "" : String(customer.unsubscribed),
      customer.last_contacted_at ?? "",
      customer.updated_at ?? ""
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`
    }
  });
}

function csvCell(value: string | number | boolean) {
  const text = String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
