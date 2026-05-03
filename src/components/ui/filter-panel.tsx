"use client";

export type FilterOption = {
  value: string;
  label: string;
};

export type Filter = {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
};

interface FilterPanelProps {
  filters: Filter[];
  className?: string;
}

export function FilterPanel({ filters, className = "" }: FilterPanelProps) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      {filters.map((f) => (
        <div key={f.key} className="flex flex-col gap-1 min-w-32">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            {f.label}
          </label>
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-surface-raised text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {f.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
