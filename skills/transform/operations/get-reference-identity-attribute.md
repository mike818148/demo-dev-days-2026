# Get Reference Identity Attribute Transform

**Reference:** [Get Reference Identity Attribute | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/get-reference-identity-attribute)

## Overview

Use the **get reference identity attribute** transform to retrieve an identity attribute of another user from within a given identity's calculation. It is an out-of-the-box rule via SailPoint's Cloud Services Deployment Utility.

Use the `"manager"` keyword as a convenient referential lookup to the target identity.

## Transform structure

This transform uses `type: "rule"` with the Cloud Services Deployment Utility:

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "getReferenceIdentityAttribute",
    "uid": "manager",
    "attributeName": "email"
  },
  "type": "rule",
  "name": "Get Reference Identity Attribute Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `rule`.                                                                                                       |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                           |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute       | Type   | Required | Description                                                                                                                       |
| --------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | string | Yes      | Must be `Cloud Services Deployment Utility`.                                                                                      |
| `operation`     | string | Yes      | Must be `getReferenceIdentityAttribute`.                                                                                          |
| `uid`           | string | Yes      | SailPoint User Name (uid) of the identity whose attribute is desired. Use `"manager"` to look up the user's manager.              |
| `attributeName` | string | Yes      | Name of the identity attribute to retrieve from the referenced identity.                                                        |

## Examples

### Example 1: Manager's email

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "getReferenceIdentityAttribute",
    "uid": "manager",
    "attributeName": "email"
  },
  "type": "rule",
  "name": "Get Reference Identity Attribute Transform"
}
```

### Example 2: Specific user's attribute

Gets the alternate phone for the identity `corporate.admin`:

```json
{
  "attributes": {
    "name": "Cloud Services Deployment Utility",
    "operation": "getReferenceIdentityAttribute",
    "uid": "corporate.admin",
    "attributeName": "phone"
  },
  "type": "rule",
  "name": "Get Reference Identity Attribute Transform"
}
```
