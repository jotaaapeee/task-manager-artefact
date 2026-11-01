"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";
import { trpc } from "@/trpc/client";
import styles from "./TaskList.module.css";

type ListPage = inferRouterOutputs<AppRouter>["task"]["list"];
type Task = ListPage["items"][number];
type Feedback = { type: "success" | "error"; text: string };

// Fixed locale and time zone: the server and the browser can be in different
// zones, and a different string on each side would cause a hydration mismatch.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function TaskList({ initialPage, pageSize }: { initialPage: ListPage; pageSize: number }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // initialData seeds the cache with the server-rendered page, so the first
  // render matches the HTML and no request is made on load.
  const list = trpc.task.list.useInfiniteQuery(
    { limit: pageSize },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: { pages: [initialPage], pageParams: [null] },
    },
  );

  // Hide the message after a few seconds; a newer message restarts the timer.
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const tasks = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section>
      {/* role="status" makes screen readers announce the message. */}
      <p role="status" className={feedback ? styles[feedback.type] : styles.hidden}>
        {feedback?.text}
      </p>

      {list.isError && <p className={styles.error}>Could not load tasks: {list.error.message}</p>}

      {tasks.length === 0 ? (
        <p className={styles.empty}>No tasks yet.</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onFeedback={setFeedback} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskItem({ task, onFeedback }: { task: Task; onFeedback: (feedback: Feedback) => void }) {
  const utils = trpc.useUtils();

  // One mutation per row, so each row has its own isPending and several
  // deletes can run at once without sharing a loading state.
  const remove = trpc.task.delete.useMutation({
    onSuccess: () => onFeedback({ type: "success", text: `Deleted "${task.titulo}".` }),
    onError: (error) => onFeedback({ type: "error", text: `Could not delete "${task.titulo}": ${error.message}` }),
    // Refetch the list either way: on success it drops the row, on error
    // (for example, already deleted elsewhere) it syncs with the server.
    onSettled: () => utils.task.list.invalidate(),
  });

  return (
    <li className={styles.item} aria-busy={remove.isPending}>
      <div className={styles.content}>
        <h2 className={styles.title}>{task.titulo}</h2>
        {task.descricao && <p className={styles.description}>{task.descricao}</p>}
        <time className={styles.date} dateTime={new Date(task.dataCriacao).toISOString()}>
          {dateFormat.format(task.dataCriacao)} UTC
        </time>
      </div>
      <div className={styles.actions}>
        <Link href={`/tasks/${task.id}/edit`} className="button secondary">
          Edit
        </Link>
        <button
          type="button"
          className="button danger"
          onClick={() => remove.mutate({ id: task.id })}
          disabled={remove.isPending}
        >
          {remove.isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </li>
  );
}
