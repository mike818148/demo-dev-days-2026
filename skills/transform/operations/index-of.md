# Index Of Transform

**Reference:** [Index Of | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/index-of)

## Overview

Use the **index of** transform to get the position of a substring within the input string. Returns `-1` if the substring is not found.

**Other considerations:**
- Returns the **first** occurrence. For the last occurrence, use the Last Index Of transform.
- Often used with the Substring transform for dynamic-length strings.

## Transform structure

```json
{
  "attributes": {
    "substring": "admin_"
  },
  "type": "indexOf",
  "name": "Index Of Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `indexOf`.                                                                                                    |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute   | Type   | Required | Description                                                                                                                       |
| ----------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `substring` | string | Yes      | The string whose starting position within the input you want to find. Returns `-1` if not found.                                   |
| `input`     | object | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Examples

### Example 1: Substring at start

**Input:** `"admin_jsmith"`  
**Output:** `"0"` (admin_ at index 0)

```json
{
  "attributes": {
    "substring": "admin_"
  },
  "type": "indexOf",
  "name": "Index Of Transform"
}
```

### Example 2: First occurrence of repeated char

**Input:** `"abcabcabc"`  
**Output:** `"1"` (first "b" at index 1)

```json
{
  "attributes": {
    "substring": "b"
  },
  "type": "indexOf",
  "name": "Index Of Transform"
}
```
