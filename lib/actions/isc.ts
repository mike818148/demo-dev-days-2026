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
    console.error(`Error searching ${errorContext}:`, error);
    return { error: `Failed to search ${errorContext}` };
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
      accessToken: session?.accessToken,
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
 * @param reason - Optional reason for the access request
 * @returns Promise with success message or error
 */
export async function createAccessRequest(
  roles: RoleDocument[],
  requestees: IdentityDocument[],
  reason?: string
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

    const res = await api.createAccessRequest({
      accessRequest: {
        requestedFor: requestees.map((requestee) => requestee.id),
        requestType: AccessRequestType.GrantAccess,
        requestedItems: roles.map((role) => ({
          type: "ROLE",
          id: role.id,
          comment: reason || "",
        })),
      },
    });

    if (res.status.toString().startsWith("2")) {
      return { message: "Access request created successfully" };
    } else {
      return { error: "Failed to create access request" };
    }
  } catch (error) {
    console.error("Error creating access request:", error);
    return { error: "Failed to create access request" };
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
