import type { CartLineItem, OrderCustomerInput } from "@/lib/types";

export const CART_STORAGE_KEY = "inquiry-cart";
export const CART_UPDATED_EVENT = "inquiry-cart-updated";
export const CONTINUE_SHOPPING_PATH_KEY = "inquiry-continue-shopping-path";
export const CART_LOCALE_KEY = "inquiry-locale";
export const ORDER_LINK_SESSION_KEY = "inquiry-order-link-session";
export const VISITOR_ORDER_SESSION_KEY = "inquiry-visitor-order-session";

const supportedCartLocales = new Set(["en", "ko", "ja", "zh"]);

export type OrderLinkCartSession = {
  token: string;
  status: "valid" | "expired";
  message?: string;
  customer: Partial<OrderCustomerInput>;
};

export type VisitorOrderSession = {
  email: string;
  country: string;
};

export function getCartItemCount(items: CartLineItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartItemKey(item: Pick<CartLineItem, "productId" | "variantId" | "sku">) {
  return item.variantId ?? `${item.productId}-${item.sku ?? ""}`;
}

type CartChange = {type:'add'|'set'|'remove'|'consume';variantId:string;quantity?:number;expected?:number};
let owner: string | null | undefined;
let cloudItems: CartLineItem[] = [];
let revision = -1;
let epoch = 0;
let pending = Promise.resolve();
let pendingCount = 0;
export function isCartSyncPending(){return pendingCount>0;}
const notify = () => window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
export function resetAccountCart() { owner=undefined;cloudItems=[];revision=-1;++epoch;notify(); }
export function readGuestCart() {
  if(typeof window==='undefined')return [];
  try{return normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)??'[]')).filter(item=>/^[0-9a-f-]{36}$/i.test(item.variantId)&&Number.isSafeInteger(item.quantity)&&item.quantity<=100000);}catch{return [];}
}
export function readCart(): CartLineItem[] { return owner===undefined?[]:owner===null?readGuestCart():cloudItems; }
export function cartOwner() { return owner; }
function acceptCart(data:{userId:string;revision:number;items:CartLineItem[]}) {
  if(owner!==data.userId){owner=data.userId;revision=-1;}
  if(data.revision<revision)return;
  revision=data.revision;cloudItems=normalizeCartItems(data.items);notify();
}
export async function refreshAccountCart() {
  const version=epoch;
  const res=await fetch(`/api/cart?locale=${window.location?.pathname?.match(/^\/(en|zh|ja|ko)(?:\/|$)/)?.[1]??'en'}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(version!==epoch)return;
  if(res.status===401){if(owner!==null)++epoch;owner=null;cloudItems=[];revision=-1;notify();return;}
  if(!res.ok)throw new Error('Cart sync failed / 购物车同步失败');
  const data=await res.json();if(version===epoch){if(owner!==undefined&&owner!==data.userId)++epoch;acceptCart(data);}
}
async function sendChanges(changes:CartChange[], existingId?:string) {
  if(!changes.length)return;
  if(owner===undefined)await refreshAccountCart();
  if(!owner)throw new Error("Sign in to sync your cart / 请先登录后再保存购物车");
  const targetOwner=owner;
  const version=epoch,operationId=existingId??crypto.randomUUID();
  let response:Response|undefined;
  for(let attempt=0;attempt<2;attempt++){
    if(version!==epoch)throw new Error("Account changed / 账号已切换，请重试");
    try{response=await fetch(`/api/cart?locale=${window.location?.pathname?.match(/^\/(en|zh|ja|ko)(?:\/|$)/)?.[1]??'en'}`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({operationId,changes,userId:targetOwner})});if(response.status<500)break;}catch{ /* Retry the same operation ID, never apply an increment twice. */ }
  }
  if(version!==epoch)throw new Error('Account changed / 账号已切换，请重试');
  if(!response||!response.ok){
    await refreshAccountCart().catch(()=>{});
    if(response?.status===401)throw new Error('Sign in to sync your cart / 请先登录后再保存购物车');
    throw new Error(response?.status===409?'Cart changed on another device. Review and retry. / 另一设备已修改购物车，请查看最新数量后重试。':'Cart sync failed. Please refresh before retrying. / 购物车同步失败，请刷新确认后重试。');
  }
  const data=await response.json();if(version===epoch)acceptCart(data);
}
function queueChanges(build:()=>CartChange[],operationId?:string) {
  const queuedEpoch=epoch;
  pendingCount++;notify();
  const result=pending.then(()=>{if(queuedEpoch!==epoch)throw new Error("Account changed / 账号已切换，请重试");return sendChanges(build(),operationId);}).finally(()=>{pendingCount--;notify();});
  pending=result.catch(()=>{});return result;
}
export async function addCartItems(newItems:CartLineItem[]) {
  // Signed-in cart is authoritative on the server; no account data goes in guest storage.
  return queueChanges(()=>newItems.map(item=>({type:'add',variantId:item.variantId,quantity:item.quantity})));
}
export async function writeCart(items:CartLineItem[]) {
  const before=readCart();
  return queueChanges(()=>{
    const result:CartChange[]=[];
    for(const old of before){const next=items.find(i=>getCartItemKey(i)===getCartItemKey(old));if(!next)result.push({type:'remove',variantId:old.variantId,expected:old.quantity});else if(next.quantity!==old.quantity)result.push({type:'set',variantId:old.variantId,quantity:next.quantity,expected:old.quantity});}
    return result;
  });
}
export async function updateCartItemQuantity(itemKey:string,quantity:number,expected?:number) {
  const item=readCart().find(item=>getCartItemKey(item)===itemKey);if(!item)return;
  return queueChanges(()=>[{type:quantity>0?'set':'remove',variantId:item.variantId,quantity,expected:expected??item.quantity}]);
}
export async function adjustCartItemQuantity(itemKey:string,delta:number){
  const item=readCart().find(item=>getCartItemKey(item)===itemKey);if(!item||!delta)return;
  return queueChanges(()=>[{type:delta>0?"add":"consume",variantId:item.variantId,quantity:Math.abs(delta)}]);
}
export async function removeCartItem(itemKey:string){return updateCartItemQuantity(itemKey,0);}
export async function clearCart(){return writeCart([]);}
export async function consumeCartItems(items:CartLineItem[]){return queueChanges(()=>items.map(item=>({type:'consume',variantId:item.variantId,quantity:item.quantity})));}
export async function importGuestCart(){
  if(!owner)throw new Error('Please sign in / 请先登录');
  const targetOwner=owner,targetEpoch=epoch;
  const snapshot=window.localStorage.getItem(CART_STORAGE_KEY);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(owner+":"+snapshot)))).map(byte=>byte.toString(16).padStart(2,"0")).join("");
  const operationId=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
  if(targetEpoch!==epoch||owner!==targetOwner)throw new Error("Account changed / 账号已切换，请重试");
  const guest=readGuestCart();
  await queueChanges(()=>guest.map(item=>({type:"add",variantId:item.variantId,quantity:item.quantity})),operationId);
  if(snapshot===window.localStorage.getItem(CART_STORAGE_KEY))window.localStorage.removeItem(CART_STORAGE_KEY);
  notify();
}

export function setContinueShoppingPath(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CONTINUE_SHOPPING_PATH_KEY, path);
}

export function getContinueShoppingPath() {
  if (typeof window === "undefined") {
    return "/order/sample-buyer-token";
  }

  return window.localStorage.getItem(CONTINUE_SHOPPING_PATH_KEY) ?? "/order/sample-buyer-token";
}

export function setCartLocale(locale: string | undefined) {
  if (typeof window === "undefined" || !locale || !supportedCartLocales.has(locale)) {
    return;
  }

  window.localStorage.setItem(CART_LOCALE_KEY, locale);
}

export function getCartLocale() {
  if (typeof window === "undefined") {
    return null;
  }

  const locale = window.localStorage.getItem(CART_LOCALE_KEY);

  return locale && supportedCartLocales.has(locale) ? locale : null;
}

export function setOrderLinkSession(session: OrderLinkCartSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(ORDER_LINK_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(ORDER_LINK_SESSION_KEY, JSON.stringify(session));
}

export function readOrderLinkSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(ORDER_LINK_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    return normalizeOrderLinkSession(JSON.parse(value));
  } catch {
    return null;
  }
}

export function setVisitorOrderSession(session: VisitorOrderSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(VISITOR_ORDER_SESSION_KEY, JSON.stringify(session));
}

export function readVisitorOrderSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(VISITOR_ORDER_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    return normalizeVisitorOrderSession(JSON.parse(value));
  } catch {
    return null;
  }
}

function normalizeCartItems(value: unknown): CartLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is CartLineItem => {
      return (
        typeof item === "object" &&
        item !== null &&
        "productId" in item &&
        "productName" in item &&
        "quantity" in item
      );
    })
    .map((item) => ({
      variantId: String(item.variantId),
      productId: String(item.productId),
      productName: String(item.productName),
      imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
      sku: String(item.sku),
      size: item.size ? String(item.size) : undefined,
      color: item.color ? String(item.color) : undefined,
      unit: item.unit ? String(item.unit) : undefined,
      unitPrice:
        "unitPrice" in item && item.unitPrice !== undefined && item.unitPrice !== null
          ? Number(item.unitPrice)
          : undefined,
      quantity: Math.max(0, Math.floor(Number(item.quantity)) || 0)
    }))
    .filter((item) => item.variantId && item.sku && item.quantity > 0);
}

function normalizeOrderLinkSession(value: unknown): OrderLinkCartSession | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const token = typeof record.token === "string" ? record.token : "";
  const status = record.status === "expired" ? "expired" : "valid";
  const customer =
    typeof record.customer === "object" && record.customer !== null
      ? (record.customer as Record<string, unknown>)
      : {};

  if (!token) {
    return null;
  }

  return {
    token,
    status,
    message: typeof record.message === "string" ? record.message : undefined,
    customer: {
      email: readOptionalString(customer.email),
      country: readOptionalString(customer.country),
      whatsapp: readOptionalString(customer.whatsapp),
      name: readOptionalString(customer.name),
      company: readOptionalString(customer.company)
    }
  };
}

function normalizeVisitorOrderSession(value: unknown): VisitorOrderSession | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const email = readOptionalString(record.email);
  const country = readOptionalString(record.country);

  if (!email || !country) {
    return null;
  }

  return {
    email,
    country
  };
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
