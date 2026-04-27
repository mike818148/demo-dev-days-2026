"use client";

import { useState, useEffect } from "react";
import {
  PolicyList,
  type PolicyViolationsUpdate,
} from "@/components/component/policy-list";
import { PolicyDetail } from "@/components/component/policy-detail";
import { IdentityDocument, SodPolicyRead } from "sailpoint-api-client";
import { getPolicies } from "@/lib/actions/isc";
import { toast } from "sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function PolicyPage() {
  const [policies, setPolicies] = useState<SodPolicyRead[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [policyViolations, setPolicyViolations] = useState<
    Record<
      string,
      {
        identities: IdentityDocument[];
        isLoading: boolean;
      }
    >
  >({});

  useEffect(() => {
    const loadPolicies = async () => {
      setIsLoading(true);
      try {
        const result = await getPolicies();
        if ("policies" in result) {
          setPolicies(result.policies);
        } else {
          toast.error(`Error loading policies: ${result.error}`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadPolicies();
  }, []);

  const handleSelectPolicy = (id: string) => {
    if (id) {
      setSelectedPolicyId(id);
    }
  };

  const selectedPolicy = policies.find(
    (policy) => policy.id && policy.id === selectedPolicyId
  );
  const selectedPolicyViolations = selectedPolicyId
    ? policyViolations[selectedPolicyId]
    : undefined;

  const handlePolicyViolationsUpdate = (update: PolicyViolationsUpdate) => {
    setPolicyViolations((current) => ({
      ...current,
      [update.policyId]: {
        identities: update.identities,
        isLoading: update.isLoading,
      },
    }));
  };

  return (
    <div className="h-full bg-background p-8 overflow-hidden">
      <ResizablePanelGroup className="h-full">
        {/* Left sidebar - Policy List */}
        <ResizablePanel defaultSize={40} minSize={20} className="border-r">
          <div className="h-full flex flex-col min-w-0">
            <PolicyList
              policies={policies}
              selectedPolicyId={selectedPolicyId}
              onSelectPolicy={handleSelectPolicy}
              onPolicyViolationsUpdate={handlePolicyViolationsUpdate}
              isLoading={isLoading}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel - Policy Detail */}
        <ResizablePanel defaultSize={60} minSize={30} className="overflow-auto">
          {selectedPolicy ? (
            <PolicyDetail
              policy={selectedPolicy}
              violatedIdentities={selectedPolicyViolations?.identities ?? []}
              isLoadingViolations={selectedPolicyViolations?.isLoading ?? false}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a policy to view details
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}