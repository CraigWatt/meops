import { getDashboardSignals, isPublishableSignal } from "@meops/store";
import { channelLabel } from "@meops/content";

const storePath = process.env.MEOPS_STORE_PATH;

async function runOnce() {
  try {
    const publishable = (await getDashboardSignals(storePath)).filter((signal) =>
      isPublishableSignal(signal)
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
