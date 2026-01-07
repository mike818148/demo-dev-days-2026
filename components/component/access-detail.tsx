"use client";

import { Card, Tag, Descriptions, Empty, Badge } from "antd";
import {
  KeyOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { AccessReviewItemV2025 } from "sailpoint-api-client";

interface AccessDetailProps {
  accessReviewItem: AccessReviewItemV2025;
}

export function AccessDetail({ accessReviewItem }: AccessDetailProps) {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "N/A";
    }
  };

  const getAccessTypeIcon = (): string => {
    if (accessReviewItem.accessSummary?.entitlement) return "key";
    if (accessReviewItem.accessSummary?.accessProfile) return "user";
    if (accessReviewItem.accessSummary?.role) return "team";
    return "question-circle";
  };

  const getAccessTypeDisplay = (): string => {
    if (accessReviewItem.accessSummary?.entitlement) return "Entitlement";
    if (accessReviewItem.accessSummary?.accessProfile) return "Access Profile";
    if (accessReviewItem.accessSummary?.role) return "Role";
    return "Unknown";
  };

  const getDecisionBadgeClass = (): string => {
    const decision = accessReviewItem.decision || "PENDING";
    switch (decision.toUpperCase()) {
      case "APPROVE":
        return "decision-approve";
      case "REVOKE":
        return "decision-revoke";
      default:
        return "decision-pending";
    }
  };

  const getPrivilegeBadgeClass = (privileged: boolean): string => {
    return privileged ? "badge-warning" : "badge-secondary";
  };

  const getCloudGovernedBadgeClass = (cloudGoverned: boolean): string => {
    return cloudGoverned ? "badge-info" : "badge-secondary";
  };

  const hasEntitlement = (): boolean => {
    return !!accessReviewItem.accessSummary?.entitlement;
  };

  const hasAccessProfile = (): boolean => {
    return !!accessReviewItem.accessSummary?.accessProfile;
  };

  const hasRole = (): boolean => {
    return !!accessReviewItem.accessSummary?.role;
  };

  if (!accessReviewItem) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Empty
          description="No Access Details Available"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
        <p style={{ marginTop: 16, color: "#8c8c8c" }}>
          No access review item data was provided to display.
        </p>
      </div>
    );
  }

  const accessName =
    accessReviewItem.accessSummary?.entitlement?.name ||
    accessReviewItem.accessSummary?.accessProfile?.name ||
    accessReviewItem.accessSummary?.role?.name ||
    accessReviewItem.accessSummary?.access?.name ||
    "Unknown Access";

  const accessId =
    accessReviewItem.accessSummary?.entitlement?.id ||
    accessReviewItem.accessSummary?.accessProfile?.id ||
    accessReviewItem.accessSummary?.role?.id ||
    accessReviewItem.accessSummary?.access?.id ||
    "N/A";

  return (
    <div className="access-detail-container">
      {/* Header Section */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {getAccessTypeIcon() === "key" && <KeyOutlined />}
          {getAccessTypeIcon() === "user" && <UserOutlined />}
          {getAccessTypeIcon() === "team" && <TeamOutlined />}
          <Tag color="blue">{getAccessTypeDisplay()}</Tag>
        </div>
        <h2 style={{ margin: 0, marginBottom: 8 }}>{accessName}</h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#8c8c8c", fontSize: 12 }}>ID: {accessId}</span>
          <Tag
            color={
              (accessReviewItem.decision || "PENDING").toUpperCase() ===
              "APPROVE"
                ? "green"
                : (accessReviewItem.decision || "PENDING").toUpperCase() ===
                  "REVOKE"
                ? "red"
                : "default"
            }
          >
            {accessReviewItem.decision || "PENDING"}
          </Tag>
        </div>
      </div>

      {/* Review Information Section */}
      <Card
        title={
          <span>
            <FileTextOutlined style={{ marginRight: 8 }} />
            Review Information
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Review ID">
            {String(accessReviewItem.id)}
          </Descriptions.Item>
          <Descriptions.Item label="Completed">
            <Badge
              status={accessReviewItem.completed ? "success" : "processing"}
              text={accessReviewItem.completed ? "Yes" : "No"}
            />
          </Descriptions.Item>
          <Descriptions.Item label="New Access">
            <Badge
              status={accessReviewItem.newAccess ? "processing" : "default"}
              text={accessReviewItem.newAccess ? "Yes" : "No"}
            />
          </Descriptions.Item>
          {accessReviewItem.comments && (
            <Descriptions.Item label="Comments" span={2}>
              {accessReviewItem.comments}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Entitlement Details Section */}
      {hasEntitlement() && accessReviewItem.accessSummary?.entitlement && (
        <Card
          title={
            <span>
              <KeyOutlined style={{ marginRight: 8 }} />
              Entitlement Details
            </span>
          }
          style={{ marginBottom: 24 }}
        >
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Name">
              {accessReviewItem.accessSummary.entitlement.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {accessReviewItem.accessSummary.entitlement.description || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Privileged">
              <Tag
                color={
                  accessReviewItem.accessSummary.entitlement.privileged
                    ? "orange"
                    : "default"
                }
              >
                {accessReviewItem.accessSummary.entitlement.privileged
                  ? "Yes"
                  : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Revocable">
              <Tag
                color={
                  accessReviewItem.accessSummary.entitlement.revocable
                    ? "green"
                    : "red"
                }
              >
                {accessReviewItem.accessSummary.entitlement.revocable
                  ? "Yes"
                  : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Cloud Governed">
              <Tag
                color={
                  accessReviewItem.accessSummary.entitlement.cloudGoverned
                    ? "blue"
                    : "default"
                }
              >
                {accessReviewItem.accessSummary.entitlement.cloudGoverned
                  ? "Yes"
                  : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Attribute Name">
              {accessReviewItem.accessSummary.entitlement.attributeName ||
                "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Attribute Value">
              {accessReviewItem.accessSummary.entitlement.attributeValue ||
                "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Source" span={2}>
              {accessReviewItem.accessSummary.entitlement.sourceName || "N/A"} (
              {accessReviewItem.accessSummary.entitlement.sourceType || "N/A"})
            </Descriptions.Item>
          </Descriptions>

          {/* Owner Information */}
          {accessReviewItem.accessSummary.entitlement.owner && (
            <div style={{ marginTop: 24 }}>
              <h4>Owner</h4>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Name">
                  {accessReviewItem.accessSummary.entitlement.owner.name ||
                    "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {accessReviewItem.accessSummary.entitlement.owner.email ||
                    "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}

          {/* Account Information */}
          {accessReviewItem.accessSummary.entitlement.account && (
            <div style={{ marginTop: 24 }}>
              <h4>Account Information</h4>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Identity Name">
                  {accessReviewItem.identitySummary?.name || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Identity ID">
                  {accessReviewItem.identitySummary?.identityId || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Native Identity">
                  {accessReviewItem.accessSummary.entitlement.account
                    .nativeIdentity || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Badge
                    status={
                      accessReviewItem.accessSummary.entitlement.account
                        .disabled
                        ? "error"
                        : "success"
                    }
                    text={
                      accessReviewItem.accessSummary.entitlement.account
                        .disabled
                        ? "Disabled"
                        : "Active"
                    }
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Locked">
                  <Badge
                    status={
                      accessReviewItem.accessSummary.entitlement.account.locked
                        ? "warning"
                        : "success"
                    }
                    text={
                      accessReviewItem.accessSummary.entitlement.account.locked
                        ? "Yes"
                        : "No"
                    }
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {formatDate(
                    accessReviewItem.accessSummary.entitlement.account.created
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Modified">
                  {formatDate(
                    accessReviewItem.accessSummary.entitlement.account.modified
                  )}
                </Descriptions.Item>
                {accessReviewItem.accessSummary.entitlement.account
                  .activityInsights && (
                  <Descriptions.Item label="Usage Days">
                    {accessReviewItem.accessSummary.entitlement.account
                      .activityInsights?.usageDays || 0}{" "}
                    days
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}

          {/* Data Access Information */}
          {accessReviewItem.accessSummary.entitlement.dataAccess && (
            <div style={{ marginTop: 24 }}>
              <h4>Data Access</h4>
              <Descriptions bordered column={2} size="small">
                {accessReviewItem.accessSummary.entitlement.dataAccess
                  .impactScore && (
                  <Descriptions.Item label="Impact Score">
                    <Tag
                      color={
                        accessReviewItem.accessSummary.entitlement.dataAccess.impactScore?.value?.toLowerCase() ===
                        "high"
                          ? "red"
                          : accessReviewItem.accessSummary.entitlement.dataAccess.impactScore?.value?.toLowerCase() ===
                            "medium"
                          ? "orange"
                          : "default"
                      }
                    >
                      {
                        accessReviewItem.accessSummary.entitlement.dataAccess
                          .impactScore?.value
                      }
                    </Tag>
                  </Descriptions.Item>
                )}
                {(accessReviewItem.accessSummary.entitlement.dataAccess.policies
                  ?.length ?? 0) > 0 && (
                  <Descriptions.Item label="Policies" span={2}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {accessReviewItem.accessSummary.entitlement.dataAccess.policies?.map(
                        (policy, idx) => (
                          <Tag key={idx}>{policy.value}</Tag>
                        )
                      )}
                    </div>
                  </Descriptions.Item>
                )}
                {(accessReviewItem.accessSummary.entitlement.dataAccess
                  .categories?.length ?? 0) > 0 && (
                  <Descriptions.Item label="Categories" span={2}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {accessReviewItem.accessSummary.entitlement.dataAccess.categories?.map(
                        (category, idx) => (
                          <Tag key={idx}>
                            {category.value} ({category.matchCount})
                          </Tag>
                        )
                      )}
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}
        </Card>
      )}

      {/* Access Profile Details Section */}
      {hasAccessProfile() && accessReviewItem.accessSummary?.accessProfile && (
        <Card
          title={
            <span>
              <UserOutlined style={{ marginRight: 8 }} />
              Access Profile Details
            </span>
          }
          style={{ marginBottom: 24 }}
        >
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Name">
              {accessReviewItem.accessSummary.accessProfile.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {accessReviewItem.accessSummary.accessProfile.description ||
                "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Privileged">
              <Tag
                color={
                  accessReviewItem.accessSummary.accessProfile.privileged
                    ? "orange"
                    : "default"
                }
              >
                {accessReviewItem.accessSummary.accessProfile.privileged
                  ? "Yes"
                  : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Cloud Governed">
              <Tag
                color={
                  accessReviewItem.accessSummary.accessProfile.cloudGoverned
                    ? "blue"
                    : "default"
                }
              >
                {accessReviewItem.accessSummary.accessProfile.cloudGoverned
                  ? "Yes"
                  : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="End Date">
              {formatDate(accessReviewItem.accessSummary.accessProfile.endDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {formatDate(accessReviewItem.accessSummary.accessProfile.created)}
            </Descriptions.Item>
            <Descriptions.Item label="Modified">
              {formatDate(
                accessReviewItem.accessSummary.accessProfile.modified
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Entitlements Count">
              {accessReviewItem.accessSummary.accessProfile.entitlements
                ?.length || 0}
            </Descriptions.Item>
          </Descriptions>

          {/* Owner Information */}
          {accessReviewItem.accessSummary.accessProfile.owner && (
            <div style={{ marginTop: 24 }}>
              <h4>Owner</h4>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Name">
                  {accessReviewItem.accessSummary.accessProfile.owner.name ||
                    "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {accessReviewItem.accessSummary.accessProfile.owner.email ||
                    "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Card>
      )}

      {/* Role Details Section */}
      {hasRole() && accessReviewItem.accessSummary?.role && (
        <Card
          title={
            <span>
              <TeamOutlined style={{ marginRight: 8 }} />
              Role Details
            </span>
          }
          style={{ marginBottom: 24 }}
        >
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Name">
              {accessReviewItem.accessSummary.role.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {accessReviewItem.accessSummary.role.description || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Privileged">
              <Tag
                color={
                  accessReviewItem.accessSummary.role.privileged
                    ? "orange"
                    : "default"
                }
              >
                {accessReviewItem.accessSummary.role.privileged ? "Yes" : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Revocable">
              <Tag
                color={
                  accessReviewItem.accessSummary.role.revocable
                    ? "green"
                    : "red"
                }
              >
                {accessReviewItem.accessSummary.role.revocable ? "Yes" : "No"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="End Date">
              {formatDate(accessReviewItem.accessSummary.role.endDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Access Profiles Count">
              {accessReviewItem.accessSummary.role.accessProfiles?.length || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Entitlements Count">
              {accessReviewItem.accessSummary.role.entitlements?.length || 0}
            </Descriptions.Item>
          </Descriptions>

          {/* Owner Information */}
          {accessReviewItem.accessSummary.role.owner && (
            <div style={{ marginTop: 24 }}>
              <h4>Owner</h4>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Name">
                  {accessReviewItem.accessSummary.role.owner.name || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {accessReviewItem.accessSummary.role.owner.email || "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
