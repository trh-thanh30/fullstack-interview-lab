import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const [{ getDatabase }, { OpsStore }] = await Promise.all([
  import("../src/db/client"),
  import("../src/ops/ops-store"),
]);
const retentionDays = Number(process.env.AI_LOG_RETENTION_DAYS ?? 90);
const deleted = await new OpsStore(getDatabase()).prune(retentionDays);
console.info(`Deleted ${deleted.length} AI call logs older than ${retentionDays} days.`);
