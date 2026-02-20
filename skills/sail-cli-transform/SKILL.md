---
name: sailpoint-cli-transforms
description: Use the SailPoint CLI (`sail`) to list, download, preview, create, update, and delete Identity Security Cloud (ISC) Transforms.
---

# SailPoint CLI (Transforms) Skill

This skill helps you work with ISC **Transforms** using the SailPoint CLI command group: `sail transform ...`. :contentReference[oaicite:0]{index=0}

## Safety rules (must follow)

1. **Draft-first**: Always produce or edit a Transform JSON file locally (in the sandbox workspace) before changing anything in ISC.
2. **Preview before apply**: Use `sail transform preview` to validate the Transform behavior whenever possible. Note: preview temporarily creates & deletes a transform in the tenant. :contentReference[oaicite:1]{index=1}
3. **No destructive actions without explicit approval**:
   - Never run `sail transform create`, `sail transform update`, or `sail transform delete` unless the user explicitly says **“apply / save / deploy / delete”**.
4. **Prefer diff-based updates**: When updating an existing transform, download first, change the file, then update.

## Prerequisites

- The `sail` CLI is installed and available on PATH.
- Authentication is configured either via:
  - Environment variables (recommended for automation). :contentReference[oaicite:2]{index=2}

---

## Directory conventions

- Downloaded or edited transforms should live in a dedicated directory, e.g.:
  - `transform_files/`
  - `drafts/`
- Draft files must be reviewed before apply.

---

## Transform command cheat sheet (reference only)

This section documents **canonical CLI usage**.
Commands are grouped by **risk level**.

### Safe commands (read-only)

List all transforms:

```bash
sail transform list
```

Download all transforms to local files:

```bash
sail transform download -d transform_files
```

These commands are always allowed.

---

### Preview commands (temporary side effects)

Preview a transform using a JSON file:

```bash
sail transform preview \
  --profile <identity-profile-id> \
  --identity <identity-id> \
  --file transform_files/<file>.json
```

Return only the result value (recommended for automation):

```bash
sail transform preview \
  --profile <identity-profile-id> \
  --identity <identity-id> \
  --file transform_files/<file>.json \
  --result-only
```

Notes:

- Preview temporarily creates and deletes a transform in the tenant.
- Use preview to validate logic before applying changes.

---

### Destructive commands (explicit approval required)

These commands MUST NOT be executed unless the user explicitly confirms.

Create a transform:

```bash
sail transform create -f transform_files/<file>.json
```

Update a transform:

```bash
sail transform update -f transform_files/<file>.json
```

Delete a transform:

```bash
sail transform delete <transform-id>
```

Rules:

- Never run these commands implicitly.
- Always confirm user intent before execution.

---

### Recommended workflow (draft → iterate → apply)

1. Download existing transforms:

```bash
sail transform download -d transform_files
```

2. Create or edit a Transform JSON file.
3. Preview the transform:

```bash
sail transform preview \
  --profile <id> \
  --identity <id> \
  --file transform_files/<file>.json \
  --result-only
```

4. Review differences (optional but recommended):

```bash
diff -u old.json new.json
```

5. Wait for explicit user confirmation.
6. Apply changes:

- Create:

```bash
sail transform create -f transform_files/<file>.json
```

- Update:

```bash
sail transform update -f transform_files/<file>.json
```

---

### Guidance for AI agent behavior

- When asked to “create” or “change” a transform:

1. Generate a draft JSON file.
2. Explain the logic.
3. Offer preview and iteration.
4. Wait for explicit confirmation before applying.

- When asked to “update” an existing transform:

1. Download transforms.
2. Locate the correct file.
3. Modify locally.
4. Preview and show changes.
5. Apply only after approval.

This skill prioritizes safety, predictability, and reviewability over speed.
