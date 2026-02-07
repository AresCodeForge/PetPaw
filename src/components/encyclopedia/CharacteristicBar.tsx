"use client";

type Props = {
  label: string;
  value: number; // 1-5
  maxValue?: number;
  color?: "green" | "blue" | "amber" | "purple" | "rose";
  annotation?: string; // Optional subtitle below the bar (e.g. cost range)
};

const colorClasses = {
  green: "bg-mint",
  blue: "bg-navy-soft",
  amber: "bg-[#f59e0b]",
  purple: "bg-[#8b5cf6]",
  rose: "bg-[#e11d48]",
};

export default function CharacteristicBar({
  label,
  value,
  maxValue = 5,
  color = "blue",
  annotation,
}: Props) {
  const percentage = (value / maxValue) * 100;
  const bgColor = colorClasses[color];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-foreground-muted">{value}/{maxValue}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all duration-300 ${bgColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {annotation && (
        <p className="text-xs text-foreground-subtle italic">{annotation}</p>
      )}
    </div>
  );
}
