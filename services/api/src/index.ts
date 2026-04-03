import { createServer } from "node:http";

import { getDashboardSignals } from "@meops/store";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method === "GET" && url.pathname === "/signals") {
    void getDashboardSignals()
      .then((signals) => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ signals }));
      })
      .catch((error: unknown) => {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            error: "store_error",
            message: error instanceof Error ? error.message : "unknown error"
          })
        );
      });
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`meops api listening on http://localhost:${port}`);
});
