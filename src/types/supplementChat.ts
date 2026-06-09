export type SupplementChatRole = "user" | "assistant" | "system";

export interface SupplementSectionUpdate {
  section_id: string;
  content: string;
  reason?: string;
}

export interface SupplementChatMessage {
  id: string;
  role: SupplementChatRole;
  content: string;
  at: string;
  attachmentNames?: string[];
  sectionUpdates?: SupplementSectionUpdate[];
  /** 반영 완료된 section_id 목록 (UI 피드백용) */
  appliedSectionIds?: string[];
}

export interface SupplementChatRequestPayload {
  projectName: string;
  messages: Array<{ role: SupplementChatRole; content: string }>;
  specContext: string;
  reviewSummary: string;
  options: {
    inventionMakingEnabled: boolean;
    chemicalInventionEnabled: boolean;
  };
  materials: Array<{
    fileId: string;
    name: string;
    mimeType: string;
    extension: string;
    size: number;
    materialType: string;
  }>;
}

export interface SupplementChatResponsePayload {
  reply: string;
  section_updates?: SupplementSectionUpdate[];
}
