import crypto from 'node:crypto';
import { callAdminBackend } from './admin-backend.js';
export async function consumeRateLimit(request, scope, maxAttempts, windowSeconds) {
 const secret=String(process.env.WITNESS_LEMA_INTERNAL_SECRET||'');
 if(secret.length<32)throw new Error('Rate-limit storage is not configured.');
 const forwarded=String(request.headers?.['x-forwarded-for']||'');
 const client=(forwarded.split(',')[0]||request.socket?.remoteAddress||'unknown').trim().slice(0,128);
 const subjectHash=crypto.createHmac('sha256',secret).update(scope+':'+client).digest('hex');
 const result=await callAdminBackend('rate-limit',{scope,subjectHash,maxAttempts,windowSeconds},1600);
 if(typeof result?.allowed!=='boolean')throw new Error('Rate-limit service unavailable.');
 return result;
}
