import { onRequest as interpret } from "./interpret.js";

export default {
  fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/interpret") return interpret({ request, env });
    return env.ASSETS.fetch(request, env, ctx);
  },
};
