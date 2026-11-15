import { getPolarClient } from "@/lib/polar";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const products = url.searchParams
    .getAll("products")
    .flatMap((entry) => entry.split(","))
    .map((id) => id.trim())
    .filter(Boolean);

  if (products.length === 0) {
    return Response.json(
      { error: "Missing products in query params" },
      { status: 400 },
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    undefined;

  try {
    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products,
      customer_email: url.searchParams.get("customer_email") ?? undefined,
      customer_ip_address: ipAddress,
      discount_id: url.searchParams.get("discount_id") ?? undefined,
    });

    return Response.redirect(checkout.url, 302);
  } catch (error) {
    console.error("Failed to create Polar checkout session:", error);
    return Response.json(
      { error: "Failed to initialize checkout session" },
      { status: 500 },
    );
  }
}
