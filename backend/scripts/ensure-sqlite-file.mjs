import { closeSync, mkdirSync, openSync } from "node:fs";
import path from "node:path";

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

if (databaseUrl.startsWith("file:")) {
  const configuredPath = databaseUrl.slice("file:".length).split("?")[0];
  const databasePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);

  mkdirSync(path.dirname(databasePath), { recursive: true });
  closeSync(openSync(databasePath, "a"));
}
