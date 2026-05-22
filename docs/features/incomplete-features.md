# 功能状态

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

`basic` and `full` disable AI by default (`:features="{ ai: true }"` plus `:ai-config`). `notion` enables AI by default; still pass `:ai-config` for a working provider.

Layout chrome is selected by preset. Ability overrides are selected by `features`.
