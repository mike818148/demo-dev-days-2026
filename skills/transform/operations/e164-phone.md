# E.164 Phone Transform

**Reference:** [E.164 Phone | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/e164-phone)

## Overview

Use the **E.164 phone** transform to convert an incoming phone number string into an E.164-compatible number.

**Other considerations:** If the input does not represent a valid phone number, the transform returns null.

## Transform structure

```json
{
  "type": "e164phone",
  "name": "Test E.164Phone Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `e164phone`.                                                                                                  |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute      | Type   | Required | Description                                                                                                                       |
| -------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `defaultRegion`| string | No       | Phone number region (ISO 3166-1 alpha-2 format). Default is `US`.                                                                  |
| `input`       | object | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Examples

### Example 1: Hyphen-separated

**Input:** `"512-777-2222"`  
**Output:** `"+1512459222"`

```json
{
  "attributes": {
    "input": {
      "attributes": { "value": "512-777-2222" },
      "type": "static"
    }
  },
  "type": "e164phone",
  "name": "E.164Phone Transform"
}
```

### Example 2: Dot-separated

**Input:** `"779.284.2727"`  
**Output:** `"+17792842727"`

```json
{
  "attributes": {
    "input": {
      "attributes": { "value": "779.284.2727" },
      "type": "static"
    }
  },
  "type": "e164phone",
  "name": "E.164Phone Transform"
}
```

### Example 3: With country region

**Input:** `"0412345678"`, **defaultRegion:** `"AU"`  
**Output:** `"+61412345678"`

```json
{
  "attributes": {
    "input": {
      "attributes": { "value": "0412345678" },
      "type": "static"
    },
    "defaultRegion": "AU"
  },
  "type": "e164phone",
  "name": "E.164Phone Transform"
}
```

## References

- [E.164 - Wikipedia](https://en.wikipedia.org/wiki/E.164)
- [ISO 3166-1 alpha-2 - Wikipedia](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
