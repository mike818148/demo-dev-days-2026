# Trim Transform

**Reference:** [Trim | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/trim)

## Overview

Use the **trim** transform to remove whitespace from both the beginning and end of an input string.

## Transform structure

```json
{
  "type": "trim",
  "name": "Trim Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `trim`.                                                                                                       |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute | Type   | Required | Description                                                            |
| --------- | ------ | -------- | ---------------------------------------------------------------------- |
| `input`   | object | No       | Explicit input. If not provided, uses input from the UI configuration. |

## Examples

### Example 1: Leading whitespace

**Input:** `" Vice President"`  
**Output:** `"Vice President"`

### Example 2: Trailing whitespace

**Input:** `"Austin, Texas "`  
**Output:** `"Austin, Texas"`

```json
{
  "attributes": {
    "input": {
      "attributes": { "value": "Austin, Texas " },
      "type": "static"
    }
  },
  "type": "trim",
  "name": "Trim Transform"
}
```
