import AccessRequestForm from "@/components/component/access-request-form";

export default async function Home() {
  return (
    <div className="w-full p-4">
      <div className="w-full">
        <AccessRequestForm />
      </div>
    </div>
  );
}
