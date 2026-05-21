#!/usr/bin/env node
import os from "node:os";
import { createOnlineHttpServer } from "../src/online/http-server.js";

const port = Number(process.env.PORT ?? process.argv[2] ?? 5173);
const host = process.env.HOST ?? "0.0.0.0";
const server = createOnlineHttpServer({ rootDir: process.cwd() });

server.listen(port, host, () => {
  const localUrl = `http://127.0.0.1:${port}`;
  console.log(`PVZ online battle server running at ${localUrl}`);
  for (const address of lanAddresses()) {
    console.log(`LAN device URL: http://${address}:${port}`);
  }
});

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}
