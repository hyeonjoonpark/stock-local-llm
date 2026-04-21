interface StatePanelProps {
  type: "empty" | "loading" | "error";
  message: string;
}

export default function StatePanel({ type, message }: StatePanelProps) {
  const colorClass =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

  return (
    <section className={`rounded-2xl border p-5 text-sm ${colorClass}`}>
      {type === "loading" ? "잠시만 기다려주세요. " : ""}
      {message}
    </section>
  );
}
