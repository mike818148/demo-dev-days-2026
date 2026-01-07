"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createAccessRequest } from "@/lib/actions/isc";
import { IdentityDocument, RoleDocument } from "sailpoint-api-client";
import { toast } from "sonner";
import { cn, isRequestCommentsRequired } from "@/lib/utils";
import { SelectIdentityStep } from "./access-request-steps/select-identity-step";
import { SearchAccessStep } from "./access-request-steps/search-access-step";
import { ReviewStep } from "./access-request-steps/review-step";
import { Toaster } from "@/components/ui/sonner";

type Step = 1 | 2 | 3;

export default function AccessRequestForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedRequestees, setSelectedRequestees] = useState<
    IdentityDocument[]
  >([]);
  const [reason, setReason] = useState("");
  const [cart, setCart] = useState<RoleDocument[]>([]);
  const [roleComments, setRoleComments] = useState<Record<string, string>>({});
  const [removalDates, setRemovalDates] = useState<Record<string, string>>({});

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addRequestee = (user: IdentityDocument) => {
    // Check if user is already selected
    if (selectedRequestees.find((u) => u.id === user.id)) {
      return;
    }

    // Validate maximum 10 users
    if (selectedRequestees.length >= 10) {
      toast.error("Maximum 10 users can be selected", {
        description: "Please remove a user before adding another.",
      });
      return;
    }

    setSelectedRequestees([...selectedRequestees, user]);
  };

  const removeRequestee = (userId: string) => {
    setSelectedRequestees(selectedRequestees.filter((u) => u.id !== userId));
  };

  const addToCart = (role: RoleDocument) => {
    // Check if role is already in cart
    if (cart.find((item) => item.id === role.id)) {
      return;
    }

    // Validate maximum 25 roles
    if (cart.length >= 25) {
      toast.error("Maximum 25 access items can be selected", {
        description: "Please remove an item before adding another.",
      });
      return;
    }

    setCart([...cart, role]);
  };

  const removeFromCart = (roleId: string) => {
    setCart(cart.filter((item) => item.id !== roleId));
    // Remove comment when role is removed
    setRoleComments((prev) => {
      const newComments = { ...prev };
      delete newComments[roleId];
      return newComments;
    });
    // Remove removal date when role is removed
    setRemovalDates((prev) => {
      const newDates = { ...prev };
      delete newDates[roleId];
      return newDates;
    });
  };

  const handleCommentChange = (roleId: string, comment: string) => {
    setRoleComments((prev) => ({
      ...prev,
      [roleId]: comment,
    }));
  };

  const handleRemovalDateChange = (roleId: string, date: string) => {
    setRemovalDates((prev) => ({
      ...prev,
      [roleId]: date,
    }));
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    // Validation
    const errors: string[] = [];
    if (cart.length === 0) {
      errors.push("Please add at least one role to your cart");
    }
    if (selectedRequestees.length === 0) {
      errors.push("Please select at least one requestee");
    }
    if (selectedRequestees.length > 10) {
      errors.push("Maximum 10 users can be selected");
    }
    if (cart.length > 25) {
      errors.push("Maximum 25 access items can be selected");
    }

    if (errors.length > 0) {
      setSubmitError(errors.join(". "));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAccessRequest(
        cart,
        selectedRequestees,
        roleComments,
        removalDates
      );

      if ("error" in result) {
        setSubmitError(result.error);
      } else {
        // Success - reset form
        setCart([]);
        setSelectedRequestees([]);
        setReason("");
        setRoleComments({});
        setRemovalDates({});
        setSubmitError(null);
        toast.success("Access request submitted successfully!");
        // Navigate to track my request page
        router.push("/myrequests");
      }
    } catch (error) {
      console.error("Error submitting access request:", error);
      setSubmitError("Failed to submit access request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step navigation
  const canProceedToStep2 = selectedRequestees.length > 0;
  const canProceedToStep3 = cart.length > 0;

  const handleNext = () => {
    if (currentStep === 1 && canProceedToStep2) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedToStep3) {
      // Validate required comments before proceeding to step 3
      const rolesRequiringComments = cart.filter((role) =>
        isRequestCommentsRequired(role)
      );
      const missingComments: string[] = [];

      rolesRequiringComments.forEach((role) => {
        const roleName =
          (role as any).name || (role as any).displayName || "Unnamed Role";
        if (!roleComments[role.id] || roleComments[role.id].trim() === "") {
          missingComments.push(roleName);
        }
      });

      if (missingComments.length > 0) {
        toast.error(
          `Please provide comments for the following access items: ${missingComments.join(
            ", "
          )}`
        );
        return;
      }

      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleStepClick = (stepNumber: Step) => {
    // Allow navigation to step 1 always
    if (stepNumber === 1) {
      setCurrentStep(1);
      return;
    }
    // Allow navigation to step 2 if we have selected requestees
    if (stepNumber === 2 && selectedRequestees.length > 0) {
      setCurrentStep(2);
      return;
    }
    // Allow navigation to step 3 if we have selected roles
    if (stepNumber === 3 && cart.length > 0) {
      setCurrentStep(3);
      return;
    }
  };

  const steps = [
    {
      number: 1,
      title: "Select Identity",
      description: "Find and select users for whom you want to manage access.",
    },
    {
      number: 2,
      title: "Search Access",
      description: "Add access for the users you've selected.",
    },
    {
      number: 3,
      title: "Review Request",
      description: "Look over your selections and confirm.",
    },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-l font-semibold">Manage User Access</h1>
      </div>

      {/* Progress Bar - Flowchart Style */}
      <div className="mb-3">
        <div className="relative w-full">
          {/* Steps Container */}
          <div className="relative flex items-start justify-between w-full">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.number;
              const isActive = currentStep === step.number;
              const canNavigate =
                step.number === 1 ||
                (step.number === 2 && selectedRequestees.length > 0) ||
                (step.number === 3 && cart.length > 0);

              return (
                <div
                  key={step.number}
                  className="flex flex-col items-center gap-1 flex-1 relative"
                >
                  {/* Step button */}
                  <button
                    onClick={() => handleStepClick(step.number as Step)}
                    disabled={!canNavigate}
                    className={cn(
                      "flex flex-col items-center gap-1 w-full transition-all group",
                      !canNavigate && "cursor-not-allowed opacity-50"
                    )}
                  >
                    {/* Step indicator */}
                    <div className="relative z-10">
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                          isCompleted
                            ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                            : isActive
                            ? "bg-primary text-primary-foreground border-2 border-primary shadow-md"
                            : "bg-muted text-muted-foreground border border-border hover:bg-muted/80",
                          canNavigate && "cursor-pointer"
                        )}
                      >
                        <span className="font-medium whitespace-nowrap text-sm">
                          {step.number} {step.title}
                        </span>
                      </div>
                    </div>

                    {/* Step description */}
                    <p
                      className={cn(
                        "text-xs text-center max-w-[250px]",
                        isActive
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.description}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Users Selected - Only show in step 1 and 2 */}
      {selectedRequestees.length > 0 && currentStep !== 3 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Users Selected:</span>
            <Badge variant="secondary" className="bg-blue-500 text-white">
              {selectedRequestees.length}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRequestees.map((user) => (
              <Badge key={user.id} variant="secondary" className="gap-1">
                {user.displayName || user.name}
                <button
                  onClick={() => removeRequestee(user.id)}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          className={cn(
            "flex-1 min-h-0",
            currentStep === 2 ? "overflow-hidden" : "overflow-auto"
          )}
        >
          {currentStep === 1 && (
            <SelectIdentityStep
              selectedRequestees={selectedRequestees}
              onAddRequestee={addRequestee}
              onRemoveRequestee={removeRequestee}
            />
          )}

          {currentStep === 2 && (
            <SearchAccessStep
              cart={cart}
              onAddToCart={addToCart}
              onRemoveFromCart={removeFromCart}
              roleComments={roleComments}
              onCommentChange={handleCommentChange}
              removalDates={removalDates}
              onRemovalDateChange={handleRemovalDateChange}
            />
          )}

          {currentStep === 3 && (
            <ReviewStep
              selectedRequestees={selectedRequestees}
              cart={cart}
              onRemoveRequestee={removeRequestee}
              onRemoveFromCart={removeFromCart}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitError={submitError}
              roleComments={roleComments}
              onCommentChange={handleCommentChange}
              removalDates={removalDates}
              onRemovalDateChange={handleRemovalDateChange}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          {currentStep < 3 && (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedToStep2) ||
                (currentStep === 2 && !canProceedToStep3)
              }
            >
              Next
            </Button>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  );
}
