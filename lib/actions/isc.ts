"use server";

import { authOptions } from "@/app/api/auth/authOptions";
import { gateway } from "@ai-sdk/gateway";
import { createMCPClient } from "@ai-sdk/mcp";
import { generateText, stepCountIs, tool } from "ai";
import { getServerSession } from "next-auth";
import {
  AccessRequestType,
  AccessRequestsApi,
  Configuration,
  type IdentityDocument,
  type Index,
  Paginator,
  type RequestedItemDtoRef,
  RequestedItemDtoRefTypeV3,
  SearchApi,
  type Search,
  type SearchDocument,
  SODPoliciesApi,
  type SodPolicyRead,
} from "sailpoint-api-client";
import z from "zod/v3";

const DEFAULT_POLICY_RESOLUTION_MODEL = "gpt-5-mini";
const SEARCH_PAGE_SIZE = 100;
const SEARCH_MAX_RESULTS = 1000;

type ActionError = { error: string };

type CriteriaItem = {
  type?: string;
  id?: string;
  name?: string;
};

type CriteriaSide = {
  name?: string;
  criteriaList?: CriteriaItem[];
};

type ConflictingAccessCriteriaShape = {
  leftCriteria?: CriteriaSide;
  rightCriteria?: CriteriaSide;
};

type IdentityAccessItem = {
  type?: string;
  id?: string;
  name?: string;
  displayName?: string;
};

type PolicyResolutionPromptOptions = {
  systemPromptAddition?: string;
};

function getErrorDetails(error: unknown): string {
  const messages = (
    error as { response?: { data?: { messages?: unknown } } } | undefined
  )?.response?.data?.messages;
  if (messages) {
    return JSON.stringify(messages);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

/**
 * Source systems often expose DNs in policy or identity "access" data. The ISC
 * access request API expects the SailPoint object id (search document `id`),
 * not LDAP-style distinguished names.
 */
function isLikelyLdapDistinguishedName(value: string): boolean {
  const v = value.trim();
  if (!v) {
    return false;
  }
  if (/^cn=/i.test(v)) {
    return true;
  }
  if (/(^|[,])(cn|ou|ldif|dc)=/i.test(v) && v.includes("=") && (v.includes(",") || v.toLowerCase().includes("dc="))) {
    return true;
  }
  return false;
}

const accessRequestRequestedItemZod = z.object({
  id: z
    .string()
    .min(1)
    .refine((id) => !isLikelyLdapDistinguishedName(id), {
      message:
        "Must be the ISC object id (search-access document id, often a UUID), not a native identifier such as an LDAP distinguished name (CN=...,DC=...).",
    }),
  type: z
    .nativeEnum(RequestedItemDtoRefTypeV3)
    .describe(
      'The type of the requested item: "ACCESS_PROFILE", "ENTITLEMENT", or "ROLE"'
    ),
  comment: z.string().describe("The comment for the access request"),
});

async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return null;
  }

  return session;
}

function getConfiguration(accessToken: string): Configuration {
  return new Configuration({
    baseurl: process.env.ISC_BASE_API_URL,
    accessToken,
  });
}

function getPolicyResolutionModel(modelOverride?: string) {
  const configuredModel = modelOverride?.trim() || DEFAULT_POLICY_RESOLUTION_MODEL;
  const normalizedModel = configuredModel.includes("/")
    ? configuredModel
    : `openai/${configuredModel}`;

  return gateway(normalizedModel);
}

async function performSearch(
  indices: Index[],
  queryString: string,
  errorContext: string
): Promise<{ data: SearchDocument[] } | ActionError> {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return { error: "Authentication required" };
    }

    const api = new SearchApi(getConfiguration(session.accessToken));
    const search: Search = {
      indices,
      query: {
        query: queryString,
      },
      sort: ["-name"],
    };
    const result = await Paginator.paginateSearchApi(
      api,
      search,
      SEARCH_PAGE_SIZE,
      SEARCH_MAX_RESULTS
    );

    return { data: result.data };
  } catch (error) {
    const messagesString = getErrorDetails(error);
    console.error(`Error searching ${errorContext}:`, messagesString);
    return {
      error: `Failed to search ${errorContext}: ${messagesString}`,
    };
  }
}

