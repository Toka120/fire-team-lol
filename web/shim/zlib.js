import { Buffer } from 'buffer';
import { gzipSync as gz, gunzipSync as gunz } from 'fflate';
export const gzipSync = (b) => Buffer.from(gz(new Uint8Array(b)));
export const gunzipSync = (b) => Buffer.from(gunz(new Uint8Array(b)));
export default { gzipSync, gunzipSync };
