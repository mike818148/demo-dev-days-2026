# Name Normalizer Transform

**Reference:** [Name Normalizer | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/name-normalizer)

## Overview

Use the **name normalizer** transform to clean or standardize the spelling of strings from source systems. Common use: names and proper nouns.

**Normalization logic:**
- **Proper casing:** Splits by space, hyphen, or apostrophe; capitalizes first character of each substring.
- **Special replacements:** "MC" → "Mc", "MAC" → "Mac" (patronymic)
- **Toponymic/generational:** "VON" → "von", "DEL" → "del", "OF" → "of", "DE" → "de", "LA" → "la", "Y" → "y"
- **Roman numerals:** "iii" → "III"

## Transform structure

```json
{
  "type": "normalizeNames",
  "name": "Name Normalizer Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `normalizeNames`.                                                                                              |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute | Type   | Required | Description                                                                                                                       |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `input`   | object | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Examples

### Example 1: Static value

**Input:** `"jOHN VON SmITh"`  
**Output:** `"John von Smith"`

```json
{
  "attributes": {
    "input": {
      "attributes": { "value": "jOHN VON SmITh" },
      "type": "static"
    }
  },
  "type": "normalizeNames",
  "name": "Name Normalizer Transform"
}
```

### Example 2: From account attribute

**Input:** `"Dr. JOHN D. O'BRIEN"` (from HR Source LastName)  
**Output:** `"Dr. John D. O'Brien"`

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
  "type": "normalizeNames",
  "name": "Name Normalizer Transform"
}
```
