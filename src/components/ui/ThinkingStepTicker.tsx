"use client";

import { useCyclingThinkingMessage } from "@/hooks/useCyclingThinkingMessage";

interface ThinkingStepTickerProps {
  steps: readonly string[];
  active: boolean;
  className?: string;
  label?: string;
}

export function ThinkingStepTicker({
  steps,
  active,
  className = "",
  label = "지금 생각 중"
}: ThinkingStepTickerProps) {
  const { message, visible } = useCyclingThinkingMessage(steps, active);

  if (!active || !message) return null;

  return (
    <div className={`thinking-step-ticker-wrap ${className}`.trim()} aria-live="polite">
      <span className="thinking-step-ticker-label">{label}</span>
      <p
        className={`thinking-step-ticker${visible ? " is-visible" : " is-fading"}`}
        key={message}
      >
        {message}
      </p>
    </div>
  );
}
