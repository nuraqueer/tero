import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { getRoutes } from 'expo-router/build/getRoutes';
import { TabRouter } from 'expo-router/build/react-navigation/routers/TabRouter';
import { StackRouter } from 'expo-router/build/react-navigation/routers/StackRouter';

/** Load the layout's exported settings without mounting its native UI dependencies. */
function layoutSettings() {
  const path = new URL('../app/(tabs)/_layout.tsx', import.meta.url);
  const source = ts.createSourceFile(
    path.pathname,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
  );
  const printer = ts.createPrinter();
  const settings = source.statements.filter(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) &&
      statement.declarationList.declarations.some(
        (declaration) =>
          ts.isIdentifier(declaration.name) && declaration.name.text === 'unstable_settings',
      ),
  );
  const code = ts.transpileModule(
    settings
      .map((statement) => printer.printNode(ts.EmitHint.Unspecified, statement, source))
      .join('\n'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports: { unstable_settings?: { initialRouteName: string } } = {};
  new Function('exports', code)(exports);
  return exports.unstable_settings;
}

function routeTree() {
  const files = {
    './_layout.tsx': {},
    './(tabs)/_layout.tsx': { unstable_settings: layoutSettings() },
    './(tabs)/you.tsx': {},
    './(tabs)/gathering.tsx': {},
    './(tabs)/messages.tsx': {},
    './chat.tsx': {},
  };
  const context = Object.assign(
    (key: string) => ({ default: () => null, ...files[key as keyof typeof files] }),
    {
      keys: () => Object.keys(files),
      resolve: (key: string) => key,
      id: 'navigation-entry',
    },
  );
  return getRoutes(context, { platform: 'ios', importMode: 'sync', skipGenerated: true })!;
}

describe('unlocked mobile entry', () => {
  it('selects Gathering even when Yoru is the first discovered tab', () => {
    const tabs = routeTree().children.find((route) => route.route === '(tabs)')!;
    const routeNames = tabs.children.map((route) => route.route);
    const state = TabRouter({ initialRouteName: tabs.initialRouteName }).getInitialState({
      routeNames,
      routeParamList: Object.fromEntries(routeNames.map((name) => [name, undefined])),
      routeGetIdList: {},
    });
    expect(state.routes[state.index].name).toBe('gathering');
  });

  it('preserves an explicit Yoru tab selection', () => {
    const tabs = routeTree().children.find((route) => route.route === '(tabs)')!;
    const routeNames = tabs.children.map((route) => route.route);
    const state = TabRouter({ initialRouteName: tabs.initialRouteName }).getRehydratedState(
      { stale: true, index: 0, routes: [{ name: 'you' }] },
      { routeNames, routeParamList: {}, routeGetIdList: {} },
    );
    expect(state.routes[state.index].name).toBe('you');
  });

  it('preserves an explicit chat route outside the tabs', () => {
    const routeNames = routeTree().children.map((route) => route.route);
    const state = StackRouter({}).getRehydratedState(
      { stale: true, index: 0, routes: [{ name: 'chat', params: { peer: 'test-peer' } }] },
      { routeNames, routeParamList: {}, routeGetIdList: {} },
    );
    expect(state.routes[state.index].name).toBe('chat');
    expect(state.routes[state.index].params).toEqual({ peer: 'test-peer' });
  });
});
