# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-09-01

### Added

- Static class properties are now correctly parsed with static scope instead of instance scope.
  - Static properties now use the correct `.` separator in longnames (e.g., `ClassName.propertyName`)
  - Static properties are properly categorized with `scope: 'static'`
  - Resolves [JSDoc Issue #2144](https://github.com/jsdoc/jsdoc/issues/2144)

- ES6 class mixin static members now retain their static scope during augmentation.
  - Static methods in ES6 class mixins are no longer incorrectly converted to instance members
  - Static members maintain their static scope and separator during mixin augmentation
  - Traditional object mixins continue to work as expected (instance scope)
  - Resolves [JSDoc Issue #2146](https://github.com/jsdoc/jsdoc/issues/2146)

---

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
