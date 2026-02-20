# Generate Random String Transform

**Reference:** [Generate Random String | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/generate-random-string)

## Overview

Use the **generate random string** transform to generate a random string of any length. It is an out-of-the-box rule transform via SailPoint's Cloud Services Deployment Utility rule. Flags control inclusion of numbers and special characters.

**Common use:** Generating random passwords that meet basic complexity requirements. For letters+numbers only, consider `randomAlphanumeric` or `randomNumeric` instead.

## Transform structure

This transform uses `type: "rule"` with the Cloud Services Deployment Utility:

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "generateRandomString",
    "includeNumbers": "true",
    "includeSpecialChars": "true",
    "length": "16"
  },
  "type": "rule",
  "name": "Generate Random String Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `rule`.                                                                                                       |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                           |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute           | Type   | Required | Description                                                                                                                       |
| ------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `name`              | string | Yes      | Must be `Cloud Services Deployment Utility`.                                                                                      |
| `operation`         | string | Yes      | Must be `generateRandomString`.                                                                                                   |
| `includeNumbers`    | string | Yes      | `"true"` or `"false"`—whether to include numbers.                                                                                 |
| `includeSpecialChars`| string| Yes      | `"true"` or `"false"`—whether to include `!, @, #, $, %, &, *, (, ), +, <, >, ?`.                                                 |
| `length`            | string | Yes      | Length of the generated string. Maximum is `450`.                                                                                  |

## Examples

### Example 1: 16-char with numbers and special chars

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "generateRandomString",
    "includeNumbers": "true",
    "includeSpecialChars": "true",
    "length": "16"
  },
  "type": "rule",
  "name": "Generate Random String Transform"
}
```

### Example 2: 8-char letters and numbers only

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "generateRandomString",
    "includeNumbers": "true",
    "includeSpecialChars": "false",
    "length": "8"
  },
  "type": "rule",
  "name": "Generate Random String Transform"
}
```
