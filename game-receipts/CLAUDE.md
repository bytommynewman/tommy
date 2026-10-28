@AGENTS.md

Game Receipts app. Read PROJECT_STATUS.md first. Pure grading logic lives in lib/scoring (keep it deterministic and versioned; bump GRADING_VERSION on any rubric change). Services take a `DB` value and are unit-tested; Server Actions in app/actions.ts are the only mutation entry points. Run `npm test`, `npm run lint`, `npm run typecheck` before committing.
