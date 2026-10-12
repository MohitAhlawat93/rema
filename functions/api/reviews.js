import {runLegacyHandler} from '../../lib/cloudflare-http.js';
import handler from '../../api/reviews.js';
export const onRequest=context=>runLegacyHandler(context,handler);
