# Lookup Transform

**Reference:** [Lookup | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/lookup)

## Overview

Use the **lookup** transform to map an incoming string to an output value via a key-value table. If the input matches a key, the transform returns the corresponding value. If no match and no default is provided, the transform returns an error.

**Other considerations:** A `default` key should be specified unless a match is guaranteed; otherwise an error will be returned if the input does not match any key.

## Transform structure

```json
{
  "attributes": {
    "table": {
      "USA": "Americas",
      "FRA": "EMEA",
      "AUS": "APAC",
      "default": "Unknown Region"
    }
  },
  "type": "lookup",
  "name": "Lookup Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `lookup`.                                                                                                      |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute | Type   | Required | Description                                                                                                                       |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `table`   | object | Yes      | JSON object of key-value pairs. Key = string to match input; value = output string. Include `default` key for fallback.           |
| `input`   | object | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Examples

### Example 1: Area code to city

**Input:** `"512"` → **Output:** `"Austin"`  
**Input:** `"999"` → **Output:** `"Unknown Area"` (default)

```json
{
  "attributes": {
    "table": {
      "512": "Austin",
      "281": "Houston",
      "214": "Dallas",
      "210": "San Antonio",
      "default": "Unknown Area"
    }
  },
  "type": "lookup",
  "name": "Lookup Transform"
}
```

### Example 2: Multiple keys to same value

Multiple area codes map to same city:

```json
{
  "attributes": {
    "table": {
      "512": "Austin",
      "281": "Houston",
      "713": "Houston",
      "832": "Houston",
      "214": "Dallas",
      "210": "San Antonio",
      "default": "Unknown Area"
    }
  },
  "type": "lookup",
  "name": "Lookup Transform"
}
```

**Note:** Duplicate keys are not allowed; each key must be unique.
