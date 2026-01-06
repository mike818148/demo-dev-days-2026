"use client";

import { useState, useEffect } from "react";
import { AccessRequestList } from "@/components/component/access-request-list";
import { AccessRequestDetail } from "@/components/component/access-request-detail";
import { RequestedItemStatus } from "sailpoint-api-client";
import { getMyRequests } from "@/lib/actions/isc";
import { toast } from "sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function MyRequests() {
  const [requests, setRequests] = useState<RequestedItemStatus[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadRequests = async () => {
      setIsLoading(true);
      try {
        const result = await getMyRequests();
        if ("requests" in result) {
          setRequests(result.requests);
        } else {
          toast.error(`Error loading requests: ${result.error}`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadRequests();
  }, []);

  const handleSelectRequest = (id: string) => {
    if (id) {
      setSelectedRequestId(id);
    }
  };

  const selectedRequest = requests.find(
    (req) =>
      req.accessRequestId &&
      String(req.accessRequestId) === String(selectedRequestId)
  );

  return (
    <div className="h-full bg-background overflow-hidden">
      <ResizablePanelGroup className="h-full">
        {/* Left sidebar - Request List */}
        <ResizablePanel defaultSize={40} minSize={20} className="border-r">
          <div className="h-full flex flex-col min-w-0">
            <AccessRequestList
              requests={requests}
              selectedRequestId={selectedRequestId}
              onSelectRequest={handleSelectRequest}
              isLoading={isLoading}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel - Request Detail */}
        <ResizablePanel defaultSize={60} minSize={30} className="overflow-auto">
          {selectedRequest ? (
            <AccessRequestDetail request={selectedRequest} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a request to view details
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
