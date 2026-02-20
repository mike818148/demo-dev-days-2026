# Identity Attribute Transform

**Reference:** [Identity Attribute | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/identity-attribute)

## Overview

Use the **identity attribute** transform to get the value of a user's identity attribute. It is often used within a source's **account create** or **disable** profile (e.g. to provision identity data onto an account).

## When to use

- **Account create / disable profiles**: To pass an identity attribute value (e.g. email, SailPoint User Name) into account provisioning or disable logic.
- **Nested inside other transforms**: As input to concat, lower, replace, etc., when the value must come from the identity rather than from a source account.

## When not to use

- **Inside another identity profile attribute's calculation**: Identity attribute calculations run in a multi-threaded process; there is no guarantee that a specific identity attribute has current data or even exists at calculation time. Referencing identity attributes within another identity attribute's transform can lead to **identity exceptions**. Use identity attribute transform only in **account**-side contexts (create/disable profiles), not in identity profile mappings that compute other identity attributes.

---

## Transform structure

The transform requires the desired identity attribute's system (camel-cased) **name** in `attributes`, plus top-level `type` and `name`.

```json
{
  "type": "identityAttribute",
  "name": "Identity Attribute Transform",
  "attributes": {
    "name": "email"
  }
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `identityAttribute`.                                                                                          |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

The `attributes` object configures which identity attribute to look up.

| Attribute | Type   | Required | Description                                                                                                                       |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | string | Yes      | The system (camel-cased) name of the identity attribute to return (e.g. `email`, `uid`, `identificationNumber`).                  |
| `input`   | object | No       | Explicitly defines the input data passed into the transform. If not provided, the transform uses input from the UI configuration. |

## Examples

### Example 1: SailPoint User Name (`uid`)

Returns the user's SailPoint User Name identity attribute.

```json
{
  "type": "identityAttribute",
  "name": "Identity Attribute Transform",
  "attributes": {
    "name": "uid"
  }
}
```

### Example 2: Employee Number

Returns the user's Employee Number identity attribute.

```json
{
  "type": "identityAttribute",
  "name": "Identity Attribute Transform",
  "attributes": {
    "name": "identificationNumber"
  }
}
```

### Example 3: Email

Returns the user's email identity attribute (often used in account create for email-based accounts).

```json
{
  "type": "identityAttribute",
  "name": "Identity Attribute Transform",
  "attributes": {
    "name": "email"
  }
}
```

## Notes

- **Attribute name**: Use the **system** (camel-cased) name of the identity attribute (e.g. `identificationNumber`), not the display name.
- **Context**: Safe in account create/disable profiles and in transforms that are used there. Do **not** use as input when computing another identity attribute in an identity profile mapping.
