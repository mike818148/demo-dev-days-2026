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
} from "sailpoint-api-client";

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
  removalDates?: Record<string, string>
): Promise<{ message: string } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return { error: "Authentication required" };
    }

    if (!roles.length) {
      return { error: "Roles are required" };
    }

    if (!requestees.length) {
      return { error: "Requestees are required" };
    }

    const configurationParams: ConfigurationParameters = {
      baseurl: process.env.ISC_BASE_API_URL,
      accessToken: session.accessToken,
    };

    const apiConfig = new Configuration(configurationParams);
    const api = new AccessRequestsApi(apiConfig);

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

    const res = await api.createAccessRequest({
      accessRequest: {
        requestedFor: requestees.map((requestee) => requestee.id),
        requestType: AccessRequestType.GrantAccess,
        requestedItems: roles.map((role) => {
          const item: any = {
            type: "ROLE",
            id: role.id,
          };

          // Use role-specific comment if available, otherwise fall back to reason
          const comment = roleComments?.[role.id] || "";
          if (comment) {
            item.comment = comment;
          }

          // Add removal date if provided
          const removalDate = removalDates?.[role.id];
          if (removalDate) {
            const formattedDate = formatDateToISO(removalDate);
            if (formattedDate) {
              item.removeDate = formattedDate;
            }
          }

          return item;
        }),
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
    console.error("Error canceling access request:", error);
    return { error: "Failed to cancel access request" };
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
    console.error("Error listing identity certifications:", error);
    const messages = (error as any).response?.data?.messages;
    const messagesString = messages
      ? JSON.stringify(messages)
      : "Unknown error";
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
