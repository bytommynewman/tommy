export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-8 w-40 rounded-lg" />
      {[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
    </div>
  );
}
