import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";

// One catch-all route serves every procedure: /api/trpc/task.list, etc.
// Queries arrive as GET, mutations as POST.
function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
  });
}

export { handler as GET, handler as POST };
