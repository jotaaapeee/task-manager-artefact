import { router } from "../trpc";
import { taskRouter } from "./task";

export const appRouter = router({
  task: taskRouter,
});

// Only the type is imported by the client, so no server code is bundled there.
export type AppRouter = typeof appRouter;
