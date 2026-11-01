"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import type { AppRouter } from "@/server/routers/_app";

// Typed hooks (trpc.task.list.useInfiniteQuery, ...) inferred from the router type.
export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // useState rather than module scope: each browser tab gets one stable client,
  // and on the server a fresh one per request, so cache is never shared between users.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Avoid an instant refetch of data that was just rendered on the server.
        defaultOptions: { queries: { staleTime: 30 * 1000 } },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      // A relative URL is enough: React Query does not fetch during server
      // rendering. Initial data comes from the server caller (src/trpc/server.ts).
      links: [httpBatchLink({ url: "/api/trpc" })],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
