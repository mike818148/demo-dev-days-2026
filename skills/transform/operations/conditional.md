# Conditional Transform

**Reference:** [Conditional | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/conditional)

## Overview

Use the **conditional** transform to output different values depending on simple conditional logic. Returns `positiveCondition` if the expression is true, otherwise `negativeCondition`.

**Other considerations:**
- The two operands cannot be null; otherwise `IllegalArgumentException` is thrown.
- The `expression` attribute must use `eq` as the operator.
- All attribute string values are case-sensitive.

## Transform structure

```json
{
  "attributes": {
    "expression": "foo eq foo",
    "positiveCondition": "true",
    "negativeCondition": "false"
  },
  "type": "conditional",
  "name": "Conditional Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `conditional`.                                                                                                 |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                             |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute            | Type   | Required | Description                                                                                                                       |
| -------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `expression`         | string | Yes      | Comparison in form `ValueA eq ValueB`. `eq` is the only valid operator. Values can be static strings or outputs of nested transforms. |
| `positiveCondition`  | string | Yes      | Output when expression evaluates to true.                                                                                         |
| `negativeCondition`  | string | Yes      | Output when expression evaluates to false.                                                                                        |
| *(dynamic variables)* | object | No       | Additional properties can serve as variables in the expression or conditions. Reference with `$variableName`.                      |

## Examples

### Example 1: Department check

Returns `true` if department is "Science", otherwise `false`:

```json
{
  "attributes": {
    "expression": "$department eq Science",
    "positiveCondition": "true",
    "negativeCondition": "false",
    "department": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "department"
      },
      "type": "accountAttribute"
    }
  },
  "type": "conditional",
  "name": "Test Conditional Transform"
}
```

### Example 2: Return nested transform output

Returns different building values based on department:

```json
{
  "attributes": {
    "expression": "$department eq Science",
    "positiveCondition": "$scienceBuilding",
    "negativeCondition": "$adminBuilding",
    "department": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "department"
      },
      "type": "accountAttribute"
    },
    "scienceBuilding": {
      "attributes": { "value": "Building S" },
      "type": "static"
    },
    "adminBuilding": {
      "attributes": { "value": "Building A" },
      "type": "static"
    }
  },
  "type": "conditional",
  "name": "Test Conditional Transform"
}
```
