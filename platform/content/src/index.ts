import type { Draft, DraftChannel } from "@meops/core";

export function formatDraft(draft: Draft): string {
  return `${draft.title}\n\n${draft.body}`;
}

export function channelLabel(channel: DraftChannel): string {
  switch (channel) {
    case "x":
      return "X";
    case "linkedin":
      return "LinkedIn";
    case "blog":
      return "Blog";
    case "update-log":
      return "Update log";
  }
}
