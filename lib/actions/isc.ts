"use server";

import { authOptions } from "@/app/api/auth/authOptions";
import { getServerSession } from "next-auth";
import {
  Configuration,
  ConfigurationParameters,
  SearchApi,
  Search,
  Paginator,
  IdentityDocument,
  RoleDocument,
  SearchDocument,
  Index,
  AccessModelMetadataBetaApi,
  AccessRequestType,
  AccessRequestsApi,
  RequestedItemStatus,
  AccessRequestsApiListAccessRequestStatusRequest,
  BrandingApi,
  BrandingItem,
  IdentityCertificationDtoV2025,
  CertificationsV2025Api,
  IdentityReferenceWithNameAndEmailV2025,
  AccessReviewItemV2025,
  CertificationDecisionV2025,
  SODPoliciesApi,
  SodPolicyRead,
  RequestedItemDtoRef,
  RequestedItemDtoRefTypeV3,
  TransformsApi,
  TransformRead,
} from "sailpoint-api-client";
import { createMCPClient } from "@ai-sdk/mcp";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, stepCountIs } from "ai";
import z from "zod/v3";

/**
 * Helper function to perform a search using the SearchApi
 * @param indices - Array of indices to search (e.g., ["identities"], ["roles"])
 * @param queryString - The search query string
 * @param errorContext - Context for error messages (e.g., "identities", "roles")
 * @returns Promise with search results as SearchDocument[] or error
 */
async function performSearch(
  indices: Index[],
  queryString: string,
  errorContext: string
): Promise<{ data: SearchDocument[] } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session?.accessToken,
    };
    // TODO: There seems to be a bug in the SearchApi where it doesn't use Client ID and Client Secret.
    /*const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      clientId: process.env.ISC_SEARCH_CLIENT_ID,
      clientSecret: process.env.ISC_SEARCH_CLIENT_SECRET,
    };*/

    const apiConfig = new Configuration(configurationParams);
    const api = new SearchApi(apiConfig);

    const search: Search = {
      indices,
      query: {
        query: queryString,
      },
      sort: ["-name"],
    };

    const val = await Paginator.paginateSearchApi(api, search, 100, 1000);

    return { data: val.data };
  } catch (error) {
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    console.error(`Error searching ${errorContext}:`, messagesString);
    return {
      error: `Failed to search ${errorContext}: ${messagesString}`,
    };
  }
}

export async function searchIdentities(
  keyword: string
): Promise<{ users: IdentityDocument[] } | { error: string }> {
  const searchKeyword = keyword || "*";
  const queryString = searchKeyword === "*" ? "*" : `*${searchKeyword}*`;

  const result = await performSearch(["identities"], queryString, "identities");

  if ("error" in result) {
    return result;
  }

  // Convert SearchDocument[] to IdentityDocument[]
  const users: IdentityDocument[] = result.data.map((doc) => {
    return doc as IdentityDocument;
  });

  return { users };
}

export async function searchRoles(
  keyword: string,
  company?: string,
  department?: string
): Promise<{ roles: RoleDocument[] } | { error: string }> {
  const searchKeyword = keyword || "*";

  // Build query string
  const queryParts: string[] = [];

  // Add keyword filter - always use name: prefix with wildcard
  // If keyword is "*", use "name:*" to match all names
  const keywordQuery =
    searchKeyword === "*" ? "name:*" : `name:${searchKeyword}*`;
  queryParts.push(keywordQuery);

  // Add company filter if provided
  if (company && company.trim()) {
    queryParts.push(`@accessModelMetadata(name:company AND value:${company})`);
  }

  // Add department filter if provided
  if (department && department.trim()) {
    queryParts.push(
      `@accessModelMetadata(name:department AND value:${department})`
    );
  }

  // Add requestable and enabled filters
  queryParts.push(`requestable:true`);
  queryParts.push(`enabled:true`);

  const queryString = queryParts.join(" AND ");
  console.log("queryString", queryString);

  const result = await performSearch(["roles"], queryString, "roles");

  if ("error" in result) {
    return result;
  }

  // Convert SearchDocument[] to RoleDocument[]
  const roles: RoleDocument[] = result.data.map((doc) => {
    return doc as RoleDocument;
  });

  return { roles };
}

