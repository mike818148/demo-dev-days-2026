# Static Transform

**Reference:** [Static | SailPoint Developer Community](https://developer.sailpoint.com/docs/extensibility/transforms/operations/static)

## Overview

Use the **static** transform to return a fixed string value or to evaluate **Velocity Template Language** (VTL). Supports if/then/else logic, for loops, and dynamic variables from other transforms.

**Account create profiles:** In create profiles, you can reference attributes higher in the list. E.g. `$displayName@yourdomain.com` for email when displayName is created first.

## Transform structure

```json
{
  "attributes": {
    "value": "Employee"
  },
  "type": "static",
  "name": "Static Transform"
}
```

## Top-level properties

| Property                  | Type    | Required | Description                                                                                                                  |
| ------------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | string  | Yes      | Must be set to `static`.                                                                                                     |
| `name`                    | string  | Yes      | The name of the transform as it appears in the UI dropdown menus.                                                            |
| `requiresPeriodicRefresh` | boolean | No       | Whether the transform logic should be reevaluated every evening as part of the identity refresh process. Default is `false`. |

## Attributes

| Attribute             | Type   | Required | Description                                                                            |
| --------------------- | ------ | -------- | -------------------------------------------------------------------------------------- |
| `value`               | string | Yes      | Fixed string or Velocity template (e.g. `$variableName`, `#if($x=='y')...`).           |
| _(dynamic variables)_ | object | No       | Additional properties serve as variables in the value. Reference with `$variableName`. |

## Examples

### Example 1: Variable from account attribute

```json
{
  "attributes": {
    "workerType": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "empType"
      },
      "type": "accountAttribute"
    },
    "value": "$workerType"
  },
  "type": "static",
  "name": "Static Transform"
}
```

### Example 2: If/else with Velocity

```json
{
  "attributes": {
    "workerType": {
      "attributes": {
        "sourceName": "HR Source",
        "attributeName": "empType"
      },
      "type": "accountAttribute"
    },
    "value": "#if($workerType=='Employee')Full-Time#{else}Contingent#end"
  },
  "type": "static",
  "name": "Static Transform"
}
```

## References

- [Velocity User Guide](https://velocity.apache.org/engine/1.7/user-guide.html)
- [Velocity VTL Reference](https://velocity.apache.org/engine/2.0/vtl-reference.html)
