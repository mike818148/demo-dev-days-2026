# Date Compare Transform

**Reference:** [Date Compare | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/date-compare)

## Overview

Use the **date compare** transform to compare two dates and return one value if the comparison is true, another if false. Common use: lifecycle states (e.g. "active" if current date >= hire date).

**Other considerations:**
- The `now` keyword evaluates to the exact date/time when the transform runs.
- All dates must be in ISO8601 format.

## Transform structure

```json
{
  "attributes": {
    "firstDate": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "termination_date"
      },
      "type": "accountAttribute"
    },
    "secondDate": "now",
    "operator": "gt",
    "positiveCondition": "active",
    "negativeCondition": "terminated"
  },
  "type": "dateCompare",
  "name": "Date Compare Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `dateCompare`.                                                                                                 |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                             |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute            | Type             | Required | Description                                                                                                                       |
| -------------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `firstDate`          | string \| object | Yes      | First date (left-hand side). ISO8601 format or `"now"`.                                                                           |
| `secondDate`         | string \| object | Yes      | Second date (right-hand side). ISO8601 format or `"now"`.                                                                         |
| `operator`           | string           | Yes      | `LT` (<), `LTE` (<=), `GT` (>), `GTE` (>=).                                                                                        |
| `positiveCondition`  | string           | Yes      | Value to return if comparison is true.                                                                                             |
| `negativeCondition`  | string           | Yes      | Value to return if comparison is false.                                                                                           |

## Examples

### Example 1: Lifecycle state (active vs terminated)

If current datetime < termination date → "active"; otherwise → "terminated":

```json
{
  "attributes": {
    "firstDate": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "termination_date"
      },
      "type": "accountAttribute"
    },
    "secondDate": "now",
    "operator": "gt",
    "positiveCondition": "active",
    "negativeCondition": "terminated"
  },
  "type": "dateCompare",
  "name": "Date Compare Transform"
}
```

### Example 2: Legacy vs regular (hire date threshold)

If hire date <= 1995-12-31 → "legacy"; otherwise → "regular":

```json
{
  "attributes": {
    "firstDate": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "hire_date"
      },
      "type": "accountAttribute"
    },
    "secondDate": {
      "attributes": {
        "input": "12/31/1995",
        "inputFormat": "M/d/yyyy",
        "outputFormat": "ISO8601"
      },
      "type": "dateFormat"
    },
    "operator": "lte",
    "positiveCondition": "legacy",
    "negativeCondition": "regular"
  },
  "type": "dateCompare",
  "name": "Date Compare Transform"
}
```
