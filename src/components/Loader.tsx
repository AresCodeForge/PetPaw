"use client";

type LoaderProps = {
  /** Optional label below the spinner (e.g. "Loading…") */
  label?: string;
  /** Use compact layout (spinner only, smaller) */
  compact?: boolean;
};

export default function Loader({ label, compact }: LoaderProps) {
  return (
    <div className={compact ? "flex justify-center py-2" : "flex flex-col items-center justify-center gap-4 py-8"}>
      <div className="spinner" role="status" aria-label={label || "Loading"}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className={i === 5 ? "middle" : undefined} />
        ))}
      </div>
      {label && !compact && (
        <p className="text-sm text-foreground-muted">{label}</p>
      )}
    </div>
  );
}
