# Upper Transform

**Reference:** [Upper | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/upper)

## Overview

Use the **upper** transform to convert an input string to all uppercase letters.

## Transform structure

```json
{
  "type": "upper",
  "name": "Upper Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `upper`.                                                                                                      |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute | Type   | Required | Description                                                            |
| --------- | ------ | -------- | ---------------------------------------------------------------------- |
| `input`   | object | No       | Explicit input. If not provided, uses input from the UI configuration. |

## Examples

### Example 1

**Input:** `"inactive"`  
**Output:** `"INACTIVE"`

### Example 2

**Input:** `"Everyone"`  
**Output:** `"EVERYONE"`

```json
{
  "attributes": {
    "input": {
      "attributes": { "value": "Everyone" },
      "type": "static"
    }
  },
  "type": "upper",
  "name": "Upper Transform"
}
```