async function getAccessModelMetadataValues(
  key: string
): Promise<{ values: string[] } | { error: string }> {
  const session = await getServerSession(authOptions);
  try {
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      clientId: process.env.ISC_SVC_CLIENT_ID,
      clientSecret: process.env.ISC_SVC_CLIENT_SECRET,
      tokenUrl: `${process.env.ISC_BASE_API_URL}/oauth/token`,
    };

    const apiConfig = new Configuration(configurationParams);
    const api = new AccessModelMetadataBetaApi(apiConfig);
    const result = await api.listAccessModelMetadataAttributeValue({
      key: key,
    });

    return { values: result.data.map((item) => item.value!) };
  } catch (error) {
    console.error(
      `Error getting access model metadata values for key ${key}:`,
      error
    );
    return {
      error: `Failed to get access model metadata values for key ${key}`,
    };
  }
}

export async function getRoleCompanies(): Promise<
  { values: string[] } | { error: string }
> {
  return await getAccessModelMetadataValues("roleCompany");
}

export async function getRoleDepartments(): Promise<
  { values: string[] } | { error: string }
> {
  return await getAccessModelMetadataValues("roleDepartment");
}

// Helper function to convert date string to ISO 8601 format
const formatDateToISO = (dateString: string): string => {
  if (!dateString) return "";
  // If already in ISO format, return as is
  if (dateString.includes("T") && dateString.includes("Z")) {
    return dateString;
  }
  // Try to parse and convert to ISO format
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "";
    }
    // Format as ISO 8601 with milliseconds and Z: '2020-07-11T21:23:15.000Z'
    return date.toISOString();
  } catch {
    return "";
  }
};

/**
 * Creates an access request for a role
 * @param roles - The roles to request access for
 * @param requestees - The requestees to request access for
 * @param reason - Optional reason for the access request (deprecated, use roleComments instead)
 * @param roleComments - Optional map of role ID to comment for each role
 * @param removalDates - Optional map of role ID to removal date (ISO 8601 format: '2020-07-11T21:23:15.000Z')
 * @returns Promise with success message or error
 */
export async function createAccessRequest(
  roles: RoleDocument[],
  requestees: IdentityDocument[],
  roleComments?: Record<string, string>,
  removalDates?: Record<string, string>,
): Promise<{ message: string } | { error: string }> {
  const requestedItems = roles.map((role) => ({
    id: role.id,
    type: RequestedItemDtoRefTypeV3.Role,
    comment: roleComments?.[role.id!] || "",
    removeDate: removalDates?.[role.id!] ? formatDateToISO(removalDates?.[role.id!]) : undefined,
  }));
  const requesteeIds = requestees.map((requestee) => requestee.id);
  return await createAccessRequestInternal(requestedItems, requesteeIds, AccessRequestType.GrantAccess);
}

async function createAccessRequestInternal(
  requestedItems: RequestedItemDtoRef[],
  requesteeIds: string[],
  accessRequestType: AccessRequestType = AccessRequestType.GrantAccess,
): Promise<{ message: string } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }

    if (!requestedItems.length) {
      return { error: "Requested items are required" };
    }

    if (!requesteeIds.length) {
      return { error: "Requestees are required" };
    }

    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };

    const apiConfig = new Configuration(configurationParams);
    const api = new AccessRequestsApi(apiConfig);

    const res = await api.createAccessRequest({
      accessRequest: {
        requestedFor: requesteeIds,
        requestType: accessRequestType,
        requestedItems: requestedItems,
      },
    });

    if (res.status.toString().startsWith("2")) {
      return { message: "Access request created successfully" };
    } else {
      return { error: "Failed to create access request" };
    }
  } catch (error) {
    console.error(
      "Error creating access request:",
      JSON.stringify((error as any).response?.data, null, 2)
    );
    return {
      error:
        "Failed to create access request: " +
        JSON.stringify((error as any).response?.data?.messages, null, 2),
    };
  }
}

