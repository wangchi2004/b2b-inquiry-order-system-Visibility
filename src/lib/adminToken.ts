import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
export const ADMIN_SESSION_COOKIE='private_admin_session';
export const ADMIN_SESSION_SECONDS=8*60*60;
export function sameSecret(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function createAdminToken(secret:string,now=Date.now()){
 const payload=`${now+ADMIN_SESSION_SECONDS*1000}.${randomBytes(24).toString('hex')}`;
 return `${payload}.${createHmac('sha256',secret).update(payload).digest('hex')}`;
}
export function verifyAdminToken(token:string|undefined,secret:string,now=Date.now()){
 if(!token||!secret)return false;
 const parts=token.split('.');if(parts.length!==3||!/^\d+$/.test(parts[0])||! /^[a-f0-9]{48}$/.test(parts[1]))return false;
 const expiry=Number(parts[0]);if(!Number.isSafeInteger(expiry)||expiry<=now||expiry>now+ADMIN_SESSION_SECONDS*1000)return false;
 return sameSecret(parts[2],createHmac('sha256',secret).update(`${parts[0]}.${parts[1]}`).digest('hex'));
}
