export type Variant = {
  dimensionImageUrl?: string | null;
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  unit: string;
  price: number | null;
  stock: string;
};
export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  variants: Variant[];
};
export type Line = {
  variantId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  image?: string;
  unit: string;
};
export type Profile = {
  name: string;
  company: string;
  country: string;
  phone: string;
  address: string;
};
export type Order = {
  id: string;
  status: string;
  created_at: string;
  product_subtotal: number;
  shipping_fee: number | null;
  grand_total: number | null;
  quote_updated_at: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  order_items: {
    variant_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: number | null;
    unit: string;
  }[];
};
