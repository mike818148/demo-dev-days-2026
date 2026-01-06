import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/authOptions";
import { UserHeader } from "@/components/component/user-header";
import AccessRequestForm from "@/components/component/access-request-form";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <UserHeader name={session?.user.name!} email={session?.user.email!} />
      <div className="flex-1 bg-background p-4 min-h-0 overflow-hidden">
        <div className="w-full h-full">
          <AccessRequestForm />
        </div>
      </div>
    </div>
  );
}
