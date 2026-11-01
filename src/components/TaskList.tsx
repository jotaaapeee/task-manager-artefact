"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

  // Infinite scroll: an empty element after the last row is watched, and
  // the next page loads when it gets close to the viewport.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = list;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    // Stop watching after a failed page load. Otherwise the new observer would
    // fire again right away and retry forever; the user retries with a button.
    if (!sentinel || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;
    // A new observer is created after each page loads. If the sentinel is
    // still visible (tall screen, short page), it fires at once and loads the
    // next page too, until the screen is filled.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      // Start loading a bit before the user reaches the end.
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const tasks = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section>
      {/* role="status" makes screen readers announce the message. */}
      <p role="status" className={feedback ? styles[feedback.type] : styles.hidden}>
        {feedback?.text}
      </p>

      {list.isError && !isFetchNextPageError && (
        <p className={styles.error}>Could not load tasks: {list.error.message}</p>
      )}

      {tasks.length === 0 ? (
        <p className={styles.empty}>No tasks yet.</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onFeedback={setFeedback} />
          ))}
        </ul>
      )}

      <div ref={sentinelRef} />
      <div className={styles.footer}>
        {isFetchingNextPage && <p>Loading more…</p>}
        {isFetchNextPageError && (
          <p className={styles.error}>
            Could not load more tasks: {list.error?.message}{" "}
            <button type="button" className="button secondary" onClick={() => fetchNextPage()}>
              Try again
            </button>
          </p>
        )}
        {!hasNextPage && tasks.length > 0 && <p>No more tasks.</p>}
      </div>
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
