# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-08-07

### Added

- **Fix for ES6 default export issues**: The plugin now corrects wrong names and structures for exported classes, functions, object literals, and their members.
  - Fixes the issue where default exports appear as `exports` instead of their actual names
  - Corrects class method scoping and memberof relationships
  - Extracts meaningful names from `@type` annotations for object literals
  - Properly links class members (constructor, properties, methods) to their parent class
  - Resolves [JSDoc Issue #1132](https://github.com/jsdoc/jsdoc/issues/1132)
  - Resolves [JSDoc Issue #2023](https://github.com/jsdoc/jsdoc/issues/2023)
  - Resolves [JSDoc Issue #2038](https://github.com/jsdoc/jsdoc/issues/2038)

---

## [1.0.0] – 2025-07-06

### Added

- This marks the first release of **jsdoc-plugin-esnext**
- Smart JSDoc plugin to support native ES2022+ class features like private fields, static members and arrow-bound methods.
