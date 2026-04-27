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

    const api = new AccessRequestsApi(
      getConfiguration(session.accessToken)
    );
    const result = await api.createAccessRequest({
      accessRequest: {
        requestedFor: requesteeIds,
        requestType: accessRequestType,
        requestedItems,
      },
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
  modelOverride?: string
): Promise<{ message: string } | { error: string }> {
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return { error: "Authentication required" };
    }

    const sessionUserId = session.user?.id;
    const sessionUserName = session.user?.name;
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

    const iscMCPTools = await mcpClient.tools();
    const availableToolsRaw: Record<string, any> = {
      "create-access-request": iscMCPTools?.["create-access-request"],
      "create-removal-access-request": tool({
        description: "Create a removal access request",
        inputSchema: z.object({
          requestedItem: z.object({
            id: z.string().describe("The ID of the requested item"),
            type: z
              .nativeEnum(RequestedItemDtoRefTypeV3)
              .describe(
                'The type of the requested item: "ACCESS_PROFILE", "ENTITLEMENT", or "ROLE"'
              ),
            comment: z.string().describe("The comment for the access request"),
          }),
          requesteeId: z.string().describe("The requestee ID to remove access for"),
        }),
        execute: async ({ requestedItem, requesteeId }) => {
          return createAccessRequestInternal(
            [requestedItem],
            [requesteeId],
            AccessRequestType.RevokeAccess
          );
        },
      }),
      "search-access": tool({
        description: "Search for an access item needed to resolve a policy violation",
        inputSchema: z.object({
          name: z.string().describe("The access item name to search for"),
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

    const response = await generateText({
      model: getPolicyResolutionModel(modelOverride),
      tools: availableTools,
      stopWhen: stepCountIs(8),
      system: `You are a tool-first policy violation resolution assistant for SailPoint Identity Security Cloud.

Strategy:
- Available tools: ${toolNames || "None"}
- Use Correction Advice as the primary driver for what to do. Some policies are resolved by revoking conflicting access; others are resolved by granting missing required access.
- Choose the smallest change that resolves the violation with least privilege and minimal business impact.
- Tool limitation: the MCP tool "create-access-request" can only act for the current session user. If the target identity is not the session user, do not call tools; explain why.
- Always answer with exactly these sections: Actions, Tools Used, Decision Reasoning.`,
      prompt: `Resolve the policy violation for identity "${identity.name}" (ID: ${identity.id}) related to policy "${policy.name}" (ID: ${policy.id}).

Important:
- Session user: ${sessionUserName} (${sessionUserId})
- If the target identity is not the session user, do nothing and explain why.
- If Correction Advice indicates a grant, use the grant/create-access-request tool.
- If Correction Advice indicates a revoke/removal, use the removal/revoke tool.
- If you need an access item's ID/type, use search-access first, then immediately use the appropriate grant/revoke tool.

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
