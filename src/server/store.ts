// Field names follow the challenge spec (titulo, descricao, dataCriacao).
export type Task = {
  id: string;
  titulo: string;
  descricao?: string;
  // Unix timestamp in ms: serializes as plain JSON (no superjson needed)
  // and sorts as a number.
  dataCriacao: number;
};

function seed(): Map<string, Task> {
  const tasks = new Map<string, Task>();
  const now = Date.now();
  for (let i = 1; i <= 25; i++) {
    const task: Task = {
      id: crypto.randomUUID(),
      titulo: `Sample task ${i}`,
      descricao: i % 3 === 0 ? undefined : `Placeholder description for task ${i}.`,
      // One hour apart, so task 25 is the newest.
      dataCriacao: now - (25 - i) * 60 * 60 * 1000,
    };
    tasks.set(task.id, task);
  }
  return tasks;
}

// Kept on globalThis so the data survives dev hot reloads, which re-evaluate
// this module, and is shared by every module instance in the same process.
// It still resets on server restart, which is fine for an in-memory store.
const globalForStore = globalThis as unknown as { tasks?: Map<string, Task> };
export const tasks = (globalForStore.tasks ??= seed());
