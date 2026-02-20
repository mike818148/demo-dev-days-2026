# Account Attribute Transform

**Reference:** [Account Attribute | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/account-attribute)

## Overview

Use the **account attribute** transform to look up an account for a particular source on an identity and return a specific attribute value from that account.

**Other considerations:**
- If there are multiple accounts, Identity Security Cloud by default takes the value from the oldest account (based on the account created date). Configure via `accountSortAttribute` and `accountSortDescending`.
- If multiple accounts exist and the oldest has a null attribute value, by default ISC moves to the next account with a value. Override with `accountReturnFirstLink`.
- Use `accountFilter` or `accountPropertyFilter` to target specific accounts (e.g. active vs terminated).

## Transform structure

```json
{
  "attributes": {
    "sourceName": "Workday",
    "attributeName": "DEPARTMENT",
    "accountSortAttribute": "created",
    "accountSortDescending": true,
    "accountReturnFirstLink": true,
    "accountPropertyFilter": "(DEPARTMENT == \"Engineering\")",
    "accountFilter": "!(nativeIdentity.startsWith(\"*DELETED*\"))"
  },
  "type": "accountAttribute",
  "name": "Account Attribute Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `accountAttribute`.                                                                                           |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute                 | Type    | Required | Description                                                                                                                                 |
| ------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `sourceName`              | string  | Yes      | The source to search for accounts (display name, e.g. "Active Directory"). Alternatives: `applicationId`, `applicationName`.                |
| `attributeName`           | string  | Yes      | The name of the account attribute to return (matches UI/source schema).                                                                    |
| `accountSortAttribute`    | string  | No       | Attribute to sort returned accounts when multiple exist. Default is `"created"` (ascending).                                                |
| `accountSortDescending`   | boolean | No       | Sort order. Default is `false` (ascending).                                                                                                  |
| `accountReturnFirstLink`  | boolean | No       | `true` = return value from first account even if null; `false` = return first non-null. Default is `false`.                                  |
| `accountFilter`           | string  | No       | `sailpoint.object.Filter` expression to narrow search (AND with default filters). Searchable: `nativeIdentity`, `displayName`, `entitlements`. |
| `accountPropertyFilter`   | string  | No       | Filter expression applied in memory after retrieval. All account attributes available. Example: `(status != "terminated")`.                     |
| `input`                   | object  | No       | Explicitly defines the input data. If not provided, uses input from the UI configuration.                                                    |

## Examples

### HR system: latest active account

Get HIREDATE from the newest active account when multiple HR records exist (rehire/conversion scenarios):

```json
{
  "attributes": {
    "attributeName": "HIREDATE",
    "sourceName": "Corporate HR",
    "accountSortAttribute": "created",
    "accountSortDescending": true,
    "accountReturnFirstLink": true,
    "accountPropertyFilter": "(WORKER_STATUS__c == \"active\")"
  },
  "type": "accountAttribute",
  "name": "Account Attribute Transform"
}
```

### Username from non-service accounts

Get sAMAccountName from Active Directory, excluding service accounts:

```json
{
  "attributes": {
    "attributeName": "sAMAccountName",
    "sourceName": "Active Directory",
    "accountFilter": "!(displayName.startsWith(\"SVC-\"))"
  },
  "type": "accountAttribute",
  "name": "Account Attribute Transform"
}
```
