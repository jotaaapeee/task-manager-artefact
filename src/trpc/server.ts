import { createCallerFactory } from "@/server/trpc";
import { appRouter } from "@/server/routers/_app";

// Calls procedures directly in Server Components, with no HTTP round trip to
// our own API, while keeping the same input validation and errors.
// Import this only from server code.
export const api = createCallerFactory(appRouter)({});
