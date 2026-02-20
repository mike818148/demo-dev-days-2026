# Random Numeric Transform

**Reference:** [Random Numeric | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/random-numeric)

## Overview

Use the **random numeric** transform to generate a random number of any length (digits only).

## Transform structure

```json
{
  "type": "randomNumeric",
  "name": "Random Numeric Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `randomNumeric`.                                                                                                |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute | Type   | Required | Description                                                                                                                       |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `length`  | string | No       | Desired number of digits. Must be positive. Default is `10`. Maximum is `450`.                                                     |

## Examples

### Example 1: Default 10 digits

**Output:** e.g. `"2334776774"`

```json
{
  "type": "randomNumeric",
  "name": "Random Numeric Transform"
}
```

### Example 2: Custom length

**Output:** e.g. `"759931"` (6 digits)

```json
{
  "attributes": {
    "length": "6"
  },
  "type": "randomNumeric",
  "name": "Random Numeric Transform"
}
```
