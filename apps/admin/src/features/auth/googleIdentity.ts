type GoogleCredentialResponse = { credential: string };

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (parent: HTMLElement, options: { theme: string; size: string; width: string }) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

/**
 * Renders the Google Identity button into `container` and calls `onCredential`
 * with each ID token. Returns false when the Google script is not loaded.
 */
export function mountGoogleButton(container: HTMLElement, onCredential: (idToken: string) => void): boolean {
  const id = window.google?.accounts?.id;
  if (!id) return false;
  id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    callback: (response) => onCredential(response.credential),
  });
  id.renderButton(container, { theme: "outline", size: "large", width: "100%" });
  return true;
}

/**
 * Mounts the Google button now, or once the async GSI script loads.
 * Returns a cleanup that drops the pending load listener.
 */
export function mountGoogleButtonWhenReady(container: HTMLElement, onCredential: (idToken: string) => void): () => void {
  if (mountGoogleButton(container, onCredential)) return () => undefined;
  const script = document.querySelector<HTMLScriptElement>('script[src*="accounts.google.com/gsi/client"]');
  if (!script) return () => undefined;
  const onLoad = () => mountGoogleButton(container, onCredential);
  script.addEventListener("load", onLoad, { once: true });
  return () => script.removeEventListener("load", onLoad);
}

/** Clicks the rendered Google button inside `container`, which opens Google's sign-in. */
export function clickGoogleButton(container: HTMLElement | null) {
  container?.querySelector<HTMLElement>('[role="button"]')?.click();
}
