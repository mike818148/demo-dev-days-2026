# Last Index Of Transform

**Reference:** [Last Index Of | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/last-index-of)

## Overview

Use the **last index of** transform to get the position of the **last** occurrence of a substring within the input string. Returns `-1` if the substring is not found.

**Other considerations:**
- Returns the **last** occurrence. For the first occurrence, use the Index Of transform.
- Often used with the Substring transform for dynamic-length strings.

## Transform structure

```json
{
  "attributes": {
    "substring": "admin_"
  },
  "type": "lastIndexOf",
  "name": "Last Index Of Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `lastIndexOf`.                                                                                                 |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                             |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute   | Type   | Required | Description                                                                                                                       |
| ----------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `substring` | string | Yes      | The string whose last occurrence position within the input you want to find. Returns `-1` if not found.                             |
| `input`     | object | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Examples

### Example 1: Single occurrence

**Input:** `"admin_jsmith"`  
**Output:** `"0"` (admin_ occurs once at index 0)

```json
{
  "attributes": {
    "substring": "admin_"
  },
  "type": "lastIndexOf",
  "name": "Last Index Of Transform"
}
```

### Example 2: Last occurrence of repeated char

**Input:** `"abcabcabc"`  
**Output:** `"7"` (last "b" at index 7)

```json
{
  "attributes": {
    "substring": "b"
  },
  "type": "lastIndexOf",
  "name": "Last Index Of Transform"
}
```
