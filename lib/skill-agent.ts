// api/run-agent.ts
import { Sandbox } from "@vercel/sandbox";

// AI SDK agent imports vary by version; treat this as the pattern.
import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from "ai";
import { ToolLoopAgent, stepCountIs } from "ai";
import { createSailCLISandbox } from "@/sandbox/sandbox";
import { openai } from "@ai-sdk/openai";

export const DEFAULT_SYSTEM_POLICY = `
You are operating in a sandbox with SailPoint CLI and a Transform Skill.

Rules:
- Always produce or modify Transform JSON locally first.
- Use preview to validate when possible.
- NEVER run create/update/delete unless the user explicitly says: apply/save/deploy/delete.
- If the user asks for changes, iterate on the JSON, then preview again.
`.trim();

export type RunTransformAgentParams = {
    sandboxId: string;
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

/**
 * Run the transform agent. Single-prompt or conversation.
 * Use the same sandboxId for all turns of a conversation so tool state persists.
 */
export async function runTransformAgent(
    params: RunTransformAgentParams
): Promise<RunTransformAgentResult> {
    // `bash-tool` is ESM-only. When running this file via CJS tooling (common in Node/TS runners),
    // static imports can fail. Use a dynamic import so local scripts can run reliably.
    const { createBashTool, experimental_createSkillTool: createSkillTool } = await import(
        "bash-tool"
    );

    // Reuse existing sandbox if sandboxId is provided (or create new one and use it).
    // Use the same sandboxId for all turns of a conversation so tool state (e.g. transform JSON) persists.
    const sandbox = await createSailCLISandbox({ sandboxId: params.sandboxId });
    const sandboxId = sandbox.sandboxId;
    const existingSandbox = sandbox;

    // Load Skills from your local repo and upload to sandbox workspace
    const { skill, files, instructions } = await createSkillTool({
        skillsDirectory: "./skills",
    });

    const { SAIL_BASE_URL, SAIL_CLIENT_ID, SAIL_CLIENT_SECRET } = process.env;

    // Create bash tool(s) and upload skill files into the sandbox workspace
    const { tools } = await createBashTool({
        sandbox: existingSandbox,
        files,
        extraInstructions: instructions,
        onBeforeBashCall: ({ command }) => {
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
        model: openai("gpt-5"),
        tools: {
            skill,
            ...tools, // bash tool(s)
        },
        stopWhen: stepCountIs(25),
    });

    const systemPolicy =
        "system" in params && params.system != null
            ? params.system
            : DEFAULT_SYSTEM_POLICY;


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
