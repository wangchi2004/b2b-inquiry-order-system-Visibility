export type ProductStatus = "active" | "inactive" | "draft" | string;

export type StockStatus = "in_stock" | "out_of_stock" | "preorder" | string;

export type OrderLinkStatus = "active" | "expired" | "disabled" | string;

export type OrderStatus = "submitted" | "confirmed" | "processing" | "cancelled" | string;

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  material: string | null;
  color: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  translated_name?: string | null;
  translated_description?: string | null;
  translated_category?: string | null;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  unit: string;
  price: number | null;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
};

export type ProductWithVariants = Product & {
  product_variants: ProductVariant[];
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  country: string | null;
  whatsapp: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderLink = {
  id: string;
  customer_id: string;
  token: string;
  status: OrderLinkStatus;
  expires_at: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  customer_id: string | null;
  customer_email: string;
  country: string | null;
  whatsapp: string | null;
  note: string | null;
  locale: string | null;
  inquiry_image_url_1: string | null;
  inquiry_image_url_2: string | null;
  inquiry_image_url_3: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unit: string | null;
  created_at: string;
};

export type CartLineItem = {
  productId: string;
  variantId: string;
  productName: string;
  imageUrl?: string;
  sku: string;
  color?: string;
  size?: string;
  unit?: string;
  unitPrice?: number | null;
  quantity: number;
};

export type PricedOrderLineItem = CartLineItem & {
  imageUrl?: string;
  unitPrice: number | null;
  lineTotal: number | null;
};

export type OrderCustomerInput = {
  email: string;
  country: string;
  whatsapp?: string;
  name?: string;
  company?: string;
  note?: string;
  inquiryImageUrls?: string[];
};

export type OrderSubmissionInput = {
  customer: OrderCustomerInput;
  items: CartLineItem[];
  token?: string;
  locale?: string;
};

export type InquiryOrder = {
  customerEmail: string;
  customerName?: string;
  country?: string;
  whatsapp?: string;
  note?: string;
  token: string;
  items: CartLineItem[];
};
