import { defineRule } from "@oxlint/plugins";

/**
 * @name noSilentCatch
 * @description Requires every `catch` block to contain a statement. A comment alone does not
 * count, so an intentionally swallowed error has to call `noop()`.
 *
 * @example
 * try {
 *   localStorage.removeItem(key);
 * } catch {
 *   noop();
 * }
 */
export const noSilentCatch = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow catch blocks without a statement, even when they hold a comment.",
    },
    messages: {
      silent:
        "Handle the error, or call `noop()` from `@remcostoeten/analytics-shared/noop` to swallow it on purpose.",
    },
  },
  createOnce(context) {
    return {
      CatchClause(node) {
        if (node.body.body.length > 0) return;
        context.report({ node: node.body, messageId: "silent" });
      },
    };
  },
});
