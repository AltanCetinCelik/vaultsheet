import { webhooks } from "@polar-sh/sdk/2026-10";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("POLAR_WEBHOOK_SECRET environment variable is missing");
    return Response.json({ received: false }, { status: 500 });
  }

  const body = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };

  let event: webhooks.WebhookPayload;
  try {
    event = await webhooks.validateEvent(body, headers, webhookSecret);
  } catch (error) {
    if (error instanceof webhooks.PolarWebhookVerificationError) {
      return Response.json({ received: false }, { status: 403 });
    }
    if (error instanceof webhooks.PolarWebhookUnknownTypeError) {
      return Response.json({ received: true }, { status: 202 });
    }
    if (error instanceof webhooks.PolarWebhookError) {
      return Response.json({ received: false }, { status: 400 });
    }
    throw error;
  }

  switch (event.type) {
    case "order.paid": {
      // TODO: Handle paid order fulfillment (e.g., persist order or grant entitlements using event.data)
      void event.data.id;
      break;
    }

    case "customer.state_changed": {
      // TODO: Reconcile customer entitlements and active benefits using event.data
      void event.data.id;
      break;
    }

    default:
      break;
  }

  return Response.json({ received: true }, { status: 202 });
}
