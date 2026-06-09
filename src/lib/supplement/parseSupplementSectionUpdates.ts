import { SECTION_TYPE_TITLES } from "@/types/specificationSection";
import type { SupplementSectionUpdate } from "@/types/supplementChat";

const TITLE_TO_SECTION_ID = Object.fromEntries(
  Object.entries(SECTION_TYPE_TITLES).map(([id, title]) => [title, id])
) as Record<string, string>;

const REPLY_ACTION_SUFFIX = /\n*명세서에\s*반영\s*$/;
const META_REASON_PATTERN = /(?:위함|목적|신설하기\s*위해|작성하기\s*위해)\.?$/;

function minContentLength(sectionId: string): number {
  if (sectionId.startsWith("drawing_") || sectionId.startsWith("claim_")) return 40;
  return 20;
}

function isSubstantiveSectionContent(sectionId: string, content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < minContentLength(sectionId)) return false;
  if (
    (sectionId.startsWith("drawing_") || sectionId.startsWith("claim_")) &&
    trimmed.length < 80 &&
    META_REASON_PATTERN.test(trimmed)
  ) {
    return false;
  }
  return true;
}

export function normalizeSupplementSectionId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed in SECTION_TYPE_TITLES) return trimmed;

  const canonical = trimmed.match(/^(claim|drawing)_(\d+)$/);
  if (canonical) return `${canonical[1]}_${canonical[2]}`;

  const drawingMatch = trimmed.match(/^(?:drawing|figure|fig|도)[_\s-]?(\d+)$/i);
  if (drawingMatch) return `drawing_${drawingMatch[1]}`;

  const claimMatch = trimmed.match(/^(?:claim|청구항)[_\s-]?(\d+)$/i);
  if (claimMatch) return `claim_${claimMatch[1]}`;

  const titled = TITLE_TO_SECTION_ID[trimmed] ?? TITLE_TO_SECTION_ID[`【${trimmed.replace(/^【|】$/g, "")}】`];
  if (titled) return titled;

  return null;
}

function parseSectionHeaderToId(headerInner: string): string | null {
  const inner = headerInner.trim();
  const drawingHeader = inner.match(/^도\s*(\d+)$/);
  if (drawingHeader) return `drawing_${drawingHeader[1]}`;

  const claimHeader = inner.match(/^청구항\s*(\d+)$/);
  if (claimHeader) return `claim_${claimHeader[1]}`;

  const titled = TITLE_TO_SECTION_ID[`【${inner}】`];
  if (titled) return titled;

  return normalizeSupplementSectionId(inner);
}

export function parseSectionUpdatesFromReply(reply: string): SupplementSectionUpdate[] {
  const cleaned = reply.replace(REPLY_ACTION_SUFFIX, "").trim();
  const headerPattern = /【([^】]+)】/g;
  const matches = [...cleaned.matchAll(headerPattern)];
  const updates: SupplementSectionUpdate[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const header = matches[i][0];
    const section_id = parseSectionHeaderToId(matches[i][1]);
    if (!section_id) continue;

    const start = (matches[i].index ?? 0) + header.length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
    const content = cleaned
      .slice(start, end)
      .replace(REPLY_ACTION_SUFFIX, "")
      .trim();

    if (!isSubstantiveSectionContent(section_id, content)) continue;
    updates.push({ section_id, content });
  }

  return updates;
}

export function cleanSupplementReplyForDisplay(
  reply: string,
  updates: SupplementSectionUpdate[]
): string {
  let text = reply.replace(REPLY_ACTION_SUFFIX, "").trim();
  if (!updates.length) return text;

  for (const update of updates) {
    const titleMatch =
      update.section_id.startsWith("drawing_")
        ? `【도 ${update.section_id.replace("drawing_", "")}】`
        : update.section_id.startsWith("claim_")
          ? `【청구항 ${update.section_id.replace("claim_", "")}】`
          : SECTION_TYPE_TITLES[update.section_id as keyof typeof SECTION_TYPE_TITLES];

    if (!titleMatch) continue;

    const escaped = titleMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const blockPattern = new RegExp(
      `${escaped}[\\s\\S]*?(?=\\n【|$)`,
      "m"
    );
    text = text.replace(blockPattern, "").trim();
  }

  return text.replace(/\n{3,}/g, "\n\n").trim() || reply.trim();
}

export function coerceSupplementSectionUpdates(
  reply: string,
  rawUpdates: SupplementSectionUpdate[] | undefined
): SupplementSectionUpdate[] {
  const merged = new Map<string, SupplementSectionUpdate>();

  for (const raw of rawUpdates ?? []) {
    const section_id = normalizeSupplementSectionId(raw.section_id);
    const content = typeof raw.content === "string" ? raw.content.trim() : "";
    if (!section_id || !content) continue;

    const existing = merged.get(section_id);
    if (!existing || content.length > existing.content.length) {
      merged.set(section_id, {
        section_id,
        content,
        reason: raw.reason?.trim() || existing?.reason
      });
    }
  }

  for (const parsed of parseSectionUpdatesFromReply(reply)) {
    const existing = merged.get(parsed.section_id);
    if (!existing) {
      merged.set(parsed.section_id, parsed);
      continue;
    }
    if (parsed.content.length > existing.content.length) {
      merged.set(parsed.section_id, { ...existing, content: parsed.content });
    }
  }

  return Array.from(merged.values()).filter((u) => isSubstantiveSectionContent(u.section_id, u.content));
}
