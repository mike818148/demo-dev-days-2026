# Reference Transform

**Reference:** [Reference | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/reference)

## Overview

Use the **reference** transform to reuse a transform that already exists in the tenant. Useful when the same logic is needed multiple times—maintain one transform and reference it elsewhere.

## Transform structure

```json
{
  "attributes": {
    "id": "Build Display Name"
  },
  "type": "reference",
  "name": "Reference Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `reference`.                                                                                                  |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute | Type   | Required | Description                                                            |
| --------- | ------ | -------- | ---------------------------------------------------------------------- |
| `id`      | string | Yes      | The name of the pre-existing transform to reference.                   |
| `input`   | object | No       | Explicit input. If not provided, uses input from the UI configuration. |

## Examples

### Example 1: Reference single transform

Outputs the result of the "Get Worker Type" transform:

```json
{
  "attributes": {
    "id": "Get Worker Type"
  },
  "type": "reference",
  "name": "Reference Transform"
}
```

### Example 2: Reference within concat

Builds "John Smith - Employee" by concatenating display name, hyphen, and worker type:

```json
{
  "attributes": {
    "values": [
      {
        "attributes": { "id": "Get Display Name" },
        "type": "reference"
      },
      " - ",
      {
        "attributes": { "id": "Get Worker Type" },
        "type": "reference"
      }
    ]
  },
  "type": "concat",
  "name": "Reference Transform"
}
```
