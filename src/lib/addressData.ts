export type SavedAddress = {id:string;recipient:string;phone:string;country:string;region:string;city:string;postal_code:string;address:string;company:string;note:string;is_default:boolean};
export const addressLimits = {recipient:150,phone:80,country:100,region:150,city:150,postal_code:40,address:1000,company:200,note:500};
export function readAddress(form: FormData) {
 const data=Object.fromEntries(Object.entries(addressLimits).map(([key])=>[key,String(form.get(key)??'').trim()]));
 if (['recipient','phone','country','address'].some(key=>!data[key]) || Object.entries(addressLimits).some(([key,max])=>data[key].length>max)) return null;
 return {...data,is_default:form.get('is_default')==='on'};
}
export function shippingSnapshot(a:SavedAddress) {
 return {shipping_recipient_name:a.recipient,shipping_phone:a.phone,shipping_country:a.country,shipping_address:[a.company,a.address,a.city,a.region,a.postal_code].filter(Boolean).join('\n'),shipping_note:a.note||null};
}
