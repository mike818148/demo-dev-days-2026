# First Valid Transform

**Reference:** [First Valid | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/first-valid)

## Overview

Use the **first valid** transform to return the first non-null value from an array of values or nested transforms. Useful for fallback logic (e.g. uid: try AD sAMAccountName, then Okta login, then employee ID).

Provide entries in **descending order of preference**—the transform returns the first that evaluates to non-null.

## Transform structure

```json
{
  "attributes": {
    "values": [
      {
        "attributes": {
          "sourceName": "Active Directory",
          "attributeName": "sAMAccountName"
        },
        "type": "accountAttribute"
      },
      {
        "attributes": {
          "sourceName": "Okta",
          "attributeName": "login"
        },
        "type": "accountAttribute"
      },
      {
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "employeeID"
        },
        "type": "accountAttribute"
      }
    ]
  },
  "type": "firstValid",
  "name": "Test First Valid Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `firstValid`.                                                                                                 |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                           |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute     | Type   | Required | Description                                                                                                                       |
| ------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `values`      | array  | Yes      | Array of values or transforms to evaluate. Returns first non-null. Order by preference (most preferred first).                    |
| `ignoreErrors`| boolean| No       | If true, proceed to next option when an error (e.g. NPE) occurs. Default is `false`.                                              |

## Examples

### Example 1: Username fallback (AD → Okta → HR)

```json
{
  "attributes": {
    "values": [
      {
        "attributes": {
          "sourceName": "Active Directory",
          "attributeName": "sAMAccountName"
        },
        "type": "accountAttribute"
      },
      {
        "attributes": {
          "sourceName": "Okta",
          "attributeName": "login"
        },
        "type": "accountAttribute"
      },
      {
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "employeeID"
        },
        "type": "accountAttribute"
      }
    ]
  },
  "type": "firstValid",
  "name": "First Valid Transform"
}
```

### Example 2: Work email with default "none"

For required attributes when new hires may not have email yet:

```json
{
  "attributes": {
    "values": [
      {
        "attributes": {
          "sourceName": "Active Directory",
          "attributeName": "mail"
        },
        "type": "accountAttribute"
      },
      {
        "attributes": { "value": "none" },
        "type": "static"
      }
    ]
  },
  "type": "firstValid",
  "name": "First Valid Transform"
}
```

### Example 3: Manager DN with ignoreErrors

Use `ignoreErrors: true` to avoid NPE when identity has no manager:

```json
{
  "attributes": {
    "ignoreErrors": "true",
    "values": [
      {
        "attributes": {
          "value": "$identity.manager.attributes.networkDn"
        },
        "type": "static"
      },
      ""
    ]
  },
  "name": "Example_Transform_ManagerDN",
  "type": "firstValid"
}
```
