# Right Pad Transform

**Reference:** [Right Pad | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/right-pad)

## Overview

Use the **right pad** transform to pad an incoming string with a character on the right to reach a specific length. Useful for data normalization (e.g. uniform-length employee IDs).

**Other considerations:** If the input is null, the transform returns null.

## Transform structure

```json
{
  "attributes": {
    "padding": "0",
    "length": "5"
  },
  "type": "rightPad",
  "name": "Right Pad Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `rightPad`.                                                                                                   |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute | Type   | Required | Description                                                            |
| --------- | ------ | -------- | ---------------------------------------------------------------------- |
| `length`  | string | Yes      | Integer value for the final output string's desired length.            |
| `padding` | string | No       | Character to use for padding. Default is a single space `" "`.         |
| `input`   | object | No       | Explicit input. If not provided, uses input from the UI configuration. |

## Examples

### Example 1: Pad to 8 characters with zeros

**Input:** `"1234"`  
**Output:** `"12340000"`

```json
{
  "attributes": {
    "padding": "0",
    "length": "8"
  },
  "type": "rightPad",
  "name": "Right Pad Transform"
}
```

### Example 2: Pad employee ID from HR Source

**Input:** `"1234"`  
**Output:** `"1234xxx"`

```json
{
  "attributes": {
    "padding": "x",
    "length": "7",
    "input": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "employeeID"
      },
      "type": "accountAttribute"
    }
  },
  "type": "rightPad",
  "name": "Right Pad Transform"
}
```
