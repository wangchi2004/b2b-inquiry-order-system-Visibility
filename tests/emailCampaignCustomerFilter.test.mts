import assert from "node:assert/strict";
import test from "node:test";
import {
  filterCampaignCustomersByCountry,
  getCampaignCustomerCountries
} from "../src/lib/emailCampaignCustomerFilter.ts";

const customers = [
  { id: "1", country: "Korea" },
  { id: "2", country: " south korea " },
  { id: "3", country: "KOREA" },
  { id: "4", country: "Japan" },
  { id: "5", country: null }
];

test("returns unique customer countries without case-sensitive duplicates", () => {
  assert.deepEqual(getCampaignCustomerCountries(customers), [
    { key: "japan", label: "Japan" },
    { key: "korea", label: "Korea" },
    { key: "south korea", label: "south korea" },
    { key: "__missing__", label: "Unspecified / 未填写国家" }
  ]);
});

test("filters customers to the selected normalized country", () => {
  assert.deepEqual(
    filterCampaignCustomersByCountry(customers, "korea").map(
      (customer) => customer.id
    ),
    ["1", "3"]
  );
});

test("supports customers without a country", () => {
  assert.deepEqual(
    filterCampaignCustomersByCountry(customers, "__missing__").map(
      (customer) => customer.id
    ),
    ["5"]
  );
});
