"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Button,
  Table,
  Select,
  Input,
  Tag,
  Progress,
  Statistic,
  Timeline,
  Modal,
  Space,
  Spin,
  Empty,
  Tooltip,
  ConfigProvider,
  theme,
  Checkbox,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  UserOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  SaveOutlined,
  LockOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useTheme } from "next-themes";
import {
  getIdentityCertification,
  listCertificationReviewers,
  listIdentityAccessReviewItems,
  getCampaign,
  makeIdentityDecision,
  signOffIdentityCertification,
} from "@/lib/actions/isc";
import {
  IdentityCertificationDtoV2025,
  IdentityReferenceWithNameAndEmailV2025,
  AccessReviewItemV2025,
  CertificationDecisionV2025,
} from "sailpoint-api-client";
import { toast } from "sonner";
import Timer from "antd/es/statistic/Timer";
import { IdentityInfo } from "./identity-info";
import { AccessDetail } from "./access-detail";
import { useRouter } from "next/navigation";

const { TextArea } = Input;

interface CertificationDetails {
  certification: IdentityCertificationDtoV2025;
  reviewers: IdentityReferenceWithNameAndEmailV2025[];
  accessReviewItems: AccessReviewItemV2025[];
  campaign?: any;
  errors?: string[];
}

interface DecisionChange {
  decision: string;
  comment?: string;
}

interface CertificationDetailProps {
  certificationId: string;
}

