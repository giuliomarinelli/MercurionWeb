# Angular CommonJS exceptions

The production Angular build fails on any CommonJS module that is not listed
in `MercurionWebNg/scripts/check-bundle-gates.mjs`. These are intentionally
narrow exceptions, not a blanket warning suppression:

| Package | Reason | Owner | Removal plan |
| --- | --- | --- | --- |
| `@mercurion/rest-contracts` | The shared contract package currently emits CommonJS for Nest compatibility. | Web platform | Publish a dual ESM/CommonJS contract build and switch the Angular export condition. |
| `@rdkit/rdkit` | The vendor distribution exposes the browser runtime as CommonJS. It is already behind the chemistry lazy boundary. | Chemistry UI | Re-evaluate the vendor ESM distribution when the RDKit package is upgraded. |
| `quill-delta` | Quill 2 currently consumes this legacy dependency. Quill is loaded only by editor features. | Support UI | Remove when ngx-quill/Quill provides an ESM-only delta dependency. |
| `eventemitter3` | This is a transitive Quill runtime dependency and is not imported by the initial application graph. | Support UI | Remove with the Quill dependency migration above. |
| `fast-diff`, `lodash.clonedeep`, `lodash.isequal` | These are transitive Quill editor dependencies and are loaded only with the editor chunk. | Support UI | Remove with the Quill dependency migration above. |

The gate records all CommonJS inputs in the CI bundle artifact and fails on
any package outside this table. Adding an exception requires updating both
this table and the exact allowlist used by the gate.
