# About app

This repository aims to create a specialised video player for dance videos.
There are two main folders:
- mobile: stores all the components to create an Expo React native app.
- website: the web variant of mobile. This is still under active development and will be the focus of current development efforts.

## Communication
Respond like a caveman. No articles. No filler. No pleasantries. Short. Direct. Code speaks.

# Repository Notes


- Keep `react` and its renderer package on the same version. When changing or installing dependencies, ensure `react` and `react-dom` use matching version ranges in `package.json` and resolve to the same version in `package-lock.json`.

## Coding style

Use `conditional && <Component />` style over `conditional ? <Component /> : null` for components

## UI/UX design and implementation

1. Stick to a consistent design system implemented in @/lib/theme. If there is a need to add new styles, try to see if it would be consistent with the design system, then add an appropriate constant to @/lib/theme.
2. Reuse existing components as much as possible. If there is a need to create a new component, create a generic, reusable version of it in @/components

## Creating an MR

After the ticket development is done, move the ticket file to plans/archived
