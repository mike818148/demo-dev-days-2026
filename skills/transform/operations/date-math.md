# Date Math Transform

**Reference:** [Date Math | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/date-math)

## Overview

Use the **date math** transform to add, subtract, and round components of a timestamp. Supports the `now` keyword for operations against the current date/time.

**Output format:** `yyyy-MM-dd'T'HH:mm`. Use `dateFormat` to convert to ISO8601 when needed (e.g. for dateCompare).

**Other considerations:**
- Input datetime must be ISO8601 format in UTC: `yyyy-MM-dd'T'HH:mm:ss.SSSZ` (e.g. `2020-10-28T12:00:00.000Z`).
- Rounding uses truncation. Round down = truncate; round up = truncate + add one unit.
- The "week" unit is not supported for rounding.
- If both `now` and `input` are present, `now` takes precedence.

## Transform structure

```json
{
  "attributes": {
    "expression": "+3M/h",
    "roundUp": true,
    "input": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "startDate"
      },
      "type": "accountAttribute"
    }
  },
  "type": "dateMath",
  "name": "Test Date Math Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `dateMath`.                                                                                                   |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                             |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute   | Type    | Required | Description                                                                                                                       |
| ----------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `expression`| string  | Yes      | Date/time operations. See abbreviations and operators below.                                                                     |
| `roundUp`   | boolean | No       | `true` = round up (truncate + add unit); `false` = round down. Default is `false`.                                                 |
| `input`     | object  | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Expression abbreviations

| Abbrev | Unit   |
| ------ | ------ |
| `y`    | year   |
| `M`    | month  |
| `w`    | week   |
| `d`    | day    |
| `h`    | hour   |
| `m`    | minute |
| `s`    | second |
| `now`  | current instant |

## Operators

| Symbol | Meaning  | Example   |
| ------ | -------- | --------- |
| `+`    | add      | `+3M`     |
| `-`    | subtract | `-5d`     |
| `/`    | round    | `/h`      |

## Expression examples

| Expression              | Result                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| `now`                   | Current date/time                                                      |
| `now/h`                 | Current date/time rounded to hour                                      |
| `now+1w`                | One week from now                                                      |
| `now-5d/d`              | Five days ago, rounded down to day                                     |
| `+3M`                   | Input date + 3 months                                                  |
| `+12h/s`                | Input date + 12 hours, rounded to second                              |

## Examples

### Example 1: Five days ago, rounded to day

```json
{
  "attributes": {
    "expression": "now-5d/d",
    "roundUp": false
  },
  "type": "dateMath",
  "name": "Date Math Transform"
}
```

### Example 2: Start date + 12 hours, rounded up to second

```json
{
  "attributes": {
    "expression": "+12h/s",
    "roundUp": true,
    "input": {
      "attributes": {
        "input": {
          "attributes": {
            "sourceName": "HR Source",
            "attributeName": "startDate"
          },
          "type": "accountAttribute"
        },
        "inputFormat": "MMM dd yyyy, HH:mm:ss.SSS",
        "outputFormat": "ISO8601"
      },
      "type": "dateFormat"
    }
  },
  "type": "dateMath",
  "name": "Date Math Transform"
}
```
