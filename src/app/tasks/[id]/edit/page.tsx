import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";
import { TaskForm } from "@/components/TaskForm";
import { api } from "@/trpc/server";

// In Next 15, params is a Promise.
export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // The task is loaded on the server, so the form renders already filled in.
  const task = await api.task.byId({ id }).catch((error) => {
    // A missing task becomes a real 404 page; any other error is unexpected
    // and goes to Next's error handling.
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  return (
    <main className="container">
      <header className="page-header">
        <h1>Edit task</h1>
      </header>
      <TaskForm task={task} />
    </main>
  );
}
