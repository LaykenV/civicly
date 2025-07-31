import { v } from "convex/values";
import { action } from "./_generated/server";


export const discoverNewBillFiles = action({
  args: {
  },
  handler: async (ctx, args) => {
    // TODO: Implement this
  },
});

export const ingestAndEnrichBillFile = action({
  args: {
    billFileId: v.id("billFiles"),
  },
  handler: async (ctx, args) => {
    // TODO: Implement this
  },
});