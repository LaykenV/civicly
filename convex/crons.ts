import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run bill discovery every 4 hours
crons.interval(
  "discover new bills",
  { hours: 4 },
  internal.dataPipeline.discoverNewBillFilesCron,
  {}
);

export default crons;