import {runLegacyHandler} from '../../lib/cloudflare-http.js';
import handler from '../../api/site-content.js';
export const onRequest=context=>runLegacyHandler(context,handler);
