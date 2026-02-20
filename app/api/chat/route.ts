import { runTransformAgent, DEFAULT_SYSTEM_POLICY } from "@/lib/skill-agent";
import type { ModelMessage } from "ai";
import { NextResponse } from "next/server";

export type ChatRequestBody = {
    sandboxId?: string;
    messages: ModelMessage[];
    system?: string;
    /** Current transform JSON — injected into system prompt so the agent always has context. */
    transform?: Record<string, unknown>;
};

export type ChatResponseBody = {
    text: string;
    responseMessages: Array<{ role: string; content: unknown }>;
    sandboxId: string;
};

type SandboxApiErrorLike = {
    response?: { status?: number };
    json?: { error?: { code?: string } };
    message?: string;
};

function isSandboxStoppedError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const e = err as SandboxApiErrorLike;
    return (
        e.response?.status === 410 ||
        e.json?.error?.code === "sandbox_stopped" ||
        String(e.message ?? "").includes("sandbox_stopped")
    );
}

export async function POST(req: Request) {
    let body: ChatRequestBody;
    try {
        body = (await req.json()) as ChatRequestBody;
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const { sandboxId = "", messages, system, transform } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json(
            { error: "Body must include a non-empty messages array" },
            { status: 400 }
        );
    }

    const baseSystem = system ?? DEFAULT_SYSTEM_POLICY;
    const systemWithTransform =
        transform != null && typeof transform === "object"
            ? `${baseSystem}\n\nCurrent transform (JSON) — the user is editing this in the UI. Use it as context when suggesting changes:\n\`\`\`json\n${JSON.stringify(transform, null, 2)}\n\`\`\``
            : baseSystem;

    try {
        let result;
        try {
            result = await runTransformAgent({
                sandboxId,
                messages,
                system: systemWithTransform,
            });
        } catch (err) {
            if (!isSandboxStoppedError(err)) throw err;

            console.warn(
                "[POST /api/chat] Sandbox stopped during run; retrying once with a fresh sandbox.",
                { sandboxId }
            );
            result = await runTransformAgent({
                sandboxId: "",
                messages,
                system: systemWithTransform,
            });
        }

        const response: ChatResponseBody = {
            text: result.text,
            responseMessages: result.responseMessages as Array<{
                role: string;
                content: unknown;
            }>,
            sandboxId: result.sandboxId,
        };

        return NextResponse.json(response);
    } catch (err) {
        console.error("[POST /api/chat]", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Agent run failed" },
            { status: 500 }
        );
    }
}
