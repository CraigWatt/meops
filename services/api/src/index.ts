import { createServer } from "node:http";

import { appendSignal, getDashboardSignals } from "@meops/store";

type CreateSignalPayload = {
  kind?: "commit" | "pull_request" | "release" | "milestone";
  summary?: string;
  repository?: string;
  timestamp?: string;
  priority?: "low" | "medium" | "high";
};

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const storePath = process.env.MEOPS_STORE_PATH;

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
    let body = "";

    request.on("data", (chunk: Buffer) => {
      body += chunk.toString("utf8");
    });

    request.on("end", () => {
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
            priority: payload.priority
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

  sendJson(response, 404, { error: "not_found" });
});

server.listen(port, () => {
  console.log(`meops api listening on http://localhost:${port}`);
});
