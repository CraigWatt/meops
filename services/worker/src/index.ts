import { getDashboardSignals, isPublishableSignal } from "@meops/core";
import { channelLabel } from "@meops/content";

function runOnce() {
  const publishable = getDashboardSignals().filter((signal) => isPublishableSignal(signal));

  console.log(`meops worker ready with ${publishable.length} publishable signals`);

  for (const signal of publishable) {
    const channels = signal.drafts.map((draft) => channelLabel(draft.channel)).join(", ");
    console.log(`${signal.description} -> ${channels}`);
  }
}

runOnce();
