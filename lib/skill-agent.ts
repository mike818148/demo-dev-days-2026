// api/run-agent.ts

// AI SDK agent imports vary by version; treat this as the pattern.
import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from "ai";
import { ToolLoopAgent, stepCountIs } from "ai";
import { createSailCLISandbox } from "@/sandbox/sandbox";
import { openai } from "@ai-sdk/openai";
import path from "node:path";

export const DEFAULT_SYSTEM_POLICY = `
You are a Transform assistant for SailPoint Identity Security Cloud (ISC).

- You always work from Transform JSON first.
- You have access to local Transform skills (design guidance and operations docs).
- You must use the skill guidance for transform design decisions.

Base safety rules (apply in all modes):
- Always draft or modify Transform JSON locally before suggesting any tenant changes.
- Prefer small, composable transforms over large, complex ones.
- Explain what you are doing in terms of transform types and attributes.
- Never propose or output a transform with type "script".
- Do not invent transform types that are not documented by available skills/docs.
`.trim();

export function buildSystemPolicyForSailCli(
    isSailCliEnabled: boolean,
    baseSystemOverride?: string
): string {
    const header = (baseSystemOverride ?? DEFAULT_SYSTEM_POLICY).trimEnd();

    if (!isSailCliEnabled) {
        return (
            header +
            `

Sail CLI mode: DISABLED
- Do not run any tenant commands (no sail transform ...).
- Focus on designing, validating, and revising Transform JSON only.
- When you suggest CLI usage, describe the commands but do not execute them.
- Always derive transform structure from local skills and operations docs only.`
        );
    }

    return (
        header +
        `

Sail CLI mode: ENABLED
- You may use the Sail CLI Transform skill to run safe sail transform commands inside the sandbox.
- Always follow the draft → preview → explicit approval → apply workflow from the Sail CLI skill.
- Never run create/update/delete unless the user explicitly says: apply / save / deploy / delete.`
    );
}

export type RunTransformAgentParams = {
    sandboxId: string;
    onStatus?: (status: string) => void;
} & (
        | { prompt: string; messages?: never }
        | { messages: ModelMessage[]; prompt?: never; system?: string }
    );

export type RunTransformAgentResult = {
    text: string;
    responseMessages: Array<AssistantModelMessage | ToolModelMessage>;
    sandboxId: string;
};

function withLeadingSystemMessage(
    messages: ModelMessage[],
    systemPolicy: string
): ModelMessage[] {
    const withoutSystem = messages.filter((m) => m.role !== "system");
    return [
        {
            role: "system",
            content: systemPolicy,
        } as ModelMessage,
        ...withoutSystem,
    ];
}

type AgentTools = ConstructorParameters<typeof ToolLoopAgent>[0]["tools"];

let nonSailTransformToolsCache: AgentTools | null = null;
let nonSailTransformToolsPromise: Promise<AgentTools> | null = null;

async function getNonSailTransformTools(): Promise<{
    tools: AgentTools;
    fromCache: boolean;
}> {
    if (nonSailTransformToolsCache) {
        return { tools: nonSailTransformToolsCache, fromCache: true };
    }

    if (nonSailTransformToolsPromise) {
        const tools = await nonSailTransformToolsPromise;
        return { tools, fromCache: true };
    }

    nonSailTransformToolsPromise = (async () => {
        const { experimental_createSkillTool: createSkillTool } = await import("bash-tool");
        // In non-SAIL mode, load only local design skills (exclude sail-cli-transform).
        const skillsDirectory = path.join(process.cwd(), "skills", "transform");
        const { skill } = await createSkillTool({
            skillsDirectory,
        });
        return { skill } as AgentTools;
    })();

    try {
        const tools = await nonSailTransformToolsPromise;
        nonSailTransformToolsCache = tools;
        return { tools, fromCache: false };
    } finally {
        nonSailTransformToolsPromise = null;
    }
}

/**
 * Run the transform agent. Single-prompt or conversation.
 * Use the same sandboxId for all turns of a conversation so tool state persists.
 */
