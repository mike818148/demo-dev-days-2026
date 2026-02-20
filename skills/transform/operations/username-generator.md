# Username Generator Transform

**Reference:** [Username Generator | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/username-generator)

## Overview

Use the **username generator** transform to derive a unique value for an attribute in an account create profile. Supports patterns (e.g. `firstName.lastName`) and a `uniqueCounter` for retries when a value is already taken (e.g. `jdoe1`, `jdoe2`).

**Important:**

- `uniqueCounter` must always be **last** in the pattern list. The generator stops processing patterns after one containing `uniqueCounter`.
- `cloudMaxUniqueChecks` (max 50) limits retry attempts before failing.
- Use `cloudMaxSize` to truncate generated values.

## Transform structure

Used within an account create profile attribute. The transform goes in the `transform` parameter:

```json
{
  "name": "userId",
  "transform": {
    "type": "usernameGenerator",
    "attributes": {
      "sourceCheck": true,
      "patterns": ["$fi$ln${uniqueCounter}"],
      "ln": {
        "type": "identityAttribute",
        "attributes": { "name": "lastname" }
      },
      "fi": {
        "type": "substring",
        "attributes": {
          "input": {
            "type": "identityAttribute",
            "attributes": { "name": "firstname" }
          },
          "begin": 0,
          "end": 1
        }
      }
    }
  },
  "attributes": {
    "cloudMaxSize": "100",
    "cloudMaxUniqueChecks": "25",
    "cloudRequired": "true"
  },
  "isRequired": false,
  "type": "string",
  "isMultiValued": false
}
```

## Attributes

| Attribute     | Type    | Required | Description                                                                                                               |
| ------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `patterns`    | array   | Yes      | Patterns to try in order. Use `$uniqueCounter` for auto-increment on collision. Must be last in any pattern that uses it. |
| `sourceCheck` | boolean | No       | `true` = check target system (if supported); `false` = check ISC DB only. Default is `false`.                             |
| _(variables)_ | object  | No       | Additional properties as variables (e.g. `fn`, `ln`, `fi`, `mi`) for use in patterns.                                     |

## Profile attribute fields

| Field                  | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `cloudMaxSize`         | Max length of generated value. Truncates if exceeded. |
| `cloudMaxUniqueChecks` | Max retry attempts (max 50).                          |
| `cloudRequired`        | Internal flag; set to `true`.                         |

## Examples

### Example 1: First initial + last name + counter

Tries `jdoe`, then `jdoe1`, `jdoe2`, ... up to 25 attempts:

```json
{
  "name": "userId",
  "transform": {
    "type": "usernameGenerator",
    "attributes": {
      "sourceCheck": true,
      "patterns": ["$fi$ln${uniqueCounter}"],
      "ln": {
        "type": "identityAttribute",
        "attributes": { "name": "lastname" }
      },
      "fi": {
        "type": "substring",
        "attributes": {
          "input": {
            "type": "identityAttribute",
            "attributes": { "name": "firstname" }
          },
          "begin": 0,
          "end": 1
        }
      }
    }
  },
  "attributes": {
    "cloudMaxSize": "100",
    "cloudMaxUniqueChecks": "25",
    "cloudRequired": "true"
  },
  "isRequired": false,
  "type": "string",
  "isMultiValued": false
}
```

### Example 2: First name + last name + counter

Tries `adam.smith`, then `adam.smith1`, `adam.smith2`, ... up to 10 attempts:

```json
{
  "name": "accountId",
  "transform": {
    "type": "usernameGenerator",
    "attributes": {
      "sourceCheck": true,
      "patterns": ["$fn.$ln${uniqueCounter}"],
      "fn": {
        "type": "identityAttribute",
        "attributes": { "name": "firstname" }
      },
      "ln": {
        "type": "identityAttribute",
        "attributes": { "name": "lastname" }
      }
    }
  },
  "attributes": {
    "cloudMaxSize": "100",
    "cloudMaxUniqueChecks": "10",
    "cloudRequired": "true"
  },
  "isRequired": false,
  "type": "string",
  "isMultiValued": false
}
```
