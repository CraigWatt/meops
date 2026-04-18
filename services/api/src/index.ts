import { createServer } from "node:http";

import { publishDraft } from "@meops/publishing";
import {
  appendSignal,
  getDashboardSignalById,
  getDashboardSignals,
  getDraftPublication,
  upsertDraftPublication
} from "@meops/store";

type CreateSignalPayload = {
  kind?: "commit" | "pull_request" | "release" | "milestone";
  summary?: string;
  repository?: string;
  timestamp?: string;
  priority?: "low" | "medium" | "high";
};

type DraftChannelPayload = "x" | "linkedin";

type DraftActionPayload = {
  signalId?: string;
  channel?: DraftChannelPayload;
};

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const storePath = process.env.MEOPS_STORE_PATH;
const publishToken = process.env.MEOPS_PUBLISH_TOKEN;

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function authorizePublish(request: import("node:http").IncomingMessage): boolean {
  if (!publishToken) {
    return false;
  }

  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  return header.slice("Bearer ".length) === publishToken;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/signals") {
    void getDashboardSignals(storePath)
      .then((signals) => {
        sendJson(response, 200, { signals });
      })
      .catch((error: unknown) => {
        sendJson(response, 500, {
          error: "store_error",
          message: error instanceof Error ? error.message : "unknown error"
        });
      });
    return;
  }

  if (request.method === "POST" && url.pathname === "/signals") {
    void readJsonBody(request).then((body) => {
      try {
        const payload = JSON.parse(body) as CreateSignalPayload;

        if (!payload.kind || !payload.summary || !payload.repository || !payload.priority) {
          sendJson(response, 400, {
            error: "invalid_signal",
            message: "kind, summary, repository, and priority are required"
          });
          return;
        }

        const timestamp = payload.timestamp ?? new Date().toISOString();

        void appendSignal(
          {
            kind: payload.kind,
            summary: payload.summary,
            repository: payload.repository,
            timestamp,
            priority: payload.priority,
            source: "manual"
          },
          storePath
        )
          .then((signal) => {
            sendJson(response, 201, { signal });
          })
          .catch((error: unknown) => {
            sendJson(response, 500, {
              error: "store_write_failed",
              message: error instanceof Error ? error.message : "unknown error"
            });
          });
      } catch {
        sendJson(response, 400, {
          error: "invalid_json",
          message: "request body must be valid JSON"
        });
      }
    });

    return;
  }

  if (request.method === "POST" && (url.pathname === "/drafts/approve" || url.pathname === "/drafts/publish")) {
    if (!publishToken) {
      sendJson(response, 503, {
        error: "publish_token_missing",
        message: "MEOPS_PUBLISH_TOKEN must be configured to change draft status"
      });
      return;
    }

    if (!authorizePublish(request)) {
      sendJson(response, 401, {
        error: "unauthorized",
        message: "missing or invalid publish token"
      });
      return;
    }

    void readJsonBody(request).then((body) => {
      try {
        const payload = JSON.parse(body) as DraftActionPayload;

        if (!payload.signalId || !payload.channel) {
          sendJson(response, 400, {
            error: "invalid_draft_action",
            message: "signalId and channel are required"
          });
          return;
        }

        const signalId = payload.signalId;
        const channel = payload.channel;

        const handleDraftAction = async (): Promise<void> => {
          if (url.pathname === "/drafts/approve") {
            const publication = await upsertDraftPublication(signalId, channel, "approved", storePath);

            sendJson(response, 200, { publication });
            return;
          }

          const publication = await getDraftPublication(signalId, channel, storePath);
          if (!publication || publication.status !== "approved") {
            sendJson(response, 409, {
              error: "draft_not_approved",
              message: "drafts must be approved before publishing"
            });
            return;
          }

          const signal = await getDashboardSignalById(signalId, storePath);
          const draft = signal?.drafts.find((candidate) => candidate.channel === channel);

          if (!signal || !draft) {
            sendJson(response, 404, {
              error: "draft_not_found",
              message: "signal or draft was not found"
            });
            return;
          }

          const delivery = await publishDraft(draft);
          const nextPublication = await upsertDraftPublication(signalId, channel, "published", storePath, {
            actor: delivery.provider,
            externalId: delivery.externalId
          });

          sendJson(response, 200, {
            publication: nextPublication,
            delivery
          });
        };

        void handleDraftAction().catch((error: unknown) => {
          sendJson(response, 500, {
            error: "draft_status_update_failed",
            message: error instanceof Error ? error.message : "unknown error"
          });
        });
      } catch {
        sendJson(response, 400, {
          error: "invalid_json",
          message: "request body must be valid JSON"
        });
      }
    });

    return;
  }

  sendJson(response, 404, { error: "not_found" });
});

server.listen(port, () => {
  console.log(`meops api listening on http://localhost:${port}`);
});
