import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: "default" | "accent" | "warning" | "danger";
}

export default function StatCard({
  label,
  value,
  subtitle,
  icon,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "border-qia-border",
    accent: "border-qia-accent/30 bg-qia-accent/5",
    warning: "border-qia-warning/30 bg-qia-warning/5",
    danger: "border-qia-danger/30 bg-qia-danger/5",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all hover:scale-[1.02]",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-qia-text-secondary">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold font-mono text-qia-text-primary">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-qia-text-secondary">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-qia-accent/60 text-xl">{icon}</div>
        )}
      </div>
    </div>
  );
}