async function createAccessRequestInternal(
  requestedItems: RequestedItemDtoRef[],
  requesteeIds: string[],
  accessRequestType: AccessRequestType
): Promise<{ message: string } | ActionError> {
  try {
    const session = await getAuthenticatedSession();

    if (!session) {
      return { error: "Authentication required" };
    }
    if (!requestedItems.length) {
      return { error: "Requested items are required" };
    }
    if (!requesteeIds.length) {
      return { error: "Requestees are required" };
    }

    for (const item of requestedItems) {
      if (item.id && isLikelyLdapDistinguishedName(item.id)) {
        return {
          error:
            "Requested item id is not a valid ISC object id (it looks like a native source identifier, e.g. an LDAP DN). Use search-access and pass the `id` from the returned document for that entitlement, role, or access profile — do not copy ids from Conflicting Access criteria or similar policy text if they are DNs.",
        };
      }
    }

    const api = new AccessRequestsApi(
      getConfiguration(session.accessToken)
    );
    const accessRequestBody = {
      requestedFor: requesteeIds,
      requestType: accessRequestType,
      requestedItems,
    };
    console.info(
      "[createAccessRequestInternal] createAccessRequest request",
      JSON.stringify(accessRequestBody, null, 2)
    );

    const result = await api.createAccessRequest({
      accessRequest: accessRequestBody,
    });

    console.info("[createAccessRequestInternal] createAccessRequest response", {
      status: result.status,
      statusText: result.statusText,
      data: result.data,
    });

    if (result.status.toString().startsWith("2")) {
      return { message: "Access request created successfully" };
    }

    return { error: "Failed to create access request" };
  } catch (error) {
    const messagesString = getErrorDetails(error);
    console.error("Error creating access request:", messagesString);
    return {
      error: `Failed to create access request: ${messagesString}`,
    };
  }
}

export async function getPolicies(): Promise<
  { policies: SodPolicyRead[] } | { error: string }
> {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return { error: "Authentication required" };
    }

    const api = new SODPoliciesApi(getConfiguration(session.accessToken));
    const result = await api.listSodPolicies();

    if (result.status >= 200 && result.status < 300) {
      return { policies: result.data || [] };
    }

    return { error: "Failed to get policies" };
  } catch (error) {
    const messagesString = getErrorDetails(error);
    console.error("Error getting policies:", messagesString);
    return {
      error: `Failed to get policies: ${messagesString}`,
    };
  }
}

export async function getPolicyViolatedIdentities(
  query: string
): Promise<{ identities: IdentityDocument[] } | { error: string }> {
  const result = await performSearch(
    ["identities"],
    query,
    "policy violated identities"
  );

  if ("error" in result) {
    return result;
  }

  return {
    identities: result.data.map((doc) => doc as IdentityDocument),
  };
}

function formatConflictingAccessCriteria(conflictingAccessCriteria: unknown): string {
  const formatSide = (sideLabel: "Left" | "Right", side?: CriteriaSide): string[] => {
    const sideName = side?.name ? ` (${String(side.name)})` : "";
    const criteriaList = Array.isArray(side?.criteriaList)
      ? side.criteriaList
      : [];

    if (criteriaList.length === 0) {
      return [`    ${sideLabel}${sideName}:`, "      - (none)"];
    }

    return [
      `    ${sideLabel}${sideName}:`,
      ...criteriaList.map((criteria) => {
        const type = criteria?.type ? String(criteria.type) : "UNKNOWN";
        const id = criteria?.id ? String(criteria.id) : "N/A";
        const name = criteria?.name ? String(criteria.name) : "N/A";
        return `      - ${type} | ${id} | ${name}`;
      }),
    ];
  };

  const criteria = conflictingAccessCriteria as ConflictingAccessCriteriaShape;
  return [
    ...formatSide("Left", criteria?.leftCriteria),
    ...formatSide("Right", criteria?.rightCriteria),
  ].join("\n");
}

