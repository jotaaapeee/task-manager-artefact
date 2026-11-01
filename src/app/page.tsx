import Link from "next/link";
import { TaskList } from "@/components/TaskList";
import { api } from "@/trpc/server";
import styles from "./page.module.css";

// The data lives in memory and changes at runtime, so this page must render on
// every request. Without this, `next build` would prerender it once, because
// the server caller is a plain function call that Next cannot see as dynamic.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function Home() {
  // SSR: the first page is fetched here and arrives in the HTML, with no
  // loading spinner. The client list takes over from there.
  const firstPage = await api.task.list({ limit: PAGE_SIZE });

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>Tasks</h1>
        <Link href="/tasks/new" className="button">
          New task
        </Link>
      </header>
      <TaskList initialPage={firstPage} pageSize={PAGE_SIZE} />
    </main>
  );
}
