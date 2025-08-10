import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const cleanOrphanedBillVersions = internalMutation({
  args: {},
  returns: v.object({ scanned: v.number(), deleted: v.number() }),
  handler: async (ctx) => {
    let scanned = 0;
    let deleted = 0;

    const versions = ctx.db.query("billVersions");
    for await (const version of versions) {
      scanned += 1;
      const bill = await ctx.db.get(version.billId);
      if (!bill) {
        await ctx.db.delete(version._id);
        deleted += 1;
      }
    }

    return { scanned, deleted };
  },
}); 