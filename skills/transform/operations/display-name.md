# Display Name Transform

**Reference:** [Display Name | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/display-name)

## Overview

Use the **display name** transform to form an identity's Display Name using Preferred Name (when it exists) over Given Name, then appending Family Name.

**Formula:** (Preferred Name OR Given Name) + " " + Family Name

## Transform structure

```json
{
  "name": "Display Name Transform",
  "type": "displayName",
  "attributes": {
    "input": "input"
  }
}
```

## Top-level properties

| Property | Type   | Required | Description                                                                   |
| -------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `type`   | string | Yes      | Must be set to `displayName`.                                                 |
| `name`   | string | Yes      | The name of the transform as it appears in the UI dropdown menus.             |

## Attributes

The `attributes` object must be present and not null. The transform automatically uses the identity's Preferred Name (if available) or Given Name, combined with Family Name.

## Examples

### Example: Preferred Name vs Given Name

- **Preferred Name:** John, **Given Name:** Jonathan, **Family Name:** Doe → **Output:** `John Doe`
- **Preferred Name:** (not set), **Given Name:** Jonathan, **Family Name:** Doe → **Output:** `Jonathan Doe`

```json
{
  "name": "Display Name Transform",
  "type": "displayName",
  "attributes": {
    "input": "input"
  }
}
```
