"use client";

import { useEffect, useState } from "react";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CyclingThinkingOptions {
  /** 각 문구 표시 시간 */
  holdMs?: number;
  /** 페이드 아웃 시간 */
  fadeMs?: number;
}

/**
 * 분석 대기 중 사고 단계 문구를 순환 표시 (보였다 사라졌다 반복).
 */
export function useCyclingThinkingMessage(
  steps: readonly string[],
  active: boolean,
  options: CyclingThinkingOptions = {}
): { message: string; visible: boolean } {
  const holdMs = options.holdMs ?? 2600;
  const fadeMs = options.fadeMs ?? 380;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active || steps.length === 0) {
      setIndex(0);
      setVisible(true);
      return;
    }

    let cancelled = false;

    const loop = async () => {
      while (!cancelled) {
        await sleep(holdMs);
        if (cancelled) return;
        setVisible(false);
        await sleep(fadeMs);
        if (cancelled) return;
        setIndex((prev) => (prev + 1) % steps.length);
        setVisible(true);
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [active, steps, holdMs, fadeMs]);

  const message = steps[index] ?? steps[0] ?? "";
  return { message, visible };
}
