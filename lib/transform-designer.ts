/**
 * Conversion between SailPoint transform JSON and sequential-workflow-designer Definition.
 * Designer uses: Definition { properties, sequence: Step[] }; Step has id, componentType, type, name, properties, optional branches.
 */

import type { Definition, Step, Sequence, Branches, Properties } from "sequential-workflow-model";

export type TransformDefinition = {
  name?: string;
  type: string;
  attributes?: Record<string, unknown>;
};

const STEP_COMPONENT_SWITCH = "switch";
const STEP_COMPONENT_TASK = "task";
const BRANCH_KINDS_KEY = "__designerBranchKinds";

type BranchKinds = Record<string, "single" | "array">;

function isTransformLike(value: unknown): value is TransformDefinition {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

function nextId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** SailPoint transform (with optional nested input) -> designer Step */
export function transformToStep(data: TransformDefinition): Step {
  const attrs = data.attributes ?? {};
  const properties: Record<string, unknown> = { ...attrs };
  const branches: Branches = {};
  const branchKinds: BranchKinds = {};

  // Extract nested transform attributes into workflow branches.
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "requiresPeriodicRefresh") {
      delete properties[key];
      continue;
    }

    if (isTransformLike(value)) {
      branches[key] = [transformToStep(value)];
      branchKinds[key] = "single";
      delete properties[key];
      continue;
    }

    if (Array.isArray(value) && value.length > 0 && value.every(isTransformLike)) {
      branches[key] = value.map((item) => transformToStep(item));
      branchKinds[key] = "array";
      delete properties[key];
    }
  }

  const hasBranches = Object.keys(branches).length > 0;
  if (Object.keys(branchKinds).length > 0) {
    properties[BRANCH_KINDS_KEY] = branchKinds;
  }

  const step: Step = {
    id: nextId(),
    componentType: hasBranches ? STEP_COMPONENT_SWITCH : STEP_COMPONENT_TASK,
    type: data.type,
    name: (data.name as string) || data.type,
    properties: properties as Properties,
  };

  if (hasBranches) {
    (step as Step & { branches: Branches }).branches = branches;
  }

  return step;
}

/** Designer Step -> SailPoint transform */
export function stepToTransform(step: Step): TransformDefinition {
  const attrs: Record<string, unknown> = { ...step.properties };
  const branchKinds = (attrs[BRANCH_KINDS_KEY] as BranchKinds | undefined) ?? {};
  delete attrs[BRANCH_KINDS_KEY];

  const branched = step as Step & { branches?: Branches };
  if (branched.branches) {
    for (const [branchName, sequence] of Object.entries(branched.branches)) {
      if (!sequence?.length) continue;
      const kind =
        branchKinds[branchName] ??
        (branchName === "input" ? "single" : sequence.length > 1 ? "array" : "single");
      if (kind === "array") {
        attrs[branchName] = sequence.map((s) => stepToTransform(s));
      } else {
        attrs[branchName] = stepToTransform(sequence[0]);
      }
    }
  }

  return {
    name: step.name,
    type: step.type,
    attributes: Object.keys(attrs).length ? attrs : undefined,
  };
}

export interface TransformDesignerDefinition extends Definition {
  properties: {
    transformName: string;
    requiresPeriodicRefresh?: boolean;
  };
}

/** SailPoint transform (root) -> designer Definition */
export function transformToDefinition(
  t: TransformDefinition
): TransformDesignerDefinition {
  const rootStep = transformToStep(t);
  return {
    sequence: [rootStep],
    properties: {
      transformName: t.name ?? "My Transform",
      requiresPeriodicRefresh:
        (t.attributes?.requiresPeriodicRefresh as boolean) ?? false,
    },
  };
}

