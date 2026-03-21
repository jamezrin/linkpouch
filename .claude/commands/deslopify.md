Review recently changed code for AI-generated slop and fix it. You are acting as a meticulous senior engineer who hates bloat, verbosity, and unnecessary complexity.

## What to fix

Work through each category below in order. For each issue found, fix it directly — do not just report it.

### 1. Fully-qualified class references

Find every place where a class is referenced with its full package path inline (e.g., `java.util.List`, `com.example.Foo`) when:
- The class is not already imported under a conflicting simple name, AND
- The reference is inside a method body, field declaration, annotation, or generic parameter

Replace the inline fully-qualified reference with the simple name and add the corresponding import. Do not touch references inside `import` statements or JavaDoc `@link` tags that are correct as-is.

### 2. Overly large or complex classes, components, or files

A class/file is a candidate for splitting if it:
- Handles multiple distinct responsibilities (violates SRP)
- Exceeds ~300 lines in a domain or application class, or ~200 lines in a controller or mapper
- Contains clearly separable logical groups (e.g., a controller with unrelated endpoint groups, a service with unrelated operations, a mapper with methods for multiple aggregates)

For each candidate:
1. Identify the logical split boundary clearly.
2. Extract the cohesive subset into a new, focused class/file with a precise name.
3. Update all call sites and imports.
4. Do not split a class just because it is long — only split if the extraction has a clear, cohesive identity.

### 3. Other common AI slop

Fix any of the following found in recently changed code:

- **Unnecessary comments** — remove comments that just restate the code (e.g., `// get the user`, `// return result`). Keep comments only where the intent is not obvious from reading the code.
- **Redundant null checks** — remove null guards on values that cannot be null given framework guarantees or prior validation.
- **Defensive no-op catch blocks** — remove empty or log-only catch blocks that swallow real errors, unless there is a documented reason.
- **Over-abstracted one-off helpers** — inline helper methods that are called exactly once and add no clarity; remove them.
- **Pointless variable aliases** — remove variables that are assigned once and immediately returned or passed without transformation.
- **Duplicate logic** — consolidate identical or near-identical blocks into one.
- **Unused imports, fields, or variables** — remove them.
- **Dead code and commented-out code** — remove it unless it has an explicit TODO with a reason.
- **Verbose boolean expressions** — simplify `if (x == true)` to `if (x)`, `if (x == false)` to `if (!x)`, and `return condition ? true : false` to `return condition`.
- **Magic numbers** — replace unexplained numeric literals with named constants, unless the value is self-evident in context (e.g., `0`, `1` in an index).
- **Overly generic names** — rename variables like `data`, `result`, `temp`, `item`, `obj`, `val` to names that reflect their actual type and role.

## Scope

Focus on **recently changed files** (modified, added, or staged in the current branch). Use `git diff --name-only HEAD~5` to identify them. Do not refactor code that was not touched in this branch unless a split from rule 2 requires touching a call site.

## How to work

1. Run `git diff --name-only HEAD~5` to get the list of changed files.
2. Read each changed file in full before making edits.
3. Apply fixes from all three categories to each file.
4. After editing, re-read each modified file to confirm the fixes are correct and nothing was accidentally broken.
5. Report a concise summary: which files were changed and what categories of issues were fixed in each. Do not list every individual fix — summarise by category per file.

## What NOT to do

- Do not change logic, behaviour, or test expectations.
- Do not introduce new abstractions or patterns beyond what the cleanup demands.
- Do not reformat code that is already correctly formatted (Spotless/Prettier will handle that).
- Do not add error handling or validation that was not there before.
- Do not add comments where none existed.
- Do not rename classes, methods, or public API surfaces — only internal variable names.
