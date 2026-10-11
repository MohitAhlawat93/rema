import { callAdminBackend } from './admin-backend.js';

// The owner secret stays on the server. Only our authenticated Edge Function
// talks to the privileged database RPC; browser/public roles never execute it.
export async function reviewInbox(action,payload={}){
  if(!['submit','list','resolve'].includes(action))throw new Error('Unknown review action.');
  return callAdminBackend('review-inbox',{reviewAction:action,payload});
}
