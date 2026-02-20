# Decompose Diacritical Marks Transform

**Reference:** [Decompose Diacritical Marks | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/decompose-diacritical-marks)

## Overview

Use the **decompose diacritical marks** transform to clean or standardize diacritical marks (e.g. Ā, Ĉ, Ň, Ŵ) to ASCII-compatible characters. Useful when downstream applications cannot handle these symbols.

The transform uses Unicode Normalization Form KD (NFKD) and then removes combining diacritical marks via regex: `replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")`.

## Transform structure

The transform only requires `type` and `name`:

```json
{
  "type": "decomposeDiacriticalMarks",
  "name": "Decompose Diacritical Marks Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `decomposeDiacriticalMarks`.                                                                                   |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                             |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute | Type   | Required | Description                                                                                                                       |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `input`   | object | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Examples

### Example 1: Simple decomposition

**Input:** `"Āric"`  
**Output:** `"Aric"`

```json
{
  "type": "decomposeDiacriticalMarks",
  "name": "Test Decompose Diacritical Marks Transform"
}
```

### Example 2: From account attribute

**Input:** `"Dubçek"` (from HR Source LastName)  
**Output:** `"Dubcek"`

```json
{
  "attributes": {
    "input": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "LastName"
      },
      "type": "accountAttribute"
    }
  },
  "type": "decomposeDiacriticalMarks",
  "name": "Decompose Diacritical Marks Transform"
}
```
