import { describe, expect, it } from "vitest";
import {
  getSectionOutputNoHeadingRule,
  sanitizeClaimSectionOutput,
  stripClaimNumberListPrefix,
  stripDuplicateSectionHeading
} from "@/lib/sectionOutputSanitizer";

describe("sectionOutputSanitizer", () => {
  it("strips leading duplicate section heading", () => {
    const input = "【발명의 배경이 되는 기술】\n\n최근 기술 분야에서는 …";
    expect(stripDuplicateSectionHeading(input, "【발명의 배경이 되는 기술】")).toBe(
      "최근 기술 분야에서는 …"
    );
  });

  it("strips other standard headings at start", () => {
    const input = "【기술분야】\n본 발명은 …";
    expect(stripDuplicateSectionHeading(input, "【발명의 배경이 되는 기술】")).toBe(
      "본 발명은 …"
    );
  });

  it("leaves body unchanged when no heading prefix", () => {
    const body = "본 발명은 데이터 처리 장치에 관한 것이다.";
    expect(stripDuplicateSectionHeading(body, "【기술분야】")).toBe(body);
  });

  it("includes no-heading rule for prompts", () => {
    expect(getSectionOutputNoHeadingRule("【기술분야】")).toContain("【기술분야】");
    expect(getSectionOutputNoHeadingRule("【기술분야】")).toContain("포함하지 말라");
  });

  it("strips claim list prefix but keeps dependent claim reference", () => {
    const independent =
      "청구항 1. 터널 굴착 시 지반의 선보강에 사용되는 터널 보강용 강관에 있어서,";
    expect(stripClaimNumberListPrefix(independent, 1)).toBe(
      "터널 굴착 시 지반의 선보강에 사용되는 터널 보강용 강관에 있어서,"
    );
    const dependent = "청구항 1에 있어서, 상기 강관은 …";
    expect(stripClaimNumberListPrefix(dependent, 2)).toBe(dependent);
  });

  it("sanitizeClaimSectionOutput removes heading and list prefix", () => {
    const raw =
      "【청구항 1】\n청구항 1. 터널 굴착 시 지반의 선보강에 사용되는 터널 보강용 강관에 있어서,";
    expect(sanitizeClaimSectionOutput(raw, "【청구항 1】")).toBe(
      "터널 굴착 시 지반의 선보강에 사용되는 터널 보강용 강관에 있어서,"
    );
  });
});
