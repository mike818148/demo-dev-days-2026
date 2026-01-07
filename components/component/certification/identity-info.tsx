"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Avatar,
  Tag,
  Descriptions,
  Timeline,
  Spin,
  Result,
  Row,
  Col,
  Badge,
  Empty,
  theme,
  Divider,
} from "antd";
import {
  ReloadOutlined,
  UserOutlined,
  MailOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useTheme } from "next-themes";
import { getDocumentById } from "@/lib/actions/isc";

interface IdentityInfoProps {
  identityId: string;
}

export function IdentityInfo({ identityId }: IdentityInfoProps) {
  const { theme: nextTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<any>(null);

  const loadIdentity = async () => {
    if (!identityId) {
      setError("Identity ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getDocumentById("identities", identityId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setIdentity(result.document);
    } catch (err) {
      setError(`Failed to load identity: ${String(err)}`);
      console.error("Error loading identity:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdentity();
  }, [identityId]);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "N/A";
    }
  };

  const getAttributeValue = (key: string): string => {
    if (!identity?.attributes) return "N/A";
    const value = identity.attributes[key];
    return value ? String(value) : "N/A";
  };

  const getAttributeKeys = (): string[] => {
    if (!identity?.attributes) return [];
    return Object.keys(identity.attributes).filter(
      (key) =>
        ![
          "firstname",
          "lastname",
          "displayName",
          "uid",
          "identificationNumber",
          "cloudStatus",
        ].includes(key)
    );
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      ACTIVE: "green",
      INACTIVE: "red",
      PENDING: "orange",
    };
    return colors[status] || "default";
  };

  const getProcessingStateColor = (state: string): string => {
    const colors: Record<string, string> = {
      NORMAL: "blue",
      ERROR: "red",
      WARNING: "orange",
    };
    return colors[state] || "default";
  };

  // Ant Design theme
  const antdTheme = useMemo(() => {
    return {
      algorithm:
        nextTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    };
  }, [nextTheme]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !loading) {
    return (
      <Result
        status="error"
        title="Error Loading Identity"
        subTitle={error}
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={loadIdentity}
          >
            Retry
          </Button>
        }
      />
    );
  }

  if (!identity) {
    return <Empty description="No identity data available" />;
  }

  return (
    <div className="identity-info-container">
      {/* Header Section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 16, flex: 1 }}>
          <Avatar
            size={64}
            icon={<UserOutlined />}
            src={identity.attributes?.["photo"]}
          />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, marginBottom: 8 }}>
              {getAttributeValue("displayName") || identity.name}
            </h1>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              <Tag color={getStatusColor(identity.identityStatus || "")}>
                {identity.identityStatus || "N/A"}
              </Tag>
              <Tag
                color={getProcessingStateColor(identity.processingState || "")}
              >
                {identity.processingState || "N/A"}
              </Tag>
              <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                ID: {identity.id}
              </span>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {identity.emailAddress && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MailOutlined />
                  {identity.emailAddress}
                </span>
              )}
              {identity.alias && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <UserOutlined />
                  {identity.alias}
                </span>
              )}
              {identity.managerRef?.name && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <TeamOutlined />
                  Manager: {identity.managerRef.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* Identity Information Grid */}
      <Row gutter={[24, 24]}>
        {/* Basic Information */}
        <Col xs={24} sm={24} md={12} lg={8}>
          <Card title="Basic Information" variant="outlined">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="First Name">
                {getAttributeValue("firstname")}
              </Descriptions.Item>
              <Descriptions.Item label="Last Name">
                {getAttributeValue("lastname")}
              </Descriptions.Item>
              <Descriptions.Item label="Display Name">
                {getAttributeValue("displayName")}
              </Descriptions.Item>
              <Descriptions.Item label="UID">
                {getAttributeValue("uid")}
              </Descriptions.Item>
              <Descriptions.Item label="Identification Number">
                {getAttributeValue("identificationNumber")}
              </Descriptions.Item>
              <Descriptions.Item label="Manager">
                {identity.managerRef?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Is Manager">
                {identity.isManager ? "Yes" : "No"}
              </Descriptions.Item>
              <Descriptions.Item label="Cloud Status">
                {getAttributeValue("cloudStatus")}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Status & Timeline */}
        <Col xs={24} sm={24} md={12} lg={8}>
          <Card title="Status & Timeline" variant="outlined">
            <div style={{ marginBottom: 16 }}>
              <Badge
                status={
                  identity.identityStatus === "ACTIVE" ? "success" : "error"
                }
                text={identity.identityStatus || "N/A"}
              />
            </div>

            <Timeline
              items={[
                {
                  color: "blue",
                  children: (
                    <>
                      <strong>Created:</strong> {formatDate(identity.created)}
                    </>
                  ),
                },
                {
                  color: "green",
                  children: (
                    <>
                      <strong>Last Modified:</strong>{" "}
                      {formatDate(identity.modified)}
                    </>
                  ),
                },
                {
                  color: "orange",
                  children: (
                    <>
                      <strong>Last Refresh:</strong>{" "}
                      {formatDate(identity.lastRefresh)}
                    </>
                  ),
                },
                {
                  color: "purple",
                  children: (
                    <>
                      <strong>Lifecycle State:</strong>{" "}
                      {identity.lifecycleState?.stateName || "N/A"}
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Additional Attributes */}
        <Col xs={24} sm={24} md={24} lg={8}>
          <Card title="Additional Attributes" variant="outlined">
            {identity?.attributes && getAttributeKeys().length > 0 ? (
              <div>
                {getAttributeKeys().map((attr) => (
                  <div
                    key={attr}
                    style={{
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        marginBottom: 4,
                        color: "#8c8c8c",
                        fontSize: 12,
                      }}
                    >
                      {attr}
                    </div>
                    <div>{getAttributeValue(attr)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description="No additional attributes available"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
