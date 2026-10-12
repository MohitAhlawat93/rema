import {runLegacyHandler} from '../../../lib/cloudflare-http.js';
import handler from '../../../api/admin/[route].js';
export const onRequest=context=>runLegacyHandler(context,handler,context.params.route);
