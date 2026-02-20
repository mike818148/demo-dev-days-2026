# UUID Generator Transform

**Reference:** [UUID Generator | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/uuid-generator)

## Overview

Use the **UUID generator** transform to create a universally unique identifier (UUID) as a 36-character string.

**Note:** Uniqueness is not guaranteed—collision probability is about 1 in 68 billion. No uniqueness checking is performed.

## Transform structure

```json
{
  "type": "uuid",
  "name": "UUID Generator Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `uuid`.                                                                                                       |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

The UUID generator transform only requires top-level properties. No attributes needed.

## Examples

**Output:** e.g. `"f7493c55-f3fc-491a-b352-4664d71f885b"`

```json
{
  "type": "uuid",
  "name": "UUID Generator Transform"
}
```