export async function runTransformAgent(
    params: RunTransformAgentParams
): Promise<RunTransformAgentResult> {
    const emitStatus = (status: string) => {
        params.onStatus?.(status);
    };
    const modelName = process.env.TRANSFORM_AGENT_MODEL?.trim() || "gpt-5";
    const model = openai(modelName);
    const sailCliEnabled = String(process.env.ENABLE_SAIL_CLI ?? "").toLowerCase() === "true";
    console.log(
        `[runTransformAgent] model=${modelName} ENABLE_SAIL_CLI=${sailCliEnabled} -> ${sailCliEnabled ? "sandbox+tools mode" : "skill-only mode"}`
    );

    const systemPolicy = buildSystemPolicyForSailCli(
        sailCliEnabled,
        "system" in params && params.system != null ? params.system : undefined
    );

    // Non-Sail mode: run skill-only agent (no sandbox/bash tools).
    if (!sailCliEnabled) {
        emitStatus("Loading local transform skills...");
        const { tools, fromCache } = await getNonSailTransformTools();
        if (fromCache) emitStatus("Using cached transform skill...");

        const agent = new ToolLoopAgent({
            model,
            tools,
            stopWhen: stepCountIs(25),
        });

        emitStatus("Running transform agent...");
        const result =
            "messages" in params && params.messages != null && params.messages.length > 0
                ? await agent.generate({
                    messages: withLeadingSystemMessage(params.messages, systemPolicy),
                } as Parameters<typeof agent.generate>[0])
                : await agent.generate({
                    system: systemPolicy,
                    prompt: params.prompt as string,
                } as Parameters<typeof agent.generate>[0]);

        return {
            text: result.text,
            responseMessages: result.response.messages,
            sandboxId: params.sandboxId || "",
        };
    }

    // `bash-tool` is ESM-only. When running this file via CJS tooling (common in Node/TS runners),
    // static imports can fail. Use a dynamic import so local scripts can run reliably.
    emitStatus("Loading Sail CLI tools...");
    const { createBashTool, experimental_createSkillTool: createSkillTool } = await import(
        "bash-tool"
    );

    // Reuse existing sandbox if sandboxId is provided (or create new one and use it).
    // Use the same sandboxId for all turns of a conversation so tool state (e.g. transform JSON) persists.
    emitStatus("Starting sandbox...");
    const sandbox = await createSailCLISandbox({ sandboxId: params.sandboxId });
    const sandboxId = sandbox.sandboxId;
    const existingSandbox = sandbox;

    // Load Skills from your local repo and upload to sandbox workspace
    emitStatus("Loading skills...");
    const skillsDirectory = path.join(process.cwd(), "skills");
    const { skill, files, instructions } = await createSkillTool({
        skillsDirectory,
    });

    const { SAIL_BASE_URL, SAIL_CLIENT_ID, SAIL_CLIENT_SECRET } = process.env;

    // Create bash tool(s) and upload skill files into the sandbox workspace
    emitStatus("Preparing bash tools...");
    const { tools } = await createBashTool({
        sandbox: existingSandbox,
        files,
        extraInstructions: instructions,
        onBeforeBashCall: ({ command }) => {
            const oneLineCommand = command.replace(/\s+/g, " ").trim();
            emitStatus(
                `Running command: ${oneLineCommand.length > 100 ? `${oneLineCommand.slice(0, 100)}...` : oneLineCommand}`
            );
            // Ensure Sail env is present for any commands executed by the tool.
            // (bash-tool uses `bash -c` under the hood, so it won't load login shell profiles.)
            const exports: string[] = [
                "if [ -f /vercel/sandbox/sail-env.sh ]; then source /vercel/sandbox/sail-env.sh; fi",
            ];

            if (SAIL_BASE_URL) exports.push(`export SAIL_BASE_URL=${JSON.stringify(SAIL_BASE_URL)}`);
            if (SAIL_CLIENT_ID)
                exports.push(`export SAIL_CLIENT_ID=${JSON.stringify(SAIL_CLIENT_ID)}`);
            if (SAIL_CLIENT_SECRET)
                exports.push(
                    `export SAIL_CLIENT_SECRET=${JSON.stringify(SAIL_CLIENT_SECRET)}`
                );

            return { command: `${exports.join("; ")}; ${command}` };
        },
    });

    // Create agent with BOTH: skill tool + bash tools
    const agent = new ToolLoopAgent({
        // model: openai("gpt-4o-mini"), // example; use your model
        model,
        tools: {
            skill,
            ...tools, // bash tool(s)
        },
        stopWhen: stepCountIs(25),
    });

    emitStatus("Running transform agent...");
    const result =
        "messages" in params && params.messages != null && params.messages.length > 0
            ? await agent.generate({
                // Keep system policy in-band as first message for maximum compatibility.
                messages: withLeadingSystemMessage(params.messages, systemPolicy),
            } as Parameters<typeof agent.generate>[0])
            : await agent.generate({
                system: systemPolicy,
                prompt: params.prompt as string,
            } as Parameters<typeof agent.generate>[0]);

    return {
        text: result.text,
        responseMessages: result.response.messages,
        sandboxId,
    };
}
