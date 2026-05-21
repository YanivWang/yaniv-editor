# Feature Status

Implemented abilities are exposed through `preset` and `features`:

- image
- video
- table
- math
- AI
- format painter
- outline
- find and replace
- Office paste
- slash command
- drag handle

The recommended starting point is `preset="basic"`. Use `preset="full"` for the advanced document capability set. Use `preset="notion"` for block editing.

AI is not enabled by any preset by default. Enable it with `:features="{ ai: true }"`.

Layout chrome is selected by preset. Ability overrides are selected by `features`.
