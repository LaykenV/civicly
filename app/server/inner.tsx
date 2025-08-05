"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.myFunctions.getUser);
  
  return (
    <>
      <div className="flex flex-col gap-4 bg-slate-200 dark:bg-slate-800 p-4 rounded-md">
        <h2 className="text-xl font-bold">Server Component Demo</h2>
        <p>This is a server-side component demonstrating authentication state.</p>
      </div>
      {isAuthenticated ? (
        <>
          <p>You are authenticated</p>
          <p>User: {user?.email}</p>
          <p>User ID: {user?._id}</p>
          <p>Created: {user?._creationTime}</p>
          <p>Name: {user?.name}</p>
          <p>Image: {user?.image}</p>
          <p>Phone: {user?.phone}</p>
          <p>Email Verified: {user?.emailVerificationTime}</p>
          <p>Phone Verified: {user?.phoneVerificationTime}</p>
          <p>Anonymous: {user?.isAnonymous}</p>
        </>
      ) : (
        <p>You are not authenticated</p>
      )}
    </>
  );
}