export async function getMyRequests(
  offset: number = 0,
  limit: number = 100,
  requesteeId?: string,
  status?: string
): Promise<{ requests: RequestedItemStatus[] } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };

    const apiConfig = new Configuration(configurationParams);
    const api = new AccessRequestsApi(apiConfig);

    const params: AccessRequestsApiListAccessRequestStatusRequest = {
      offset: offset,
      limit: limit,
      sorters: "-created",
      requestedFor: requesteeId ?? undefined,
      requestState: status,
    };
    const requests = await api.listAccessRequestStatus(params);

    return { requests: requests.data };
  } catch (error) {
    console.error("Error getting my requests:", error);
    return { error: "Failed to get my requests" };
  }
}

export async function getDocumentById(
  index:
    | "accessprofiles"
    | "accountactivities"
    | "entitlements"
    | "events"
    | "identities"
    | "roles",
  id: string
): Promise<{ document: SearchDocument } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new SearchApi(apiConfig);
    const result = await api.searchGet({
      index: index,
      id: id,
    });
    return { document: result.data };
  } catch (error) {
    console.error("Error getting document by id:", error);
    return { error: "Failed to get document by id" };
  }
}

export async function getBranding(): Promise<
  { branding: BrandingItem[] } | { error: string }
> {
  try {
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      clientId: process.env.ISC_SVC_CLIENT_ID,
      clientSecret: process.env.ISC_SVC_CLIENT_SECRET,
      tokenUrl: `${process.env.ISC_BASE_API_URL}/oauth/token`,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new BrandingApi(apiConfig);
    const result = await api.getBrandingList();
    return { branding: result.data };
  } catch (error) {
    console.error("Error getting branding:", error);
    return { error: "Failed to get branding" };
  }
}

export async function getDefaultBranding(): Promise<
  { branding: BrandingItem } | { error: string }
> {
  try {
    try {
      const configurationParams: ConfigurationParameters = {
        baseurl: process.env.ISC_BASE_API_URL,
        clientId: process.env.ISC_SVC_CLIENT_ID,
        clientSecret: process.env.ISC_SVC_CLIENT_SECRET,
        tokenUrl: `${process.env.ISC_BASE_API_URL}/oauth/token`,
      };
      const apiConfig = new Configuration(configurationParams);
      const api = new BrandingApi(apiConfig);
      const result = await api.getBranding({
        name: "default",
      });
      return { branding: result.data };
    } catch (error) {
      console.error("Error getting branding:", error);
      return { error: "Failed to get branding" };
    }
  } catch (error) {
    console.error("Error getting branding:", error);
    return { error: "Failed to get branding" };
  }
}

export async function getUsersWithAccessToRole(
  roleId: string
): Promise<{ users: IdentityDocument[] } | { error: string }> {
  try {
    const result = await performSearch(
      ["identities"],
      `@access(id:${roleId} AND type:ROLE)`,
      "identities"
    );
    if ("error" in result) {
      return result;
    }
    return { users: result.data.flatMap((doc) => doc as IdentityDocument[]) };
  } catch (error) {
    console.error("Error getting users with access to role:", error);
    return { error: "Failed to get users with access to role" };
  }
}

