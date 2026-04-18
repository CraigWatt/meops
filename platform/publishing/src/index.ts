import { type Draft, type DraftChannel } from "@meops/core";

export type PublishChannel = Extract<DraftChannel, "x" | "linkedin">;

export interface PublishResult {
  channel: PublishChannel;
  provider: "x" | "linkedin";
  externalId: string;
  publishedAt: string;
}

export interface PublishDraftOptions {
  xAccessToken?: string;
  xApiBaseUrl?: string;
  linkedinAccessToken?: string;
  linkedinApiBaseUrl?: string;
  linkedinAuthorUrn?: string;
  linkedinVersion?: string;
}

function requireValue(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function responseBodyMessage(bodyText: string, statusCode: number): string {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return `request failed with status ${statusCode}`;
  }

  return trimmed;
}

async function postJson(
  url: string,
  init: RequestInit,
  label: string
): Promise<{ body: unknown; response: Response; rawText: string }> {
  const response = await fetch(url, init);
  const rawText = await response.text();
  const body = rawText
    ? (() => {
        try {
          return JSON.parse(rawText) as unknown;
        } catch {
          return rawText;
        }
      })()
    : undefined;

  if (!response.ok) {
    const message = typeof body === "string" ? body : responseBodyMessage(rawText, response.status);

    throw new Error(`${label} failed (${response.status}): ${message}`);
  }

  return { body, response, rawText };
}

function normalizeXDraftText(draft: Draft): string {
  return draft.body.trim();
}

async function publishToX(
  draft: Draft,
  options: PublishDraftOptions
): Promise<PublishResult> {
  const accessToken = requireValue(
    options.xAccessToken ?? process.env.MEOPS_X_ACCESS_TOKEN,
    "MEOPS_X_ACCESS_TOKEN must be configured to publish X drafts"
  );
  const apiBaseUrl = (options.xApiBaseUrl ?? process.env.MEOPS_X_API_BASE ?? "https://api.x.com").replace(
    /\/$/,
    ""
  );
  const payloadText = normalizeXDraftText(draft);

  if (!payloadText) {
    throw new Error("X drafts must contain content before publishing");
  }

  if (payloadText.length > 280) {
    throw new Error(`X drafts must be 280 characters or fewer; received ${payloadText.length}`);
  }

  const { body } = await postJson(
    `${apiBaseUrl}/2/tweets`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ text: payloadText })
    },
    "X publish"
  );

  const externalId =
    typeof body === "object" && body !== null && "data" in body && typeof (body as { data?: { id?: string } }).data?.id === "string"
      ? (body as { data: { id: string } }).data.id
      : typeof body === "object" && body !== null && "id" in body && typeof (body as { id?: string }).id === "string"
        ? (body as { id: string }).id
        : undefined;

  if (!externalId) {
    throw new Error("X publish succeeded but no tweet identifier was returned");
  }

  return {
    channel: "x",
    provider: "x",
    externalId,
    publishedAt: new Date().toISOString()
  };
}

async function publishToLinkedIn(
  draft: Draft,
  options: PublishDraftOptions
): Promise<PublishResult> {
  const accessToken = requireValue(
    options.linkedinAccessToken ?? process.env.MEOPS_LINKEDIN_ACCESS_TOKEN,
    "MEOPS_LINKEDIN_ACCESS_TOKEN must be configured to publish LinkedIn drafts"
  );
  const authorUrn = requireValue(
    options.linkedinAuthorUrn ?? process.env.MEOPS_LINKEDIN_AUTHOR_URN,
    "MEOPS_LINKEDIN_AUTHOR_URN must be configured to publish LinkedIn drafts"
  );
  const apiBaseUrl = (options.linkedinApiBaseUrl ?? process.env.MEOPS_LINKEDIN_API_BASE ?? "https://api.linkedin.com").replace(
    /\/$/,
    ""
  );
  const linkedInVersion = options.linkedinVersion ?? process.env.MEOPS_LINKEDIN_VERSION ?? "202601";

  const { body, response } = await postJson(
    `${apiBaseUrl}/rest/posts`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "x-restli-protocol-version": "2.0.0",
        "linkedin-version": linkedInVersion
      },
      body: JSON.stringify({
        author: authorUrn,
        commentary: draft.body.trim(),
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      })
    },
    "LinkedIn publish"
  );

  const externalId =
    response.headers.get("x-restli-id") ??
    (typeof body === "object" && body !== null && "id" in body && typeof (body as { id?: string }).id === "string"
      ? (body as { id: string }).id
      : undefined);

  if (!externalId) {
    throw new Error("LinkedIn publish succeeded but no post identifier was returned");
  }

  return {
    channel: "linkedin",
    provider: "linkedin",
    externalId,
    publishedAt: new Date().toISOString()
  };
}

export async function publishDraft(
  draft: Draft,
  options: PublishDraftOptions = {}
): Promise<PublishResult> {
  if (draft.channel === "x") {
    return publishToX(draft, options);
  }

  if (draft.channel === "linkedin") {
    return publishToLinkedIn(draft, options);
  }

  throw new Error(`Unsupported publish channel: ${draft.channel}`);
}
