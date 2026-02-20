# Join Transform

**Reference:** [Join | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/join)

## Overview

Use the **join** transform to join two or more string values with a specified separator. Values can be static strings or outputs of nested transforms.

Common use: joining first and last name into a full display name.

## Transform structure

```json
{
  "attributes": {
    "values": ["John", "Smith"],
    "separator": "|"
  },
  "type": "join",
  "name": "Join transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `join`.                                                                                                       |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute   | Type   | Required | Description                                                                                                                       |
| ----------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `values`    | array  | Yes      | Array of items to join. Items can be static strings or nested transform outputs.                                                   |
| `separator` | string | No       | Separator between each value. Default is `","` (comma).                                                                            |

## Examples

### Example 1: First and last name with space

```json
{
  "attributes": {
    "values": [
      {
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "FirstName"
        },
        "type": "accountAttribute"
      },
      {
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "LastName"
        },
        "type": "accountAttribute"
      }
    ],
    "separator": " "
  },
  "type": "join",
  "name": "Join Transform"
}
```

### Example 2: Job title and code with hyphen

```json
{
  "attributes": {
    "values": [
      {
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "JobTitle"
        },
        "type": "accountAttribute"
      },
      {
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "JobCode"
        },
        "type": "accountAttribute"
      }
    ],
    "separator": "-"
  },
  "type": "join",
  "name": "Join Transform"
}
```
