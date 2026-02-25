"use client";

import {
  type TransformDesignerDefinition,
  definitionToTransform,
  transformToDefinition,
  TOOLBOX_STEPS,
  getStepIconUrl,
  STEP_METADATA,
  type TransformDefinition,
} from "@/lib/transform-designer";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRootEditor, useStepEditor } from "sequential-workflow-designer-react";
import type { Definition } from "sequential-workflow-model";

type Step = Definition["sequence"][number];

export type TransformVisualEditorProps = {
  transform: TransformDefinition;
  onTransformChange: (t: TransformDefinition) => void;
  className?: string;
  editingDisabled?: boolean;
};

/** Root editor: "Transform" panel with name + requires periodic refresh (matches reference) */
function TransformRootEditor() {
  const root = useRootEditor<TransformDesignerDefinition>();
  if (!root) return <div className="p-3 text-sm text-muted-foreground">Select root</div>;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-3 py-2 flex-shrink-0">
        <span className="font-medium text-sm">Transform</span>
      </div>
      <div className="space-y-4 p-3 overflow-auto flex-1">
        <div className="space-y-2">
          <Label>Transform Name</Label>
          <Input
            value={String(root.properties?.transformName ?? "")}
            onChange={(e) => root.setProperty("transformName", e.target.value)}
            placeholder="Transform name"
          />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="periodic-refresh" className="flex-1">
            Requires Periodic Refresh
          </Label>
          <Switch
            id="periodic-refresh"
            checked={Boolean(root.properties?.requiresPeriodicRefresh)}
            onCheckedChange={(v) => root.setProperty("requiresPeriodicRefresh", v)}
          />
        </div>
      </div>
    </div>
  );
}

