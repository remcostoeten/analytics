import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

type TypeDeclaration = ESTree.TSTypeAliasDeclaration | ESTree.TSInterfaceDeclaration;

type Component = ESTree.Function | ESTree.ArrowFunctionExpression;

type LocalType = {
  declaration: TypeDeclaration;
  exported: boolean;
};

const expectedName = "Props";

function isTypeDeclaration(node: ESTree.Node): node is TypeDeclaration {
  return node.type === "TSTypeAliasDeclaration" || node.type === "TSInterfaceDeclaration";
}

function unwrapExport(statement: ESTree.Node): ESTree.Node | null {
  if (
    statement.type === "ExportNamedDeclaration" ||
    statement.type === "ExportDefaultDeclaration"
  ) {
    return statement.declaration;
  }
  return statement;
}

function collectTypes(program: ESTree.Program): LocalType[] {
  const types: LocalType[] = [];
  for (const statement of program.body) {
    const inner = unwrapExport(statement);
    if (inner && isTypeDeclaration(inner)) {
      types.push({ declaration: inner, exported: inner !== statement });
    }
  }
  return types;
}

function isComponentName(name: string): boolean {
  const first = name.charAt(0);
  return first !== first.toLowerCase();
}

function collectComponents(program: ESTree.Program): Component[] {
  const components: Component[] = [];
  for (const statement of program.body) {
    const inner = unwrapExport(statement);
    if (!inner) continue;
    if (inner.type === "FunctionDeclaration" && inner.id && isComponentName(inner.id.name)) {
      components.push(inner);
    }
    if (inner.type !== "VariableDeclaration") continue;
    for (const declarator of inner.declarations) {
      const { id, init } = declarator;
      if (id.type !== "Identifier" || !isComponentName(id.name) || !init) continue;
      if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
        components.push(init);
      }
    }
  }
  return components;
}

function isTypedBy(component: Component, name: string): boolean {
  const [first] = component.params;
  if (!first || first.type === "TSParameterProperty") return false;
  const annotation = first.typeAnnotation?.typeAnnotation;
  return (
    annotation?.type === "TSTypeReference" &&
    annotation.typeName.type === "Identifier" &&
    annotation.typeName.name === name
  );
}

/**
 * @name localTypeName
 * @description Requires the single, non-exported type of a component file to be named `Props`
 * when it types a component's props. Files with several types, and exported types, are skipped.
 *
 * @example
 * type Props = { note: Note };
 *
 * function NoteRow({ note }: Props) {
 *   return <li>{note.title}</li>;
 * }
 */
export const localTypeName = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Name the single local props type of a component file `Props`.",
    },
    messages: {
      rename: "Rename `{{name}}` to `Props`: it is the only local type in this file.",
    },
  },
  createOnce(context) {
    return {
      Program(program) {
        const types = collectTypes(program);
        if (types.length !== 1) return;
        const [only] = types;
        if (!only || only.exported) return;
        const { name } = only.declaration.id;
        if (name === expectedName) return;
        const isProps = collectComponents(program).some((component) => isTypedBy(component, name));
        if (!isProps) return;
        context.report({ node: only.declaration.id, messageId: "rename", data: { name } });
      },
    };
  },
});
