# Replace All Transform

**Reference:** [Replace All | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/replace-all)

## Overview

Use the **replace all** transform to perform multiple replace operations on incoming data. Like Replace, but with a table of pattern→replacement pairs. Supports standard regex syntax.

## Transform structure

```json
{
  "attributes": {
    "table": {
      "-": " ",
      "\"": "'",
      "ñ": "n"
    }
  },
  "type": "replaceAll",
  "name": "Replace All Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `replaceAll`.                                                                                                 |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute | Type   | Required | Description                                                                               |
| --------- | ------ | -------- | ----------------------------------------------------------------------------------------- |
| `table`   | object | Yes      | Key-value pairs: key = pattern to search for, value = replacement string. Supports regex. |
| `input`   | object | No       | Explicit input. If not provided, uses input from the UI configuration.                    |

## Examples

### Example 1: Special character replacements

**Input:** `"Enrique Jose-Piñon"`  
**Output:** `"Enrique Jose Pinon"`

```json
{
  "attributes": {
    "table": {
      ".": "-",
      "\"": "'",
      "ñ": "n"
    }
  },
  "type": "replaceAll",
  "name": "Replace All Transform"
}
```

### Example 2: Regex patterns

**Input:** `"ad512.777.1234"`  
**Output:** `"512-777-1234"` (remove letters, replace periods with hyphens)

```json
{
  "attributes": {
    "table": {
      "[.]": "-",
      "[a-zA-z]": ""
    }
  },
  "type": "replaceAll",
  "name": "Replace All Transform"
}
```

## References

- [Regex Replace Tutorial](https://www.regular-expressions.info/replacetutorial.html)
- [Regex101](https://regex101.com/)
