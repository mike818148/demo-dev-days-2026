# Concatenation Transform

**Reference:** [Concatenation | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/concatenation)

## Overview

Use the **concatenation** transform to join two or more string values into a combined output. It is often used to join first and last name into a full display name, but has many other uses.

## Transform structure

The concatenation transform requires an array of `values` in `attributes` that are joined in order. Each item can be a static string or the return value of another nested transform.

```json
{
  "type": "concat",
  "name": "Concatenation transform",
  "attributes": {
    "values": ["John", " ", "Smith"]
  }
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `concat`.                                                                                                     |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

The `attributes` object contains the values to concatenate.

| Attribute | Type  | Required | Description                                                                                  |
| --------- | ----- | -------- | -------------------------------------------------------------------------------------------- |
| `values`  | array | Yes      | An array of items to join in order. Items can be static strings or nested transform objects. |

## Examples

### Example 1: Static strings

**Input:** `["John", " ", "Smith"]`  
**Output:** `"John Smith"`

```json
{
  "type": "concat",
  "name": "Concatenation transform",
  "attributes": {
    "values": ["John", " ", "Smith"]
  }
}
```

### Example 2: First name + space + last name + " (Contractor)"

Joins first name and last name from "HR Source" with a space, then appends `" (Contractor)"`.

```json
{
  "type": "concat",
  "name": "Test Concat Transform",
  "attributes": {
    "values": [
      {
        "type": "accountAttribute",
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "FirstName"
        }
      },
      " ",
      {
        "type": "accountAttribute",
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "LastName"
        }
      },
      " (Contractor)"
    ]
  }
}
```

### Example 3: Job title + hyphen + job code

Joins job title and job code from "HR Source" with a hyphen.

```json
{
  "type": "concat",
  "name": "Test Concat Transform",
  "attributes": {
    "values": [
      {
        "type": "accountAttribute",
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "JobTitle"
        }
      },
      "-",
      {
        "type": "accountAttribute",
        "attributes": {
          "sourceName": "HR Source",
          "attributeName": "JobCode"
        }
      }
    ]
  }
}
```

## Notes

- **Order matters**: Values are concatenated in array order with no separator unless you include one (e.g. `" "`, `"-"`) as an element.
- **Nested transforms**: Any element in `values` can be a transform object (e.g. `accountAttribute`, `identityAttribute`, `static`, `lower`) so you can mix static text with dynamic values.
