import { AppShell } from "@/components/layout/AppShell";
import { getOpenAiPublicConfig } from "@/lib/ai/getOpenAiPublicConfig";

export default function Home() {
  return <AppShell initialOpenAiConfig={getOpenAiPublicConfig()} />;
}
