import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run durable data pipeline workflow every 4 hours
crons.interval(
  "data pipeline workflow",
  { hours: 4 },
  internal.workflows.runDataPipelineCron,
  { maxFiles: 200, interBatchDelayMs: 1500 },
);

export default crons;