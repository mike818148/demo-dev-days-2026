---
name: transform-design
description: Guidelines for designing and writing Identity Security Cloud (ISC) Transforms. Use when creating, editing, or reviewing transform JSON; for create/modify/delete/test operations use the sail-cli skill.
---

# Transform Design Skill

This skill provides guidelines for **designing and writing** Identity Security Cloud Transforms. It is the starting point for defining transform logic and structure. For **creating, modifying, deleting, and testing** transforms in a tenant, use the **sail-cli** skill (`sail transform ...`).

Reference: [SailPoint Transforms Documentation](https://developer.sailpoint.com/docs/extensibility/transforms)

---

## What are Transforms

Transforms are configurable objects that manipulate attribute values during aggregation from or provisioning to a source. They are **JSON-based** building blocks with inputs and outputs—no code is required. Administrators configure them via JSON and upload them using the Identity Security Cloud Transform REST APIs (or the sail-cli).

- **Identity attribute transforms**: Used in identity profile mappings to compute identity attributes from source data.
- **Account transforms**: Used in account create profiles to define templates for new accounts during provisioning.

---

## Transform syntax (JSON structure)

A transform is a JSON object with three main components:

| Component    | Required  | Description                                                              |
| ------------ | --------- | ------------------------------------------------------------------------ |
| `name`       | Root only | Name of the transform (for API/UI). Omit on nested transforms.           |
| `type`       | Yes       | Transform type; determines behavior (e.g. `lower`, `concat`, `replace`). |
| `attributes` | Optional  | Configuration for the transform (inputs, options). Varies by type.       |

**Minimal example:**

```json
{
  "name": "Lowercase Department",
  "type": "lower",
  "attributes": {}
}
```

**With attributes:**

```json
{
  "name": "Lowercase Department",
  "type": "lower",
  "attributes": {
    "transform-attribute-1": "attribute-1-value"
  }
}
```

**Size limit:** A transform uploaded to Identity Security Cloud cannot exceed **400KB**.

---

## Input: Implicit vs explicit

- **Implicit input**: Do **not** specify an `input` in `attributes`. The system provides the input based on the identity profile mapping (or account profile). Use when the transform should operate on the value mapped in the UI/API.
- **Explicit input**: Specify an `input` in `attributes`. The system ignores its default input and uses the value(s) you define. Use when you need a specific source, attribute, or nested transform output.

**Explicit input example (nested):** Using another transform or account attribute as input:

```json
{
  "name": "Lowercase Department",
  "type": "lower",
  "attributes": {
    "input": {
      "type": "accountAttribute",
      "attributes": {
        "attributeName": "department",
        "sourceName": "Source 2"
      }
    }
  }
}
```

---

## Nested transforms

Transforms can be chained: the output of one transform becomes the input of another. Build from small blocks and add steps as needed.

**Example:** Concat two strings, then lowercase:

- Inputs: `Foo`, `Bar`
- Concat → `FooBar`
- Lower → `foobar`

There is no hard limit on nesting depth, but deep nesting can be hard to understand and maintain.

---

## Template engine (Velocity)

Every string value in a transform can use the **Apache Velocity** template engine. Use `$variableName` to reference values from the context.

**Example:** If `$firstName=John` and `$lastName=Doe`, the string `$firstName.$lastName` renders as `John.Doe`.

### Identity attribute context

When the transform is used to **source an identity attribute**, these variables are available:

| Variable              | Type                             | Description                                           |
| --------------------- | -------------------------------- | ----------------------------------------------------- |
| `identity`            | sailpoint.object.Identity        | The identity the attribute promotion is performed on. |
| `attributeDefinition` | sailpoint.object.ObjectAttribute | Definition of the attribute being promoted.           |
| `oldValue`            | Object                           | The attribute's previous value.                       |

### Account profile context

When the transform is used in an **account profile**, these variables are available:

| Variable      | Type                         | Description                                                   |
| ------------- | ---------------------------- | ------------------------------------------------------------- |
| `field`       | sailpoint.object.Field       | Field definition backing the account profile attribute.       |
| `identity`    | sailpoint.object.Identity    | Identity the account profile is generating for.               |
| `application` | sailpoint.object.Application | Application backing the source that owns the account profile. |
| `current`     | Object                       | The attribute's current value.                                |

---

## Transform designer: from request to transform

Use this workflow to break down a requirement into small **sources** and **logic** steps, then construct the transform JSON.

### 1. Clarify the requirement

- **Inputs**: Where do values come from? (e.g. identity attribute, account attribute from Source X, static text.)
- **Output**: What exact string or value do you need? (e.g. lowercase department, `firstName.lastName`, "Title - Code".)
- **Context**: Identity attribute (profile mapping) or account attribute (create profile)?

### 2. Break into small steps (sources and logic)

List steps in order of data flow:

| Step   | Kind                   | Description                                                                  |
| ------ | ---------------------- | ---------------------------------------------------------------------------- |
| Source | Where is the value?    | e.g. "Department from Source 2", "First name from HR Source", literal `" "`. |
| Logic  | What do we do with it? | e.g. "Lowercase", "Join with space", "Replace X with Y".                     |

**Example — "Display name: first + space + last, then lowercase":**

1. **Source**: First name (account attribute, HR Source).
2. **Source**: Static space `" "`.
3. **Source**: Last name (account attribute, HR Source).
4. **Logic**: Concatenate (1)(2)(3) → one string.
5. **Logic**: Lowercase that string → final output.

### 3. Map steps to transform types

- Each **source** becomes an input: `identityAttribute`, `accountAttribute`, `static`, or the output of another transform.
- Each **logic** step becomes a transform type: e.g. `concat` to join, `lower` to lowercase, `replace` to substitute.

For **detailed use cases, attributes, and examples** per operation, use the **operations** docs:

- **[Lower](operations/lower.md)** — convert a string to lowercase.
- **[Concatenation](operations/concatenation.md)** — join two or more values in order.

Other transform types (replace, conditional, date format, etc.) follow the same pattern; see SailPoint docs or add more `operations/*.md` as needed.

### 4. Construct the transform (inside-out or outside-in)

- **Inside-out**: Build **inputs** first (sources and any nested transforms), then wrap them in the **outer** logic transform.
- **Outside-in**: Start from the **final** operation (e.g. `lower`), then fill in its `input` or `values` with nested transforms/sources.

**Example (inside-out):**  
Final output = lowercase( concat( firstName, " ", lastName ) ).

1. **Inner**: Concat transform with `values`: [ accountAttribute(FirstName), `" "`, accountAttribute(LastName) ].
2. **Outer**: Lower transform with `input` = that concat transform.

Resulting structure: one root transform (e.g. `lower`) whose `attributes.input` is a nested `concat` with `values` array containing two `accountAttribute` objects and one static `" "`.

### 5. Write the JSON

- Root object: `name`, `type`, and `attributes` (and `requiresPeriodicRefresh` if needed).
- Nested transforms: no `name`; only `type` and `attributes`.
- Validate JSON and keep size under 400KB.

After drafting, use the **sail-cli** skill to preview and then create/update the transform in the tenant.

---

## Design guidelines

1. **Start with small building blocks**: Compose from simple transforms (e.g. `lower`, `concat`) before adding more steps.
2. **Diagram when complex**: For many chained transforms, sketch inputs and outputs to keep logic clear.
3. **Prefer transforms over rules**: Use transforms when possible; they are JSON-only and can be managed by admins via REST API. Use rules only when transforms cannot express the logic.
4. **Encapsulate repetition**: If the same transform logic is reused, define a standalone transform and reference it (e.g. via `type: "reference"`) instead of copying JSON.
5. **Plan for bad data**: Handle missing, malformed, or incorrect values so the transform still produces workable results.
6. **Use a JSON editor**: Validate and format transform JSON (e.g. VS Code, with JSON validation/formatting) before uploading.

---

## Transforms vs. Rules

| Aspect         | Transforms                                  | Rules                                |
| -------------- | ------------------------------------------- | ------------------------------------ |
| Format         | JSON                                        | Code (e.g. BeanShell)                |
| Editing        | REST API / UI; no SailPoint review          | Require SailPoint review and install |
| Use when       | Logic can be expressed with transform types | Logic cannot be done with transforms |
| Identity attr. | Identity transforms                         | Identity Attribute rules             |
| Account attr.  | Account transforms                          | Attribute Generator rules            |

When moving from a transform to a rule, choose the correct execution context (identity vs. account) and follow Identity Security Cloud Rule Guidelines.

---

## Reference: Detailed transform operations

For **per-operation** syntax, attributes, and examples, use the markdown files in the **operations** folder:

| Operation                        | File                                                                                             | Description                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Account Attribute                | [operations/account-attribute.md](operations/account-attribute.md)                               | Look up an account attribute from a source on an identity.               |
| Base64 Decode                    | [operations/base64-decode.md](operations/base64-decode.md)                                       | Decode Base64-encoded data to original binary format.                    |
| Base64 Encode                    | [operations/base64-encode.md](operations/base64-encode.md)                                       | Encode data to Base64 string.                                            |
| Conditional                      | [operations/conditional.md](operations/conditional.md)                                           | Output different values based on eq comparison.                          |
| Concatenation                    | [operations/concatenation.md](operations/concatenation.md)                                       | Join two or more values into one string.                                 |
| Date Compare                     | [operations/date-compare.md](operations/date-compare.md)                                         | Compare two dates and return one of two values.                          |
| Date Format                      | [operations/date-format.md](operations/date-format.md)                                           | Convert datetime strings between formats.                                |
| Date Math                        | [operations/date-math.md](operations/date-math.md)                                               | Add, subtract, or round date/time components.                            |
| Decompose Diacritical Marks      | [operations/decompose-diacritical-marks.md](operations/decompose-diacritical-marks.md)           | Remove diacritical marks for ASCII compatibility.                        |
| Display Name                     | [operations/display-name.md](operations/display-name.md)                                         | Form display name from Preferred/Given Name + Family Name.               |
| E.164 Phone                      | [operations/e164-phone.md](operations/e164-phone.md)                                             | Convert phone number to E.164 format.                                    |
| First Valid                      | [operations/first-valid.md](operations/first-valid.md)                                           | Return first non-null value from an array of options.                    |
| Generate Random String           | [operations/generate-random-string.md](operations/generate-random-string.md)                     | Generate random string (rule-based, supports special chars).             |
| Get End of String                | [operations/get-end-of-string.md](operations/get-end-of-string.md)                               | Get rightmost N characters (rule-based).                                 |
| Get Reference Identity Attribute | [operations/get-reference-identity-attribute.md](operations/get-reference-identity-attribute.md) | Get another identity's attribute (e.g. manager's email).                 |
| Identity Attribute               | [operations/identity-attribute.md](operations/identity-attribute.md)                             | Get the value of a user's identity attribute (e.g. in account profiles). |
| Index Of                         | [operations/index-of.md](operations/index-of.md)                                                 | Get position of substring within input.                                  |
| ISO3166                          | [operations/iso3166.md](operations/iso3166.md)                                                   | Convert country name/code to ISO 3166 format.                            |
| Join                             | [operations/join.md](operations/join.md)                                                         | Join values with a separator.                                            |
| Last Index Of                    | [operations/last-index-of.md](operations/last-index-of.md)                                       | Get position of last occurrence of substring.                            |
| Left Pad                         | [operations/left-pad.md](operations/left-pad.md)                                                 | Pad string to length with character on the left.                         |
| Lookup                           | [operations/lookup.md](operations/lookup.md)                                                     | Map input to output via key-value table.                                 |
| Lower                            | [operations/lower.md](operations/lower.md)                                                       | Convert input string to lowercase.                                       |
| Name Normalizer                  | [operations/name-normalizer.md](operations/name-normalizer.md)                                   | Normalize names (proper casing, Mc/Mac, von/del, etc.).                  |
| Random Alphanumeric              | [operations/random-alphanumeric.md](operations/random-alphanumeric.md)                           | Generate random letters and numbers.                                     |
| Random Numeric                   | [operations/random-numeric.md](operations/random-numeric.md)                                     | Generate random digits only.                                             |
| Reference                        | [operations/reference.md](operations/reference.md)                                               | Reuse an existing transform by ID.                                       |
| Replace                          | [operations/replace.md](operations/replace.md)                                                   | Replace pattern with string (regex).                                     |
| Replace All                      | [operations/replace-all.md](operations/replace-all.md)                                           | Multiple pattern→replacement pairs (regex).                              |
| RFC5646                          | [operations/rfc5646.md](operations/rfc5646.md)                                                   | Convert language name/code to RFC 5646 tag.                              |
| Right Pad                        | [operations/right-pad.md](operations/right-pad.md)                                               | Pad string to length with character on the right.                        |
| Split                            | [operations/split.md](operations/split.md)                                                       | Split by delimiter and return Nth element.                               |
| Static                           | [operations/static.md](operations/static.md)                                                     | Fixed string or Velocity template.                                       |
| Substring                        | [operations/substring.md](operations/substring.md)                                               | Extract portion of string by index.                                      |
| Trim                             | [operations/trim.md](operations/trim.md)                                                         | Remove leading/trailing whitespace.                                      |
| Upper                            | [operations/upper.md](operations/upper.md)                                                       | Convert input string to uppercase.                                       |
| Username Generator               | [operations/username-generator.md](operations/username-generator.md)                             | Generate unique username with retry logic.                               |
| UUID Generator                   | [operations/uuid-generator.md](operations/uuid-generator.md)                                     | Generate UUID string.                                                    |

---

## Create, modify, delete, get, list and test transforms

For tenant operations (for example: `sail transform create`, `sail transform update`, `sail transform delete`, `sail transform get`, `sail transform list`, `sail transform preview`), follow mode-specific behavior:

- If `ENABLE_SAIL_CLI=true`: use the **sail-cli** skill at `skills/sail-cli-transform/SKILL.md`.
- If `ENABLE_SAIL_CLI=false`: do not run tenant commands. Limit work to drafting, revising, and validating Transform JSON content only.

The `sail-cli` skill defines the safe workflow (draft -> preview -> explicit approval -> apply), directory conventions, and exact CLI commands. This transform design skill focuses on how to write and structure Transform JSON.
