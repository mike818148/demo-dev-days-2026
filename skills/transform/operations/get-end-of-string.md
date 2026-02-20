# Get End of String Transform

**Reference:** [Get End of String | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/get-end-of-string)

## Overview

Use the **get end of string** transform to return the rightmost N characters of a string. It is an out-of-the-box rule transform via SailPoint's Cloud Services Deployment Utility rule.

**Note:** If `numChars` is greater than the string length, the transform returns null.

## Transform structure

This transform uses `type: "rule"` with the Cloud Services Deployment Utility:

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "getEndOfString",
    "numChars": "4"
  },
  "type": "rule",
  "name": "Get End Of String Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `rule`.                                                                                                       |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                           |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute  | Type   | Required | Description                                                                                                                       |
| ---------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | string | Yes      | Must be `Cloud Services Deployment Utility`.                                                                                      |
| `operation`| string | Yes      | Must be `getEndOfString`.                                                                                                         |
| `numChars` | string | Yes      | Number of rightmost characters to return. Returns null if greater than string length.                                             |
| `input`    | object | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Examples

### Example 1: Last 4 characters

**Input:** `"abcd1234"`  
**Output:** `"1234"`

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "getEndOfString",
    "numChars": "4"
  },
  "type": "rule",
  "name": "Get End Of String Transform"
}
```

### Example 2: Returns null when numChars exceeds length

**Input:** `"This is a test."` (15 chars), **numChars:** `"16"`  
**Output:** null

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "getEndOfString",
    "numChars": "16",
    "input": "This is a test."
  },
  "type": "rule",
  "name": "Get End Of String Transform"
}
```
