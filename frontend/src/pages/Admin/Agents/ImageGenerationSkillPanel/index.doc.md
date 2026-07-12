# Image Generation Skill Panel

## Purpose

Renders admin configuration for the image-generation agent skill, including gateway URL, API key, model, and stored-key removal.

## Notes

- The API-key edit and clear branches use stable keys so React does not reuse a password input as a hidden sentinel input.
- The `-CLEAR-` sentinel is intentionally submitted only when the admin checks the remove-key control.
