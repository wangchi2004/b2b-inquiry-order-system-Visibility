export type CustomerEmailTemplateInput = {
  orderUrl: string;
};

export type CustomerEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export function buildCustomerCatalogEmailTemplate({
  orderUrl
}: CustomerEmailTemplateInput): CustomerEmailTemplate {
  const subject = "New Shoe Repair Materials Catalog - Select Products Online";
  const safeOrderUrl = escapeHtml(orderUrl);

  const html = `<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
    <div style="max-width:640px; margin:0 auto; padding:28px 20px;">
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:28px;">
        <p style="margin:0 0 16px;">Dear customer,</p>
        <p style="margin:0 0 16px; line-height:1.6;">
          We have prepared a new product selection page for shoe repair materials.
        </p>
        <p style="margin:0 0 20px; line-height:1.6;">
          You can choose products, sizes and quantities online:
        </p>
        <p style="margin:0 0 24px;">
          <a href="${safeOrderUrl}" style="display:inline-block; background:#0f172a; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:6px;">
            Start Order
          </a>
        </p>
        <p style="margin:0 0 16px; line-height:1.6;">
          After you submit the order request, we will check stock, price and shipping cost, then reply to you soon.
        </p>
        <p style="margin:24px 0 0; line-height:1.6;">
          Best regards
        </p>
      </div>
      <p style="margin:16px 0 0; color:#64748b; font-size:12px; line-height:1.5;">
        Order link: <a href="${safeOrderUrl}" style="color:#2563eb;">${safeOrderUrl}</a>
      </p>
    </div>
  </body>
</html>`;

  const text = `Subject: ${subject}

Dear customer,

We have prepared a new product selection page for shoe repair materials.

You can choose products, sizes and quantities online:

Start Order:
${orderUrl}

After you submit the order request, we will check stock, price and shipping cost, then reply to you soon.

Best regards`;

  return {
    subject,
    html,
    text
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
