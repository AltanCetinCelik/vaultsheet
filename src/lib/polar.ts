import { createPolar, type Environment, type Polar } from "@polar-sh/sdk/2026-10";

let polarClient: Polar | null = null;

function resolvePolarEnvironment(): Environment {
  const configured =
    process.env.POLAR_SERVER?.trim().toLowerCase() ??
    process.env.POLAR_ENVIRONMENT?.trim().toLowerCase();
  return configured === "sandbox" ? "sandbox" : "production";
}

/**
 * Returns a single shared Polar SDK client configured from POLAR_SERVER and POLAR_ACCESS_TOKEN.
 */
export function getPolarClient(): Polar {
  if (polarClient) {
    return polarClient;
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN environment variable is required");
  }

  polarClient = createPolar({
    accessToken,
    environment: resolvePolarEnvironment(),
  });

  return polarClient;
}