/** Designer Definition -> SailPoint transform */
export function definitionToTransform(
  d: TransformDesignerDefinition
): TransformDefinition {
  const seq: Sequence = d.sequence;
  if (!seq?.length) {
    return { name: d.properties?.transformName, type: "static", attributes: { value: "" } };
  }

  // Compose the whole workflow sequence into a single transform expression.
  // For linear steps [A, B, C], model as C(input=B(input=A)).
  // This avoids losing steps when the designer emits multiple root sequence items.
  const toTransform = (step: Step): TransformDefinition => stepToTransform(step);
  let out = toTransform(seq[0]);
  for (let i = 1; i < seq.length; i++) {
    const current = toTransform(seq[i]);
    current.attributes = current.attributes ?? {};
    if (
      !("input" in current.attributes) ||
      current.attributes.input == null
    ) {
      current.attributes.input = out;
    }
    out = current;
  }

  const root = seq[seq.length - 1];
  out.name = (d.properties?.transformName as string) ?? root.name;
  const refresh = d.properties?.requiresPeriodicRefresh;
  if (refresh !== undefined) {
    out.attributes = out.attributes ?? {};
    (out.attributes as Record<string, unknown>).requiresPeriodicRefresh = refresh;
  }
  return out;
}

/** Toolbox step definitions (no id) for drag-and-drop. Steps with input use branches. */
export type ToolboxStepDef = Omit<Step, "id"> & { branches?: Branches };
export const TOOLBOX_STEPS: ToolboxStepDef[] = [
  {
    componentType: STEP_COMPONENT_TASK,
    type: "accountAttribute",
    name: "Account Attribute",
    properties: { attributeName: "", sourceName: "" },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "base64Encode",
    name: "Base64 Encode",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "base64Decode",
    name: "Base64 Decode",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "concat",
    name: "Concatenate",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "join",
    name: "Join",
    properties: { separator: "," },
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "conditional",
    name: "Conditional",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "dateFormat",
    name: "Date Format",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "dateMath",
    name: "Date Math",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "dateCompare",
    name: "Date Compare",
    properties: { operator: "gte", positiveCondition: "active", negativeCondition: "inactive" },
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "firstValid",
    name: "First Valid",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "lookup",
    name: "Lookup",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "lower",
    name: "Lower",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "upper",
    name: "Upper",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "replace",
    name: "Replace",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "replaceAll",
    name: "Replace All",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "static",
    name: "Static",
    properties: { value: "" },
    branches: {},
  },
  {
    componentType: STEP_COMPONENT_TASK,
    type: "identityAttribute",
    name: "Identity Attribute",
    properties: {},
  },
  {
    componentType: STEP_COMPONENT_TASK,
    type: "reference",
    name: "Reference",
    properties: { id: "" },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "trim",
    name: "Trim",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "substring",
    name: "Substring",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "split",
    name: "Split",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "indexOf",
    name: "Index Of",
    properties: { substring: "" },
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "lastIndexOf",
    name: "Last Index Of",
    properties: { substring: "" },
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "leftPad",
    name: "Left Pad",
    properties: { length: "8", padding: "0" },
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "rightPad",
    name: "Right Pad",
    properties: { length: "8", padding: "0" },
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "normalizeNames",
    name: "Name Normalizer",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "displayName",
    name: "Display Name",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "decomposeDiacriticalMarks",
    name: "Decompose Diacritical Marks",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "rfc5646",
    name: "RFC5646 (Language Tag)",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "iso3166",
    name: "ISO3166 (Country Code)",
    properties: {},
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_SWITCH,
    type: "e164phone",
    name: "E.164 Phone",
    properties: { defaultRegion: "US" },
    branches: { input: [] },
  },
  {
    componentType: STEP_COMPONENT_TASK,
    type: "randomNumeric",
    name: "Random Numeric",
    properties: { length: "10" },
  },
  {
    componentType: STEP_COMPONENT_TASK,
    type: "randomAlphaNumeric",
    name: "Random Alphanumeric",
    properties: { length: "32" },
  },
  {
    componentType: STEP_COMPONENT_TASK,
    type: "uuid",
    name: "UUID Generator",
    properties: {},
  },
];

/** Description and short example for each transform type (for drawer help). */
export const STEP_METADATA: Record<
  string,
  { description: string; example: string }