export async function checkIdentitiesForAccessToRole(
  roleId: string,
  identities: string[]
): Promise<{ identitiesWithAccess: string[] } | { error: string }> {
  const usersWithAccess = await getUsersWithAccessToRole(roleId);
  if ("error" in usersWithAccess) {
    return { error: "Failed to get users with access to role" };
  }
  const identitiesWithAccess = usersWithAccess.users
    .map((user) => user.id)
    .filter((id) => identities.includes(id));
  return {
    identitiesWithAccess: identitiesWithAccess.filter((id) =>
      identities.includes(id)
    ),
  };
}

export async function cancelAccessRequest(
  accessRequestId: string,
  comment?: string
): Promise<{ success: boolean } | { error: string }> {
  console.log("accessRequestId", accessRequestId);
  console.log("comment", comment);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new AccessRequestsApi(apiConfig);
    const result = await api.cancelAccessRequest({
      cancelAccessRequest: {
        accountActivityId: accessRequestId,
        comment: comment ?? "Cancelled by user",
      },
    });
    if (result.status.toString().startsWith("2")) {
      return { success: true };
    } else {
      return { error: "Failed to cancel access request" };
    }
  } catch (error) {
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    console.error("Error canceling access request:", messagesString);
    return {
      error: `Failed to cancel access request: ${messagesString}`,
    };
  }
}

export async function listIdentityCertifications(): Promise<
  { certifications: IdentityCertificationDtoV2025[] } | { error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new CertificationsV2025Api(apiConfig);
    const result = await api.listIdentityCertifications();
    if (result.status === 200) {
      return { certifications: result.data || [] };
    } else {
      return { error: "Failed to list identity certifications" };
    }
  } catch (error) {
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    console.error("Error listing identity certifications:", messagesString);
    return {
      error: `Failed to list identity certifications: ${messagesString}`,
    };
  }
}

export async function getIdentityCertification(
  id: string
): Promise<
  { certification: IdentityCertificationDtoV2025 } | { error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new CertificationsV2025Api(apiConfig);
    const result = await api.getIdentityCertification({ id });
    if (result.status === 200) {
      return { certification: result.data };
    } else {
      return { error: "Failed to get identity certification" };
    }
  } catch (error) {
    console.error("Error getting identity certification:", error);
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    return {
      error: `Failed to get identity certification: ${messagesString}`,
    };
  }
}

export async function listCertificationReviewers(
  id: string
): Promise<
  { reviewers: IdentityReferenceWithNameAndEmailV2025[] } | { error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new CertificationsV2025Api(apiConfig);
    const result = await api.listCertificationReviewers({ id });
    if (result.status === 200) {
      return { reviewers: result.data || [] };
    } else {
      return { error: "Failed to list certification reviewers" };
    }
  } catch (error) {
    console.error("Error listing certification reviewers:", error);
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    return {
      error: `Failed to list certification reviewers: ${messagesString}`,
    };
  }
}

export async function listIdentityAccessReviewItems(
  id: string
): Promise<{ items: AccessReviewItemV2025[] } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new CertificationsV2025Api(apiConfig);
    const result = await api.listIdentityAccessReviewItems({ id });
    if (result.status === 200) {
      return { items: result.data || [] };
    } else {
      return { error: "Failed to list identity access review items" };
    }
  } catch (error) {
    console.error("Error listing identity access review items:", error);
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    return {
      error: `Failed to list identity access review items: ${messagesString}`,
    };
  }
}

export async function getCampaign(
  id: string,
  detail?: "FULL" | "SUMMARY"
): Promise<{ campaign: any } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    // Note: Campaign API may not be available in the current version
    // Returning empty campaign for now - can be implemented when API is available
    return { campaign: null };
  } catch (error) {
    console.error("Error getting campaign:", error);
    return {
      error: `Failed to get campaign: ${String(error)}`,
    };
  }
}

