"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listTransforms } from "@/lib/actions/isc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Bot, Check, ChevronDown, ChevronRight, Copy, Download, Eye, EyeOff, GripHorizontal, Redo2, Save, Undo2, Upload, User } from "lucide-react";
import dynamic from "next/dynamic";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import Editor from "react-simple-code-editor";
import React, { useState, useCallback, useEffect, useRef, type ChangeEvent } from "react";
import { toast } from "sonner";

const TRANSFORM_TYPES = [
    "lower",
    "upper",
    "concat",
    "lookup",
    "replace",
    "replaceAll",
    "static",
    "identityAttribute",
    "accountAttribute",
    "trim",
    "substring",
    "split",
    "conditional",
    "dateFormat",
    "dateMath",
    "firstValid",
    "base64Encode",
    "base64Decode",
] as const;

/** SailPoint transform: name (root only), type, attributes. */
export type TransformDefinition = {
    name?: string;
    type: string;
    attributes?: Record<string, unknown>;
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type ListedTransform = TransformDefinition & { id?: string };
type TransformCandidateOption = { id: string; json: string; parsed: TransformDefinition };
type ChatStreamEvent =
    | { type: "status"; status: string }
    | {
          type: "final";
          payload: {
              text: string;
              responseMessages: Array<{ role: string; content: unknown }>;
              sandboxId: string;
          };
      }
    | { type: "error"; error: string };
const NEW_TRANSFORM_OPTION = "__new_transform__";
const MAX_TRANSFORM_HISTORY = 100;
const MIN_INPUT_HEIGHT = 56;
const MAX_INPUT_HEIGHT = 224;

type UiSkillInfo = {
    id: string;
    name: string;
    description?: string;
};

function toSafeFileBaseName(name?: string): string {
    const fallback = "transform";
    if (!name) return fallback;
    const normalized = name
        .trim()
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return normalized || fallback;
}

const TransformVisualEditor = dynamic(
    () =>
        import("@/components/component/transform-visual-editor").then(
            (mod) => mod.TransformVisualEditor
        ),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full items-center justify-center rounded border bg-muted/20 text-sm text-muted-foreground">
                Loading visual editor...
            </div>
        ),
    }
);

const DEFAULT_TRANSFORM: TransformDefinition = {
    name: "My Transform",
    type: "lower",
    attributes: {},
};

/** Extract only text from a message (ignore tool calls and other non-text parts). */
function getMessageContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .filter((part) => typeof part === "object" && part && (part as { type?: string }).type === "text")
            .map((part) => String((part as { text: string }).text ?? ""))
            .join("");
    }
    return String(content ?? "");
}

/** Extract transform JSON blocks from assistant message text. */
function extractTransformJsonCandidates(text: string): string[] {
    const trimmed = text.trim();
    const candidates: string[] = [];

    // Prefer fenced JSON blocks when present.
    const fencedBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
    let fencedMatch: RegExpExecArray | null;
    while ((fencedMatch = fencedBlockRegex.exec(trimmed)) !== null) {
        const candidate = fencedMatch[1].trim();
        if (candidate.startsWith("{") && candidate.endsWith("}")) {
            candidates.push(candidate);
        }
    }

    // Fallback: collect balanced top-level JSON objects in plain text.
    if (candidates.length === 0) {
        let depth = 0;
        let start = -1;
        let inString = false;
        let escaping = false;

        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];

            if (inString) {
                if (escaping) {
                    escaping = false;
                    continue;
                }
                if (char === "\\") {
                    escaping = true;
                    continue;
                }
                if (char === "\"") {
                    inString = false;
                }
                continue;
            }

            if (char === "\"") {
                inString = true;
                continue;
            }

            if (char === "{") {
                if (depth === 0) start = i;
                depth++;
            } else if (char === "}") {
                if (depth === 0) continue;
                depth--;
                if (depth === 0 && start >= 0) {
                    candidates.push(trimmed.slice(start, i + 1));
                    start = -1;
                }
            }
        }
    }

    return Array.from(new Set(candidates));
}

