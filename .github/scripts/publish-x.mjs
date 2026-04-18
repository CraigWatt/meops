import { createHmac, randomBytes } from "node:crypto";

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function percentEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function oauthNonce() {
  return randomBytes(16).toString("hex");
}

function oauthTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function buildOAuth1Header(parameters) {
  return `OAuth ${Object.entries(parameters)
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

function signatureBaseString(method, url, parameters) {
  const parameterString = Object.entries(parameters)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      const leftPair = `${percentEncode(leftKey)}=${percentEncode(leftValue)}`;
      const rightPair = `${percentEncode(rightKey)}=${percentEncode(rightValue)}`;
      return leftPair.localeCompare(rightPair);
    })
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join("&");

  return [method.toUpperCase(), percentEncode(url), percentEncode(parameterString)].join("&");
}

function signOAuth1Request(method, url, consumerKey, consumerSecret, token, tokenSecret) {
  const nonce = oauthNonce();
  const timestamp = oauthTimestamp();
  const oauthParameters = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: token,
    oauth_version: "1.0"
  };

  const baseString = signatureBaseString(method, url, oauthParameters);
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");

  return buildOAuth1Header({
    ...oauthParameters,
    oauth_signature: signature
  });
}

const draftTitle = requireValue(process.env.X_DRAFT_TITLE?.trim(), "X_DRAFT_TITLE must be set");
const draftBody = requireValue(process.env.X_DRAFT_BODY?.trim(), "X_DRAFT_BODY must be set");
const consumerKey = requireValue(process.env.MEOPS_X_CONSUMER_KEY, "MEOPS_X_CONSUMER_KEY must be configured");
const consumerSecret = requireValue(process.env.MEOPS_X_CONSUMER_SECRET, "MEOPS_X_CONSUMER_SECRET must be configured");
const accessToken = requireValue(process.env.MEOPS_X_ACCESS_TOKEN, "MEOPS_X_ACCESS_TOKEN must be configured");
const accessTokenSecret = requireValue(
  process.env.MEOPS_X_ACCESS_TOKEN_SECRET,
  "MEOPS_X_ACCESS_TOKEN_SECRET must be configured"
);
const apiBaseUrl = (process.env.MEOPS_X_API_BASE || "https://api.x.com").replace(/\/$/, "");

if (draftBody.length > 280) {
  throw new Error(`X drafts must be 280 characters or fewer; received ${draftBody.length}`);
}

const url = `${apiBaseUrl}/2/tweets`;
const response = await fetch(url, {
  method: "POST",
  headers: {
    authorization: signOAuth1Request(
      "POST",
      url,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret
    ),
    "content-type": "application/json"
  },
  body: JSON.stringify({ text: draftBody })
});

const rawText = await response.text();
let payload;

try {
  payload = rawText ? JSON.parse(rawText) : undefined;
} catch {
  payload = rawText;
}

if (!response.ok) {
  const message = typeof payload === "string" ? payload : rawText || `request failed with status ${response.status}`;
  throw new Error(`X publish failed (${response.status}): ${message}`);
}

const tweetId =
  typeof payload === "object" && payload !== null && "data" in payload && typeof payload.data?.id === "string"
    ? payload.data.id
    : typeof payload === "object" && payload !== null && "id" in payload && typeof payload.id === "string"
      ? payload.id
      : undefined;

if (!tweetId) {
  throw new Error("X publish succeeded but no tweet identifier was returned");
}

console.log(`Published ${draftTitle} to X as ${tweetId}`);
