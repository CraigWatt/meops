export type ContentChannel = "x" | "linkedin" | "blog" | "update-log";

export interface Draft {
  channel: ContentChannel;
  title: string;
  body: string;
}

export function formatDraft(draft: Draft): string {
  return `${draft.title}\n\n${draft.body}`;
}

export function channelLabel(channel: ContentChannel): string {
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
