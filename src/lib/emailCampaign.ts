export const EMAIL_COOLDOWN_DAYS = 15;
export const EMAIL_COOLDOWN_EXEMPT_ADDRESS = "wangchi.2004@gmail.com";

export type CampaignTemplate = {
  id: string;
  name: string;
  country_matches: string[];
  locale: string;
  subject: string;
  greeting: string;
  body: string;
  website_button_label: string;
  closing: string;
  signature: string;
  is_default: boolean;
  status: string;
};

export type CampaignProduct = {
  id: string;
  name: string;
  image_url: string | null;
};

type EligibilityInput = {
  email: string | null | undefined;
  emailValid: boolean | null;
  unsubscribed: boolean | null;
  status: string | null;
  lastSuccessfulSendAt: string | null;
  now?: Date;
};

export type CampaignSendEligibility = {
  allowed: boolean;
  reason: string | null;
  cooldownEndsAt: string | null;
};

export function normalizeCampaignCountry(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function selectCampaignTemplate<T extends CampaignTemplate>(
  templates: T[],
  country: string | null | undefined,
  overrideTemplateId?: string | null
): T | null {
  const activeTemplates = templates.filter(
    (template) => template.status === "active"
  );
  const override = overrideTemplateId
    ? activeTemplates.find((template) => template.id === overrideTemplateId)
    : null;

  if (override) {
    return override;
  }

  const normalizedCountry = normalizeCampaignCountry(country);
  const countryTemplate = activeTemplates.find((template) =>
    template.country_matches.some(
      (alias) => normalizeCampaignCountry(alias) === normalizedCountry
    )
  );

  return (
    countryTemplate ??
    activeTemplates.find((template) => template.is_default) ??
    activeTemplates.find((template) => template.locale === "en") ??
    activeTemplates[0] ??
    null
  );
}

export function isCampaignCooldownExempt(email: string | null | undefined) {
  return normalizeEmail(email) === EMAIL_COOLDOWN_EXEMPT_ADDRESS;
}

export function getCampaignSendEligibility({
  email,
  emailValid,
  unsubscribed,
  status,
  lastSuccessfulSendAt,
  now = new Date()
}: EligibilityInput): CampaignSendEligibility {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return denied("Customer email is missing or invalid.");
  }

  if (emailValid === false) {
    return denied("Customer email is marked invalid.");
  }

  if (unsubscribed) {
    return denied("Customer has unsubscribed.");
  }

  if (isDoNotContactStatus(status)) {
    return denied("Customer is marked do not contact.");
  }

  if (!isCampaignCooldownExempt(normalizedEmail) && lastSuccessfulSendAt) {
    const lastSentAt = new Date(lastSuccessfulSendAt);

    if (!Number.isNaN(lastSentAt.getTime())) {
      const cooldownEndsAt = new Date(
        lastSentAt.getTime() + EMAIL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
      );

      if (cooldownEndsAt.getTime() > now.getTime()) {
        return {
          allowed: false,
          reason: `A successful email was sent within the last ${EMAIL_COOLDOWN_DAYS} days.`,
          cooldownEndsAt: cooldownEndsAt.toISOString()
        };
      }
    }
  }

  return {
    allowed: true,
    reason: null,
    cooldownEndsAt: null
  };
}

export function renderCampaignEmail({
  template,
  customerName,
  websiteUrl,
  products
}: {
  template: CampaignTemplate;
  customerName: string | null | undefined;
  websiteUrl: string;
  products: CampaignProduct[];
}) {
  const displayName = customerName?.trim() || "Customer";
  const subject = replaceCustomerName(template.subject, displayName).trim();
  const greeting = replaceCustomerName(template.greeting, displayName).trim();
  const safeWebsiteUrl = normalizeWebsiteUrl(websiteUrl);
  const selectedProducts = products.slice(0, 6);
  const productHtml = selectedProducts
    .map((product) => buildProductHtml(product))
    .join("");
  const productText = selectedProducts
    .map((product) => `- ${product.name}`)
    .join("\n");

  const html = `
    <div style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ef;padding:28px;">
        <p style="margin:0 0 18px;font-size:18px;font-weight:700;">${escapeHtml(greeting)}</p>
        ${paragraphsToHtml(template.body)}
        ${productHtml ? `<div style="margin:24px 0;">${productHtml}</div>` : ""}
        <p style="margin:24px 0;text-align:center;">
          <a href="${escapeHtml(safeWebsiteUrl)}" style="display:inline-block;background:#020617;color:#ffffff;text-decoration:none;padding:12px 22px;font-weight:700;">${escapeHtml(template.website_button_label)}</a>
        </p>
        <p style="margin:24px 0 0;white-space:pre-line;">${escapeHtml(template.closing)}<br />${escapeHtml(template.signature)}</p>
      </div>
    </div>
  `.trim();

  const text = [
    greeting,
    template.body.trim(),
    productText,
    `${template.website_button_label}: ${safeWebsiteUrl}`,
    template.closing.trim(),
    template.signature.trim()
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, html, text };
}

function buildProductHtml(product: CampaignProduct) {
  const imageUrl = normalizeImageUrl(product.image_url);

  return `
    <div style="display:inline-block;vertical-align:top;width:46%;min-width:220px;margin:0 2% 18px 0;">
      ${
        imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" width="300" style="display:block;width:100%;max-width:300px;height:auto;border:1px solid #dbe3ef;" />`
          : ""
      }
      <p style="margin:8px 0 0;font-weight:700;">${escapeHtml(product.name)}</p>
    </div>
  `;
}

function paragraphsToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;white-space:pre-line;">${escapeHtml(paragraph)}</p>`
    )
    .join("");
}

function replaceCustomerName(value: string, customerName: string) {
  return value.replaceAll("{customer_name}", customerName);
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isDoNotContactStatus(status: string | null) {
  const normalized = (status ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s-]+/g, "_");

  return ["do_not_contact", "blocked", "unsubscribed"].includes(normalized);
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function normalizeImageUrl(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}

function denied(reason: string): CampaignSendEligibility {
  return {
    allowed: false,
    reason,
    cooldownEndsAt: null
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
