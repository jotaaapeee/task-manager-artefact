import Link from "next/link";

export default function TaskNotFound() {
  return (
    <main className="container">
      <h1>Task not found</h1>
      <p>It may have been deleted.</p>
      <p>
        <Link href="/" className="button secondary">
          Back to tasks
        </Link>
      </p>
    </main>
  );
}
