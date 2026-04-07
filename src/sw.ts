/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const SHARE_CACHE = "share-target-v1";
const SHARE_KEY = "/pwa-md-editor/__shared-file__";

// Web Share Target — intercepta el POST cuando Android abre un .md con esta PWA
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.pathname === "/pwa-md-editor/share" &&
    event.request.method === "POST"
  ) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get("file") as File | null;
          if (file) {
            const content = await file.text();
            const cache = await caches.open(SHARE_CACHE);
            await cache.put(
              SHARE_KEY,
              new Response(JSON.stringify({ name: file.name, content }), {
                headers: { "Content-Type": "application/json" },
              })
            );
          }
        } catch {
          // si algo falla, igual redirige a la app
        }
        return Response.redirect("/pwa-md-editor/", 303);
      })()
    );
  }
});
