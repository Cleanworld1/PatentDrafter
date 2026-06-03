/** 요청별 OpenAI 옵션 (모델만 선택적). Key·프로젝트는 .env.local 전용. */
export interface OpenAiCredentialInput {
  model?: string;
}

export interface ResolvedOpenAiCredentials {
  apiKey: string;
  model: string;
  source: "server_env";
  organizationId?: string;
  projectId?: string;
}

/** 향후 DB 암호화 저장용 — MVP 미구현 */
export interface UserApiKeyStorageAdapter {
  saveEncryptedKey(userId: string, plainKey: string): Promise<void>;
  getDecryptedKey(userId: string): Promise<string | null>;
  deleteKey(userId: string): Promise<void>;
}