function formatIdentityAccess(access: unknown): string {
  const accessList = Array.isArray(access) ? (access as IdentityAccessItem[]) : [];
  if (accessList.length === 0) {
    return "      - (none)";
  }

  return accessList
    .map((item) => {
      const type = item?.type ? String(item.type) : "UNKNOWN";
      const id = item?.id ? String(item.id) : "N/A";
      const name =
        item?.name ?? item?.displayName
          ? String(item.name ?? item.displayName)
          : "N/A";
      return `      - ${type} | ${id} | ${name}`;
    })
    .join("\n");
}

export async function resolvePolicyViolationWithAI(
  policy: SodPolicyRead,
  identity: IdentityDocument,
  modelOverride?: string,
  promptOptions?: PolicyResolutionPromptOptions
): Promise<{ message: string } | { error: string }> {
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return { error: "Authentication required" };
    }

    const sessionUserId = session.user?.id;
    const sessionUserName = session.user?.name;
    const isSessionUserAffectedIdentity = Boolean(
      sessionUserId && identity.id && String(sessionUserId) === String(identity.id)
    );

    if (isSessionUserAffectedIdentity) {
      mcpClient = await createMCPClient({
        transport: {
          type: "http",
          url: `${process.env.ISC_BASE_API_URL}/latest/access-requests/mcp`,
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
        name: "isc-access-requests-mcp",
      });
    }

    const iscMCPTools = mcpClient ? await mcpClient.tools() : {};
    const identityAccessRequestTypeSchema = isSessionUserAffectedIdentity
      ? z
          .literal(AccessRequestType.RevokeAccess)
          .describe(
            `Use "${AccessRequestType.RevokeAccess}". Grant requests for the session user must use create-self-access-request.`
          )
      : z
          .nativeEnum(AccessRequestType)
          .describe(
            `Use "${AccessRequestType.GrantAccess}" to grant access or "${AccessRequestType.RevokeAccess}" to remove access.`
          );
    const availableToolsRaw: Record<string, any> = {
      ...(isSessionUserAffectedIdentity
        ? {
            "create-self-access-request": iscMCPTools?.["create-access-request"],
          }
        : {}),
      "create-identity-access-request": tool({
        description: isSessionUserAffectedIdentity
          ? "Create a revoke access request for the affected session user using the SailPoint API"
          : "Create a grant or revoke access request for a specified identity using the SailPoint API",
        inputSchema: z.object({
          requestedItem: accessRequestRequestedItemZod.describe(
            "Requested access item. The id must come from a search-access hit (ISC object id), not a native/LDAP DN."
          ),
          requesteeId: z
            .string()
            .describe(
              `The identity ID to request access for. Use the affected identity ID: ${identity.id}`
            ),
          requestType: identityAccessRequestTypeSchema,
        }),
        execute: async ({ requestedItem, requesteeId, requestType }) => {
          return createAccessRequestInternal(
            [requestedItem],
            [requesteeId],
            requestType
          );
        },
      }),
      "search-access": tool({
        description:
          "Search entitlements, roles, and access profiles by keyword. Use a short name fragment (e.g. display name or word from the object name), not a full LDAP DN. Every access request must use the document `id` from the search result as requestedItem.id — that is the only valid ISC object id for createAccessRequest.",
        inputSchema: z.object({
          name: z
            .string()
            .describe(
              "Keyword to search in access profile, entitlement, and role names (e.g. WindowsAdministration). Do not pass an LDAP distinguished name."
            ),
        }),
        execute: async ({ name }) => {
          return performSearch(
            ["accessprofiles", "entitlements", "roles"],
            `name:${name}`,
            "search-access"
          );
        },
      }),
    };

    const availableTools = Object.fromEntries(
      Object.entries(availableToolsRaw).filter(([, value]) => Boolean(value))
    );
    const toolNames = Object.keys(availableTools).join(", ");
    const systemPromptAddition = promptOptions?.systemPromptAddition?.trim();

    const response = await generateText({
      model: getPolicyResolutionModel(modelOverride),
      tools: availableTools,
      stopWhen: stepCountIs(8),
      system: `You are a tool-first policy violation resolution assistant for SailPoint Identity Security Cloud.

Strategy:
- Available tools: ${toolNames || "None"}
- Use Correction Advice as the primary driver for what to do. Some policies are resolved by revoking conflicting access; others are resolved by granting missing required access.
- Choose the smallest change that resolves the violation with least privilege and minimal business impact.
- If the target identity is the session user and the correction requires a grant, use "create-self-access-request".
- For every revoke/removal action, use "create-identity-access-request", even when the target identity is the session user.
- If the target identity is not the session user, use "create-identity-access-request" for grant or revoke actions and pass the affected identity ID as requesteeId.
- For grant actions, use AccessRequestType.GrantAccess. For revoke/removal actions, use AccessRequestType.RevokeAccess.
- ID rule: "Conflicting Access" and similar policy lines often show source-native ids (e.g. LDAP DNs). Those values are not valid for access requests. Always call search-access, then set requestedItem.id to the search hit document's id field (ISC object id), never a CN=... string.
- Always answer with exactly these sections: Actions, Tools Used, Decision Reasoning.
${systemPromptAddition ? `- Additional instruction from frontend: ${systemPromptAddition}` : ""}`,
      prompt: `Resolve the policy violation for identity "${identity.name}" (ID: ${identity.id}) related to policy "${policy.name}" (ID: ${policy.id}).

Important:
- Session user: ${sessionUserName} (${sessionUserId})
- Affected identity is session user: ${isSessionUserAffectedIdentity ? "yes" : "no"}
- If Correction Advice indicates a grant, create a ${AccessRequestType.GrantAccess} request.
- If Correction Advice indicates a revoke/removal, create a ${AccessRequestType.RevokeAccess} request.
- If you need an access item's ID/type, use search-access first, then use the result document id and correct type, then call the appropriate grant/revoke tool. Never use an id that looks like CN=... or a full LDAP distinguished name.
- A generic "semantically invalid" error from the API often means a bad id reference (wrong object, wrong tenant id, or native id instead of ISC id) — re-run search-access and try the correct document id.

Policy Details:
  - ID: ${policy.id}
  - Description: ${policy.description}
  - Compensating Controls: ${policy.compensatingControls}
  - Correction Advice: ${policy.correctionAdvice}
  - policyQuery: ${policy.policyQuery}
  - Conflicting Access:
${formatConflictingAccessCriteria(policy.conflictingAccessCriteria)}

Identity Details:
  - Name: ${identity.name}
  - ID: ${identity.id}
  - Email: ${identity.email}
  - Status: ${identity.status}
  - Access:
${formatIdentityAccess((identity as { access?: unknown }).access)}`,
    });

    if (response.text) {
      return { message: response.text };
    }

    const summary = await generateText({
      model: getPolicyResolutionModel(modelOverride),
      prompt: `Summarize these tool results in exactly three sections: Actions, Tools Used, Decision Reasoning.

Tool results:
${JSON.stringify(response.toolResults, null, 2)}`,
    });

    return {
      message: summary.text || "No summary returned",
    };
  } catch (error) {
    console.error("[resolvePolicyViolationWithAI]", error);
    return {
      error: `Failed to resolve policy violation with AI: ${String(error)}`,
    };
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch (closeError) {
        console.error("[resolvePolicyViolationWithAI] failed to close MCP client", closeError);
      }
    }
  }
}

export async function isOpenAIAvailable(): Promise<boolean> {
  return !!process.env.AI_GATEWAY_API_KEY;
}
