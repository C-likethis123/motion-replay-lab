# Ticket: Web App Scaffolding and Theme System

> [!NOTE]
> The scope of this ticket is for the website app (i.e. the folder in `website`).

Goal:
- Scaffold the website codebase in a new `website/` directory using Vite, React, TypeScript, and Vanilla CSS.
- Implement the design tokens and layout system to match the mobile app's aesthetic.

Scope:
- Initialize the React + TypeScript app in `website/` using `npx -y create-vite@latest ./ --template react-ts`.
- Ensure `package.json` uses React version `19.2.3` and React DOM version `19.2.3` to match the mobile app configurations.
- Configure ESLint and TSConfig files for clean builds.
- Implement a global `index.css` defining CSS custom properties (variables) for all tokens in [theme.ts](file:///Users/chowjiaying/dance/mobile/lib/theme.ts):
  - Colors (e.g. `--color-app-background: #f8f4ee;`, `--color-accent: #52796f;`, etc.)
  - Spacing variables (`--spacing-screen`, `--spacing-screen-gap`, etc.)
  - Typography weights and sizes (`--font-size-title`, `--font-weight-bold`)
  - Border radii (`--radius-xl`)
- Set up application routing using `react-router-dom` to support three primary routes:
  - `/` (Library Dashboard)
  - `/video/:id` (Video Detail & Loop Settings)
  - `/practice/:id` (Focused Practice Player)
- Build a shared layout wrapper to handle viewport safe areas and standard application padding.

Definition of done:
- A Vite React application runs locally on port 5173 via `npm run dev`.
- Theme colors and styles render correctly across light/dark browsers using the design tokens.
- Routing works: navigating to `/`, `/video/123`, or `/practice/123` displays placeholder components.
- Linter and type check passes cleanly with `npm run lint` and `npm run typecheck` equivalent scripts.

Steps to verify:
1. Navigate to the `website` directory and run `npm run dev`.
2. Confirm the app is active at `http://localhost:5173`.
3. Manually change URLs to `/`, `/video/abc`, and `/practice/abc` to confirm the router successfully resolves the routes.
4. Verify that background colors and basic layout margins utilize the CSS variables defined from `theme.ts`.
