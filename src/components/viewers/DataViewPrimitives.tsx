import type { ReactNode } from "react";
import { coerceStringArray } from "@/lib/jsonSchema";

export function DataSection({
  title,
  children,
  variant = "default"
}: {
  title: string;
  children: ReactNode;
  variant?: "default" | "warning" | "highlight";
}) {
  return (
    <section className={`data-section data-section--${variant}`}>
      <h3 className="data-section-title">{title}</h3>
      <div className="data-section-body">{children}</div>
    </section>
  );
}

export function DataField({ label, value }: { label: string; value: string }) {
  const text = typeof value === "string" ? value : value != null ? String(value) : "";
  if (!text.trim()) return null;
  return (
    <div className="data-field">
      <span className="data-field-label">{label}</span>
      <p className="data-field-value">{text}</p>
    </div>
  );
}

export function ChipList({
  items,
  emptyLabel = "없음"
}: {
  items: string[] | unknown;
  emptyLabel?: string;
}) {
  const filtered = coerceStringArray(items);
  if (filtered.length === 0) {
    return <p className="data-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="chip-list">
      {filtered.map((item, i) => (
        <li key={`${item.slice(0, 24)}-${i}`} className="chip">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function BulletList({
  items,
  emptyLabel = "없음"
}: {
  items: string[] | unknown;
  emptyLabel?: string;
}) {
  const filtered = coerceStringArray(items);
  if (filtered.length === 0) {
    return <p className="data-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="data-bullet-list">
      {filtered.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
