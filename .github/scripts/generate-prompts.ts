import fs from "node:fs/promises";
import { buildSnapshotPrompts } from "../../platform/generation/src/index.ts";
import type { DashboardSignal, RepositoryCatalogEntry } from "../../platform/core/src/index.ts";

type PromptTimeRange = "day" | "week" | "month" | "three-months" | "six-months" | "year" | "all";

interface SnapshotStore {
  signals: DashboardSignal[];
  repositories: RepositoryCatalogEntry[];
}

const timeRangeLabels: Record<PromptTimeRange, string> = {
  day: "Last day",
  week: "Last week",
  month: "Last month",
  "three-months": "Last 3 months",
  "six-months": "Last 6 months",
  year: "Last year",
  all: "All time"
};

function readInput(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

async function main() {
  const snapshotPath = new URL("../../.meops/signals.json", import.meta.url);
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, "utf8")) as SnapshotStore;
  const prompts = buildSnapshotPrompts(snapshot.signals, snapshot.repositories);

  const timeRange = readInput("MEOPS_PROMPT_TIME_RANGE", "all") as PromptTimeRange;
  const repositoryScope = readInput("MEOPS_PROMPT_REPOSITORIES", "all watched repositories");
  const scopeLabel = timeRangeLabels[timeRange] ?? "All time";

  const report = [
    "# meops prompt generation",
    "",
    `Scope: ${scopeLabel}`,
    `Repositories: ${repositoryScope}`,
    "",
    "## X prompt",
    "",
    prompts.x.prompt,
    "",
    "## LinkedIn prompt",
    "",
    prompts.linkedin.prompt,
    ""
  ].join("\n");

  process.stdout.write(report);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
