"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import {
  createOrganization,
  type CreateOrganizationParams,
} from "@/lib/actions/nerm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormState = CreateOrganizationParams;

const emptyForm: FormState = {
  name: "",
  iso27001Tisax: "No",
  nermCoreOrganizationEndDate: "",
  signedNda: "No",
  description: "",
};

/** API expects dates as MM/dd/yyyy. */
const DATE_API_FORMAT = "MM/dd/yyyy";

function parseDateString(value: string): Date | undefined {
  if (!value?.trim()) return undefined;
  try {
    const d = parse(value.trim(), DATE_API_FORMAT, new Date());
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function NermNewOrganization() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const update = (updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(updates) as (keyof FormState)[]) {
        delete next[key];
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, iso27001Tisax, nermCoreOrganizationEndDate, signedNda, description } =
      form;

    const errors: FieldErrors = {};
    if (!name?.trim()) {
      errors.name = "Name is required.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setSubmitting(true);
    try {
      const org = await createOrganization({
        name: name.trim(),
        iso27001Tisax: iso27001Tisax.trim() || "No",
        nermCoreOrganizationEndDate: nermCoreOrganizationEndDate.trim(),
        signedNda: signedNda.trim() || "No",
        description: description?.trim() ?? "",
      });
      toast.success("Organization created", {
        description: `${org.name} (${org.id})`,
      });
      setForm(emptyForm);
      setFieldErrors({});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create organization";
      toast.error("Create failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const endDateParsed = parseDateString(form.nermCoreOrganizationEndDate);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New Organization</h1>
        <p className="text-sm text-muted-foreground">
          Create a new organization profile.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            <span>Organization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. StratEdge Advisors"
                aria-invalid={!!fieldErrors.name}
                className={fieldErrors.name ? "border-destructive" : undefined}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter the partner, supplier, or service provider name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    data-empty={!form.nermCoreOrganizationEndDate}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.nermCoreOrganizationEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDateParsed
                      ? format(endDateParsed, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDateParsed ?? undefined}
                    onSelect={(date) =>
                      update({
                        nermCoreOrganizationEndDate: date
                          ? format(date, DATE_API_FORMAT)
                          : "",
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 sm:col-span-2 flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="iso27001-tisax"
                  checked={form.iso27001Tisax === "Yes"}
                  onCheckedChange={(checked) =>
                    update({ iso27001Tisax: checked === true ? "Yes" : "No" })
                  }
                />
                <Label
                  htmlFor="iso27001-tisax"
                  className="text-sm font-normal cursor-pointer"
                >
                  ISO27001-TISAX
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="signed-nda"
                  checked={form.signedNda === "Yes"}
                  onCheckedChange={(checked) =>
                    update({ signedNda: checked === true ? "Yes" : "No" })
                  }
                />
                <Label
                  htmlFor="signed-nda"
                  className="text-sm font-normal cursor-pointer"
                >
                  Signed NDA
                </Label>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create Organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
