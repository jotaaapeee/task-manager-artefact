"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";
import { trpc } from "@/trpc/client";
import styles from "./TaskForm.module.css";

type Task = inferRouterOutputs<AppRouter>["task"]["byId"];

// One form for both pages: with a task it edits, without one it creates.
export function TaskForm({ task }: { task?: Task }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutationOptions = {
    onSuccess: async () => {
      // The list cache survives navigation (the QueryClient lives in the root
      // layout), so mark it stale before going back or it would show old data.
      await utils.task.list.invalidate();
      router.push("/");
    },
  };
  const create = trpc.task.create.useMutation(mutationOptions);
  const update = trpc.task.update.useMutation(mutationOptions);
  const mutation = task ? update : create;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Same rule as the backend schema. Checking here gives instant feedback;
    // the backend check still runs, since the API can be called directly.
    if (titulo.trim() === "") {
      setValidationError("Title is required");
      return;
    }
    setValidationError(null);
    if (task) {
      update.mutate({ id: task.id, titulo, descricao });
    } else {
      create.mutate({ titulo, descricao });
    }
  }

  // isSuccess stays true while the redirect happens, so the form stays locked.
  const busy = mutation.isPending || mutation.isSuccess;
  const error = validationError ?? mutation.error?.message;

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <label className={styles.field}>
        <span>Title</span>
        <input
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          disabled={busy}
          aria-invalid={validationError !== null}
          autoFocus
        />
      </label>

      <label className={styles.field}>
        <span>
          Description <span className={styles.optional}>(optional)</span>
        </span>
        <textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} disabled={busy} rows={5} />
      </label>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className={styles.success}>
          Saved. Redirecting…
        </p>
      )}

      <div className={styles.actions}>
        <Link href="/" className="button secondary">
          Cancel
        </Link>
        <button type="submit" className="button" disabled={busy}>
          {mutation.isPending ? "Saving…" : task ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
}
