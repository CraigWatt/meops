import { isPublishableSignal } from "@meops/core";
import { channelLabel } from "@meops/content";
import { appendSignalIfMissing, getDashboardSignals } from "@meops/store";
import { scanRepositoryForSignals } from "@meops/extraction";

const repoPath = process.env.MEOPS_REPO_PATH ?? process.cwd();
const storePath = process.env.MEOPS_STORE_PATH;
const parsedScanLimit = Number.parseInt(process.env.MEOPS_SCAN_LIMIT ?? "12", 10);
const scanLimit = Number.isNaN(parsedScanLimit) ? 12 : parsedScanLimit;

async function syncGitSignals() {
  const extractedSignals = await scanRepositoryForSignals(repoPath, scanLimit);
  let createdCount = 0;

  for (const signal of extractedSignals) {
    const result = await appendSignalIfMissing(signal, storePath);
    if (result.created) {
      createdCount += 1;
    }
  }

  return {
    candidateCount: extractedSignals.length,
    createdCount
  };
}

async function runOnce() {
  try {
    let syncResult = {
      candidateCount: 0,
      createdCount: 0
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
      `meops worker scanned ${syncResult.candidateCount} git commits and added ${syncResult.createdCount} new signals`
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
