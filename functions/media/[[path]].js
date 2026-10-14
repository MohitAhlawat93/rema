import { getR2Photo } from '../../lib/r2-media.js';
export async function onRequest(context){
  return getR2Photo(context.env.MEDIA_BUCKET,context.request);
}