> = {
  accountAttribute: {
    description: "Look up an account for a source on an identity and return a specific attribute value (e.g. DEPARTMENT from Workday).",
    example: '{"sourceName": "Workday", "attributeName": "DEPARTMENT"}',
  },
  base64Encode: {
    description: "Encode the input string as Base64.",
    example: "Input: \"Hello\" → Output: \"SGVsbG8=\"",
  },
  base64Decode: {
    description: "Decode a Base64 string to plain text.",
    example: "Input: \"SGVsbG8=\" → Output: \"Hello\"",
  },
  concat: {
    description: "Join two or more values in order (e.g. first + \" \" + last name).",
    example: '{"values": ["John", " ", "Smith"]} → "John Smith"',
  },
  join: {
    description: "Join values with a separator (e.g. pipe or comma).",
    example: '{"values": ["a","b"], "separator": "|"} → "a|b"',
  },
  conditional: {
    description: "Return one value if condition is true, another if false.",
    example: "Configure condition and positive/negative return values.",
  },
  dateFormat: {
    description: "Format a date string (e.g. to ISO or display format).",
    example: "Input date → formatted string per pattern.",
  },
  dateMath: {
    description: "Add or subtract time from a date.",
    example: "Date + 30 days, or now - 1 year.",
  },
  dateCompare: {
    description: "Compare two dates; return one value if true, another if false (e.g. active vs terminated).",
    example: '{"operator": "gte", "positiveCondition": "active", "negativeCondition": "terminated"}',
  },
  firstValid: {
    description: "Return the first non-null value from a list of inputs.",
    example: "Try identity attr, then account attr, then static fallback.",
  },
  lookup: {
    description: "Map input to an output value via a lookup table.",
    example: "Map status codes to display labels.",
  },
  lower: {
    description: "Convert the input string to lowercase.",
    example: '"Hello" → "hello"',
  },
  upper: {
    description: "Convert the input string to uppercase.",
    example: '"hello" → "HELLO"',
  },
  replace: {
    description: "Replace the first occurrence of a substring with another.",
    example: 'Replace first "x" with "y".',
  },
  replaceAll: {
    description: "Replace all occurrences of a substring with another.",
    example: 'Replace every " " with "_".',
  },
  static: {
    description: "Return a fixed string or evaluate Velocity (VTL) with variables.",
    example: '{"value": "Employee"} or {"value": "$first $last"}',
  },
  identityAttribute: {
    description: "Return an identity attribute (e.g. firstname, email) for the current identity.",
    example: "Use in attributes or as input to other transforms.",
  },
  reference: {
    description: "Reuse an existing transform by id. One place to maintain logic.",
    example: '{"id": "Build Display Name"}',
  },
  trim: {
    description: "Remove leading and trailing whitespace from the input.",
    example: '"  hello  " → "hello"',
  },
  substring: {
    description: "Extract a portion of the input string by start/end index.",
    example: '{"begin": 0, "end": 5} on "Hello World" → "Hello"',
  },
  split: {
    description: "Split the input string by a delimiter into parts (or use with index).",
    example: '"a,b,c" split by "," → ["a","b","c"]',
  },
  indexOf: {
    description: "Return the position of the first occurrence of a substring (-1 if not found).",
    example: '{"substring": "admin_"} on "admin_jsmith" → 0',
  },
  lastIndexOf: {
    description: "Return the position of the last occurrence of a substring (-1 if not found).",
    example: "Use with Substring for dynamic-length extraction.",
  },
  leftPad: {
    description: "Pad the input on the left to reach a length (e.g. zeros for IDs).",
    example: '{"length": "8", "padding": "0"} → "00123456"',
  },
  rightPad: {
    description: "Pad the input on the right to reach a length.",
    example: '{"length": "10", "padding": " "}',
  },
  normalizeNames: {
    description: "Standardize name casing (e.g. John von Smith, McArthur).",
    example: '"jOHN VON SmITh" → "John von Smith"',
  },
  displayName: {
    description: "Build display name: (Preferred Name or Given Name) + \" \" + Family Name.",
    example: "Preferred: John, Family: Doe → \"John Doe\"",
  },
  decomposeDiacriticalMarks: {
    description: "Convert accented characters to ASCII (Ā→A, ñ→n).",
    example: '"Āric" → "Aric"',
  },
  rfc5646: {
    description: "Convert language code or name to RFC 5646 tag (e.g. SPA → es).",
    example: '"Spanish" → "es"',
  },
  iso3166: {
    description: "Convert country code or name to ISO 3166 (e.g. Spain → ES).",
    example: '"Spain" or "ESP" → "ES"',
  },
  e164phone: {
    description: "Format a phone number to E.164 (e.g. +1...).",
    example: '{"defaultRegion": "US"} for US numbers.',
  },
  randomNumeric: {
    description: "Generate a random string of digits (e.g. for OTP or ID).",
    example: '{"length": "10"} → e.g. "2334776774"',
  },
  randomAlphaNumeric: {
    description: "Generate a random alphanumeric string (letters and numbers).",
    example: '{"length": "32"} → e.g. "VtPeE9WL56lMTlvfjr02KXqS3KtgDSuk"',
  },
  uuid: {
    description: "Generate a UUID (36-character unique id).",
    example: 'e.g. "f7493c55-f3fc-491a-b352-4664d71f885b"',
  },
};

