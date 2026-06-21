export const MISSING_CUSTOMER_COUNTRY = "__missing__";

type CustomerWithCountry = {
  country: string | null;
};

export function normalizeCampaignCustomerCountry(country: string | null) {
  const normalized = country?.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  return normalized || MISSING_CUSTOMER_COUNTRY;
}

export function getCampaignCustomerCountries<T extends CustomerWithCountry>(
  customers: T[]
) {
  const countries = new Map<string, string>();

  for (const customer of customers) {
    const key = normalizeCampaignCustomerCountry(customer.country);
    const label =
      key === MISSING_CUSTOMER_COUNTRY
        ? "Unspecified / 未填写国家"
        : customer.country?.trim().replace(/\s+/g, " ") || key;

    if (!countries.has(key)) {
      countries.set(key, label);
    }
  }

  return Array.from(countries, ([key, label]) => ({ key, label })).sort(
    (a, b) => {
      if (a.key === MISSING_CUSTOMER_COUNTRY) return 1;
      if (b.key === MISSING_CUSTOMER_COUNTRY) return -1;
      return a.label.localeCompare(b.label, "en", { sensitivity: "base" });
    }
  );
}

export function filterCampaignCustomersByCountry<
  T extends CustomerWithCountry
>(customers: T[], selectedCountry: string) {
  if (!selectedCountry) {
    return [];
  }

  return customers.filter(
    (customer) =>
      normalizeCampaignCustomerCountry(customer.country) === selectedCountry
  );
}
