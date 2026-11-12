import { createFileRoute } from "@tanstack/react-router";

// Public, unauthenticated REST API. Every data access goes through
// SECURITY DEFINER RPCs or public-safe column projections.
async function run(request: Request, splat: string | undefined) {
  const { handle } = await import("@/lib/public-api.server");
  return handle(request, splat ?? "");
}

export const Route = createFileRoute("/api/public/v1/$")({
  server: {
    handlers: {
      OPTIONS: async () => {
        const { CORS } = await import("@/lib/public-api.server");
        return new Response(null, { status: 204, headers: CORS });
      },
      GET: async ({ request, params }) => run(request, params._splat),
      POST: async ({ request, params }) => run(request, params._splat),
    },
  },
});
