"use client";

import { Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
export default function Home({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.myFunctions.listNumbers>;
}) {
  const data = usePreloadedQuery(preloaded);
  const addNumber = useMutation(api.myFunctions.addNumber);
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.myFunctions.getUser);
  return (
    <>
      <div className="flex flex-col gap-4 bg-slate-200 dark:bg-slate-800 p-4 rounded-md">
        <h2 className="text-xl font-bold">Reactive client-loaded data</h2>
        <code>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </code>
      </div>
      {isAuthenticated ? (
        <>
          <p>You are authenticated</p>
          <p>User: {user?.email}</p>
          <p>User ID: {user?._id}</p>
          <p>User ID: {user?._creationTime}</p>
          <p>User ID: {user?.name}</p>
          <p>User ID: {user?.image}</p>
          <p>User ID: {user?.email}</p>
          <p>User ID: {user?.phone}</p>
          <p>User ID: {user?.emailVerificationTime}</p>
          <p>User ID: {user?.phoneVerificationTime}</p>
          <p>User ID: {user?.isAnonymous}</p>
        </>
      ) : (
        <p>You are not authenticated</p>
      )}
      <button
        className="bg-foreground text-background px-4 py-2 rounded-md mx-auto"
        onClick={() => {
          void addNumber({ value: Math.floor(Math.random() * 10) });
        }}
      >
        Add a random number
      </button>
    </>
  );
}
