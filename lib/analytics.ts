/** Privacy-friendly events. No-ops unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. */
export function track(name: string): void {
  if (typeof window === "undefined") return;
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return;
  const payload = JSON.stringify({
    name,
    url: window.location.href,
    domain,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "https://plausible.io/api/event",
      new Blob([payload], { type: "application/json" }),
    );
    return;
  }
  void fetch("https://plausible.io/api/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}
