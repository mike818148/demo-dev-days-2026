import MyRequests from "@/components/component/my-requests";

const MyRequestsPage = async () => {
  return (
    <div className="w-full h-full p-8 overflow-auto">
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
  );
};

export default MyRequestsPage;
