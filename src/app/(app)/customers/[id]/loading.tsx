export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse rounded-[20px] bg-white p-6" style={{ border: "1px solid var(--border)" }}>
        <div className="h-5 w-32 rounded" style={{ background: "var(--primary-light)" }} />
        <div className="mt-3 h-3 w-48 rounded" style={{ background: "var(--background)" }} />
      </div>
      <div className="animate-pulse rounded-[20px] bg-white p-6" style={{ border: "1px solid var(--border)" }}>
        <div className="h-4 w-40 rounded" style={{ background: "var(--primary-light)" }} />
        <div className="mt-4 h-20 rounded-xl" style={{ background: "var(--background)" }} />
      </div>
      <div className="animate-pulse rounded-[20px] bg-white p-6" style={{ border: "1px solid var(--border)" }}>
        <div className="h-4 w-32 rounded" style={{ background: "var(--primary-light)" }} />
        <div className="mt-4 h-24 rounded-xl" style={{ background: "var(--background)" }} />
      </div>
    </div>
  );
}
