# Split Transform

**Reference:** [Split | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/split)

## Overview

Use the **split** transform to split a string by a delimiter (character or regex) and return the Nth element of the resulting array. Useful for extracting parts of combined values (e.g. split "John,Doe" to get first or last name).

## Transform structure

```json
{
  "attributes": {
    "delimiter": ",",
    "index": 5
  },
  "type": "split",
  "name": "Split Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `split`.                                                                                                      |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute   | Type    | Required | Description                                                                        |
| ----------- | ------- | -------- | ---------------------------------------------------------------------------------- |
| `delimiter` | string  | Yes      | Character or regex used to split the input.                                        |
| `index`     | integer | Yes      | 0-based index of the array element to return after splitting.                      |
| `throws`    | boolean | No       | If true, throw when index out of bounds; if false, return null. Default is `true`. |
| `input`     | object  | No       | Explicit input. If not provided, uses input from the UI configuration.             |

## Examples

### Example 1: Split by colon, get second element

**Input:** `"abc:123"`  
**Output:** `"123"`

```json
{
  "attributes": {
    "delimiter": ":",
    "index": 1
  },
  "type": "split",
  "name": "Split Transform"
}
```

### Example 2: Split by space, get fourth word

**Input:** `"The quick brown fox jumped over 10 lazy dogs"`  
**Output:** `"fox"`

```json
{
  "attributes": {
    "input": "The quick brown fox jumped over 10 lazy dogs",
    "delimiter": " ",
    "index": 3,
    "throws": true
  },
  "type": "split",
  "name": "Split Transform"
}
```
