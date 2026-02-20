import { runTransformAgent, DEFAULT_SYSTEM_POLICY } from "@/lib/skill-agent";
import type { ModelMessage } from "ai";
import { NextResponse } from "next/server";

export type ChatRequestBody = {
    sandboxId?: string;
    messages: ModelMessage[];
    system?: string;
    stream?: boolean;
    /** Current transform JSON — injected into system prompt so the agent always has context. */
    transform?: Record<string, unknown>;
};

export type ChatResponseBody = {
    text: string;
    responseMessages: Array<{ role: string; content: unknown }>;
    sandboxId: string;
};

type ChatStreamEvent =
    | { type: "status"; status: string }
    | { type: "final"; payload: ChatResponseBody }
    | { type: "error"; error: string };

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

    const { sandboxId = "", messages, system, stream = false, transform } = body;

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

    const runAgentWithRetry = async (
        onStatus?: (status: string) => void
    ): Promise<ChatResponseBody> => {
        let result;
        try {
            result = await runTransformAgent({
                sandboxId,
                messages,
                system: systemWithTransform,
                onStatus,
            });
        } catch (err) {
            if (!isSandboxStoppedError(err)) throw err;

            onStatus?.("Sandbox stopped, retrying with a fresh sandbox...");
            console.warn(
                "[POST /api/chat] Sandbox stopped during run; retrying once with a fresh sandbox.",
                { sandboxId }
            );
            result = await runTransformAgent({
                sandboxId: "",
                messages,
                system: systemWithTransform,
                onStatus,
            });
        }

        return {
            text: result.text,
            responseMessages: result.responseMessages as Array<{
                role: string;
                content: unknown;
            }>,
            sandboxId: result.sandboxId,
        };
    };

    if (!stream) {
        try {
            const response = await runAgentWithRetry();
            return NextResponse.json(response);
        } catch (err) {
            console.error("[POST /api/chat]", err);
            return NextResponse.json(
                { error: err instanceof Error ? err.message : "Agent run failed" },
                { status: 500 }
            );
        }
    }

    const encoder = new TextEncoder();
    const toNdjson = (event: ChatStreamEvent) => `${JSON.stringify(event)}\n`;

    const responseStream = new ReadableStream<Uint8Array>({
        start(controller) {
            const send = (event: ChatStreamEvent) => {
                controller.enqueue(encoder.encode(toNdjson(event)));
            };

            (async () => {
                try {
                    send({ type: "status", status: "Agent started..." });
                    const response = await runAgentWithRetry((status) => {
                        send({ type: "status", status });
                    });
                    send({ type: "final", payload: response });
                } catch (err) {
                    console.error("[POST /api/chat stream]", err);
                    send({
                        type: "error",
                        error: err instanceof Error ? err.message : "Agent run failed",
                    });
                } finally {
                    controller.close();
                }
            })();
        },
    });

    return new Response(responseStream, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
