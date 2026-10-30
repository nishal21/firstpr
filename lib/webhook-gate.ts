/**
 * What the webhook route answers before any bot work runs. Kept free of
 * Next.js and Octokit so it can be checked offline.
 *
 * Only a missing or wrong signature (401) and a signed body that is not JSON
 * (400) are client errors. Every signed JSON event gets 202, including events
 * the bot ignores (status, check_run, check_suite, ping, anything new), so
 * GitHub lists them as delivered and the status page counts them as accepted.
 */
export type GateHeaders = {
  id: string | null;
  name: string | null;
  signature: string | null;
};

export type GateResult =
  | { ok: true; status: 202; id: string; name: string; payload: unknown }
  | { ok: false; status: 400 | 401; code: "unauthorized" | "bad_request"; error: string; signatureMismatch: boolean };

export async function gateWebhook(
  headers: GateHeaders,
  body: string,
  verify: (body: string, signature: string) => Promise<boolean>,
): Promise<GateResult> {
  const { id, name, signature } = headers;
  if (!id || !name || !signature) {
    return { ok: false, status: 401, code: "unauthorized", error: "Missing GitHub webhook headers", signatureMismatch: false };
  }
  let verified = false;
  try {
    verified = await verify(body, signature);
  } catch {
    verified = false;
  }
  if (!verified) {
    return { ok: false, status: 401, code: "unauthorized", error: "Invalid webhook signature", signatureMismatch: true };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return { ok: false, status: 400, code: "bad_request", error: "Webhook body is not valid JSON", signatureMismatch: false };
  }
  return { ok: true, status: 202, id, name, payload };
}

export type HookDelivery = { delivered_at?: string; status_code?: number; event?: string };

export type DeliveryCounts = {
  accepted: number;
  total: number;
  clientErrors: number;
  serverErrors: number;
  noResponse: number;
};

const code = (d: HookDelivery) => (typeof d.status_code === "number" ? d.status_code : 0);

/** Any 2xx is accepted, whether the bot acted on the event or ignored it. */
export function deliveryAccepted(d: HookDelivery): boolean {
  return code(d) >= 200 && code(d) < 300;
}

/** Counts over GitHub's recent deliveries. Pings are setup noise and are left out. */
export function countDeliveries(all: readonly HookDelivery[]): { deliveries: HookDelivery[]; counts: DeliveryCounts } {
  const deliveries = all.filter((d) => d.event !== "ping");
  return {
    deliveries,
    counts: {
      accepted: deliveries.filter(deliveryAccepted).length,
      total: deliveries.length,
      clientErrors: deliveries.filter((d) => code(d) >= 400 && code(d) < 500).length,
      serverErrors: deliveries.filter((d) => code(d) >= 500).length,
      noResponse: deliveries.filter((d) => code(d) === 0).length,
    },
  };
}