export default function TransformPage() {
    const skipNextVisualHistoryRef = useRef(true);
    const uploadFileInputRef = useRef<HTMLInputElement | null>(null);
    const [transform, setTransform] = useState<TransformDefinition>(DEFAULT_TRANSFORM);
    const [rawDraft, setRawDraft] = useState<string | null>(null);
    const [visualEditorKey, setVisualEditorKey] = useState(0);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sandboxId, setSandboxId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("Agent is thinking...");
    const [rawJsonError, setRawJsonError] = useState<string | null>(null);
    const [editingDisabled, setEditingDisabled] = useState(false);
    const [saved, setSaved] = useState(false);
    const [transformOptions, setTransformOptions] = useState<ListedTransform[]>([]);
    const [selectedTransformOption, setSelectedTransformOption] = useState(NEW_TRANSFORM_OPTION);
    const [undoHistory, setUndoHistory] = useState<TransformDefinition[]>([]);
    const [redoHistory, setRedoHistory] = useState<TransformDefinition[]>([]);
    const [skills, setSkills] = useState<UiSkillInfo[]>([]);
    const [sailCliEnabled, setSailCliEnabled] = useState<boolean | null>(null);
    const [skillsOpen, setSkillsOpen] = useState(false);
    const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
    const [transformPickerOpen, setTransformPickerOpen] = useState(false);
    const [transformCandidateOptions, setTransformCandidateOptions] = useState<TransformCandidateOption[]>([]);
    const [selectedCandidateId, setSelectedCandidateId] = useState("");

    const transformJson = rawDraft !== null ? rawDraft : JSON.stringify(transform, null, 2);
    const serializeTransform = useCallback(
        (value: TransformDefinition) => JSON.stringify(value),
        []
    );

    const applyTransformChange = useCallback(
        (next: TransformDefinition, options?: { trackHistory?: boolean; clearDraft?: boolean }) => {
            const trackHistory = options?.trackHistory ?? true;
            const clearDraft = options?.clearDraft ?? true;
            if (trackHistory && serializeTransform(next) !== serializeTransform(transform)) {
                setUndoHistory((prev) =>
                    [...prev, transform].slice(-MAX_TRANSFORM_HISTORY)
                );
                setRedoHistory([]);
            }
            setTransform(next);
            if (clearDraft) {
                setRawDraft(null);
                setRawJsonError(null);
            }
        },
        [serializeTransform, transform]
    );

    const commitRawToTransform = useCallback((jsonString: string) => {
        try {
            const parsed = JSON.parse(jsonString) as TransformDefinition;
            if (typeof parsed.type !== "string") throw new Error("Missing type");
            applyTransformChange(parsed, { trackHistory: true, clearDraft: true });
            setVisualEditorKey((k) => k + 1);
            return true;
        } catch (e) {
            const message =
                e instanceof Error && e.message
                    ? `Invalid JSON: ${e.message}`
                    : "Invalid JSON";
            setRawJsonError(message);
            return false;
        }
    }, [applyTransformChange]);

    const syncTransformFromJson = useCallback(() => {
        return commitRawToTransform(transformJson);
    }, [transformJson, commitRawToTransform]);

    const highlightJson = useCallback((code: string) => {
        return Prism.highlight(code, Prism.languages.json, "json");
    }, []);

    const getTransformForAgentContext = useCallback((): TransformDefinition => {
        if (rawDraft == null) return transform;
        try {
            const parsed = JSON.parse(rawDraft) as TransformDefinition;
            if (typeof parsed.type === "string") return parsed;
        } catch {
            // Keep using the last valid transform if raw draft is invalid JSON.
        }
        return transform;
    }, [rawDraft, transform]);

    useEffect(() => {
        let cancelled = false;
        const loadTransforms = async () => {
            try {
                const result = await listTransforms();
                if ("error" in result) {
                    throw new Error(result.error || "Failed to load transforms");
                }
                if (cancelled) return;
                const options: ListedTransform[] = [];
                for (const raw of result.transforms ?? []) {
                    const item = raw as unknown as Record<string, unknown>;
                    const name = typeof item.name === "string" ? item.name : undefined;
                    const type = typeof item.type === "string" ? item.type : undefined;
                    if (!name || !type) continue;
                    options.push({
                        id: typeof item.id === "string" ? item.id : undefined,
                        name,
                        type,
                        attributes:
                            item.attributes && typeof item.attributes === "object"
                                ? (item.attributes as Record<string, unknown>)
                                : undefined,
                    });
                }
                setTransformOptions(options);
            } catch (e) {
                if (!cancelled) {
                    toast.error(e instanceof Error ? e.message : "Failed to load transforms");
                }
            }
        };
        loadTransforms();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadSkills = async () => {
            try {
                const res = await fetch("/api/skills");
                if (!res.ok) {
                    throw new Error("Failed to load skills");
                }
                const data = (await res.json()) as { skills?: UiSkillInfo[]; sailCliEnabled?: boolean };
                if (cancelled) return;
                setSkills(Array.isArray(data.skills) ? data.skills : []);
                if (typeof data.sailCliEnabled === "boolean") {
                    setSailCliEnabled(data.sailCliEnabled);
                }
            } catch (e) {
                if (!cancelled) {
                    console.error(e);
                }
            }
        };
        loadSkills();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSaveEditor = useCallback(() => {
        if (rawDraft != null) {
            const ok = commitRawToTransform(rawDraft);
            if (!ok) return;
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [rawDraft, commitRawToTransform]);

    const handleDownloadTransform = useCallback(() => {
        let dataToDownload: TransformDefinition = transform;
        if (rawDraft != null) {
            try {
                const parsed = JSON.parse(rawDraft) as TransformDefinition;
                if (typeof parsed?.type === "string") {
                    dataToDownload = parsed;
                }
            } catch {
                toast.error("Cannot download: Raw JSON is invalid.");
                return;
            }
        }
        const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${toSafeFileBaseName(dataToDownload.name)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [rawDraft, transform]);

    const handleUploadTransformFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const content = await file.text();
            const parsed = JSON.parse(content) as TransformDefinition;
            if (!parsed || typeof parsed.type !== "string") {
                throw new Error("Uploaded file is not a valid transform JSON.");
            }
            applyTransformChange(parsed, { trackHistory: true, clearDraft: true });
            setSelectedTransformOption(NEW_TRANSFORM_OPTION);
            setVisualEditorKey((k) => k + 1);
            toast.success(`Loaded transform from ${file.name}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to load transform file");
        }
    }, [applyTransformChange]);

    const handleUndoTransform = useCallback(() => {
        if (undoHistory.length === 0) return;
        const previous = undoHistory[undoHistory.length - 1];
        setUndoHistory((prev) => prev.slice(0, -1));
        setRedoHistory((prev) => [transform, ...prev]);
        setTransform(previous);
        setRawDraft(null);
        setRawJsonError(null);
    }, [transform, undoHistory]);

    const handleRedoTransform = useCallback(() => {
        if (redoHistory.length === 0) return;
        const [next, ...remaining] = redoHistory;
        setRedoHistory(remaining);
        setUndoHistory((prev) => [...prev, transform].slice(-MAX_TRANSFORM_HISTORY));
        setTransform(next);
        setRawDraft(null);
        setRawJsonError(null);
    }, [redoHistory, transform]);

    const handleCopyTransformJson = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(transformJson);
            toast.success("Transform JSON copied.");
        } catch {
            toast.error("Failed to copy JSON.");
        }
    }, [transformJson]);

    const handleCopyChatMessage = useCallback(async (message: string) => {
        try {
            await navigator.clipboard.writeText(message);
            toast.success("Message copied.");
        } catch {
            toast.error("Failed to copy message.");
        }
    }, []);

    const applyTransformToEditor = useCallback((parsed: TransformDefinition) => {
        applyTransformChange(parsed, { trackHistory: true, clearDraft: true });
        setVisualEditorKey((k) => k + 1);
        toast.success("Applied to editor");
    }, [applyTransformChange]);

    const handleApplyAssistantMessageToEditor = useCallback((assistantContent: string) => {
        const options = extractTransformJsonCandidates(assistantContent)
            .map((json, idx): TransformCandidateOption | null => {
                try {
                    const parsed = JSON.parse(json) as TransformDefinition;
                    if (typeof parsed.type !== "string") return null;
                    return {
                        id: `${idx}`,
                        json,
                        parsed,
                    };
                } catch {
                    return null;
                }
            })
            .filter((candidate): candidate is TransformCandidateOption => candidate !== null);

        if (options.length === 0) {
            toast.error("No valid transform JSON found in assistant reply");
            return;
        }

        if (options.length === 1) {
            applyTransformToEditor(options[0].parsed);
            return;
        }

        setTransformCandidateOptions(options);
        setSelectedCandidateId(options[0].id);
        setTransformPickerOpen(true);
    }, [applyTransformToEditor]);

    const handleInputResizeStart = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const startY = event.clientY;
        const startHeight = inputHeight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const nextHeight = Math.max(
                MIN_INPUT_HEIGHT,
                Math.min(MAX_INPUT_HEIGHT, startHeight - deltaY)
            );
            setInputHeight(nextHeight);
        };

        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }, [inputHeight]);

    const handleTransformSelection = useCallback(
        (value: string) => {
            setSelectedTransformOption(value);
            skipNextVisualHistoryRef.current = true;
            if (value === NEW_TRANSFORM_OPTION) {
                applyTransformChange(DEFAULT_TRANSFORM, { trackHistory: true, clearDraft: true });
                setVisualEditorKey((k) => k + 1);
                return;
            }

            const selected = transformOptions.find((t, idx) => `${idx}` === value);
            if (!selected) return;
            applyTransformChange({
                name: selected.name,
                type: selected.type,
                attributes: selected.attributes,
            }, { trackHistory: true, clearDraft: true });
            setVisualEditorKey((k) => k + 1);
        },
        [applyTransformChange, transformOptions]
    );

    const handleSendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMessage: ChatMessage = { role: "user", content: text };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setLoadingStatus("Agent is thinking...");

        try {
            const apiMessages = [...messages, userMessage].map((m) => ({
                role: m.role as "user" | "assistant" | "system",
                content: m.content,
            }));

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sandboxId: sandboxId || undefined,
                    messages: apiMessages,
                    stream: true,
                    transform: getTransformForAgentContext(),
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || res.statusText);
            }

            if (!res.body) throw new Error("No response stream from chat endpoint");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let streamError: string | null = null;
            let data: {
                text: string;
                responseMessages: Array<{ role: string; content: unknown }>;
                sandboxId: string;
            } | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let newlineIndex = buffer.indexOf("\n");
                while (newlineIndex !== -1) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);
                    if (line.length > 0) {
                        const event = JSON.parse(line) as ChatStreamEvent;
                        if (event.type === "status") {
                            setLoadingStatus(event.status);
                        } else if (event.type === "final") {
                            data = event.payload;
                        } else if (event.type === "error") {
                            streamError = event.error;
                        }
                    }
                    newlineIndex = buffer.indexOf("\n");
                }
            }

            const tail = buffer.trim();
            if (tail.length > 0) {
                const event = JSON.parse(tail) as ChatStreamEvent;
                if (event.type === "status") {
                    setLoadingStatus(event.status);
                } else if (event.type === "final") {
                    data = event.payload;
                } else if (event.type === "error") {
                    streamError = event.error;
                }
            }

            if (streamError) throw new Error(streamError);
            if (!data) throw new Error("No final response received from agent");

            if (data.sandboxId) setSandboxId(data.sandboxId);

            const newMessages: ChatMessage[] = data.responseMessages
                .filter((m) => m.role === "assistant")
                .map((m) => ({
                    role: "assistant" as const,
                    content: getMessageContent(m.content),
                }))
                .filter((m) => m.content.length > 0);

            setMessages((prev) => [...prev, ...newMessages]);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Send failed");
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
            setLoadingStatus("Agent is thinking...");
        }
    };

    const handleVisualTransformChange = useCallback((t: TransformDefinition) => {
        const shouldTrackHistory = !skipNextVisualHistoryRef.current;
        if (skipNextVisualHistoryRef.current) {
            skipNextVisualHistoryRef.current = false;
        }
        applyTransformChange(t, { trackHistory: shouldTrackHistory, clearDraft: true });
    }, [applyTransformChange]);

    return (
        <div className="h-[calc(100vh-4rem)] bg-background p-4 overflow-hidden">
            <ResizablePanelGroup orientation="horizontal" className="h-full gap-2">
                {/* Left: Chat */}
                <ResizablePanel defaultSize={45} minSize={25} className="flex flex-col min-w-0">
                    <Card className="flex flex-col flex-1 min-h-0">
                        <CardHeader className="flex-shrink-0 space-y-2">
                            <div className="flex flex-col gap-1">
                                <CardTitle>Transform assistant</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Chat with the agent. Same sandbox and transform context.
                                </p>
                            </div>
                            <div className="rounded-md border bg-muted/30">
                                <button
                                    type="button"
                                    onClick={() => setSkillsOpen((open) => !open)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors rounded-md"
                                >
                                    {skillsOpen ? (
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span>Skills</span>
                                    {skills.length > 0 && (
                                        <span className="text-muted-foreground/70">
                                            ({skills.length} granted)
                                        </span>
                                    )}
                                    {sailCliEnabled !== null && (
                                        <span className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border bg-background">
                                            <span className="font-semibold mr-1">Sail CLI</span>
                                            <span
                                                className={
                                                    sailCliEnabled
                                                        ? "text-emerald-600"
                                                        : "text-muted-foreground"
                                                }
                                            >
                                                {sailCliEnabled ? "enabled" : "disabled"}
                                            </span>
                                        </span>
                                    )}
                                </button>
                                {skillsOpen && (
                                    <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-2 text-[10px] text-muted-foreground border-t border-border/50">
                                        {skills.length === 0 ? (
                                            <span className="italic text-muted-foreground/70">
                                                Detecting local skills...
                                            </span>
                                        ) : (
                                            skills.map((s) => {
                                                const tag = (
                                                    <span
                                                        key={s.id}
                                                        className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-[10px]"
                                                    >
                                                        <span className="font-medium text-[10px]">
                                                            {s.name}
                                                        </span>
                                                    </span>
                                                );
                                                if (s.description) {
                                                    return (
                                                        <Tooltip key={s.id}>
                                                            <TooltipTrigger asChild>
                                                                {tag}
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-xs text-xs">
                                                                {s.description}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    );
                                                }
                                                return <React.Fragment key={s.id}>{tag}</React.Fragment>;
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-1 min-h-0 gap-3 p-4 pt-0">
                            <div className="flex-1 overflow-y-auto rounded border bg-muted/30 p-3 space-y-2 min-h-[120px]">
                                {messages.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Send a message to start. You can paste your current
                                        transform and ask for changes.
                                    </p>
                                )}
                                {messages.map((m, i) => (
                                    <div
                                        key={i}
                                        className="text-left"
                                    >
                                        <div
                                            className={`group rounded-md ${m.role === "user" ? "ml-4 mr-8" : "mr-8"}`}
                                        >
                                            <div
                                                className={`flex items-center gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                            >
                                                {m.role === "assistant" && (
                                                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                                                )}
                                                {m.role === "user" && (
                                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                )}
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {m.role}
                                                </span>
                                            </div>
                                            <pre className="mt-0.5 whitespace-pre-wrap break-words rounded bg-background p-2 text-sm">
                                                {m.content}
                                            </pre>
                                            <div className="mt-1 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs"
                                                    onClick={() => handleCopyChatMessage(m.content)}
                                                >
                                                    <Copy className="h-3 w-3 mr-1" />
                                                    Copy
                                                </Button>
                                                {m.role === "assistant" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-xs"
                                                        onClick={() => handleApplyAssistantMessageToEditor(m.content)}
                                                    >
                                                        Apply to editor
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="text-left">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            assistant
                                        </span>
                                        <div className="mt-0.5 rounded bg-background p-2 text-sm text-muted-foreground flex items-center gap-2">
                                            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            {loadingStatus}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-shrink-0 gap-2">
                                <div className="relative flex-1">
                                    <button
                                        type="button"
                                        onMouseDown={handleInputResizeStart}
                                        aria-label="Resize message input"
                                        className="absolute right-2 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground/80 hover:bg-muted hover:text-foreground cursor-ns-resize"
                                    >
                                        <GripHorizontal className="h-3.5 w-3.5" />
                                    </button>
                                    <Textarea
                                        placeholder="Message..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        rows={2}
                                        style={{ height: `${inputHeight}px` }}
                                        className="min-h-[56px] max-h-56 resize-none pt-7"
                                    />
                                </div>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || !input.trim()}
                                >
                                    {isLoading ? "..." : "Send"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right: Transform editor */}
                <ResizablePanel defaultSize={55} minSize={30} className="flex flex-col min-w-0">
                    <Card className="flex flex-col flex-1 min-h-0">
                        <CardHeader className="flex-shrink-0">
                            <CardTitle>Transform editor</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Edit the same transform. Raw JSON or Visual form.
                            </p>
                        </CardHeader>
                        <CardContent className="flex flex-col flex-1 min-h-0 gap-3 p-4 pt-0">
                            <div className="flex items-center justify-between gap-4 border rounded-md bg-muted/30 px-3 py-2 flex-shrink-0 min-h-[44px]">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Select
                                        value={selectedTransformOption}
                                        onValueChange={handleTransformSelection}
                                        disabled={editingDisabled}
                                    >
                                        <SelectTrigger className="h-8 w-[320px] text-xs">
                                            <SelectValue placeholder="Select transform" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NEW_TRANSFORM_OPTION}>
                                                (New Transform)
                                            </SelectItem>
                                            {transformOptions.map((item, idx) => (
                                                <SelectItem key={`${item.id ?? item.name}-${idx}`} value={`${idx}`}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={handleUndoTransform}
                                        disabled={editingDisabled || undoHistory.length === 0}
                                    >
                                        <Undo2 className="h-3.5 w-3.5 mr-1" />
                                        Undo
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={handleRedoTransform}
                                        disabled={editingDisabled || redoHistory.length === 0}
                                    >
                                        <Redo2 className="h-3.5 w-3.5 mr-1" />
                                        Redo
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => toast.message("Preview is not implemented yet.")}
                                    >
                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                        Preview
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setEditingDisabled((d) => !d)}
                                    >
                                        {editingDisabled ? (
                                            <EyeOff className="h-3.5 w-3.5 mr-1" />
                                        ) : (
                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                        )}
                                        {editingDisabled ? "Enable" : "Disable"} Editing
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => uploadFileInputRef.current?.click()}
                                        disabled={editingDisabled}
                                    >
                                        <Upload className="h-3.5 w-3.5 mr-1" />
                                        Upload
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={handleDownloadTransform}
                                    >
                                        <Download className="h-3.5 w-3.5 mr-1" />
                                        Download
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={handleSaveEditor}
                                    >
                                        <Save className="h-3.5 w-3.5 mr-1" />
                                        Save
                                    </Button>
                                    {saved && (
                                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                            <Check className="h-4 w-4" />
                                            Saved
                                        </span>
                                    )}
                                </div>
                            </div>
                            <input
                                ref={uploadFileInputRef}
                                type="file"
                                accept=".json,.txt,application/json,text/plain"
                                className="hidden"
                                onChange={handleUploadTransformFile}
                            />
                            <Tabs defaultValue="raw" className="flex flex-col flex-1 min-h-0">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="raw">Raw</TabsTrigger>
                                    <TabsTrigger value="visual">Visual</TabsTrigger>
                                </TabsList>
                                <TabsContent value="raw" className="flex flex-col flex-1 min-h-0 mt-3 gap-3 data-[state=inactive]:hidden">
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <Label className="pb-2">Full transform (JSON)</Label>
                                        <div className="flex-1 min-h-[200px] rounded-md border bg-background overflow-auto">
                                            <Editor
                                                value={transformJson}
                                                onValueChange={(value) => {
                                                    setRawDraft(value);
                                                    if (rawJsonError) setRawJsonError(null);
                                                }}
                                                onBlur={() => syncTransformFromJson()}
                                                highlight={highlightJson}
                                                padding={12}
                                                disabled={editingDisabled}
                                                className="json-raw-editor min-h-[200px] font-mono text-sm"
                                                textareaId="transform-json-editor"
                                            />
                                        </div>
                                    </div>
                                    {rawJsonError && (
                                        <Alert variant="destructive" className="py-3">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Cannot parse JSON</AlertTitle>
                                            <AlertDescription>{rawJsonError}</AlertDescription>
                                        </Alert>
                                    )}
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={syncTransformFromJson}
                                            disabled={editingDisabled}
                                        >
                                            Parse JSON
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopyTransformJson}
                                        >
                                            <Copy className="h-3.5 w-3.5 mr-1" />
                                            Copy
                                        </Button>
                                    </div>
                                </TabsContent>
                                <TabsContent value="visual" className="flex flex-col flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
                                    <div className="flex-1 min-h-[420px] flex flex-col">
                                        <TransformVisualEditor
                                            key={visualEditorKey}
                                            transform={transform}
                                            onTransformChange={handleVisualTransformChange}
                                            editingDisabled={editingDisabled}
                                            className="flex-1 min-h-0 w-full"
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </ResizablePanel>
            </ResizablePanelGroup>
            <Dialog open={transformPickerOpen} onOpenChange={setTransformPickerOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Select transform to apply</DialogTitle>
                        <DialogDescription>
                            This assistant reply contains multiple transform JSON blocks.
                            Choose which one to apply to the editor.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[50vh] overflow-y-auto space-y-2">
                        {transformCandidateOptions.map((candidate, idx) => (
                            <button
                                key={candidate.id}
                                type="button"
                                onClick={() => setSelectedCandidateId(candidate.id)}
                                className={`w-full rounded-md border p-3 text-left transition-colors ${selectedCandidateId === candidate.id ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
                            >
                                <div className="text-xs font-medium text-muted-foreground">
                                    Option {idx + 1}
                                </div>
                                <div className="mt-0.5 text-sm">
                                    <span className="font-medium">name:</span>{" "}
                                    {candidate.parsed.name || "(unnamed)"}{" "}
                                    <span className="mx-2 text-muted-foreground">|</span>
                                    <span className="font-medium">type:</span> {candidate.parsed.type}
                                </div>
                                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/30 p-2 text-xs">
                                    {candidate.json}
                                </pre>
                            </button>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setTransformPickerOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                const selected = transformCandidateOptions.find(
                                    (candidate) => candidate.id === selectedCandidateId
                                );
                                if (!selected) {
                                    toast.error("Please select a transform");
                                    return;
                                }
                                applyTransformToEditor(selected.parsed);
                                setTransformPickerOpen(false);
                            }}
                        >
                            Apply selected
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
