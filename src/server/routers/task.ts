import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks, type Task } from "../store";
import { publicProcedure, router } from "../trpc";

// Shared by create and update, so both apply the same rules.
const taskFields = z.object({
  titulo: z.string().trim().min(1, "Title is required").max(120, "Title must be at most 120 characters"),
  descricao: z.string().trim().max(1000, "Description must be at most 1000 characters").optional(),
});

function findOrThrow(id: string): Task {
  const task = tasks.get(id);
  if (!task) {
    throw new TRPCError({ code: "NOT_FOUND", message: `Task "${id}" not found` });
  }
  return task;
}

export const taskRouter = router({
  // Offset pagination: cursor is the index of the first item on the page.
  // Simple, and good enough for an in-memory list. A deletion between pages
  // can shift items by one, which a keyset cursor (dataCriacao + id) would avoid.
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
        cursor: z.number().int().min(0).nullish(),
      }),
    )
    .query(({ input }) => {
      const start = input.cursor ?? 0;
      const sorted = [...tasks.values()].sort((a, b) => b.dataCriacao - a.dataCriacao);
      const items = sorted.slice(start, start + input.limit);
      const next = start + items.length;
      return { items, nextCursor: next < sorted.length ? next : null };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => findOrThrow(input.id)),

  create: publicProcedure.input(taskFields).mutation(({ input }) => {
    const task: Task = {
      id: crypto.randomUUID(),
      titulo: input.titulo,
      // An empty description from the form is stored as "no description".
      descricao: input.descricao || undefined,
      dataCriacao: Date.now(),
    };
    tasks.set(task.id, task);
    return task;
  }),

  update: publicProcedure
    .input(taskFields.extend({ id: z.string() }))
    .mutation(({ input }) => {
      const task = findOrThrow(input.id);
      const updated: Task = { ...task, titulo: input.titulo, descricao: input.descricao || undefined };
      tasks.set(task.id, updated);
      return updated;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      findOrThrow(input.id);
      tasks.delete(input.id);
      return { id: input.id };
    }),
});
