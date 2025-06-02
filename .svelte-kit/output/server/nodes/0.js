

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.Bozamwv4.js","_app/immutable/chunks/sGujlNqX.js","_app/immutable/chunks/DkfcLkkR.js"];
export const stylesheets = [];
export const fonts = [];
