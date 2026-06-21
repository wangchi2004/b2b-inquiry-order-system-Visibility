"use client";

import { useMemo, useState } from "react";
import {
  filterCampaignCustomersByCountry,
  getCampaignCustomerCountries,
  normalizeCampaignCustomerCountry
} from "@/lib/emailCampaignCustomerFilter";

type SelectorCustomer = {
  id: string;
  name: string | null;
  email: string;
  country: string | null;
  company: string | null;
};

type SelectorTemplate = {
  id: string;
  name: string;
  is_default: boolean;
};

export function EmailCampaignCustomerSelector({
  password,
  customers,
  templates,
  initialCustomerId,
  initialTemplateId
}: {
  password: string;
  customers: SelectorCustomer[];
  templates: SelectorTemplate[];
  initialCustomerId: string;
  initialTemplateId: string;
}) {
  const initialCustomer = customers.find(
    (customer) => customer.id === initialCustomerId
  );
  const [country, setCountry] = useState(
    initialCustomer
      ? normalizeCampaignCustomerCountry(initialCustomer.country)
      : ""
  );
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const countries = useMemo(
    () => getCampaignCustomerCountries(customers),
    [customers]
  );
  const countryCustomers = useMemo(
    () => filterCampaignCustomersByCountry(customers, country),
    [country, customers]
  );

  return (
    <form
      method="GET"
      className="mt-4 grid gap-3 xl:grid-cols-[0.7fr_1.1fr_1fr_auto]"
    >
      <input type="hidden" name="password" value={password} />
      <input type="hidden" name="tab" value="send" />

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Country / 国家
        <select
          value={country}
          onChange={(event) => {
            setCountry(event.target.value);
            setCustomerId("");
          }}
          className="h-11 border border-slate-300 bg-white px-3 font-normal"
          required
        >
          <option value="">Select country / 选择国家</option>
          {countries.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Customer / 客户
        <select
          name="customer_id"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          disabled={!country}
          className="h-11 border border-slate-300 bg-white px-3 font-normal disabled:bg-slate-100"
          required
        >
          <option value="">
            {country
              ? "Select customer / 选择客户"
              : "Select country first / 请先选择国家"}
          </option>
          {countryCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customerLabel(customer)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Template override / 手动选择模板
        <select
          name="template_id"
          defaultValue={initialTemplateId}
          className="h-11 border border-slate-300 bg-white px-3 font-normal"
        >
          <option value="">Auto match by country / 按国家自动匹配</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
              {template.is_default ? " (Default)" : ""}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={!country || !customerId}
        className="h-11 self-end bg-slate-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Load Preview / 加载预览
      </button>
    </form>
  );
}

function customerLabel(customer: SelectorCustomer) {
  const name = customer.name ? `${customer.name} - ` : "";
  const email = customer.email || "No email";
  const company = customer.company ? ` / ${customer.company}` : "";

  return `${name}${email}${company}`;
}
