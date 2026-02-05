"use client";

import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import {
  createNonEmployee,
  createAssignment,
  getJobs,
  getOrganizations,
  getSponsors,
  type CreateNonEmployeeParams,
  type CreateAssignmentParams,
  type NermProfile,
  type NermSponsorOption,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, UserPlus, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormState = CreateNonEmployeeParams & {
  assignmentOrganizationId: string;
  jobId: string;
  sponsorId: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  additionalAccess: string;
  nonEmployeeType: string;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  contactEmail: "",
  businessEmail: "",
  contactPhoneNumber: "",
  businessPhoneNumber: "",
  assignmentOrganizationId: "",
  jobId: "",
  sponsorId: "",
  jobTitle: "",
  startDate: "",
  endDate: "",
  additionalAccess: "",
  nonEmployeeType: "",
};

const NON_EMPLOYEE_TYPES = ["Contractor", "Remote", "Temporary"] as const;
const ADDITIONAL_ACCESS_OPTIONS = ["Infrastructure", "Citrix", "RSA Token", "Email"] as const;

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function NermNewNonEmployee() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<NermProfile[]>([]);
  const [jobs, setJobs] = useState<NermProfile[]>([]);
  const [sponsors, setSponsors] = useState<NermSponsorOption[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    setLookupsLoading(true);
    Promise.all([getOrganizations(), getJobs(), getSponsors()])
      .then(([orgs, js, sp]) => {
        if (cancelled) return;
        setOrganizations(orgs ?? []);
        setJobs(js ?? []);
        setSponsors(sp ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load organizations, jobs, and sponsors";
        console.error("[NermNewNonEmployee] load lookups", err);
        toast.error("Failed to load lookups", { description: message });
      })
      .finally(() => {
        if (!cancelled) setLookupsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      firstName,
      lastName,
      contactEmail,
      businessEmail,
      contactPhoneNumber,
      businessPhoneNumber,
      assignmentOrganizationId,
      jobId,
      sponsorId,
      jobTitle,
      startDate,
      endDate,
      additionalAccess,
      nonEmployeeType,
    } = form;

    const errors: FieldErrors = {};

    if (!firstName?.trim()) {
      errors.firstName = "First name is required.";
    }
    if (!lastName?.trim()) {
      errors.lastName = "Last name is required.";
    }
    if (!contactEmail?.trim()) {
      errors.contactEmail = "Contact email is required.";
    } else if (!isValidEmail(contactEmail)) {
      errors.contactEmail = "Please enter a valid email address.";
    }
    if (businessEmail?.trim() && !isValidEmail(businessEmail)) {
      errors.businessEmail = "Please enter a valid email address.";
    }
    if (!assignmentOrganizationId?.trim()) {
      errors.assignmentOrganizationId = "Organization is required.";
    }
    if (!jobId?.trim()) {
      errors.jobId = "Job is required.";
    }
    if (!sponsorId?.trim()) {
      errors.sponsorId = "Sponsor is required.";
    }
    if (!startDate?.trim()) {
      errors.startDate = "Start date is required.";
    }
    if (!endDate?.trim()) {
      errors.endDate = "End date is required.";
    }
    if (!nonEmployeeType?.trim()) {
      errors.nonEmployeeType = "Non-employee type is required.";
    }
    if (startDate?.trim() && endDate?.trim()) {
      const start = parseDateString(startDate);
      const end = parseDateString(endDate);
      if (start && end && start > end) {
        errors.endDate = "End date must be on or after start date.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = Object.values(errors)[0];
      toast.error(first);
      return;
    }

    setSubmitting(true);
    try {
      const personParams: CreateNonEmployeeParams = {
        firstName,
        lastName,
        contactEmail,
        businessEmail,
        contactPhoneNumber,
        businessPhoneNumber,
      };
      const nonEmployee = await createNonEmployee(personParams);
      toast.success("Non-employee created", {
        description: `${nonEmployee.name} (${nonEmployee.id})`,
      });

      const assignmentParams: CreateAssignmentParams = {
        ...personParams,
        assignmentOrganizationId,
        jobId,
        sponsorId,
        jobTitle,
        startDate,
        endDate,
        additionalAccess: additionalAccess || undefined,
        nonEmployeeType: nonEmployeeType || undefined,
      };
      const assignment = await createAssignment(assignmentParams);
      toast.success("Assignment created", {
        description: `${assignment.name} (${assignment.id})`,
      });

      setForm(emptyForm);
      setFieldErrors({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create non-employee or assignment";
      toast.error("Create failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const startDateParsed = parseDateString(form.startDate);
  const endDateParsed = parseDateString(form.endDate);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New Non-Employees</h1>
        <p className="text-sm text-muted-foreground">
          Create a non-employee and assignment in one step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            <span>Non-Employee &amp; Assignment</span>
            <ClipboardList className="h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-muted-foreground">Person details</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-name">First name <span className="text-destructive">*</span></Label>
              <Input
                id="first-name"
                value={form.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
                aria-invalid={!!fieldErrors.firstName}
                className={fieldErrors.firstName ? "border-destructive" : undefined}
              />
              {fieldErrors.firstName && (
                <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name <span className="text-destructive">*</span></Label>
              <Input
                id="last-name"
                value={form.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
                aria-invalid={!!fieldErrors.lastName}
                className={fieldErrors.lastName ? "border-destructive" : undefined}
              />
              {fieldErrors.lastName && (
                <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contact-email">Contact email <span className="text-destructive">*</span></Label>
              <Input
                id="contact-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => update({ contactEmail: e.target.value })}
                aria-invalid={!!fieldErrors.contactEmail}
                className={fieldErrors.contactEmail ? "border-destructive" : undefined}
              />
              {fieldErrors.contactEmail && (
                <p className="text-xs text-destructive">{fieldErrors.contactEmail}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="business-email">Business email</Label>
              <Input
                id="business-email"
                type="email"
                value={form.businessEmail}
                onChange={(e) => update({ businessEmail: e.target.value })}
                aria-invalid={!!fieldErrors.businessEmail}
                className={fieldErrors.businessEmail ? "border-destructive" : undefined}
              />
              {fieldErrors.businessEmail && (
                <p className="text-xs text-destructive">{fieldErrors.businessEmail}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Contact phone</Label>
              <Input
                id="contact-phone"
                value={form.contactPhoneNumber}
                onChange={(e) => update({ contactPhoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-phone">Business phone</Label>
              <Input
                id="business-phone"
                value={form.businessPhoneNumber}
                onChange={(e) => update({ businessPhoneNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2 sm:col-span-2 mt-2">
              <Label className="text-muted-foreground">Assignment</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-id">Organization <span className="text-destructive">*</span></Label>
              <Select
                value={form.assignmentOrganizationId || undefined}
                onValueChange={(value) => update({ assignmentOrganizationId: value })}
              >
                <SelectTrigger
                  id="org-id"
                  disabled={lookupsLoading || organizations.length === 0}
                  className={fieldErrors.assignmentOrganizationId ? "border-destructive" : undefined}
                >
                  <SelectValue
                    placeholder={
                      lookupsLoading
                        ? "Loading organizations..."
                        : organizations.length === 0
                        ? "No organizations available"
                        : "Select organization"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name || org.uid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.assignmentOrganizationId && (
                <p className="text-xs text-destructive">{fieldErrors.assignmentOrganizationId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-id">Job <span className="text-destructive">*</span></Label>
              <Select
                value={form.jobId || undefined}
                onValueChange={(value) => update({ jobId: value })}
              >
                <SelectTrigger
                  id="job-id"
                  disabled={lookupsLoading || jobs.length === 0}
                  className={fieldErrors.jobId ? "border-destructive" : undefined}
                >
                  <SelectValue
                    placeholder={
                      lookupsLoading
                        ? "Loading jobs..."
                        : jobs.length === 0
                        ? "No jobs available"
                        : "Select job"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name || job.uid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.jobId && (
                <p className="text-xs text-destructive">{fieldErrors.jobId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsor-id">Sponsor <span className="text-destructive">*</span></Label>
              <Select
                value={form.sponsorId || undefined}
                onValueChange={(value) => update({ sponsorId: value })}
              >
                <SelectTrigger
                  id="sponsor-id"
                  disabled={lookupsLoading || sponsors.length === 0}
                  className={fieldErrors.sponsorId ? "border-destructive" : undefined}
                >
                  <SelectValue
                    placeholder={
                      lookupsLoading
                        ? "Loading sponsors..."
                        : sponsors.length === 0
                        ? "No sponsors available"
                        : "Select sponsor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sponsors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.sponsorId && (
                <p className="text-xs text-destructive">{fieldErrors.sponsorId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-title">Job title</Label>
              <Input
                id="job-title"
                value={form.jobTitle}
                onChange={(e) => update({ jobTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date">Start date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    data-empty={!form.startDate}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.startDate && "text-muted-foreground",
                      fieldErrors.startDate && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDateParsed
                      ? format(startDateParsed, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDateParsed ?? undefined}
                    onSelect={(date) =>
                      update({ startDate: date ? format(date, DATE_API_FORMAT) : "" })
                    }
                  />
                </PopoverContent>
              </Popover>
              {fieldErrors.startDate && (
                <p className="text-xs text-destructive">{fieldErrors.startDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    data-empty={!form.endDate}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.endDate && "text-muted-foreground",
                      fieldErrors.endDate && "border-destructive"
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
                      update({ endDate: date ? format(date, DATE_API_FORMAT) : "" })
                    }
                  />
                </PopoverContent>
              </Popover>
              {fieldErrors.endDate && (
                <p className="text-xs text-destructive">{fieldErrors.endDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="non-employee-type">Non-Employee Type <span className="text-destructive">*</span></Label>
              <Select
                value={form.nonEmployeeType || undefined}
                onValueChange={(value) => update({ nonEmployeeType: value })}
              >
                <SelectTrigger
                  id="non-employee-type"
                  className={fieldErrors.nonEmployeeType ? "border-destructive" : undefined}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {NON_EMPLOYEE_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.nonEmployeeType && (
                <p className="text-xs text-destructive">{fieldErrors.nonEmployeeType}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-access">Additional Access</Label>
              <Select
                value={form.additionalAccess || undefined}
                onValueChange={(value) => update({ additionalAccess: value })}
              >
                <SelectTrigger id="additional-access">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {ADDITIONAL_ACCESS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create Non-Employee and Assignment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
