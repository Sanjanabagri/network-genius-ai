import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackEvent } from "@/lib/analytics.functions";

function sessionId() {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("na_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("na_session_id", id);
  }
  return id;
}

/** Records a login once per browser session and a page_view on every route change. */
export function useActivityTracking() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const sid = sessionId();
    if (!sessionStorage.getItem("na_login_logged")) {
      sessionStorage.setItem("na_login_logged", "1");
      void trackEvent({ data: { event_type: "login", session_id: sid } }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    void trackEvent({
      data: {
        event_type: "page_view",
        path: pathname,
        session_id: sessionId(),
        referrer: typeof document !== "undefined" ? document.referrer.slice(0, 512) : undefined,
      },
    }).catch(() => {});
  }, [pathname]);
}
