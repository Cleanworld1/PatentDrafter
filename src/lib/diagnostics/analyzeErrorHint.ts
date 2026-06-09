/** 수집된 오류 메시지에서 사용자·개발자용 원인 추정 */
export function inferErrorHint(message: string, context?: string): string | undefined {
  const m = message.toLowerCase();
  const ctx = (context ?? "").toLowerCase();

  if (/failed to fetch|networkerror|load failed|서버에 연결/.test(m)) {
    return "dev 서버 미실행·재시작 중·포트 불일치(3000 vs 3001)·업로드 용량 초과 가능. scripts\\dev-restart.cmd 후 http://localhost:3000 확인.";
  }
  if (/413|too large|body exceeded|용량/.test(m)) {
    return "multipart 업로드 한도 초과. 파일 수·PDF/이미지 크기를 줄이거나 dev 서버 재시작(next.config bodySizeLimit 적용).";
  }
  if (/전달되지 않|누락|re-upload|다시 올려/.test(m)) {
    return "브라우저에 File blob이 없음. 히스토리 불러온 뒤에는 파일을 다시 업로드해야 합니다.";
  }
  if (/invalid_api_key|401|incorrect api key/.test(m)) {
    return ".env.local의 OPENAI_API_KEY·OPENAI_PROJECT_ID 확인. node scripts/test-openai-env.mjs";
  }
  if (/getfileblob|already been declared|module parse failed/.test(m)) {
    return "빌드/번들 오류. dev 서버 재시작 및 patentDraftStore 중복 import 여부 확인.";
  }
  if (/invalid pdf|pdf structure/.test(m)) {
    return "PDF 텍스트 추출 실패. 파일 손상 여부 확인 또는 다른 형식(DOCX) 사용.";
  }
  if (ctx.includes("analyze") && /timeout|timed out|abort/.test(m)) {
    return "분석 시간 초과. 파일 수·크기 줄이거나 모델/네트워크 상태 확인.";
  }
  if (/input tokens exceed|configured limit|토큰/.test(m)) {
    return "요청 토큰 한도 초과. 업로드 파일·PDF 수를 줄이거나 OPENAI_REASONING_EFFORT 를 medium/low 로 낮춰 보세요.";
  }
  if (/content가 없|응답 본문이 비어|reasoning/.test(m)) {
    return "OPENAI_REASONING_EFFORT=high 일 때 추론만 하고 본문이 비는 경우가 있습니다. 발명 분석은 자동으로 low 를 쓰도록 수정됨 — dev 서버 재시작 후 재시도.";
  }
  return undefined;
}
