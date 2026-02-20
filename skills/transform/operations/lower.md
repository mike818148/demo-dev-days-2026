# Lower Transform

**Reference:** [Lower | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/lower)

## Overview

Use the **lower** transform to convert an input string into all lowercase letters.

## Transform structure

The lower transform only requires the transform's `type` and `name` attributes. No `attributes` configuration is required unless you use explicit input.

```json
{
  "type": "lower",
  "name": "Lower Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `lower`.                                                                                                      |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

The `attributes` object contains the configuration for the lower transform.

| Attribute | Type   | Required | Description                                                                                                                                                                         |
| --------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`   | object | No       | Explicitly defines the input data passed into the transform. If not provided, the transform uses **implicit** input from the source and attribute combination configured in the UI. |

## Examples

### Example 1: "ACTIVE" → "active"

**Input:** `"ACTIVE"`  
**Output:** `"active"`

```json
{
  "type": "lower",
  "name": "Lower Transform",
  "attributes": {
    "input": {
      "type": "static",
      "attributes": {
        "value": "ACTIVE"
      }
    }
  }
}
```

### Example 2: "All-Access" → "all-access"

**Input:** `"All-Access"`  
**Output:** `"all-access"`

```json
{
  "type": "lower",
  "name": "Lower Transform",
  "attributes": {
    "input": {
      "type": "static",
      "attributes": {
        "value": "All-Access"
      }
    }
  }
}
```

### Implicit input

Omit `attributes.input` to use the value from the identity profile mapping (or account profile). The system provides the input; the transform only lowercases it.

```json
{
  "type": "lower",
  "name": "Lowercase Department",
  "attributes": {}
}
```