/** Step editor form content (used inside the drawer) */
function StepEditorFormContent({ rootStepIds }: { rootStepIds: Set<string> }) {
  const stepEditor = useStepEditor<Step, TransformDesignerDefinition>();
  if (!stepEditor) return null;
  const step = stepEditor.step as Step;
  const isRootStep = rootStepIds.has(step.id);
  const meta = STEP_METADATA[step.type];
  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2">
        <Label>Step name</Label>
        <Input
          value={stepEditor.name}
          disabled={isRootStep}
          onChange={(e) => {
            stepEditor.setName(e.target.value);
            stepEditor.notifyPropertiesChanged();
            stepEditor.notifyChildrenChanged();
          }}
          placeholder="Step name"
        />
        {isRootStep && (
          <p className="text-xs text-amber-700">
            Root name is not editable in Visual editor. Please use Raw editor.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <div className="rounded border bg-muted/30 px-3 py-2 text-sm">{step.type}</div>
      </div>
      {meta && (
        <div className="rounded-md border bg-muted/20 p-3 space-y-2">
          <p className="text-sm text-foreground">{meta.description}</p>
          <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words">
            Example: {meta.example}
          </p>
        </div>
      )}
      {step.type === "static" && "value" in (step.properties ?? {}) && (
        <div className="space-y-2">
          <Label>Value</Label>
          <Input
            value={String((step.properties as Record<string, unknown>).value ?? "")}
            onChange={(e) => {
              stepEditor.setProperty("value", e.target.value);
              stepEditor.notifyPropertiesChanged();
            }}
            placeholder="Static value"
          />
        </div>
      )}
      {step.type === "accountAttribute" && (
        <>
          <div className="space-y-2">
            <Label>Attribute Name</Label>
            <Input
              value={String((step.properties as Record<string, unknown>).attributeName ?? "")}
              onChange={(e) => {
                stepEditor.setProperty("attributeName", e.target.value);
                stepEditor.notifyPropertiesChanged();
              }}
              placeholder="Attribute name"
            />
          </div>
          <div className="space-y-2">
            <Label>Source Name</Label>
            <Input
              value={String((step.properties as Record<string, unknown>).sourceName ?? "")}
              onChange={(e) => {
                stepEditor.setProperty("sourceName", e.target.value);
                stepEditor.notifyPropertiesChanged();
              }}
              placeholder="Source name"
            />
          </div>
        </>
      )}
      {step.type === "identityAttribute" && (
        <div className="space-y-2">
          <Label>Attribute Name</Label>
          <Input
            value={String((step.properties as Record<string, unknown>).name ?? "")}
            onChange={(e) => {
              stepEditor.setProperty("name", e.target.value);
              stepEditor.notifyPropertiesChanged();
              stepEditor.notifyChildrenChanged();
            }}
            placeholder="e.g. preferredName"
          />
        </div>
      )}
      {step.type === "reference" && (
        <div className="space-y-2">
          <Label>Transform ID</Label>
          <Input
            value={String((step.properties as Record<string, unknown>).id ?? "")}
            onChange={(e) => {
              stepEditor.setProperty("id", e.target.value);
              stepEditor.notifyPropertiesChanged();
            }}
            placeholder="Name of existing transform to reference"
          />
        </div>
      )}
      {step.type === "join" && (
        <div className="space-y-2">
          <Label>Separator</Label>
          <Input
            value={String((step.properties as Record<string, unknown>).separator ?? ",")}
            onChange={(e) => {
              stepEditor.setProperty("separator", e.target.value);
              stepEditor.notifyPropertiesChanged();
            }}
            placeholder=","
          />
        </div>
      )}
      {(step.type === "leftPad" || step.type === "rightPad") && (
        <>
          <div className="space-y-2">
            <Label>Length</Label>
            <Input
              value={String((step.properties as Record<string, unknown>).length ?? "8")}
              onChange={(e) => {
                stepEditor.setProperty("length", e.target.value);
                stepEditor.notifyPropertiesChanged();
              }}
              placeholder="8"
            />
          </div>
          <div className="space-y-2">
            <Label>Padding character</Label>
            <Input
              value={String((step.properties as Record<string, unknown>).padding ?? "0")}
              onChange={(e) => {
                stepEditor.setProperty("padding", e.target.value);
                stepEditor.notifyPropertiesChanged();
              }}
              placeholder="0 or space"
            />
          </div>
        </>
      )}
      {(step.type === "indexOf" || step.type === "lastIndexOf") && (
        <div className="space-y-2">
          <Label>Substring</Label>
          <Input
            value={String((step.properties as Record<string, unknown>).substring ?? "")}
            onChange={(e) => {
              stepEditor.setProperty("substring", e.target.value);
              stepEditor.notifyPropertiesChanged();
            }}
            placeholder="String to find"
          />
        </div>
      )}
      {step.type === "dateCompare" && (
        <>
          <div className="space-y-2">
            <Label>Operator (LT, LTE, GT, GTE)</Label>
            <Input
              value={String((step.properties as Record<string, unknown>).operator ?? "gte")}
              onChange={(e) => {
                stepEditor.setProperty("operator", e.target.value);
                stepEditor.notifyPropertiesChanged();
              }}
              placeholder="gte"
            />
          </div>
          <div className="space-y-2">
            <Label>If true</Label>
            <Input
              value={String((step.properties as Record<string, unknown>).positiveCondition ?? "")}
              onChange={(e) => {
                stepEditor.setProperty("positiveCondition", e.target.value);
                stepEditor.notifyPropertiesChanged();
              }}
              placeholder="active"
            />
          </div>
          <div className="space-y-2">
            <Label>If false</Label>
            <Input
              value={String((step.properties as Record<string, unknown>).negativeCondition ?? "")}
              onChange={(e) => {
                stepEditor.setProperty("negativeCondition", e.target.value);
                stepEditor.notifyPropertiesChanged();
              }}
              placeholder="inactive"
            />
          </div>
        </>
      )}
      {step.type === "e164phone" && (
        <div className="space-y-2">
          <Label>Default region (e.g. US)</Label>
          <Input
            value={String((step.properties as Record<string, unknown>).defaultRegion ?? "US")}
            onChange={(e) => {
              stepEditor.setProperty("defaultRegion", e.target.value);
              stepEditor.notifyPropertiesChanged();
            }}
            placeholder="US"
          />
        </div>
      )}
      {step.type === "randomNumeric" && (
        <div className="space-y-2">
          <Label>Length (digits)</Label>
          <Input
            value={String((step.properties as Record<string, unknown>).length ?? "10")}
            onChange={(e) => {
              stepEditor.setProperty("length", e.target.value);
              stepEditor.notifyPropertiesChanged();
            }}
            placeholder="10"
          />
        </div>
      )}
      {step.type === "randomAlphaNumeric" && (
        <div className="space-y-2">
          <Label>Length (characters)</Label>
          <Input
            value={String((step.properties as Record<string, unknown>).length ?? "32")}
            onChange={(e) => {
              stepEditor.setProperty("length", e.target.value);
              stepEditor.notifyPropertiesChanged();
            }}
            placeholder="32"
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        For full attributes (e.g. nested input), use Raw mode or edit JSON.
      </p>
    </div>
  );
}

/** Step editor: opens in a right-side drawer after explicit action */
function TransformStepEditorDrawer({
  rootStepIds,
  onStepSelectionChange,
}: {
  rootStepIds: Set<string>;
  onStepSelectionChange: (hasStep: boolean) => void;
}) {
  const stepEditor = useStepEditor<Step, TransformDesignerDefinition>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasStep = Boolean(stepEditor);
    onStepSelectionChange(hasStep);
    if (!hasStep) setOpen(false);
  }, [stepEditor?.step?.id, onStepSelectionChange]);

  useEffect(() => {
    if (stepEditor) setOpen(true);
  }, [stepEditor?.step?.id]);

  if (!stepEditor) return null;

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerContent
        className="right-0 left-auto top-0 bottom-0 h-full w-[380px] max-w-[calc(100vw-2rem)] rounded-l-xl rounded-r-none border-l border-t border-b border-r-0 mt-0 [&>div:first-child]:hidden"
      >
        <DrawerHeader className="border-b px-4 py-3 text-left">
          <DrawerTitle className="text-base">Step</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-auto">
          <StepEditorFormContent rootStepIds={rootStepIds} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Lazy-loaded designer to avoid loading heavy canvas on server
let SequentialWorkflowDesignerComponent: React.ComponentType<{
  definition: { value: TransformDesignerDefinition; isValid?: boolean };
  onDefinitionChange: (w: { value: TransformDesignerDefinition; isValid?: boolean }) => void;
  toolboxConfiguration: { groups: Array<{ name: string; steps: Array<Omit<Step, "id">> }> };
  stepsConfiguration: { iconUrlProvider?: (ct: string, t: string) => string | null };
  isReadonly?: boolean;
  rootEditor: JSX.Element;
  stepEditor: JSX.Element;
  controlBar: boolean;
  theme?: string;
}> | null = null;
let wrapDefinitionFn: ((v: TransformDesignerDefinition, isValid?: boolean) => { value: TransformDesignerDefinition; isValid?: boolean }) | null = null;

function TransformVisualEditorInner({
  transform,
  onTransformChange,
  className,
  editingDisabled = false,
}: TransformVisualEditorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const initialDef = useMemo(
    () => transformToDefinition(transform),
    [] // eslint-disable-line react-hooks/exhaustive-deps -- only on mount
  );
  const [wrappedDefinition, setWrappedDefinition] = useState<{
    value: TransformDesignerDefinition;
    isValid?: boolean;
  }>(() => (wrapDefinitionFn ? wrapDefinitionFn(initialDef, true) : { value: initialDef, isValid: true }));

  const lastPushedTransformRef = useRef<string>("");

  const handleDefinitionChange = useCallback(
    (next: { value: TransformDesignerDefinition; isValid?: boolean }) => {
      const previousRootName = wrappedDefinition.value.sequence[0]?.name;
      const nextRootName = next.value.sequence[0]?.name;
      const normalizedNext =
        nextRootName && previousRootName && nextRootName !== previousRootName
          ? {
              ...next,
              value: {
                ...next.value,
                properties: {
                  ...next.value.properties,
                  transformName: nextRootName,
                },
              },
            }
          : next;

      setWrappedDefinition(normalizedNext);
      const t = definitionToTransform(normalizedNext.value);
      lastPushedTransformRef.current = JSON.stringify(t);
      onTransformChange(t);
    },
    [onTransformChange, wrappedDefinition.value.sequence]
  );

  // When parent transform changes from outside (Raw, Chat, Apply), sync definition. Skip if the change came from us (avoid overwriting after drag-drop).
  useEffect(() => {
    const fromParent = JSON.stringify(transform);
    if (fromParent === lastPushedTransformRef.current) return;
    const def = transformToDefinition(transform);
    setWrappedDefinition(wrapDefinitionFn ? wrapDefinitionFn(def, true) : { value: def, isValid: true });
  }, [transform.type, transform.name, JSON.stringify(transform.attributes)]);

  const toolboxConfiguration = useMemo(
    () => ({
      groups: [{ name: "Transforms", steps: TOOLBOX_STEPS }],
      labelProvider: (step: Omit<Step, "id">) => step.name,
    }),
    []
  );

  const stepsConfiguration = useMemo(
    () => ({
      iconUrlProvider: getStepIconUrl,
    }),
    []
  );

  const rootStepIds = useMemo(
    () => new Set(wrappedDefinition.value.sequence.map((s) => s.id)),
    [wrappedDefinition.value.sequence]
  );
  const handleStepSelectionChange = useCallback((_hasStep: boolean) => {}, []);

  const syncToolboxScrollboxHeight = useCallback(() => {
    const root = wrapperRef.current;
    if (!root) return;
    const toolbox = root.querySelector<HTMLElement>(".sqd-toolbox");
    const scrollbox = toolbox?.querySelector<HTMLElement>(".sqd-scrollbox");
    if (!toolbox || !scrollbox) return;

    const headerHeight = toolbox.querySelector<HTMLElement>(".sqd-toolbox-header")?.offsetHeight ?? 0;
    const filterHeight = toolbox.querySelector<HTMLElement>(".sqd-toolbox-filter")?.offsetHeight ?? 0;
    const bottomPadding = 6;
    const availableHeight = toolbox.clientHeight - headerHeight - filterHeight - bottomPadding;
    if (availableHeight > 0) {
      scrollbox.style.height = `${availableHeight}px`;
      scrollbox.style.minHeight = "0px";
    }
  }, []);

  useEffect(() => {
    let frame = 0;
    let observedScrollbox: HTMLElement | null = null;
    const stopLibraryWheelHandler = (e: Event) => {
      e.stopImmediatePropagation();
    };
    const attachNativeScrollInterception = () => {
      const root = wrapperRef.current;
      const nextScrollbox = root?.querySelector<HTMLElement>(".sqd-toolbox .sqd-scrollbox") ?? null;
      if (observedScrollbox === nextScrollbox) return;
      if (observedScrollbox) {
        observedScrollbox.removeEventListener("wheel", stopLibraryWheelHandler, true);
      }
      observedScrollbox = nextScrollbox;
      if (observedScrollbox) {
        observedScrollbox.addEventListener("wheel", stopLibraryWheelHandler, true);
      }
    };
    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        syncToolboxScrollboxHeight();
        attachNativeScrollInterception();
      });
    };

    scheduleSync();
    window.addEventListener("resize", scheduleSync);

    const root = wrapperRef.current;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    if (root) {
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          scheduleSync();
        });
        resizeObserver.observe(root);
      }
      mutationObserver = new MutationObserver(() => {
        scheduleSync();
      });
      mutationObserver.observe(root, {
        subtree: true,
        childList: true,
      });
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleSync);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (observedScrollbox) {
        observedScrollbox.removeEventListener("wheel", stopLibraryWheelHandler, true);
      }
    };
  }, [syncToolboxScrollboxHeight]);

  if (!SequentialWorkflowDesignerComponent) {
    return (
      <div className={className} style={{ minHeight: 320 }}>
        <div className="flex h-full items-center justify-center rounded border bg-muted/20 text-sm text-muted-foreground">
          Loading visual editor...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`transform-visual-editor-wrapper ${editingDisabled ? "opacity-70 " : ""}${className ?? ""}`.trim()}
      style={{ height: "100%", width: "100%", minHeight: 0, minWidth: 0 }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <SequentialWorkflowDesignerComponent
          definition={wrappedDefinition}
          onDefinitionChange={handleDefinitionChange}
          toolboxConfiguration={toolboxConfiguration}
          stepsConfiguration={stepsConfiguration}
          rootEditor={<TransformRootEditor />}
          stepEditor={
            <TransformStepEditorDrawer
              rootStepIds={rootStepIds}
              onStepSelectionChange={handleStepSelectionChange}
            />
          }
          isReadonly={editingDisabled}
          controlBar={true}
          theme="light"
        />
      </div>
    </div>
  );
}

/**
 * Visual transform editor: toolbox (left), canvas (center), property panel (right).
 * Loads sequential-workflow-designer only on client to avoid SSR.
 */
export function TransformVisualEditor(props: TransformVisualEditorProps) {
  const [designerReady, setDesignerReady] = useState(false);

  useEffect(() => {
    Promise.all([
      import("sequential-workflow-designer-react"),
      // @ts-expect-error CSS import has no type declarations
      import("sequential-workflow-designer/css/designer-light.css"),
    ]).then(([mod]) => {
      SequentialWorkflowDesignerComponent = mod.SequentialWorkflowDesigner as typeof SequentialWorkflowDesignerComponent;
      wrapDefinitionFn = mod.wrapDefinition;
      setDesignerReady(true);
    });
  }, []);

  if (!designerReady) {
    return (
      <div className={props.className} style={{ minHeight: 320 }}>
        <div className="flex h-full items-center justify-center rounded border bg-muted/20 text-sm text-muted-foreground">
          Loading visual editor...
        </div>
      </div>
    );
  }

  return <TransformVisualEditorInner {...props} />;
}
