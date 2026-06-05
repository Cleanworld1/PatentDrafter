let abortRequested = false;

export function resetGuidedDraftAbort(): void {
  abortRequested = false;
}

export function requestGuidedDraftAbort(): void {
  abortRequested = true;
}

export function isGuidedDraftAborted(): boolean {
  return abortRequested;
}
