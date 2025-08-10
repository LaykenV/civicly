import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { rag } from "./agent";

export const cleanOrphanRagEntries = internalMutation({
  args: {},
  returns: v.object({ scanned: v.number(), deleted: v.number() }),
  handler: async (ctx) => {
    let scanned = 0;
    let deleted = 0;

    const statuses: Array<"pending" | "ready" | "replaced"> = [
      "pending",
      "ready",
      "replaced",
    ];

    for (const status of statuses) {
      let cursor: string | null = null;
      do {
        const page = await rag.list(ctx, {
          status,
          order: "asc",
          paginationOpts: { cursor, numItems: 100 },
        });

        for (const entry of page.page) {
          scanned += 1;
          const fv = (entry.filterValues || []).find((f) => f.name === "billIdentifier");
          const identifier: string | undefined = (fv?.value as string | undefined) ?? entry.key;
          if (!identifier) continue;

          const parts = identifier.split("-");
          if (parts.length !== 3) continue;
          const [congressStr, billType, billNumber] = parts;
          const congress = Number(congressStr);
          if (!Number.isFinite(congress)) continue;

          let exists = false;
          try {
            const bill = await ctx.db
              .query("bills")
              .withIndex("by_identifier", (q) =>
                q.eq("congress", congress).eq("billType", billType).eq("billNumber", billNumber),
              )
              .unique();
            exists = bill !== null;
          } catch {
            exists = true; // Multiple matches implies existence
          }

          if (!exists) {
            await rag.deleteAsync(ctx, { entryId: entry.entryId });
            deleted += 1;
          }
        }

        cursor = page.isDone ? null : page.continueCursor;
      } while (cursor);
    }

    return { scanned, deleted };
  },
}); 