export function CertificationDetail({
  certificationId,
}: CertificationDetailProps) {
  const { theme: nextTheme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [certificationDetails, setCertificationDetails] =
    useState<CertificationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionChanges, setDecisionChanges] = useState<
    Map<string, DecisionChange>
  >(new Map());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {}
  );
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [bulkActionDecision, setBulkActionDecision] = useState("APPROVE");
  const [setOfCheckedId, setSetOfCheckedId] = useState<Set<string>>(new Set());
  const [listOfCurrentPageData, setListOfCurrentPageData] = useState<
    AccessReviewItemV2025[]
  >([]);
  const [checked, setChecked] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);
  const [bulkCommentModalVisible, setBulkCommentModalVisible] = useState(false);
  const [bulkCommentText, setBulkCommentText] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [commentValidationModalVisible, setCommentValidationModalVisible] =
    useState(false);
  const [missingCommentItems, setMissingCommentItems] = useState<any[]>([]);
  const [saveChangesLoading, setSaveChangesLoading] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);
  const [identityModalVisible, setIdentityModalVisible] = useState(false);
  const [identityModalData, setIdentityModalData] = useState<{
    identityId: string;
    name: string;
  } | null>(null);
  const [accessModalVisible, setAccessModalVisible] = useState(false);
  const [accessModalData, setAccessModalData] =
    useState<AccessReviewItemV2025 | null>(null);

  // Load certification details
  const loadCertificationDetails = useCallback(async () => {
    if (!certificationId) {
      setError("Certification ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [certResult, reviewersResult, itemsResult] =
        await Promise.allSettled([
          getIdentityCertification(certificationId),
          listCertificationReviewers(certificationId),
          listIdentityAccessReviewItems(certificationId),
        ]);

      const details: CertificationDetails = {
        certification: {} as IdentityCertificationDtoV2025,
        reviewers: [],
        accessReviewItems: [],
        campaign: undefined,
        errors: [],
      };

      if (
        certResult.status === "fulfilled" &&
        "certification" in certResult.value
      ) {
        details.certification = certResult.value.certification;
      } else {
        details.errors?.push("Failed to fetch certification details");
      }

      if (
        reviewersResult.status === "fulfilled" &&
        "reviewers" in reviewersResult.value
      ) {
        details.reviewers = reviewersResult.value.reviewers;
      } else {
        details.errors?.push("Failed to fetch reviewers");
      }

      if (itemsResult.status === "fulfilled" && "items" in itemsResult.value) {
        details.accessReviewItems = itemsResult.value.items;
      } else {
        details.errors?.push("Failed to fetch access review items");
      }

      // Fetch campaign data if available
      if (details.certification.campaign?.id) {
        try {
          const campaignResult = await getCampaign(
            details.certification.campaign.id,
            "FULL"
          );
          if ("campaign" in campaignResult) {
            details.campaign = campaignResult.campaign;
          }
        } catch (err) {
          details.errors?.push("Failed to fetch campaign data");
        }
      }

      setCertificationDetails(details);

      // Initialize comment inputs
      const inputs: Record<string, string> = {};
      details.accessReviewItems.forEach((item) => {
        inputs[String(item.id)] = item.comments || "";
      });
      setCommentInputs(inputs);

      // Calculate deadline
      if (details.certification.due) {
        const dueDate = new Date(details.certification.due);
        setDeadline(dueDate.getTime());
        setIsOverdue(!details.certification.completed && dueDate < new Date());
      }
    } catch (err) {
      setError(`Failed to load certification details: ${String(err)}`);
      console.error("Error loading certification details:", err);
    } finally {
      setLoading(false);
    }
  }, [certificationId]);

  useEffect(() => {
    loadCertificationDetails();
  }, [loadCertificationDetails]);

  // Update current page data when access review items change
  useEffect(() => {
    if (certificationDetails?.accessReviewItems) {
      const currentPageData = certificationDetails.accessReviewItems.slice(
        0,
        10
      );
      onCurrentPageDataChange(currentPageData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificationDetails?.accessReviewItems]);

  // Helper functions
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const getStatusText = (): string => {
    if (!certificationDetails?.certification) return "Loading...";
    return certificationDetails.certification.completed
      ? "Completed"
      : "Pending";
  };

  const getStatusColor = (): string => {
    if (!certificationDetails?.certification) return "default";
    return certificationDetails.certification.completed ? "green" : "orange";
  };

  const getPhaseColor = (): string => {
    if (!certificationDetails?.certification?.phase) return "default";
    const phase = certificationDetails.certification.phase.toLowerCase();
    switch (phase) {
      case "active":
        return "blue";
      case "completed":
        return "green";
      case "pending":
        return "orange";
      case "cancelled":
      case "expired":
        return "red";
      default:
        return "default";
    }
  };

  const getIdentitiesProgressPercent = (): number => {
    if (!certificationDetails?.certification) return 0;
    const completed =
      certificationDetails.certification.identitiesCompleted || 0;
    const total = certificationDetails.certification.identitiesTotal || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getDecisionsProgressPercent = (): number => {
    if (!certificationDetails?.certification) return 0;
    const made = certificationDetails.certification.decisionsMade || 0;
    const total = certificationDetails.certification.decisionsTotal || 0;
    return total > 0 ? Math.round((made / total) * 100) : 0;
  };

  const getIdentitiesProgressStatus = ():
    | "success"
    | "active"
    | "normal"
    | "exception" => {
    const percent = getIdentitiesProgressPercent();
    if (percent === 100) return "success";
    if (percent >= 80) return "active";
    if (percent >= 50) return "normal";
    return "exception";
  };

  const getDecisionsProgressStatus = ():
    | "success"
    | "active"
    | "normal"
    | "exception" => {
    const percent = getDecisionsProgressPercent();
    if (percent === 100) return "success";
    if (percent >= 80) return "active";
    if (percent >= 50) return "normal";
    return "exception";
  };

  const isCertificationStaged = (): boolean => {
    return (
      certificationDetails?.certification?.phase?.toUpperCase() === "STAGED"
    );
  };

  const getCurrentDecision = (itemId: string): string => {
    if (decisionChanges.has(String(itemId))) {
      return decisionChanges.get(String(itemId))!.decision || "PENDING";
    }
    const item = certificationDetails?.accessReviewItems?.find(
      (i) => i.id === String(itemId)
    );
    return item?.decision ? String(item.decision) : "PENDING";
  };

  const getCurrentComment = (itemId: string): string | null => {
    if (decisionChanges.has(String(itemId))) {
      const comment = decisionChanges.get(String(itemId))!.comment;
      return comment ? String(comment) : null;
    }
    const item = certificationDetails?.accessReviewItems?.find(
      (i) => i.id === String(itemId)
    );
    return item?.comments ? String(item.comments) : null;
  };

  const onDecisionChange = (newDecision: string, itemId: string) => {
    const newChanges = new Map(decisionChanges);
    if (newDecision === "PENDING") {
      const existingChange = newChanges.get(itemId);
      if (existingChange?.comment) {
        setCommentInputs((prev) => ({
          ...prev,
          [itemId]: existingChange.comment || "",
        }));
      }
      newChanges.delete(itemId);
    } else {
      const existingChange = newChanges.get(itemId);
      const existingComment =
        existingChange?.comment || commentInputs[itemId] || "";
      newChanges.set(itemId, {
        decision: newDecision,
        comment: existingComment,
      });
    }
    setDecisionChanges(newChanges);
  };

  const onCommentChange = (newComment: string, itemId: string) => {
    setCommentInputs((prev) => ({ ...prev, [itemId]: newComment }));
    const newChanges = new Map(decisionChanges);
    const existingChange = newChanges.get(itemId);
    if (existingChange) {
      existingChange.comment = newComment;
    } else {
      const currentDecision = getCurrentDecision(itemId);
      newChanges.set(itemId, {
        decision: currentDecision !== "PENDING" ? currentDecision : "PENDING",
        comment: newComment,
      });
    }
    setDecisionChanges(newChanges);
  };

  const hasPendingChanges = (): boolean => {
    return decisionChanges.size > 0;
  };

  const clearAllDecisionChanges = () => {
    setDecisionChanges(new Map());
    if (certificationDetails?.accessReviewItems) {
      const newItems = [...certificationDetails.accessReviewItems];
      newItems.forEach((item) => {
        if (item.id && decisionChanges.has(String(item.id))) {
          item.decision = "PENDING" as any;
        }
      });
      setCertificationDetails({
        ...certificationDetails,
        accessReviewItems: newItems,
      });
    }
  };

  const validateCommentRequirements = (): boolean => {
    if (!certificationDetails?.campaign?.mandatoryCommentRequirement) {
      return true;
    }

    const requirement =
      certificationDetails.campaign.mandatoryCommentRequirement;
    const missing: any[] = [];

    for (const [itemId, decisionChange] of Array.from(
      decisionChanges.entries()
    )) {
      const item = certificationDetails.accessReviewItems.find(
        (i) => i.id === String(itemId)
      );
      if (!item) continue;

      const decision = decisionChange.decision;
      const comment = decisionChange.comment || "";

      let commentRequired = false;
      if (requirement === "ALL_DECISIONS") {
        commentRequired = true;
      } else if (requirement === "REVOKE_ONLY_DECISIONS") {
        commentRequired = decision === "REVOKE";
      }

      if (commentRequired && !comment.trim()) {
        missing.push({
          id: String(itemId),
          identityName: String(item.identitySummary?.name) || "Unknown",
          accessType: String(item.accessSummary?.access?.type) || "Unknown",
          accessName: String(item.accessSummary?.access?.name) || "Unknown",
          decision: String(decision),
        });
      }
    }

    setMissingCommentItems(missing);
    return missing.length === 0;
  };

  const saveDecisionChanges = async () => {
    if (decisionChanges.size === 0) {
      return;
    }

    if (!validateCommentRequirements()) {
      setCommentValidationModalVisible(true);
      return;
    }

    const reviewDecisionV2025 = Array.from(decisionChanges.entries()).map(
      ([id, decisionChange]) => ({
        id: id,
        decision: decisionChange.decision as CertificationDecisionV2025,
        bulk: true,
        comments: decisionChange.comment || "",
      })
    );

    setSaveChangesLoading(true);
    try {
      const result = await makeIdentityDecision(
        certificationId,
        reviewDecisionV2025
      );
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Decision changes saved successfully");
      setDecisionChanges(new Map());
      await loadCertificationDetails();
    } catch (err) {
      toast.error(`Failed to save decisions: ${String(err)}`);
    } finally {
      setSaveChangesLoading(false);
    }
  };

  const signOffCertification = async () => {
    if (
      !confirm(
        "Are you sure you want to sign off this certification? This action will complete the review process and cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await signOffIdentityCertification(certificationId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Certification signed off successfully");
      await loadCertificationDetails();
    } catch (err) {
      toast.error(`Failed to sign off certification: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const areAllDecisionsMade = (): boolean => {
    if (!certificationDetails?.certification) return false;
    const made = certificationDetails.certification.decisionsMade || 0;
    const total = certificationDetails.certification.decisionsTotal || 0;
    return total > 0 && made >= total;
  };

  const isCertificationActive = (): boolean => {
    return (
      certificationDetails?.certification?.phase?.toUpperCase() === "ACTIVE"
    );
  };

  const shouldShowSignOffButton = (): boolean => {
    return (
      areAllDecisionsMade() &&
      isCertificationActive() &&
      !isCertificationStaged()
    );
  };

  const viewIdentity = (identityId: string, name: string) => {
    if (identityId) {
      setIdentityModalData({ identityId, name });
      setIdentityModalVisible(true);
    }
  };

  const viewAccessDetail = (accessReviewItem: AccessReviewItemV2025) => {
    setAccessModalData(accessReviewItem);
    setAccessModalVisible(true);
  };

  // Bulk action functions
  const toggleBulkActionMode = useCallback(() => {
    setBulkActionMode((prev) => {
      if (prev) {
        // Clear selections when exiting bulk mode
        setSetOfCheckedId(new Set());
        setChecked(false);
        setIndeterminate(false);
      }
      return !prev;
    });
  }, []);

  const updateCheckedSet = useCallback((id: string, checked: boolean) => {
    setSetOfCheckedId((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const refreshCheckedStatus = useCallback(() => {
    const listOfEnabledData = listOfCurrentPageData.filter(
      (item) => !item.completed
    );
    const allChecked = listOfEnabledData.every((item) =>
      setOfCheckedId.has(String(item.id))
    );
    const someChecked =
      listOfEnabledData.some((item) => setOfCheckedId.has(String(item.id))) &&
      !allChecked;
    setChecked(allChecked);
    setIndeterminate(someChecked);
  }, [listOfCurrentPageData, setOfCheckedId]);

  const onCurrentPageDataChange = useCallback(
    (listOfCurrentPageData: AccessReviewItemV2025[]) => {
      setListOfCurrentPageData(listOfCurrentPageData);
    },
    []
  );

  useEffect(() => {
    if (listOfCurrentPageData.length > 0) {
      refreshCheckedStatus();
    }
  }, [listOfCurrentPageData, setOfCheckedId, refreshCheckedStatus]);

  const onItemChecked = useCallback(
    (id: string, checked: boolean) => {
      updateCheckedSet(id, checked);
    },
    [updateCheckedSet]
  );

  const onAllChecked = useCallback(
    (checked: boolean) => {
      listOfCurrentPageData
        .filter((item) => !item.completed)
        .forEach((item) => updateCheckedSet(String(item.id), checked));
    },
    [listOfCurrentPageData, updateCheckedSet]
  );

  const isCommentRequiredForDecision = (decision: string): boolean => {
    if (!certificationDetails?.campaign?.mandatoryCommentRequirement) {
      return false;
    }

    const requirement =
      certificationDetails.campaign.mandatoryCommentRequirement;

    if (requirement === "ALL_DECISIONS") {
      return true;
    } else if (requirement === "REVOKE_ONLY_DECISIONS") {
      return decision === "REVOKE";
    }

    return false;
  };

  const executeBulkDecision = async (comment: string = "") => {
    setBulkActionLoading(true);

    try {
      // Update decision changes for all selected items
      const newChanges = new Map(decisionChanges);
      setOfCheckedId.forEach((itemId) => {
        newChanges.set(String(itemId), {
          decision: bulkActionDecision,
          comment: comment,
        });

        // Update the commentInputs to reflect in the textarea
        setCommentInputs((prev) => ({
          ...prev,
          [String(itemId)]: comment,
        }));
      });
      setDecisionChanges(newChanges);

      // Clear selections
      setSetOfCheckedId(new Set());
    } catch (error) {
      console.error("Error applying bulk decision:", error);
      toast.error(`Failed to apply bulk decision: ${String(error)}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const applyBulkDecision = () => {
    if (setOfCheckedId.size === 0) {
      toast.warning("No items selected for bulk action");
      return;
    }

    // Check if comment is required for this decision
    const commentRequired = isCommentRequiredForDecision(bulkActionDecision);

    if (commentRequired) {
      // Show modal to collect comment
      setBulkCommentText("");
      setBulkCommentModalVisible(true);
    } else {
      // Apply decision directly without comment
      executeBulkDecision("");
    }
  };

  const onBulkCommentConfirm = () => {
    if (
      isCommentRequiredForDecision(bulkActionDecision) &&
      !bulkCommentText.trim()
    ) {
      toast.warning("Comment is required for this decision");
      return;
    }

    setBulkCommentModalVisible(false);
    executeBulkDecision(bulkCommentText.trim());
  };

  const onBulkCommentCancel = () => {
    setBulkCommentModalVisible(false);
    setBulkCommentText("");
  };

  const isBulkActionDisabled = (): boolean => {
    return setOfCheckedId.size === 0 || isCertificationStaged();
  };

  const downloadAccessReviewItemsCSV = () => {
    if (
      !certificationDetails?.accessReviewItems ||
      certificationDetails.accessReviewItems.length === 0
    ) {
      return;
    }

    try {
      const headers = [
        "ID",
        "Identity",
        "Access Type",
        "Access Name",
        "Source",
        "Completed",
        "New Access",
        "Comments",
        "Decision",
      ];
      const csvContent = [headers.join(",")];

      certificationDetails.accessReviewItems.forEach((item) => {
        const row = [
          String(item.id || ""),
          String(item.identitySummary?.name || ""),
          item.accessSummary?.entitlement
            ? "Entitlement"
            : item.accessSummary?.accessProfile
            ? "Access Profile"
            : item.accessSummary?.role
            ? "Role"
            : "Unknown",
          String(
            item.accessSummary?.entitlement?.name ||
              item.accessSummary?.accessProfile?.name ||
              item.accessSummary?.role?.name ||
              "N/A"
          ),
          String(
            item.accessSummary?.entitlement?.sourceName ||
              item.accessSummary?.accessProfile?.entitlements?.[0]
                ?.sourceName ||
              item.accessSummary?.role?.entitlements?.[0]?.sourceName ||
              "N/A"
          ),
          item.completed ? "Yes" : "No",
          item.newAccess ? "Yes" : "No",
          String(item.comments || "").replace(/"/g, '""'),
          getCurrentDecision(String(item.id)),
        ];
        csvContent.push(row.map((field) => `"${field}"`).join(","));
      });

      const csvString = csvContent.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `access-review-items-${certificationId}-${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error(`Failed to download CSV: ${String(err)}`);
    }
  };

  // CSV Upload functions
  const shouldShowLoadCSVButton = (): boolean => {
    return (
      !certificationDetails?.certification?.completed &&
      isCertificationActive() &&
      !isCertificationStaged()
    );
  };

  const getLoadCSVTooltip = (): string => {
    if (certificationDetails?.certification?.completed) {
      return "Load CSV is not available for completed certifications";
    }
    if (!isCertificationActive()) {
      return "Load CSV is only available for active certifications";
    }
    if (isCertificationStaged()) {
      return "Load CSV is not available for staged certifications";
    }
    return "Upload CSV file to update decisions for access review items";
  };

  const escapeCSVField = (field: string): string => {
    if (!field) return "";

    // If field contains comma, newline, or double quote, wrap in quotes and escape internal quotes
    if (
      field.includes(",") ||
      field.includes("\n") ||
      field.includes("\r") ||
      field.includes('"')
    ) {
      return '"' + field.replace(/"/g, '""') + '"';
    }

    return field;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current.trim());

    return result;
  };

  const processCSVContent = (csvContent: string): void => {
    try {
      const lines = csvContent.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error(
          "CSV file must contain at least a header row and one data row"
        );
        return;
      }

      // Parse header row to find column indices
      const headers = parseCSVLine(lines[0]);
      const idIndex = headers.findIndex(
        (header) => header.toLowerCase() === "id"
      );
      const decisionIndex = headers.findIndex(
        (header) => header.toLowerCase() === "decision"
      );

      if (idIndex === -1) {
        toast.error('CSV file must contain an "ID" column');
        return;
      }

      if (decisionIndex === -1) {
        toast.error('CSV file must contain a "Decision" column');
        return;
      }

      // Process data rows
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const newChanges = new Map(decisionChanges);

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);

        if (row.length <= Math.max(idIndex, decisionIndex)) {
          errors.push(`Row ${i + 1}: Insufficient columns`);
          continue;
        }

        const itemId = String(row[idIndex] || "").trim();
        const decision = String(row[decisionIndex] || "")
          .trim()
          .toUpperCase();

        if (!itemId) {
          errors.push(`Row ${i + 1}: Missing item ID`);
          continue;
        }

        // Validate decision value
        if (!["APPROVE", "REVOKE", "PENDING"].includes(decision)) {
          errors.push(
            `Row ${
              i + 1
            }: Invalid decision "${decision}". Must be APPROVE, REVOKE, or PENDING`
          );
          continue;
        }

        // Find the corresponding access review item
        const item = certificationDetails?.accessReviewItems.find(
          (accessItem) => accessItem.id === String(itemId)
        );

        if (!item) {
          errors.push(`Row ${i + 1}: Item with ID "${itemId}" not found`);
          continue;
        }

        // Only update if item is not completed
        if (item.completed) {
          skippedCount++;
          continue;
        }

        // Update decision changes
        if (decision === "PENDING") {
          // Remove from changes map if it exists (reverting to default state)
          newChanges.delete(String(itemId));
        } else {
          // Store the change for APPROVE/REVOKE decisions
          const existingChange = newChanges.get(String(itemId));
          newChanges.set(String(itemId), {
            decision: decision,
            comment: existingChange?.comment || "",
          });
        }

        updatedCount++;
      }

      // Update state with new changes
      setDecisionChanges(newChanges);

      // Show results
      if (updatedCount > 0) {
        let message = `CSV processing completed. Updated ${updatedCount} items`;
        if (skippedCount > 0) {
          message += `, skipped ${skippedCount} completed items`;
        }
        toast.success(message);
      }

      // Show errors if any
      if (errors.length > 0) {
        console.error("CSV processing errors:", errors);
        toast.error(
          `CSV processing completed with ${errors.length} errors. Check console for details.`
        );
      }
    } catch (error) {
      console.error("Error processing CSV:", error);
      toast.error(`Failed to process CSV file: ${String(error)}`);
    }
  };

  const loadCSV = (file: File): boolean => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a valid CSV file");
      return false;
    }

    // Read and process the CSV file
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      processCSVContent(csvContent);
    };
    reader.onerror = () => {
      toast.error("Error reading CSV file");
    };
    reader.readAsText(file);

    // Return false to prevent automatic upload
    return false;
  };

  // Generate filter options from data
  const filterOptions = useMemo(() => {
    if (!certificationDetails?.accessReviewItems) {
      return {
        identities: [],
        accessTypes: [],
        sources: [],
      };
    }

    const identities = new Set<string>();
    const accessTypes = new Set<string>();
    const sources = new Set<string>();

    certificationDetails.accessReviewItems.forEach((item) => {
      // Identity
      if (item.identitySummary?.name) {
        identities.add(item.identitySummary.name);
      }

      // Access Type
      if (item.accessSummary?.entitlement) {
        accessTypes.add("Entitlement");
      } else if (item.accessSummary?.accessProfile) {
        accessTypes.add("Access Profile");
      } else if (item.accessSummary?.role) {
        accessTypes.add("Role");
      } else {
        accessTypes.add("Unknown");
      }

      // Source
      const sourceName =
        item.accessSummary?.entitlement?.sourceName ||
        item.accessSummary?.accessProfile?.entitlements?.[0]?.sourceName ||
        item.accessSummary?.role?.entitlements?.[0]?.sourceName;
      if (sourceName) {
        sources.add(sourceName);
      }
    });

    return {
      identities: Array.from(identities).sort(),
      accessTypes: Array.from(accessTypes).sort(),
      sources: Array.from(sources).sort(),
    };
  }, [certificationDetails?.accessReviewItems]);

  // Table columns
  const accessReviewColumns: ColumnsType<AccessReviewItemV2025> = useMemo(
    () => [
      ...(bulkActionMode
        ? [
            {
              title: (
                <Checkbox
                  checked={checked}
                  indeterminate={indeterminate}
                  onChange={(e) => onAllChecked(e.target.checked)}
                  disabled={isCertificationStaged()}
                />
              ),
              key: "selection",
              width: 50,
              render: (_: any, record: AccessReviewItemV2025) => (
                <Checkbox
                  checked={setOfCheckedId.has(String(record.id))}
                  onChange={(e) =>
                    onItemChecked(String(record.id), e.target.checked)
                  }
                  disabled={record.completed || isCertificationStaged()}
                />
              ),
            },
          ]
        : []),
      {
        title: "Identity",
        dataIndex: ["identitySummary", "name"],
        key: "identity",
        sorter: (a: AccessReviewItemV2025, b: AccessReviewItemV2025) =>
          (a.identitySummary?.name || "").localeCompare(
            b.identitySummary?.name || ""
          ),
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => (
          <div style={{ padding: 8 }}>
            <Input
              placeholder="Search identity"
              value={selectedKeys[0]}
              onChange={(e) =>
                setSelectedKeys(e.target.value ? [e.target.value] : [])
              }
              onPressEnter={() => {
                confirm();
              }}
              style={{ marginBottom: 8, display: "block" }}
            />
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                icon={<SearchOutlined />}
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
              <Button
                onClick={() => {
                  clearFilters?.();
                  confirm();
                }}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
            </Space>
          </div>
        ),
        onFilter: (value, record: AccessReviewItemV2025) => {
          const identityName = record.identitySummary?.name || "";
          return identityName
            .toLowerCase()
            .includes((value as string).toLowerCase());
        },
        render: (value: string) => value || "N/A",
      },
      {
        title: "Access Type",
        key: "accessType",
        filters: filterOptions.accessTypes.map((type) => ({
          text: type,
          value: type,
        })),
        onFilter: (value, record: AccessReviewItemV2025) => {
          if (record.accessSummary?.entitlement) return value === "Entitlement";
          if (record.accessSummary?.accessProfile)
            return value === "Access Profile";
          if (record.accessSummary?.role) return value === "Role";
          return value === "Unknown";
        },
        render: (_: any, record: AccessReviewItemV2025) => {
          if (record.accessSummary?.entitlement) return "Entitlement";
          if (record.accessSummary?.accessProfile) return "Access Profile";
          if (record.accessSummary?.role) return "Role";
          return "Unknown";
        },
      },
      {
        title: "Access Name",
        key: "accessName",
        render: (_: any, record: AccessReviewItemV2025) => {
          return (
            record.accessSummary?.entitlement?.name ||
            record.accessSummary?.accessProfile?.name ||
            record.accessSummary?.role?.name ||
            "N/A"
          );
        },
      },
      {
        title: "Source",
        key: "source",
        filterDropdown: ({
          setSelectedKeys,
          selectedKeys,
          confirm,
          clearFilters,
        }) => (
          <div style={{ padding: 8 }}>
            <Input
              placeholder="Search source"
              value={selectedKeys[0]}
              onChange={(e) =>
                setSelectedKeys(e.target.value ? [e.target.value] : [])
              }
              onPressEnter={() => {
                confirm();
              }}
              style={{ marginBottom: 8, display: "block" }}
            />
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                icon={<SearchOutlined />}
                size="small"
                style={{ width: 90 }}
              >
                Search
              </Button>
              <Button
                onClick={() => {
                  clearFilters?.();
                  confirm();
                }}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
            </Space>
          </div>
        ),
        onFilter: (value, record: AccessReviewItemV2025) => {
          const sourceName =
            record.accessSummary?.entitlement?.sourceName ||
            record.accessSummary?.accessProfile?.entitlements?.[0]
              ?.sourceName ||
            record.accessSummary?.role?.entitlements?.[0]?.sourceName ||
            "N/A";
          return sourceName
            .toLowerCase()
            .includes((value as string).toLowerCase());
        },
        render: (_: any, record: AccessReviewItemV2025) => {
          return (
            record.accessSummary?.entitlement?.sourceName ||
            record.accessSummary?.accessProfile?.entitlements?.[0]
              ?.sourceName ||
            record.accessSummary?.role?.entitlements?.[0]?.sourceName ||
            "N/A"
          );
        },
      },
      {
        title: "Completed",
        dataIndex: "completed",
        key: "completed",
        filters: [
          { text: "Yes", value: true },
          { text: "No", value: false },
        ],
        onFilter: (value, record: AccessReviewItemV2025) => {
          return record.completed === value;
        },
        render: (value: boolean) => (
          <Tag color={value ? "green" : "orange"}>{value ? "Yes" : "No"}</Tag>
        ),
      },
      {
        title: "New Access",
        dataIndex: "newAccess",
        key: "newAccess",
        render: (value: boolean) => (
          <Tag color={value ? "blue" : "default"}>{value ? "Yes" : "No"}</Tag>
        ),
      },
      {
        title: "Comments",
        key: "comments",
        render: (_: any, record: AccessReviewItemV2025) => {
          const itemId = String(record.id);
          if (record.completed) {
            const comment = getCurrentComment(itemId);
            return comment ? (
              <Tooltip title={comment}>
                <Space>
                  <MessageOutlined />
                  <span>
                    {comment.slice(0, 50)}
                    {comment.length > 50 ? "..." : ""}
                  </span>
                </Space>
              </Tooltip>
            ) : (
              "-"
            );
          }
          return (
            <TextArea
              rows={2}
              value={commentInputs[itemId] || ""}
              onChange={(e) => onCommentChange(e.target.value, itemId)}
              placeholder="Add comment..."
            />
          );
        },
      },
      {
        title: "Decision",
        key: "decision",
        filters: [
          { text: "APPROVE", value: "APPROVE" },
          { text: "REVOKE", value: "REVOKE" },
          { text: "PENDING", value: "PENDING" },
        ],
        onFilter: (value, record: AccessReviewItemV2025) => {
          const itemId = String(record.id);
          return getCurrentDecision(itemId) === value;
        },
        render: (_: any, record: AccessReviewItemV2025) => {
          const itemId = String(record.id);
          if (record.completed) {
            return (
              <Space>
                <Tag
                  color={
                    getCurrentDecision(itemId) === "APPROVE"
                      ? "green"
                      : getCurrentDecision(itemId) === "REVOKE"
                      ? "red"
                      : "default"
                  }
                >
                  {getCurrentDecision(itemId)}
                </Tag>
                <LockOutlined />
              </Space>
            );
          }
          return (
            <Select
              disabled={isCertificationStaged()}
              value={getCurrentDecision(itemId)}
              onChange={(value) => onDecisionChange(value, itemId)}
              size="small"
              style={{ width: 120 }}
              optionLabelProp="children"
            >
              <Select.Option value="APPROVE">
                <Tag color="green" style={{ marginInlineEnd: 0 }}>
                  APPROVE
                </Tag>
              </Select.Option>
              <Select.Option value="REVOKE">
                <Tag color="red" style={{ marginInlineEnd: 0 }}>
                  REVOKE
                </Tag>
              </Select.Option>
              <Select.Option value="PENDING">
                <Tag color="default" style={{ marginInlineEnd: 0 }}>
                  PENDING
                </Tag>
              </Select.Option>
            </Select>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        render: (_: any, record: AccessReviewItemV2025) => (
          <Space>
            <Button
              size="small"
              icon={<UserOutlined />}
              onClick={() =>
                viewIdentity(
                  record.identitySummary?.identityId || "",
                  record.identitySummary?.name || ""
                )
              }
              disabled={!record.identitySummary?.identityId}
            >
              View Identity
            </Button>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => viewAccessDetail(record)}
            >
              View Access
            </Button>
          </Space>
        ),
      },
    ],
    [
      certificationDetails,
      commentInputs,
      decisionChanges,
      isCertificationStaged,
      bulkActionMode,
      checked,
      indeterminate,
      setOfCheckedId,
      onAllChecked,
      onItemChecked,
    ]
  );

  // Ant Design theme configuration based on next-themes
  const antdTheme = useMemo(() => {
    return {
      algorithm:
        nextTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
      components: {
        Statistic: {
          contentFontSize: 14,
        },
        Typography: {
          titleMarginBottom: "0.5em",
          titleMarginTop: "1.2em",
          fontWeightStrong: 600,
          h1: {
            fontSize: 32,
            fontWeight: 600,
          },
          h2: {
            fontSize: 24,
            fontWeight: 600,
          },
          h3: {
            fontSize: 20,
            fontWeight: 600,
          },
          h4: {
            fontSize: 16,
            fontWeight: 600,
          },
          h5: {
            fontSize: 14,
            fontWeight: 600,
          },
        },
      },
    };
  }, [nextTheme]);

  // Timeline component that uses theme token
  const TimelineContent = ({
    certificationDetails,
    isOverdue,
    deadline,
    formatDate,
  }: {
    certificationDetails: CertificationDetails;
    isOverdue: boolean;
    deadline: number;
    formatDate: (date: string | null | undefined) => string;
  }) => {
    const { token } = theme.useToken();

    const timelineItems = [
      {
        color: "blue" as const,
        content: (
          <>
            <strong>Created:</strong>{" "}
            {formatDate(certificationDetails.certification.created)}
          </>
        ),
      },
      certificationDetails.certification.signed
        ? {
            color: "green" as const,
            content: (
              <>
                <strong>Signed:</strong>{" "}
                {formatDate(certificationDetails.certification.signed)}
              </>
            ),
          }
        : {
            icon: (
              <ClockCircleOutlined
                style={{
                  fontSize: 20,
                  background: token.colorBgContainer,
                }}
              />
            ),
            content: (
              <>
                <strong>Signed:</strong> <em>Pending</em>
              </>
            ),
          },
      {
        color: (isOverdue
          ? certificationDetails.certification.completed
            ? "green"
            : "red"
          : "orange") as "green" | "red" | "orange",
        content: (
          <>
            <strong>Due:</strong>{" "}
            {formatDate(certificationDetails.certification.due)}
            {isOverdue &&
              !certificationDetails.certification.completed &&
              ` (${Math.ceil(
                (Date.now() - deadline) / (1000 * 60 * 60 * 24)
              )} days overdue)`}
          </>
        ),
      },
    ];

    return (
      <Card title="Certification Timeline" style={{ height: "100%" }}>
        <Timeline items={timelineItems} />
      </Card>
    );
  };

  if (loading && !certificationDetails) {
    return (
      <ConfigProvider theme={antdTheme}>
        <Card>
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <Spin size="large" />
          </div>
        </Card>
      </ConfigProvider>
    );
  }

  if (error && !certificationDetails) {
    return (
      <ConfigProvider theme={antdTheme}>
        <Card>
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Space>
              <WarningOutlined style={{ color: "#ff4d4f" }} />
              <span>{error}</span>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadCertificationDetails}
            >
              Retry
            </Button>
          </Space>
        </Card>
      </ConfigProvider>
    );
  }

  if (!certificationDetails) {
    return (
      <ConfigProvider theme={antdTheme}>
        <Card>
          <Empty description="No certification details found" />
        </Card>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={antdTheme}>
      <Card
        title="Certification Details"
        extra={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/certification")}
            >
              Back
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadCertificationDetails}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        {/* Status Indicators */}
        <Space style={{ marginBottom: 16 }}>
          <Tag color={getStatusColor()}>{getStatusText()}</Tag>
          <Tag color={getPhaseColor()}>
            {certificationDetails.certification.phase || "N/A"}
          </Tag>
        </Space>

        {/* Staged Notice */}
        {isCertificationStaged() && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#fff7e6",
              borderRadius: 4,
            }}
          >
            <Space>
              <InfoCircleOutlined style={{ color: "#faad14" }} />
              <span>
                This certification is in STAGED phase. Decision changes are
                disabled.
              </span>
            </Space>
          </div>
        )}

        {/* Information Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Campaign Information */}
          {certificationDetails.certification.campaign && (
            <Card title="Campaign Information" style={{ height: "100%" }}>
              <Space orientation="vertical" style={{ width: "100%" }}>
                <div>
                  <strong>Campaign Name:</strong>{" "}
                  {certificationDetails.certification.campaign.name || "N/A"}
                </div>
                <div>
                  <strong>Campaign Type:</strong>{" "}
                  {certificationDetails.certification.campaign.type || "N/A"}
                </div>
                <div>
                  <strong>Campaign Description:</strong>{" "}
                  {certificationDetails.certification.campaign.description ||
                    "N/A"}
                </div>
              </Space>
            </Card>
          )}

          {/* Progress Information */}
          <Card title="Progress Information" style={{ height: "100%" }}>
            <Space
              orientation="vertical"
              style={{ width: "100%" }}
              size="large"
            >
              <div>
                <Statistic
                  title="Identities Completed"
                  value={
                    certificationDetails.certification.identitiesCompleted || 0
                  }
                  suffix={`/ ${
                    certificationDetails.certification.identitiesTotal || 0
                  }`}
                />
                <Progress
                  percent={getIdentitiesProgressPercent()}
                  status={getIdentitiesProgressStatus()}
                  size="small"
                />
              </div>
              <div>
                <Statistic
                  title="Decisions Made"
                  value={certificationDetails.certification.decisionsMade || 0}
                  suffix={`/ ${
                    certificationDetails.certification.decisionsTotal || 0
                  }`}
                />
                <Progress
                  percent={getDecisionsProgressPercent()}
                  status={getDecisionsProgressStatus()}
                  size="small"
                />
              </div>
              {deadline > 0 && (
                <div>
                  {isOverdue &&
                  !certificationDetails.certification.completed ? (
                    <Space orientation="vertical">
                      <Statistic
                        title="Status"
                        value="OVERDUE"
                        valueRender={(node) => (
                          <span style={{ color: "#ff4d4f" }}>{node}</span>
                        )}
                      />
                    </Space>
                  ) : (
                    <Timer
                      title="Time Remaining"
                      value={deadline}
                      type="countdown"
                      format="D [days] HH:mm:ss"
                    />
                  )}
                </div>
              )}
            </Space>
          </Card>

          {/* Timeline */}
          <TimelineContent
            certificationDetails={certificationDetails}
            isOverdue={isOverdue}
            deadline={deadline}
            formatDate={formatDate}
          />

          {/* Reviewers */}
          {certificationDetails.reviewers.length > 0 && (
            <Card title="Reviewers" style={{ height: "100%" }}>
              <Space orientation="vertical" style={{ width: "100%" }}>
                {certificationDetails.reviewers.map((reviewer) => (
                  <div key={reviewer.id}>
                    <Space>
                      <strong>{reviewer.name || "N/A"}</strong>
                      {reviewer.email && <span>({reviewer.email})</span>}
                      {reviewer.id && (
                        <Button
                          size="small"
                          icon={<UserOutlined />}
                          onClick={() =>
                            viewIdentity(reviewer.id || "", reviewer.name || "")
                          }
                        >
                          View Identity
                        </Button>
                      )}
                    </Space>
                  </div>
                ))}
              </Space>
            </Card>
          )}
        </div>

        {/* Access Review Items Table */}
        {certificationDetails.accessReviewItems.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 24, fontWeight: "bold" }}>
                Access Review Items
              </h2>
              <Space>
                {!certificationDetails.certification.completed && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Tooltip
                      title={
                        isCertificationStaged()
                          ? "Bulk actions are disabled for STAGED certifications"
                          : ""
                      }
                      placement="top"
                    >
                      <Button
                        type="default"
                        icon={
                          bulkActionMode ? (
                            <CloseOutlined />
                          ) : (
                            <CheckSquareOutlined />
                          )
                        }
                        onClick={toggleBulkActionMode}
                        loading={bulkActionLoading}
                        disabled={isCertificationStaged()}
                      >
                        {bulkActionMode ? "Exit Bulk Mode" : "Bulk Actions"}
                      </Button>
                    </Tooltip>
                    {bulkActionMode && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Select
                          value={bulkActionDecision}
                          onChange={setBulkActionDecision}
                          style={{ width: 150 }}
                          placeholder="Select decision"
                        >
                          <Select.Option value="APPROVE">APPROVE</Select.Option>
                          <Select.Option value="REVOKE">REVOKE</Select.Option>
                        </Select>
                        <Button
                          type="primary"
                          disabled={isBulkActionDisabled()}
                          loading={bulkActionLoading}
                          onClick={applyBulkDecision}
                        >
                          Apply to {setOfCheckedId.size} items
                        </Button>
                        {setOfCheckedId.size > 0 && (
                          <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                            Selected {setOfCheckedId.size} items
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {shouldShowLoadCSVButton() && (
                  <Tooltip title={getLoadCSVTooltip()} placement="top">
                    <Upload
                      accept=".csv"
                      multiple={false}
                      showUploadList={false}
                      beforeUpload={loadCSV}
                    >
                      <Button
                        type="default"
                        size="small"
                        icon={<UploadOutlined />}
                      >
                        Load CSV
                      </Button>
                    </Upload>
                  </Tooltip>
                )}
                <Button
                  icon={<DownloadOutlined />}
                  onClick={downloadAccessReviewItemsCSV}
                >
                  Download CSV
                </Button>
              </Space>
            </div>
            <Table
              columns={accessReviewColumns}
              dataSource={certificationDetails.accessReviewItems}
              rowKey={(record) => String(record.id)}
              loading={loading}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ["5", "10", "20", "50", "100"],
                showTotal: (total) => `Total ${total} items`,
                onChange: (page, pageSize) => {
                  const start = (page - 1) * pageSize;
                  const end = start + pageSize;
                  const currentPageData =
                    certificationDetails.accessReviewItems.slice(start, end);
                  onCurrentPageDataChange(currentPageData);
                },
                onShowSizeChange: (current, size) => {
                  const start = (current - 1) * size;
                  const end = start + size;
                  const currentPageData =
                    certificationDetails.accessReviewItems.slice(start, end);
                  onCurrentPageDataChange(currentPageData);
                },
              }}
              scroll={{ x: "max-content" }}
              onChange={(pagination, filters, sorter, extra) => {
                if (extra.action === "paginate") {
                  // Handle pagination change
                  const start =
                    ((pagination.current || 1) - 1) *
                    (pagination.pageSize || 10);
                  const end = start + (pagination.pageSize || 10);
                  const currentPageData =
                    certificationDetails.accessReviewItems.slice(start, end);
                  onCurrentPageDataChange(currentPageData);
                }
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 24,
          }}
        >
          <Space>
            <Button
              icon={<ClearOutlined />}
              onClick={clearAllDecisionChanges}
              disabled={!hasPendingChanges()}
            >
              Clear Changes
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveDecisionChanges}
              loading={saveChangesLoading}
              disabled={!hasPendingChanges()}
            >
              Save Changes ({decisionChanges.size})
            </Button>
          </Space>
          {shouldShowSignOffButton() && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={signOffCertification}
              loading={loading}
            >
              Sign-Off
            </Button>
          )}
        </div>
      </Card>

      {/* Bulk Comment Modal */}
      <Modal
        open={bulkCommentModalVisible}
        title="Bulk Action Comment"
        onOk={onBulkCommentConfirm}
        onCancel={onBulkCommentCancel}
        okText="Apply"
        cancelText="Cancel"
      >
        <div>
          <p>
            A comment is required for this decision. Please enter a comment that
            will be applied to all {setOfCheckedId.size} selected items.
          </p>
          <TextArea
            rows={4}
            value={bulkCommentText}
            onChange={(e) => setBulkCommentText(e.target.value)}
            placeholder="Enter comment for bulk action..."
          />
        </div>
      </Modal>

      {/* Comment Validation Modal */}
      <Modal
        open={commentValidationModalVisible}
        title="Missing Required Comments"
        onCancel={() => setCommentValidationModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setCommentValidationModalVisible(false)}
          >
            Close
          </Button>,
        ]}
      >
        <div>
          <Space>
            <WarningOutlined style={{ color: "#faad14" }} />
            <span>
              The following items require comments but are missing them:
            </span>
          </Space>
          <div style={{ marginTop: 16 }}>
            {missingCommentItems.map((item) => (
              <div key={item.id} style={{ marginBottom: 8 }}>
                <strong>{item.identityName}</strong> - {item.decision}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Identity Details Modal */}
      {identityModalData && (
        <Modal
          open={identityModalVisible}
          title={`Identity Details: ${identityModalData.name || ""}`}
          onCancel={() => {
            setIdentityModalVisible(false);
            setIdentityModalData(null);
          }}
          footer={[
            <Button
              key="close"
              onClick={() => {
                setIdentityModalVisible(false);
                setIdentityModalData(null);
              }}
            >
              Close
            </Button>,
          ]}
          width={1000}
          style={{ top: 20 }}
          styles={{
            body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" },
          }}
        >
          <IdentityInfo identityId={identityModalData.identityId} />
        </Modal>
      )}

      {/* Access Details Modal */}
      {accessModalData && (
        <Modal
          open={accessModalVisible}
          title={`Access Details: ${
            accessModalData.accessSummary?.entitlement?.name ||
            accessModalData.accessSummary?.accessProfile?.name ||
            accessModalData.accessSummary?.role?.name ||
            accessModalData.accessSummary?.access?.name ||
            "Unknown Access"
          }`}
          onCancel={() => {
            setAccessModalVisible(false);
            setAccessModalData(null);
          }}
          footer={[
            <Button
              key="close"
              onClick={() => {
                setAccessModalVisible(false);
                setAccessModalData(null);
              }}
            >
              Close
            </Button>,
          ]}
          width={1000}
          style={{ top: 20 }}
          styles={{
            body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" },
          }}
        >
          <AccessDetail accessReviewItem={accessModalData} />
        </Modal>
      )}
    </ConfigProvider>
  );
}