export async function makeIdentityDecision(
  id: string,
  reviewDecisionV2025: Array<{
    id: string;
    decision: CertificationDecisionV2025;
    bulk: boolean;
    comments?: string;
  }>
): Promise<{ success: boolean } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new CertificationsV2025Api(apiConfig);
    const result = await api.makeIdentityDecision({
      id,
      reviewDecisionV2025,
    });
    if (result.status >= 200 && result.status < 300) {
      return { success: true };
    } else {
      return { error: "Failed to make identity decision" };
    }
  } catch (error) {
    console.error("Error making identity decision:", error);
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    return {
      error: `Failed to make identity decision: ${messagesString}`,
    };
  }
}

export async function signOffIdentityCertification(
  id: string
): Promise<{ success: boolean } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new CertificationsV2025Api(apiConfig);
    const result = await api.signOffIdentityCertification({ id });
    if (result.status >= 200 && result.status < 300) {
      return { success: true };
    } else {
      return { error: "Failed to sign off identity certification" };
    }
  } catch (error) {
    console.error("Error signing off identity certification:", error);
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    return {
      error: `Failed to sign off identity certification: ${messagesString}`,
    };
  }
}

export async function getPolicies(): Promise<{ policies: SodPolicyRead[] } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }
    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };
    const apiConfig = new Configuration(configurationParams);
    const api = new SODPoliciesApi(apiConfig);
    const result = await api.listSodPolicies();
    if (result.status >= 200 && result.status < 300) {
      return { policies: result.data || [] };
    } else {
      return { error: "Failed to get policies" };
    }
  } catch (error) {
    console.error("Error get policies:", error);
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
    return {
      error: `Failed to get policies: ${messagesString}`,
    };
  }
}

export async function getPolicyViolatedIdentities(query: string): Promise<{ identities: IdentityDocument[] } | { error: string }> {
  const result = await performSearch(["identities"], query, "policy violated identities");

  if ("error" in result) {
    return result;
  }
  // Convert SearchDocument[] to IdentityDocument[]
  const identities: IdentityDocument[] = result.data.map((doc) => {
    return doc as IdentityDocument;
  });

  return { identities };
}

