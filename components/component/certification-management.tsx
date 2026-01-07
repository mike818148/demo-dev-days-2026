"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  Button,
  Input,
  Card,
  Tag,
  Statistic,
  Carousel,
  Popover,
  Checkbox,
  Divider,
  Tooltip,
  Space,
  Spin,
  Empty,
  ConfigProvider,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ReloadOutlined,
  SettingOutlined,
  SearchOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { useTheme } from "next-themes";
import { listIdentityCertifications } from "@/lib/actions/isc";
import { IdentityCertificationDtoV2025 } from "sailpoint-api-client";
import { toast } from "sonner";
import Link from "next/link";

// Interface for campaign summary data
interface CampaignSummary {
  campaignName: string;
  campaignType: string;
  campaignDescription: string;
  totalCertifications: number;
  completedCertifications: number;
  incompleteCertifications: number;
  totalIdentities: number;
  completedIdentities: number;
  totalDecisions: number;
  madeDecisions: number;
  phaseCounts: {
    staged: number;
    active: number;
    signed: number;
  };
}

export function CertificationManagement() {
  const { theme: nextTheme } = useTheme();
  const [certifications, setCertifications] = useState<
    IdentityCertificationDtoV2025[]
  >([]);
  const [filteredCertifications, setFilteredCertifications] = useState<
    IdentityCertificationDtoV2025[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [nameSearchValue, setNameSearchValue] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [columnDropdownVisible, setColumnDropdownVisible] = useState(false);
  const [campaignSummaries, setCampaignSummaries] = useState<CampaignSummary[]>(
    []
  );

  // Initialize column visibility
  useEffect(() => {
    const allColumns = [
      "Name",
      "Campaign Name",
      "Campaign Type",
      "Campaign Description",
      "Completed",
      "Identities Completed",
      "Identities Total",
      "Created",
      "Decisions Made",
      "Decisions Total",
      "Due",
      "Signed",
      "Reviewer Name",
      "Phase",
    ];
    setVisibleColumns(new Set(allColumns));
  }, []);

  // Load certifications
  const getCertificationManagement = async () => {
    setLoading(true);
    try {
      const result = await listIdentityCertifications();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setCertifications(result.certifications);
      setFilteredCertifications(result.certifications);
      generateCampaignSummaries(result.certifications);
    } catch (error) {
      console.error("Error loading certifications:", error);
      toast.error("Failed to load certifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCertificationManagement();
  }, []);

  // Generate campaign summaries
  const generateCampaignSummaries = (
    certs: IdentityCertificationDtoV2025[]
  ) => {
    const campaignMap = new Map<string, CampaignSummary>();

    certs.forEach((certification) => {
      const campaignName =
        String(certification.campaign?.name) || "Unknown Campaign";
      const campaignType =
        String(certification.campaign?.type) || "Unknown Type";
      const campaignDescription =
        String(certification.campaign?.description) || "";

      if (!campaignMap.has(campaignName)) {
        campaignMap.set(campaignName, {
          campaignName,
          campaignType,
          campaignDescription,
          totalCertifications: 0,
          completedCertifications: 0,
          incompleteCertifications: 0,
          totalIdentities: 0,
          completedIdentities: 0,
          totalDecisions: 0,
          madeDecisions: 0,
          phaseCounts: {
            staged: 0,
            active: 0,
            signed: 0,
          },
        });
      }

      const summary = campaignMap.get(campaignName)!;

      summary.totalCertifications++;
      if (certification.completed) {
        summary.completedCertifications++;
      } else {
        summary.incompleteCertifications++;
      }

      summary.totalIdentities += certification.identitiesTotal || 0;
      summary.completedIdentities += certification.identitiesCompleted || 0;
      summary.totalDecisions += certification.decisionsTotal || 0;
      summary.madeDecisions += certification.decisionsMade || 0;

      const phase = String(certification.phase || "").toLowerCase();
      if (phase.includes("staged")) {
        summary.phaseCounts.staged++;
      } else if (phase.includes("active")) {
        summary.phaseCounts.active++;
      } else if (phase.includes("signed")) {
        summary.phaseCounts.signed++;
      }
    });

    setCampaignSummaries(Array.from(campaignMap.values()));
  };

  // Name search handlers
  const nameSearchReset = () => {
    setNameSearchValue("");
    nameSearchSubmit("");
  };

  const nameSearchSubmit = (value?: string) => {
    const searchValue = value ?? nameSearchValue;
    if (!searchValue.trim()) {
      setFilteredCertifications([...certifications]);
    } else {
      setFilteredCertifications(
        certifications.filter(
          (item) =>
            item.name?.toLowerCase().indexOf(searchValue.toLowerCase()) !== -1
        )
      );
    }
  };

  // Column visibility handlers
  const toggleColumnVisibility = (columnName: string) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        newSet.delete(columnName);
      } else {
        newSet.add(columnName);
      }
      return newSet;
    });
  };

  const selectAllColumns = () => {
    const allColumns = [
      "Name",
      "Campaign Name",
      "Campaign Type",
      "Campaign Description",
      "Completed",
      "Identities Completed",
      "Identities Total",
      "Created",
      "Decisions Made",
      "Decisions Total",
      "Due",
      "Signed",
      "Reviewer Name",
      "Phase",
    ];
    setVisibleColumns(new Set(allColumns));
  };

  const deselectAllColumns = () => {
    setVisibleColumns(new Set());
  };

  // Helper functions
  const getCampaignTypeColor = (campaignType: string): string => {
    const typeColors: { [key: string]: string } = {
      "Access Review": "blue",
      "Identity Review": "green",
      "Entitlement Review": "orange",
      "Role Review": "purple",
    };
    return typeColors[String(campaignType)] || "default";
  };

  const getProgressPercentage = (completed: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  // Table columns configuration
  const allColumns: ColumnsType<IdentityCertificationDtoV2025> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Search name"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => {
              confirm();
              nameSearchSubmit(selectedKeys[0] as string);
            }}
            style={{ marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                confirm();
                nameSearchSubmit(selectedKeys[0] as string);
              }}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
            <Button
              onClick={() => {
                clearFilters?.();
                nameSearchReset();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered) => (
        <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
      ),
      render: (value: string) => value || "N/A",
    },
    {
      title: "Campaign Name",
      dataIndex: ["campaign", "name"],
      key: "campaignName",
      sorter: (a, b) =>
        (a.campaign?.name || "").localeCompare(b.campaign?.name || ""),
      render: (value: string) => value || "N/A",
    },
    {
      title: "Campaign Type",
      dataIndex: ["campaign", "type"],
      key: "campaignType",
      sorter: (a, b) =>
        (a.campaign?.type || "").localeCompare(b.campaign?.type || ""),
      render: (value: string) => value || "N/A",
    },
    {
      title: "Campaign Description",
      dataIndex: ["campaign", "description"],
      key: "campaignDescription",
      render: (value: string) => value || "N/A",
    },
    {
      title: "Completed",
      dataIndex: "completed",
      key: "completed",
      sorter: (a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0),
      filters: [
        { text: "Yes", value: true },
        { text: "No", value: false },
      ],
      onFilter: (value, record) => record.completed === value,
      render: (value: boolean) => (
        <Tag color={value ? "green" : "orange"}>{value ? "Yes" : "No"}</Tag>
      ),
    },
    {
      title: "Identities Completed",
      dataIndex: "identitiesCompleted",
      key: "identitiesCompleted",
      sorter: (a, b) =>
        (a.identitiesCompleted || 0) - (b.identitiesCompleted || 0),
      render: (value: number) => (value || 0).toString(),
    },
    {
      title: "Identities Total",
      dataIndex: "identitiesTotal",
      key: "identitiesTotal",
      sorter: (a, b) => (a.identitiesTotal || 0) - (b.identitiesTotal || 0),
      render: (value: number) => (value || 0).toString(),
    },
    {
      title: "Created",
      dataIndex: "created",
      key: "created",
      sorter: (a, b) =>
        new Date(a.created || "").getTime() -
        new Date(b.created || "").getTime(),
      render: (value: string) =>
        value ? new Date(value).toLocaleString() : "N/A",
    },
    {
      title: "Decisions Made",
      dataIndex: "decisionsMade",
      key: "decisionsMade",
      sorter: (a, b) => (a.decisionsMade || 0) - (b.decisionsMade || 0),
      render: (value: number) => (value || 0).toString(),
    },
    {
      title: "Decisions Total",
      dataIndex: "decisionsTotal",
      key: "decisionsTotal",
      sorter: (a, b) => (a.decisionsTotal || 0) - (b.decisionsTotal || 0),
      render: (value: number) => (value || 0).toString(),
    },
    {
      title: "Due",
      dataIndex: "due",
      key: "due",
      sorter: (a, b) =>
        new Date(a.due || "").getTime() - new Date(b.due || "").getTime(),
      render: (value: string) =>
        value ? new Date(value).toLocaleString() : "N/A",
    },
    {
      title: "Signed",
      dataIndex: "signed",
      key: "signed",
      sorter: (a, b) =>
        new Date(a.signed || "").getTime() - new Date(b.signed || "").getTime(),
      render: (value: string) =>
        value ? new Date(value).toLocaleString() : "N/A",
    },
    {
      title: "Reviewer Name",
      dataIndex: ["reviewer", "name"],
      key: "reviewerName",
      render: (value: string) => value || "N/A",
    },
    {
      title: "Phase",
      dataIndex: "phase",
      key: "phase",
      render: (value: string) => value || "N/A",
    },
  ];

  const visibleColumnsList = useMemo(() => {
    const visible = allColumns.filter((col) =>
      visibleColumns.has(col.title as string)
    );
    // Add action column
    visible.push({
      title: "Action",
      key: "action",
      fixed: "right" as const,
      render: (_: any, record: IdentityCertificationDtoV2025) => (
        <Link href={`/certification/${record.id}`}>
          <Button type="default" size="small">
            View Details
          </Button>
        </Link>
      ),
    });
    return visible;
  }, [visibleColumns]);

  // Ant Design theme configuration based on next-themes
  const antdTheme = useMemo(() => {
    return {
      algorithm:
        nextTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
      components: {
        Statistic: {
          contentFontSize: 14,
        },
      },
    };
  }, [nextTheme]);

  return (
    <ConfigProvider theme={antdTheme}>
      <div className="certification-management-container w-full">
        <Card className="w-full">
          {/* Campaign Summary Section */}
          {!loading && campaignSummaries.length > 0 && (
            <Card
              style={{ marginTop: 16, marginBottom: 16 }}
              title={
                <Space>
                  <DashboardOutlined style={{ fontSize: 24 }} />
                  <span style={{ fontSize: 18, fontWeight: 600 }}>
                    Campaign Summary
                  </span>
                </Space>
              }
            >
              <Carousel
                autoplay
                autoplaySpeed={5000}
                effect="fade"
                dots={{ className: "custom-dots" }}
              >
                {campaignSummaries.map((summary, index) => (
                  <div key={index} style={{ padding: "0 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                        {summary.campaignName}
                      </h4>
                      <Tag color={getCampaignTypeColor(summary.campaignType)}>
                        {summary.campaignType}
                      </Tag>
                    </div>
                    {summary.campaignDescription && (
                      <p style={{ marginBottom: 16 }}>
                        {summary.campaignDescription}
                      </p>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 16,
                      }}
                    >
                      {/* Certifications Statistics */}
                      <div>
                        <h5
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          Certifications
                        </h5>
                        <Space orientation="vertical" size="small">
                          <Statistic
                            title="Total"
                            value={summary.totalCertifications}
                            prefix="📋"
                          />
                          <Statistic
                            title="Completed"
                            value={summary.completedCertifications}
                            prefix="✅"
                          />
                          <Statistic
                            title="Incomplete"
                            value={summary.incompleteCertifications}
                            prefix="⏳"
                            valueRender={(node) => (
                              <span style={{ color: "#faad14" }}>{node}</span>
                            )}
                          />
                        </Space>
                      </div>

                      {/* Identities Statistics */}
                      <div>
                        <h5
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          Identities
                        </h5>
                        <Space orientation="vertical" size="small">
                          <Statistic
                            title="Total"
                            value={summary.totalIdentities}
                            prefix="👥"
                          />
                          <Statistic
                            title="Completed"
                            value={summary.completedIdentities}
                            prefix="✅"
                            valueRender={(node) => (
                              <span style={{ color: "#52c41a" }}>{node}</span>
                            )}
                          />
                          <Statistic
                            title="Progress"
                            value={getProgressPercentage(
                              summary.completedIdentities,
                              summary.totalIdentities
                            )}
                            suffix="%"
                            prefix="📊"
                            valueRender={(node) => (
                              <span style={{ color: "#1890ff" }}>{node}</span>
                            )}
                          />
                        </Space>
                      </div>

                      {/* Decisions Statistics */}
                      <div>
                        <h5
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          Decisions
                        </h5>
                        <Space orientation="vertical" size="small">
                          <Statistic
                            title="Total"
                            value={summary.totalDecisions}
                            prefix="⚖️"
                          />
                          <Statistic
                            title="Made"
                            value={summary.madeDecisions}
                            prefix="✅"
                            valueRender={(node) => (
                              <span style={{ color: "#52c41a" }}>{node}</span>
                            )}
                          />
                          <Statistic
                            title="Progress"
                            value={getProgressPercentage(
                              summary.madeDecisions,
                              summary.totalDecisions
                            )}
                            suffix="%"
                            prefix="📊"
                            valueRender={(node) => (
                              <span style={{ color: "#1890ff" }}>{node}</span>
                            )}
                          />
                        </Space>
                      </div>

                      {/* Phase Statistics */}
                      <div>
                        <h5
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            marginBottom: 8,
                          }}
                        >
                          Phases
                        </h5>
                        <Space orientation="vertical" size="small">
                          <Statistic
                            title="Staged"
                            value={summary.phaseCounts.staged}
                            prefix="📋"
                            valueRender={(node) => (
                              <span style={{ color: "#722ed1" }}>{node}</span>
                            )}
                          />
                          <Statistic
                            title="Active"
                            value={summary.phaseCounts.active}
                            prefix="🔄"
                            valueRender={(node) => (
                              <span style={{ color: "#fa8c16" }}>{node}</span>
                            )}
                          />
                          <Statistic
                            title="Signed"
                            value={summary.phaseCounts.signed}
                            prefix="✍️"
                            valueRender={(node) => (
                              <span style={{ color: "#52c41a" }}>{node}</span>
                            )}
                          />
                        </Space>
                      </div>
                    </div>
                  </div>
                ))}
              </Carousel>
            </Card>
          )}

          {/* Table Section */}
          <Card
            title="Certification Management"
            extra={
              <Space>
                <Tooltip title="Refresh certifications">
                  <Button
                    icon={<ReloadOutlined spin={loading} />}
                    onClick={getCertificationManagement}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </Tooltip>
                <Popover
                  content={
                    <div style={{ width: 200 }}>
                      <div style={{ marginBottom: 8 }}>
                        <Button
                          type="link"
                          size="small"
                          onClick={selectAllColumns}
                          style={{ padding: 0 }}
                        >
                          Select All
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          onClick={deselectAllColumns}
                          style={{ padding: 0, marginLeft: 8 }}
                        >
                          Deselect All
                        </Button>
                      </div>
                      <Divider style={{ margin: "8px 0" }} />
                      <div style={{ maxHeight: 300, overflowY: "auto" }}>
                        {allColumns.map((col) => (
                          <div
                            key={col.title as string}
                            style={{ marginBottom: 4 }}
                          >
                            <Checkbox
                              checked={visibleColumns.has(col.title as string)}
                              onChange={() =>
                                toggleColumnVisibility(col.title as string)
                              }
                            >
                              {typeof col.title === "function"
                                ? null
                                : col.title}
                            </Checkbox>
                          </div>
                        ))}
                      </div>
                    </div>
                  }
                  trigger="click"
                  open={columnDropdownVisible}
                  onOpenChange={setColumnDropdownVisible}
                  placement="bottomRight"
                >
                  <Button icon={<SettingOutlined />}>Columns</Button>
                </Popover>
              </Space>
            }
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "50px 0" }}>
                <Spin size="large" />
              </div>
            ) : filteredCertifications.length === 0 ? (
              <Empty description="No certifications found" />
            ) : (
              <Table
                columns={visibleColumnsList}
                dataSource={filteredCertifications}
                rowKey={(record) =>
                  String(record.id) || Math.random().toString()
                }
                loading={loading}
                pagination={{
                  defaultPageSize: 10,
                  showTotal: (total: number) => `Total ${total} items`,
                }}
                scroll={{ x: "max-content" }}
                size="middle"
              />
            )}
          </Card>
        </Card>
      </div>
    </ConfigProvider>
  );
}
