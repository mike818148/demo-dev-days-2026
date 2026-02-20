# Base64 Encode Transform

**Reference:** [Base64 Encode | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/base64-encode)

## Overview

Use the **base64 encode** transform to take incoming data and encode it using a Base64-based text encoding scheme. The output is a string of 64 basic ASCII characters.

**Other considerations:** If the input is null, the transform returns null.

## Transform structure

The base64 encode transform only requires `type` and `name`:

```json
{
  "type": "base64Encode",
  "name": "Base64 Encode Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `base64Encode`.                                                                                               |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                             |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

The base64 encode transform only requires top-level properties. Use `attributes.input` for explicit input if needed.

## Examples

### Example 1: Encode string

**Input:** `1234`  
**Output:** `MTIzNA==`

```json
{
  "type": "base64Encode",
  "name": "Base64 Encode Transform"
}
```

### Example 2: Encode binary image

Takes a binary image as input and returns a Base64-encoded string.

```json
{
  "type": "base64Encode",
  "name": "Base64 Encode Transform"
}
```

## References

- [Base64 - MDN](https://developer.mozilla.org/en-US/docs/Glossary/Base64)
- [Base64 - Wikipedia](https://en.wikipedia.org/wiki/Base64)
