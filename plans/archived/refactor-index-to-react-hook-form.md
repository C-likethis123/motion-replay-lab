# Ticket: Refactor index.tsx to use React Hook Form

Goal:
- Refactor the form handling in `app/index.tsx` to use `react-hook-form` for better performance, reduced boilerplate, and improved form validation handling.

Scope:
- Install `react-hook-form` and `@hookform/resolvers` (if needed for zod/yup validation).
- Refactor the existing state-based form handling in `app/index.tsx` to use `useForm`.
- Implement schema validation (if required, check project conventions for validation libraries).
- Ensure existing form behavior (input changes, submission) is preserved.
- Update `components/labelled-text-input.tsx` or any other components as necessary to work seamlessly with `Controller` or `useFormContext` if needed.

Definition of done:
- `app/index.tsx` utilizes `react-hook-form`.
- Form state is managed via `useForm` instead of `useState`.
- Existing form functionality (validation, submission) works identically.
- No regressions in form input responsiveness.

Steps to verify:
1. Verify the form in `app/index.tsx` functions exactly as before.
2. Check if form submissions are processed correctly.
3. Validate that form validation errors (if any) are displayed correctly.
4. Ensure no console warnings related to controlled/uncontrolled inputs.
