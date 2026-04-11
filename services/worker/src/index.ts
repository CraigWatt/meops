import { isPublishableSignal } from "@meops/core";
import { channelLabel } from "@meops/content";
import { discoverRepositorySignals } from "@meops/discovery";
import { appendSignalIfMissing, getDashboardSignals } from "@meops/store";
import { type ExtractedSignal, scanRepositoryForSignals } from "@meops/extraction";

const repoPath = process.env.MEOPS_REPO_PATH ?? process.cwd();
const storePath = process.env.MEOPS_STORE_PATH;
const githubToken = process.env.GITHUB_TOKEN ?? process.env.MEOPS_GITHUB_TOKEN;
const githubApiBaseUrl = process.env.MEOPS_GITHUB_API_BASE;
const parsedDiscoveryLimit = Number.parseInt(process.env.MEOPS_REPO_DISCOVERY_LIMIT ?? "10", 10);
const discoveryLimit = Number.isNaN(parsedDiscoveryLimit) ? 10 : parsedDiscoveryLimit;
const parsedCommitLimit = Number.parseInt(process.env.MEOPS_GITHUB_COMMIT_LIMIT ?? "12", 10);
const githubCommitLimit = Number.isNaN(parsedCommitLimit) ? 12 : parsedCommitLimit;
const parsedScanLimit = Number.parseInt(process.env.MEOPS_SCAN_LIMIT ?? "12", 10);
const scanLimit = Number.isNaN(parsedScanLimit) ? 12 : parsedScanLimit;
const repoAllowlist = process.env.MEOPS_REPO_ALLOWLIST?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

async function syncGitSignals() {
  let extractedSignals: ExtractedSignal[] | undefined;
  let mode: "github" | "local" = "local";

  if (githubToken) {
    try {
      extractedSignals = await discoverRepositorySignals({
        token: githubToken,
        allowlist: repoAllowlist,
        repoLimit: discoveryLimit,
        commitLimit: githubCommitLimit,
        apiBaseUrl: githubApiBaseUrl
      });
      mode = "github";
    } catch (error) {
      console.warn(
        "meops worker GitHub discovery failed, falling back to local scan:",
        error instanceof Error ? error.message : error
      );
    }
  }

  if (!extractedSignals) {
    extractedSignals = await scanRepositoryForSignals(repoPath, scanLimit);
  }

  let createdCount = 0;

  for (const signal of extractedSignals) {
    const result = await appendSignalIfMissing(signal, storePath);
    if (result.created) {
      createdCount += 1;
    }
  }

  return {
    candidateCount: extractedSignals.length,
    createdCount,
    mode
  };
}

async function runOnce() {
  try {
    let syncResult = {
      candidateCount: 0,
      createdCount: 0,
      mode: "local" as "github" | "local"
    };

    try {
      syncResult = await syncGitSignals();
    } catch (error) {
      console.warn(
        "meops worker git scan skipped:",
        error instanceof Error ? error.message : error
      );
    }

    const publishable = (await getDashboardSignals(storePath)).filter((signal) =>
      isPublishableSignal(signal)
    );

    console.log(
      `meops worker scanned ${syncResult.candidateCount} git commits from ${syncResult.mode} discovery and added ${syncResult.createdCount} new signals`
    );
    console.log(`meops worker ready with ${publishable.length} publishable signals`);

    for (const signal of publishable) {
      const channels = signal.drafts.map((draft) => channelLabel(draft.channel)).join(", ");
      console.log(`${signal.description} -> ${channels}`);
    }
  } catch (error) {
    console.error(
      "meops worker failed to load signals:",
      error instanceof Error ? error.message : error
    );
  }
}

void runOnce();
