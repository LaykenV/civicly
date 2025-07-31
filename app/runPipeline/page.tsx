"use client";

import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function RunPipeline() {
  const runPipeline = useAction(api.dataPipeline.discoverNewBillFiles);
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <button className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 cursor-pointer" onClick={() => runPipeline()}>Run Pipeline</button>
    </div>
  );
}