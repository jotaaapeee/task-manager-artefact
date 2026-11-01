import { TaskForm } from "@/components/TaskForm";

export default function NewTaskPage() {
  return (
    <main className="container">
      <header className="page-header">
        <h1>New task</h1>
      </header>
      <TaskForm />
    </main>
  );
}
