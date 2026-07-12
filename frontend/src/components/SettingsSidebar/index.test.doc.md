# SettingsSidebar Tests

## Purpose

Regression tests for the settings sidebar shell, menu rendering, and router-safe mounting behavior.

## Notes

- Provider mocks should render JSX fragments, not return a bare `children` function, so React does not warn about function children.
