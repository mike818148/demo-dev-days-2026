import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/authOptions";
import { UserHeader } from "@/components/component/user-header";
import AccessRequestForm from "@/components/component/access-request-form";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col h-screen">
      <UserHeader name={session?.user.name!} email={session?.user.email!} />
      <div className="flex-1 bg-background p-8 flex items-center justify-center">
        <div className="mx-auto max-w-[1600px]">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Access Request
          </h1>
          <p className="mt-2 text-muted-foreground">
            Request access to resources and applications
          </p>
          <div className="mt-8">
            <AccessRequestForm />
          </div>
        </div>
      </div>
    </div>
  );
}
