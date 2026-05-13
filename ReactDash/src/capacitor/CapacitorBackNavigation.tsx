import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { consumeHardwareBack } from "./hardwareBackStack";

const ROOT_PATHS = new Set(["/", "/admin-login"]);

/**
 * Android: hardware back and predictive / gesture back dispatch through Capacitor's
 * `backButton` event. We close registered UI layers first, then match React Router
 * history, then send the user home if the WebView stack is empty, then minimize at root.
 *
 * iOS: interactive pop is driven by WKWebView history; HashRouter already responds to
 * `popstate` / hash changes, so no listener is registered there.
 */
export function CapacitorBackNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  pathRef.current = location.pathname;

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    const sub = App.addListener("backButton", async ({ canGoBack }) => {
      if (consumeHardwareBack()) return;

      if (canGoBack) {
        navigate(-1);
        return;
      }

      const path = pathRef.current;
      if (!ROOT_PATHS.has(path)) {
        navigate("/", { replace: false });
        return;
      }

      try {
        await App.minimizeApp();
      } catch {
        await App.exitApp();
      }
    });

    return () => {
      void sub.then((h) => void h.remove());
    };
  }, [navigate]);

  return null;
}
