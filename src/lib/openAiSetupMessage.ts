/** 브라우저에서 로컬 dev 호스트 여부 */
export function isLocalDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function isProductionDeploymentHost(hostname: string): boolean {
  return !isLocalDevHost(hostname);
}

export function getOpenAiKeySetupMessage(hostname?: string): string {
  const onDeployed =
    typeof hostname === "string"
      ? isProductionDeploymentHost(hostname)
      : process.env.NODE_ENV === "production";

  if (onDeployed) {
    return (
      "서버에 OpenAI API Key가 설정되지 않았습니다. " +
      "Vercel(또는 호스팅) → Settings → Environment Variables에 OPENAI_API_KEY를 넣고 Redeploy하세요."
    );
  }

  return (
    "서버에 OpenAI API Key가 설정되지 않았습니다. " +
    "프로젝트 루트 .env.local의 OPENAI_API_KEY를 설정한 뒤 dev 서버를 재시작하세요."
  );
}
