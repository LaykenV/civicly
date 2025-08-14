import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { WorkflowManager, vWorkflowId, WorkflowId } from "@convex-dev/workflow";
import { components } from "./_generated/api";
import { BillData } from "../types";

// Initialize workflow manager with sensible defaults
export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    // Adjust if you need more/less parallelism
    maxParallelism: 5,
  },
});

// Internal helpers used by the workflow
export const listNewXmlFiles = internalAction({
  args: {
    sinceMs: v.number(),
    billTypes: v.optional(v.array(v.string())),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const billTypes = args.billTypes ?? ["hr", "s", "hjres", "sjres"];
    const urls: Array<string> = [];

    for (const billType of billTypes) {
      const govInfoUrl = `https://www.govinfo.gov/bulkdata/json/BILLS/119/1/${billType}/`;
      const response = await fetch(govInfoUrl, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) continue;
      const data: BillData = await response.json();
      const newXmlFiles = (data.files ?? [])
        .filter((f) => f.link.endsWith(".xml"))
        // Exclude initial-state bills: 'ih' (House Introduced) and 'is' (Senate Introduced)
        .filter((f) => {
          const link = f.link.toLowerCase();
          return !link.endsWith("ih.xml") && !link.endsWith("is.xml");
        })
        .filter((f) => new Date(f.formattedLastModifiedTime).getTime() > args.sinceMs)
        .sort((a, b) => new Date(b.formattedLastModifiedTime).getTime() - new Date(a.formattedLastModifiedTime).getTime())
        .map((f) => f.link as string);
      urls.push(...newXmlFiles);
    }

    // Deduplicate
    console.log(`Found ${urls.length} new XML files`);
    return Array.from(new Set(urls));
  },
});

export const noop = internalAction({
  args: {},
  returns: v.null(),
  handler: async (): Promise<null> => {
    return null;
  },
});

// A durable workflow that discovers, filters and ingests bill XML files.
export const dataPipelineWorkflow = workflow.define({
  args: {
    maxFiles: v.optional(v.number()),
    interBatchDelayMs: v.optional(v.number()),
  },
  // Always annotate return type to avoid type cycles
  handler: async (step, args): Promise<void> => {
    // 1) Read last checked timestamp deterministically
    const lastChecked = await step.runQuery(
      internal.dataPipeline.getLastCheckedTimestamp,
      {},
    );
    const lastCheckedTs = lastChecked?.timestamp ?? 0;

    // 2) Discover new XML URLs across bill types in a single step action
    const xmlUrls = await step.runAction(
      internal.workflows.listNewXmlFiles,
      { sinceMs: lastCheckedTs },
      { name: "discover_new_xml_files", retry: true },
    );

    // Optionally limit how many to process this run
    const toProcess = args.maxFiles && args.maxFiles > 0 ? xmlUrls.slice(0, args.maxFiles) : xmlUrls;

    if (toProcess.length === 0) {
      await step.runMutation(internal.dataPipeline.updateLastCheckedTimestamp, { timestamp: Date.now() });
      return;
    }

    // 3) Ingest in parallel with retry; batch to respect maxParallelism and rate limits
    const batchSize = 5;
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      await Promise.all(
        batch.map((xmlUrl: string) =>
          step.runAction(
            internal.dataPipeline.ingestAndEnrichBillFile,
            { xmlUrl },
            { name: `ingest:${xmlUrl}`, retry: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 } },
          ),
        ),
      );

      if (args.interBatchDelayMs && args.interBatchDelayMs > 0) {
        await step.runAction(internal.workflows.noop, {}, { runAfter: args.interBatchDelayMs });
      }
    }

    // 4) Update last checked timestamp to now
    await step.runMutation(internal.dataPipeline.updateLastCheckedTimestamp, { timestamp: Date.now() });
  },
});

// Public action to kick off a run; returns the workflow id
export const startDataPipeline = action({
  args: {
    maxFiles: v.optional(v.number()),
    interBatchDelayMs: v.optional(v.number()),
  },
  returns: vWorkflowId,
  handler: async (ctx, args): Promise<WorkflowId> => {
    const id = await workflow.start(ctx, internal.workflows.dataPipelineWorkflow, args);
    return id;
  },
});

// Public action to check status of a workflow by id
export const getWorkflowStatus = action({
  args: { workflowId: vWorkflowId },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    const status = await workflow.status(ctx, args.workflowId);
    return status;
  },
});

// Public action to cancel a running workflow
export const cancelWorkflow = action({
  args: { workflowId: vWorkflowId },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await workflow.cancel(ctx, args.workflowId);
    return null;
  },
});

// Public action to cleanup a finished workflow's storage
export const cleanupWorkflow = action({
  args: { workflowId: vWorkflowId },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await workflow.cleanup(ctx, args.workflowId);
    return null;
  },
});

// Internal cron-safe starter for the data pipeline workflow
export const runDataPipelineCron = internalAction({
  args: {
    maxFiles: v.optional(v.number()),
    interBatchDelayMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await workflow.start(ctx, internal.workflows.dataPipelineWorkflow, args);
    return null;
  },
}); 