/** Simple icon as data URL for step types */
export function getStepIconUrl(_componentType: string, type: string): string | null {
  const icons: Record<string, string> = {
    accountAttribute: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E",
    static: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z'/%3E%3C/svg%3E",
    lower: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z'/%3E%3C/svg%3E",
    upper: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M8 11l4 4 4-4H8zm8-8l-8 8 2.83 2.83L16 5.66V20H4V4h2v10h2V4h8V2z'/%3E%3C/svg%3E",
    concat: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/%3E%3C/svg%3E",
    join: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/%3E%3C/svg%3E",
    conditional: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z'/%3E%3C/svg%3E",
    lookup: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E",
    dateFormat: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z'/%3E%3C/svg%3E",
    dateMath: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z'/%3E%3C/svg%3E",
    dateCompare: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z'/%3E%3C/svg%3E",
    firstValid: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M3 5v14h18V5H3zm16 6h-3v4h-4v-4H8v4H5V7h14v4z'/%3E%3C/svg%3E",
    base64Encode: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'/%3E%3C/svg%3E",
    base64Decode: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2h1c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z'/%3E%3C/svg%3E",
    replace: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79 2.73 2.7 7.15 2.69 9.88-.1L20 14.12V10.12zM12.5 8c4.65 0 8.58 3.03 9.97 7.2L21 16.12V4h-8l1.92 2c-2.31-2.08-5.3-3.35-8.42-3.35zM2.5 16c-.31-.49-.6-.99-.86-1.5.26-.51.55-1.01.86-1.5 2.73 2.7 7.15 2.69 9.88-.1l1.92 2c-2.31-2.08-5.3-3.35-8.42-3.35-4.65 0-8.58 3.03-9.97 7.2L2.5 16z'/%3E%3C/svg%3E",
    replaceAll: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79 2.73 2.7 7.15 2.69 9.88-.1L20 14.12V10.12z'/%3E%3C/svg%3E",
    identityAttribute: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E",
    reference: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M10 18H6V6h4V4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2zm6 0v2h4c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-4v2h4v12z'/%3E%3C/svg%3E",
    trim: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2z'/%3E%3C/svg%3E",
    substring: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M4 18h16v-2H4v2zm0-5h16v-2H4v2zm0-7v2h16V6H4z'/%3E%3C/svg%3E",
    split: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M14 4l2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4h-6zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.59l-4.71-4.7L10 4z'/%3E%3C/svg%3E",
    indexOf: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E",
    lastIndexOf: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E",
    leftPad: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2z'/%3E%3C/svg%3E",
    rightPad: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2z'/%3E%3C/svg%3E",
    normalizeNames: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E",
    displayName: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E",
    decomposeDiacriticalMarks: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z'/%3E%3C/svg%3E",
    rfc5646: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z'/%3E%3C/svg%3E",
    iso3166: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
    e164phone: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z'/%3E%3C/svg%3E",
    randomNumeric: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z'/%3E%3C/svg%3E",
    randomAlphaNumeric: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z'/%3E%3C/svg%3E",
    uuid: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 0 24 24' width='24'%3E%3Cpath fill='%23666' d='M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z'/%3E%3C/svg%3E",
  };
  return icons[type] ?? null;
}
