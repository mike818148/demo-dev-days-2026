"use client";

import { useState, useEffect } from "react";
import { AccessRequestList } from "@/components/component/access-request-list";
import { AccessRequestDetail } from "@/components/component/access-request-detail";
import { RequestedItemStatus } from "sailpoint-api-client";
import { getMyRequests } from "@/lib/actions/isc";
import { toast } from "sonner";

export default function MyRequests() {
  const [requests, setRequests] = useState<RequestedItemStatus[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");

  useEffect(() => {
    const loadRequests = async () => {
      const result = await getMyRequests();
      if ("requests" in result) {
        setRequests(result.requests);
      } else {
        toast.error(`Error loading requests: ${result.error}`);
      }
    };
    loadRequests();
  }, []);

  const handleSelectRequest = (id: string) => {
    setSelectedRequestId(id);
  };

  const selectedRequest = requests.find((req) => req.id === selectedRequestId);

  return (
    <div className="grid grid-cols-5 h-screen bg-background overflow-hidden">
      {/* Left sidebar - Request List */}
      <div className="col-span-2 border-r flex flex-col">
        <AccessRequestList
          requests={requests}
          selectedRequestId={selectedRequestId}
          onSelectRequest={handleSelectRequest}
        />
      </div>

      {/* Right panel - Request Detail */}
      <div className="col-span-3 overflow-auto">
        {selectedRequest ? (
          <AccessRequestDetail request={selectedRequest} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a request to view details
          </div>
        )}
      </div>
    </div>
  );
}
