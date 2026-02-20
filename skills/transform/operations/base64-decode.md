# Base64 Decode Transform

**Reference:** [Base64 Decode | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/base64-decode)

## Overview

Use the **base64 decode** transform to take incoming data encoded with Base64 and render it in its original binary format. Base64 is commonly used for binary data (images, etc.) in HTML, email, or text documents.

**Other considerations:** If the input is null, the transform returns null.

## Transform structure

The base64 decode transform only requires `type` and `name`:

```json
{
  "type": "base64Decode",
  "name": "Base64 Decode Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `base64Decode`.                                                                                               |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                             |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`.  |

## Attributes

The base64 decode transform only requires top-level properties. Use `attributes.input` for explicit input if needed.

## Examples

### Example 1: Decode string

**Input:** `"MTIzNA=="`  
**Output:** `1234`

```json
{
  "type": "base64Decode",
  "name": "Base64 Decode Transform"
}
```

### Example 2: Decode image

Takes Base64-encoded image data and returns the original binary (e.g. image).

```json
{
  "type": "base64Decode",
  "name": "Base64 Decode Transform with Image"
}
```

## References

- [Base64 - MDN](https://developer.mozilla.org/en-US/docs/Glossary/Base64)
- [Base64 - Wikipedia](https://en.wikipedia.org/wiki/Base64)
