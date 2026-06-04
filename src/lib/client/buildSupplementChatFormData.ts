import { appendOpenAiToFormData } from "@/lib/client/appendOpenAiFields";
import { getSupplementChatBlob } from "@/lib/client/supplementChatBlobRegistry";
import type { SupplementChatRequestPayload } from "@/types/supplementChat";
import type { UploadedFile } from "@/types/patentDraft";

export function buildSupplementChatFormData(
  payload: SupplementChatRequestPayload,
  userMessage: string,
  attachmentFiles: UploadedFile[]
): FormData {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  formData.append("userMessage", userMessage);

  for (const meta of attachmentFiles) {
    const file = getSupplementChatBlob(meta.id);
    if (file) {
      formData.append(meta.id, file, file.name);
    }
  }

  appendOpenAiToFormData(formData);
  return formData;
}
