import assert from "node:assert/strict";
import test from "node:test";
import {
  getCampaignSendEligibility,
  renderCampaignEmail,
  selectCampaignTemplate,
  type CampaignTemplate
} from "../src/lib/emailCampaign.ts";

const englishDefault: CampaignTemplate = {
  id: "default-en",
  name: "English Default",
  country_matches: [],
  locale: "en",
  subject: "New products for {customer_name}",
  greeting: "Dear {customer_name},",
  body: "Please view our latest products.",
  website_button_label: "Visit Website",
  closing: "Best regards",
  signature: "Wang Chi",
  is_default: true,
  status: "active"
};

const koreanTemplate: CampaignTemplate = {
  ...englishDefault,
  id: "korea",
  name: "Korea",
  country_matches: ["Korea", "South Korea", "대한민국", "한국"],
  locale: "ko",
  is_default: false
};

test("matches a country alias without case or whitespace sensitivity", () => {
  const selected = selectCampaignTemplate(
    [englishDefault, koreanTemplate],
    "  SOUTH KOREA "
  );

  assert.equal(selected?.id, "korea");
});

test("falls back to the active default template", () => {
  const selected = selectCampaignTemplate(
    [koreanTemplate, englishDefault],
    "Brazil"
  );

  assert.equal(selected?.id, "default-en");
});

test("honors an active manual template override", () => {
  const selected = selectCampaignTemplate(
    [englishDefault, koreanTemplate],
    "Brazil",
    "korea"
  );

  assert.equal(selected?.id, "korea");
});

test("blocks invalid, unsubscribed, and do-not-contact customers", () => {
  assert.equal(
    getCampaignSendEligibility({
      email: "not-an-email",
      emailValid: true,
      unsubscribed: false,
      status: "prospecting"
    }).allowed,
    false
  );
  assert.equal(
    getCampaignSendEligibility({
      email: "buyer@example.com",
      emailValid: false,
      unsubscribed: false,
      status: "prospecting"
    }).reason,
    "Customer email is marked invalid."
  );
  assert.equal(
    getCampaignSendEligibility({
      email: "buyer@example.com",
      emailValid: true,
      unsubscribed: true,
      status: "prospecting"
    }).reason,
    "Customer has unsubscribed."
  );
  assert.equal(
    getCampaignSendEligibility({
      email: "buyer@example.com",
      emailValid: true,
      unsubscribed: false,
      status: "do_not_contact"
    }).reason,
    "Customer is marked do not contact."
  );
});

test("allows a valid contact without send-history gating", () => {
  const result = getCampaignSendEligibility({
    email: "buyer@example.com",
    emailValid: true,
    unsubscribed: false,
    status: "prospecting"
  });

  assert.equal(result.allowed, true);
});

test("renders an escaped email with website link and featured products", () => {
  const rendered = renderCampaignEmail({
    template: englishDefault,
    customerName: '<Buyer & "Partner">',
    websiteUrl: "https://www.wangchi2004.com",
    products: [
      {
        id: "product-1",
        name: "Sole <Black>",
        image_url: "https://images.example.com/sole.webp"
      }
    ]
  });

  assert.equal(rendered.subject, "New products for <Buyer & \"Partner\">");
  assert.match(rendered.html, /Dear &lt;Buyer &amp; &quot;Partner&quot;&gt;,/);
  assert.match(rendered.html, /Sole &lt;Black&gt;/);
  assert.match(rendered.html, /https:\/\/www\.wangchi2004\.com/);
  assert.doesNotMatch(rendered.html, /<Buyer/);
  assert.match(rendered.text, /Sole <Black>/);
});
