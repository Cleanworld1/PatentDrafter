/** sk-proj- Key는 프로젝트/조직 헤더가 필요한 경우가 많음 */
export function buildOpenAiAuthHeaders(
  apiKey: string,
  options?: { organizationId?: string; projectId?: string }
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`
  };

  const org =
    options?.organizationId?.trim() ||
    process.env.OPENAI_ORG_ID?.trim() ||
    process.env.OPENAI_ORGANIZATION?.trim();
  const project =
    options?.projectId?.trim() ||
    process.env.OPENAI_PROJECT_ID?.trim() ||
    process.env.OPENAI_PROJECT?.trim();

  if (org) headers["OpenAI-Organization"] = org;
  if (project) headers["OpenAI-Project"] = project;

  return headers;
}

export function getConfiguredOpenAiScope(): {
  hasOrganization: boolean;
  hasProject: boolean;
} {
  return {
    hasOrganization: Boolean(
      process.env.OPENAI_ORG_ID?.trim() || process.env.OPENAI_ORGANIZATION?.trim()
    ),
    hasProject: Boolean(
      process.env.OPENAI_PROJECT_ID?.trim() || process.env.OPENAI_PROJECT?.trim()
    )
  };
}
