# Replace Transform

**Reference:** [Replace | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/replace)

## Overview

Use the **replace** transform to find a pattern in incoming data and replace all instances with an alternate value. Supports standard regex syntax. For multiple patterns, use Replace All.

## Transform structure

```json
{
  "attributes": {
    "regex": "IIQ",
    "replacement": "Identity Security Cloud"
  },
  "type": "replace",
  "name": "Replace Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `replace`.                                                                                                    |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute     | Type   | Required | Description                                                            |
| ------------- | ------ | -------- | ---------------------------------------------------------------------- |
| `regex`       | string | Yes      | Pattern to search for and replace. Supports regex.                     |
| `replacement` | string | Yes      | Replacement string.                                                    |
| `input`       | object | No       | Explicit input. If not provided, uses input from the UI configuration. |

## Examples

### Example 1: Simple word replacement

**Input:** `"Working with IIQ is fun"`  
**Output:** `"Working with Identity Security Cloud is fun"`

```json
{
  "attributes": {
    "regex": "IIQ",
    "replacement": "Identity Security Cloud"
  },
  "type": "replace",
  "name": "Replace Transform"
}
```

### Example 2: Remove non-alphabet characters

**Input:** `"The quick brown fox jumped over 10 lazy dogs"`  
**Output:** `"Thequickbrownfoxjumpedoverlazydogs"`

```json
{
  "attributes": {
    "regex": "[^a-zA-Z]",
    "replacement": ""
  },
  "type": "replace",
  "name": "Replace Transform"
}
```

## References

- [Regex Replace Tutorial](https://www.regular-expressions.info/replacetutorial.html)
- [Regex101](https://regex101.com/)