export async function resolvePolicyViolationWithAI(policy: SodPolicyRead, identity: IdentityDocument): Promise<{ message: string } | { error: string }> {
  console.log("[resolvePolicyViolationWithAI] Starting resolution for:", {
    policyId: policy.id,
    policyName: policy.name,
    identityId: identity.id,
    identityName: identity.name,
  });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      console.error("[resolvePolicyViolationWithAI] Authentication required");
      return { error: "Authentication required" };
    }
    const sessionUserId = session.user?.id;
    const sessionUserName = session.user?.name;

    // console.log("[resolvePolicyViolationWithAI] Access token:", session.accessToken);

    const mcpUrl = `${process.env.ISC_BASE_API_URL}/v2025/access-requests/mcp`;
    console.log("[resolvePolicyViolationWithAI] Creating MCP client with URL:", mcpUrl);

    const mcpClient = await createMCPClient({
      transport: {
        type: "http",
        url: mcpUrl,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
      name: "isc-access-requests-mcp",
    });
    console.log("[resolvePolicyViolationWithAI] MCP client created successfully");

    const iscMCPTools = await mcpClient.tools();
    const availableToolsRaw: Record<string, any> = {
      "create-access-request": iscMCPTools?.["create-access-request"],
      // NOTE: here we assume the session user is a ORG_ADMIN (or direct Manager)in this use case. As per API documentation, 
      "create-removal-access-request": tool({
        description: 'Create a removal access request',
        inputSchema: z.object({
          requestedItem: z.object({
            id: z.string().describe('The ID of the requested item'),
            type: z.nativeEnum(RequestedItemDtoRefTypeV3).describe('The type of the requested item, can be "ACCESS_PROFILE", "ENTITLEMENT", or "ROLE", it must align with the ID of the requested item type'),
            comment: z.string().describe('The comment for the access request'),
          }).describe('The requested item to remove access for'),
          requesteeId: z.string().describe('The requestee ID to remove access for'),
        }),
        execute: async ({ requestedItem, requesteeId }) => {
          return await createAccessRequestInternal([requestedItem], [requesteeId], AccessRequestType.RevokeAccess);
        },
      }),
      "search-access": tool({
        description: 'Search Access Item for a missing required access',
        inputSchema: z.object({
          name: z.string().describe('The Access Item name to search for'),
        }),
        execute: async ({ name }) => {
          return await performSearch(["accessprofiles", "entitlements", "roles"], `name:${name}`, "search-access");
        },
      }),
    };

    // Drop any undefined tools (e.g. if MCP didn't expose create-access-request)
    const availableTools = Object.fromEntries(
      Object.entries(availableToolsRaw).filter(([, v]) => Boolean(v))
    );

    const toolNamesList = Object.keys(availableTools);
    const toolNames = toolNamesList.join(", ");
    console.log("[resolvePolicyViolationWithAI] Available tools:", {
      count: toolNamesList.length,
      toolNames: toolNames || "None",
    });

    const formatConflictingAccessCriteria = (
      conflictingAccessCriteria: any
    ): string => {
      const formatSide = (
        sideLabel: "Left" | "Right",
        side: any
      ): string[] => {
        const sideName = side?.name ? ` (${String(side.name)})` : "";
        const header = `    ${sideLabel}${sideName}:`;

        const criteriaList = Array.isArray(side?.criteriaList)
          ? side.criteriaList
          : [];

        if (criteriaList.length === 0) {
          return [header, "      - (none)"];
        }

        const lines = criteriaList.map((c: any) => {
          const type = c?.type ? String(c.type) : "UNKNOWN";
          const id = c?.id ? String(c.id) : "N/A";
          const name = c?.name ? String(c.name) : "N/A";
          return `      - ${type} | ${id} | ${name}`;
        });

        return [header, ...lines];
      };

      if (!conflictingAccessCriteria) {
        return [
          "    Left:",
          "      - (none)",
          "    Right:",
          "      - (none)",
        ].join("\n");
      }

      const left = (conflictingAccessCriteria as any).leftCriteria;
      const right = (conflictingAccessCriteria as any).rightCriteria;

      return [...formatSide("Left", left), ...formatSide("Right", right)].join(
        "\n"
      );
    };
    const conflictingAccessText = formatConflictingAccessCriteria(
      policy.conflictingAccessCriteria
    );

    const formatIdentityAccess = (access: any): string => {
      const accessList = Array.isArray(access) ? access : [];
      if (accessList.length === 0) {
        return "      - (none)";
      }

      return accessList
        .map((item: any) => {
          const type = item?.type ? String(item.type) : "UNKNOWN";
          const id = item?.id ? String(item.id) : "N/A";
          const name =
            item?.name ?? item?.displayName
              ? String(item.name ?? item.displayName)
              : "N/A";
          return `      - ${type} | ${id} | ${name}`;
        })
        .join("\n");
    };
    const identityAccessText = formatIdentityAccess((identity as any).access);

    console.log("[resolvePolicyViolationWithAI] Calling AI model to resolve violation...");
    const response = await generateText({
      model: openai("gpt-5"),
      tools: availableTools,
      // Allow multi-step tool use (e.g. search-access -> create-access-request)
      stopWhen: stepCountIs(8),
      system: `You are a tool-only policy violation resolution assistant. Prefer tools over text generation. Your role is to help resolve policy violations by adjusting access as needed (this may require revoking/removing conflicting access OR granting missing required access).

Strategy:
- Available tools: ${toolNames || "None"}
- Use Correction Advice as the primary driver for what to do. Some policies are resolved by removing/revoking access; other policies are resolved by granting missing access. Do not assume "revoke" is always correct.
- Consider Compensating Controls when applicable, but prioritize actually resolving the violation as the policy intends.
- Choose the smallest change that resolves the violation (least privilege / minimal impact).
- Use tools to grant or revoke access as appropriate to resolve the violation
- Tool limitation: the MCP tool "create-access-request" can only act for the current session user. If the target identity is not the session user, do not call tools; instead reply with the reason.
- If no tools are available, reply with the three sections above, stating in Actions: "No tools available"; in Tools Used: "None"; in Decision Reasoning: why you cannot proceed.
- If the violation is resolved, provide the full three-section summary of what was done, which tools were used, and why.
- If you cannot determine a resolution, use the three sections to explain what you considered, that no resolution was chosen, and what information or capabilities would be needed.`,
      prompt: `Resolve the policy violation for identity "${identity.name}" (ID: ${identity.id}) related to policy "${policy.name}" (ID: ${policy.id}). 
      And return the result in the three sections format: Actions, Tools Used, and Decision Reasoning.

Important:
- Session user (tool limitation context): ${sessionUserName} (${sessionUserId})
- If the target identity is not the session user, do nothing and reply why (the MCP create-access-request tool cannot act for other identities).
- The policy's Correction Advice may instruct you to GRANT missing access instead of removing access. Follow it.
- If Correction Advice indicates a grant, use the grant/create-access-request tool.
- If Correction Advice indicates a revoke/removal, use the removal/revoke tool.
- If you need an access item's ID/type to proceed, use search-access as a LOOKUP step, then immediately use the appropriate grant/revoke tool to complete the resolution. Do not stop after search-access unless no suitable match exists.

Policy Details:
  - ID: ${policy.id}
  - Description: ${policy.description}
  - Compensating Controls: ${policy.compensatingControls}
  - Correction Advice: ${policy.correctionAdvice}
  - policyQuery: ${policy.policyQuery}
  - Conflicting Access:
    ${conflictingAccessText}

Identity Details:
  - Name: ${identity.name}
  - ID: ${identity.id}
  - Email: ${identity.email}
  - Status: ${identity.status}
  - Access:
    ${identityAccessText}
`,
    });

    console.log("[resolvePolicyViolationWithAI] Action response received:", {
      textLength: response.text?.length || 0,
      hasToolCalls: response.toolCalls && response.toolCalls.length > 0,
      toolCallsCount: response.toolCalls?.length || 0,
    });

    if (response.text) {
      return {
        message: response.text,
      };
    }

    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log("[resolvePolicyViolationWithAI] Tool calls made:", response.toolCalls.map((tc: any) => ({
        toolName: tc.toolName,
        args: tc.args,
      })));
    }
    console.log("[resolvePolicyViolationWithAI] Resolution completed successfully, response.toolResults:", JSON.stringify(response.toolResults, null, 2));

    const summary = await generateText({
      model: openai("gpt-5"),
      prompt: `
    Summarize the following action response
    in three sections: Actions, Tools Used, Decision Reasoning.
    
    Tool results:
    ${JSON.stringify(response.toolResults, null, 2)}
    `,
    });
    return {
      message: summary.text ?? "No summary returned",
    };
  } catch (error) {
    console.error("[resolvePolicyViolationWithAI] Error resolving policy violation:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      policyId: policy.id,
      identityId: identity.id,
    });
    return {
      error: `Failed to resolve policy violation with AI: ${String(error)}`,
    };
  }
}

export async function isOpenAIAvailable(): Promise<boolean> {
  return !!process.env.OPENAI_API_KEY;
}

export async function listTransforms(): Promise<{ transforms: TransformRead[] } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: "Authentication required" };
  }
  const configurationParams: ConfigurationParameters = {
    baseurl: process.env.ISC_BASE_API_URL,
    accessToken: session.accessToken,
  };
  const apiConfig = new Configuration(configurationParams);
  const api = new TransformsApi(apiConfig);
  const result = await api.listTransforms();
  if (result.status === 200) {
    return { transforms: result.data || [] };
  } else {
    return { error: "Failed to list transforms" };
  }
}