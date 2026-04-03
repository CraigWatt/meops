export type ContentChannel = "x" | "linkedin" | "blog" | "update-log";

export interface Draft {
  channel: ContentChannel;
  title: string;
  body: string;
}

