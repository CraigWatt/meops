import { createServer } from "node:http";

import { getDashboardSignals } from "@meops/core";
import { channelLabel, formatDraft } from "@meops/content";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method === "GET" && url.pathname === "/signals") {
    const signals = getDashboardSignals().map((signal) => ({
      ...signal,
      drafts: signal.drafts.map((draft) => ({
        ...draft,
        label: channelLabel(draft.channel),
        preview: formatDraft(draft)
      }))
    }));

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ signals }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`meops api listening on http://localhost:${port}`);
});

