# Substring Transform

**Reference:** [Substring | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/substring)

## Overview

Use the **substring** transform to extract a portion of a string. Specify start (and optionally end) index. Use with Index Of or Last Index Of for dynamic positions.

**Note:** For the last N characters, use the Get End of String transform instead.

## Transform structure

```json
{
  "attributes": {
    "begin": 4
  },
  "type": "substring",
  "name": "Substring Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `substring`.                                                                                                  |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute     | Type    | Required | Description                                                                 |
| ------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `begin`       | integer | Yes      | Index of first character. Use `-1` to start at 0.                           |
| `beginOffset` | integer | No       | Characters to add to `begin`. Only used if `begin` is not `-1`.             |
| `end`         | integer | No       | Index where substring ends (exclusive). `-1` or omitted = to end of string. |
| `endOffset`   | integer | No       | Characters to add to `end`. Only used if `end` is provided and not `-1`.    |
| `input`       | object  | No       | Explicit input. If not provided, uses input from the UI configuration.      |

## Examples

### Example 1: Basic substring

**Input:** `"abcdef"`  
**Output:** `"cd"` (indices 2–3, end exclusive)

```json
{
  "attributes": {
    "begin": 2,
    "end": 4
  },
  "type": "substring",
  "name": "Substring Transform"
}
```

### Example 2: With offsets

**Input:** `"abcdef"`  
**Output:** `"cde"` (begin 1 + offset 1 = 2; end 3 + offset 2 = 5)

```json
{
  "attributes": {
    "begin": 1,
    "end": 3,
    "beginOffset": 1,
    "endOffset": 2
  },
  "type": "substring",
  "name": "Substring Transform"
}
```
