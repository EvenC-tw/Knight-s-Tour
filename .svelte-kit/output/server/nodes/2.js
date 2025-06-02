import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2.-nGYBJnY.js","_app/immutable/chunks/sGujlNqX.js","_app/immutable/chunks/DkfcLkkR.js","_app/immutable/chunks/B_AqWkID.js","_app/immutable/chunks/CtfEvnOT.js","_app/immutable/chunks/BvHBzDWs.js","_app/immutable/chunks/D_WX08sC.js"];
export const stylesheets = ["_app/immutable/assets/2.1UEhxGeh.css"];
export const fonts = [];
