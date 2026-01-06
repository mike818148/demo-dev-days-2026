import MyRequests from "@/components/component/my-requests";
import { UserHeader } from "@/components/component/user-header";
import { getServerSession } from "next-auth";
import React from "react";
import { authOptions } from "../api/auth/authOptions";

const MyRequestsPage = async () => {
  const session = await getServerSession(authOptions);
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <UserHeader name={session?.user.name!} email={session?.user.email!} />
      <div className="flex-1 bg-background p-8 overflow-auto min-h-0">
        <div className="w-full h-full flex flex-col">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              My Requests
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track your access requests and their status
            </p>
          </div>
          <div className="mt-8 flex-1 min-h-0">
            <MyRequests />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyRequestsPage;
