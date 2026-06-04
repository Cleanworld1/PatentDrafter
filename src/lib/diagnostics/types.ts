export type ErrorLogSource = "client" | "server";

export interface ErrorLogEntry {
  id: string;
  at: string;
  source: ErrorLogSource;
  context: string;
  message: string;
  stack?: string;
  meta?: Record<string, string | number | boolean>;
  hint?: string;
}

export interface DiagnosticsReport {
  generatedAt: string;
  devUrl: string;
  serverReachable: boolean;
  entries: ErrorLogEntry[];
  summary: string[];
}
