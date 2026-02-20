# Random Alphanumeric Transform

**Reference:** [Random Alphanumeric | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/random-alphanumeric)

## Overview

Use the **random alphanumeric** transform to generate a random string of any length comprising numbers and letters (lowercase and uppercase). Simpler than the rule-based Generate Random String when special characters are not needed.

## Transform structure

```json
{
  "type": "randomAlphaNumeric",
  "name": "Random Alphanumeric Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `randomAlphaNumeric`.                                                                                          |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute | Type   | Required | Description                                                                                                                       |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `length`  | string | No       | Desired number of characters. Must be positive. Default is `32`. Maximum is `450`.                                                |

## Examples

### Example 1: Default 32 characters

**Output:** e.g. `"VtPeE9WL56lMTlvfjr02KXqS3KtgDSuk"`

```json
{
  "type": "randomAlphaNumeric",
  "name": "Random Alphanumeric Transform"
}
```

### Example 2: Custom length

**Output:** e.g. `"5GH2qsjU27"` (10 chars)

```json
{
  "attributes": {
    "length": "10"
  },
  "type": "randomAlphaNumeric",
  "name": "Random Alphanumeric Transform"
}
```
