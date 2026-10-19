# REPORT: fix-20-follower-guard

## Commits
- d850ae9 fix(web): the DM language follower only applies while a DM page is shown
- d115be3 fix(api): a reconnect refetch and a repair never run at the same time
- 0abeca6 fix(web): the error page stops the DM language follower

## Checks run
- `pnpm check`: green
- `pnpm test`: green, 2208 tests
- `pnpm build`: green
- `E2E_PORT=3100 pnpm e2e`: green, 24 passed. `ss -ltn` shows no listener on 3100 or the agent ports before or after the run.
- Each new test fails without its change:
  - Without the guard in `router.tsx`, the error-page test that uses a throwing loader fails.
  - Without `leaveDm()` in `notFound`, the route-walk test fails. It passes on the tree as it stands.
  - Without the `hono-client.ts` change, both new `hono-client.test.ts` tests fail.
  - With `router.tsx` and `pages.tsx` reverted to before commit 0abeca6, both new tests in that commit fail.

## Questions
1. The unit project runs in Node and the repo has no DOM package (no jsdom, happy-dom or similar). The `storybook` and `visual` browser projects only cover `packages/ui`, which this batch must not touch. So no test renders a DM child that throws during render.
   - The new test in `routeLocale.test.ts` takes the root `errorElement` from `createRoutes` and calls its `onShow`, which is what the error page's mount effect does. It then delivers the late session and checks that the language stays the browser language.
   - `router.test.ts` checks that the root `errorElement` is `RouteError` and gets an `onShow` function.
   - Not verified by any test: that `RouteError`'s `useEffect` calls `onShow` when React Router's error boundary shows it. This is a hypothesis.
   - To cover it with a real render, one of these is needed:
     - 1a: a browser test project for `apps/web` in `vite.config.ts`, plus adding it to the `test` script in `package.json`;
     - 1b: a DOM package such as jsdom, which is a new dependency.
2. The old test `maps RouteError to UnexpectedError with a reload action` called `RouteError()` directly. `RouteError` now uses a hook, so it cannot be called outside a render, and that test is replaced.
   - Its replacement checks `RouteError` as the root `errorElement` with `onShow`.
   - Still covered by the existing server-render test: `RouteError` renders `UnexpectedError` with the reload text.
   - No longer covered: that `onReload` is a function.

## Left undone
- A test that renders a DM page which throws during render (Question 1).

## Processes left running
none
