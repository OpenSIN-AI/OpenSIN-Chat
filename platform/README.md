# Platform

Deployment and runtime infrastructure lives here.

- `containers/image` builds and starts the production image.
- `containers/compose` defines local and production container topology.
- `ci` contains CI runtime helpers.
- `automation` contains operational automation definitions.

Application source must not be placed in this directory.
