const SCRIPT_ATTR = "data-safemate-naver-maps";

let loadPromise: Promise<void> | null = null;
let loadedClientId: string | null = null;

function rejectStale(clientId: string): void {
  if (loadedClientId && loadedClientId !== clientId) {
    loadPromise = null;
    loadedClientId = null;
  }
}

/**
 * Load NCP Dynamic Map v3 once per tab. Duplicate `<script>` tags are avoided; same `ncpClientId` reuses the SDK.
 */
export function loadNaverMapsScript(ncpClientId: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Naver Maps: no window"));
  }
  const id = ncpClientId.trim();
  if (!id) {
    return Promise.reject(new Error("Naver Maps: empty ncpClientId"));
  }

  if (window.naver?.maps?.Map) {
    return Promise.resolve();
  }

  rejectStale(id);
  if (loadPromise && loadedClientId === id) {
    return loadPromise;
  }

  loadedClientId = id;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_ATTR}]`);
    if (existing) {
      const onLoad = () => {
        if (window.naver?.maps?.Map) resolve();
        else reject(new Error("Naver Maps: script present but SDK missing"));
      };
      if (window.naver?.maps?.Map) {
        resolve();
        return;
      }
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener(
        "error",
        () => {
          loadPromise = null;
          loadedClientId = null;
          reject(new Error("Naver Maps: script load error"));
        },
        { once: true },
      );
      return;
    }

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${encodeURIComponent(id)}`;
    s.setAttribute(SCRIPT_ATTR, id);
    s.onload = () => {
      if (window.naver?.maps?.Map) resolve();
      else {
        loadPromise = null;
        loadedClientId = null;
        reject(new Error("Naver Maps: SDK not available after load"));
      }
    };
    s.onerror = () => {
      loadPromise = null;
      loadedClientId = null;
      reject(new Error("Naver Maps: failed to load script"));
    };
    document.head.appendChild(s);
  });

  return loadPromise;
}
