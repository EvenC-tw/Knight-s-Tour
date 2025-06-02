export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "Knight-s-Tour/_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.tfeTfbp5.js",app:"_app/immutable/entry/app.BAd2qU2y.js",imports:["_app/immutable/entry/start.tfeTfbp5.js","_app/immutable/chunks/D1SKrS96.js","_app/immutable/chunks/DkfcLkkR.js","_app/immutable/chunks/CtfEvnOT.js","_app/immutable/entry/app.BAd2qU2y.js","_app/immutable/chunks/DkfcLkkR.js","_app/immutable/chunks/BvHBzDWs.js","_app/immutable/chunks/sGujlNqX.js","_app/immutable/chunks/CtfEvnOT.js","_app/immutable/chunks/D_WX08sC.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
