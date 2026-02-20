# Date Format Transform

**Reference:** [Date Format | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/date-format)

## Overview

Use the **date format** transform to convert datetime strings from one format to another. Useful when syncing data between systems that use different date/time formats.

Uses Java SimpleDateFormat syntax. Built-in named formats: `ISO8601`, `LDAP`, `PEOPLE_SOFT`, `EPOCH_TIME_JAVA`, `EPOCH_TIME_WIN32`.

**Note:** This transform does not support the `now` keyword as input.

## Transform structure

```json
{
  "attributes": {
    "inputFormat": "EPOCH_TIME_JAVA",
    "outputFormat": "ISO8601"
  },
  "type": "dateFormat",
  "name": "Date Format Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `dateFormat`.                                                                                                 |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                             |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

| Attribute       | Type   | Required | Description                                                                                                                       |
| --------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `inputFormat`   | string | No       | Format of incoming date. SimpleDateFormat pattern or named format. Default is `ISO8601`.                                          |
| `outputFormat`  | string | No       | Desired output format. SimpleDateFormat pattern or named format. Default is `ISO8601`.                                             |
| `input`         | object | No       | Explicit input. If not provided, uses input from the UI configuration.                                                            |

## Named formats

| Name               | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `ISO8601`          | `yyyy-MM-dd'T'HH:mm:ss.SSSZ`                                                |
| `LDAP`             | `yyyyMMddHHmmss.Z`                                                          |
| `PEOPLE_SOFT`      | `MM/dd/yyyy`                                                                |
| `EPOCH_TIME_JAVA`  | Milliseconds since 1970-01-01                                               |
| `EPOCH_TIME_WIN32` | 100-nanosecond intervals since 1601-01-01                                   |

## Examples

### Example 1: Epoch to ISO8601

**Input:** `144642632190`  
**Output:** `1974-08-02T02:30:32.190-00`

```json
{
  "attributes": {
    "inputFormat": "EPOCH_TIME_JAVA",
    "outputFormat": "ISO8601"
  },
  "type": "dateFormat",
  "name": "Date Format Transform"
}
```

### Example 2: US date to database format

**Input:** `4/1/1975`  
**Output:** `1975-04-01`

```json
{
  "attributes": {
    "inputFormat": "M/d/yyyy",
    "outputFormat": "yyyy-MM-dd"
  },
  "type": "dateFormat",
  "name": "Date Format Transform"
}
```

## References

- [Java SimpleDateFormat](http://docs.oracle.com/javase/8/docs/api/java/text/SimpleDateFormat.html)
