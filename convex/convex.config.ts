import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import rag from "@convex-dev/rag/convex.config";
// import workflow from "@convex-dev/workflow/convex.config"; // Future: for durable workflows

const app = defineApp();
app.use(agent);
app.use(rag);
// app.use(workflow); // Future: enable when using workflows

export default app; 