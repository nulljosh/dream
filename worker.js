import { onRequest as interpret } from "./interpret.js";
import { onRequest as transcribe } from "./transcribe.js";

export default {
  fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/interpret") return interpret({ request, env });
    if (pathname === "/api/transcribe") return transcribe({ request, env });
    return env.ASSETS.fetch(request, env, ctx);
  },
};
