import type { Select } from 'node-sql-parser';
import { EXPLORE_VIRTUAL_TABLES, type ExploreVirtualTable } from './constants';
import { ExploreEngineError } from './errors';
import { EXPLORE_ALLOWED_FUNCTIONS } from './function-allowlist';

type AstNode = Record<string, unknown>;

export type ExploreTableRef = AstNode & {
  db: string | null;
  table: string;
  as: string | null;
};

export type ExploreAstInspection = {
  tables: Set<ExploreVirtualTable>;
  tableRefs: ExploreTableRef[];
};

const FUNCTION_NODE_TYPES = new Set(['aggr_func', 'window_func']);
const FORBIDDEN_NODE_TYPES = new Set(['var', 'param']);

function isAstNode(value: unknown): value is AstNode {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTableRef(node: AstNode): node is ExploreTableRef {
  return typeof node.table === 'string' && !('column' in node);
}

function forEachChild(node: AstNode, visit: (child: AstNode) => void): void {
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isAstNode(item)) {
          visit(item);
        }
      }
    } else if (isAstNode(value)) {
      visit(value);
    }
  }
}

function resolveFunctionName(node: AstNode): string | null {
  if (FUNCTION_NODE_TYPES.has(node.type as string)) {
    return typeof node.name === 'string' ? node.name : '';
  }
  if (node.type !== 'function') {
    return null;
  }

  const name = node.name as { name?: unknown; schema?: unknown } | undefined;
  const parts = Array.isArray(name?.name) ? name.name : [];
  if (name?.schema || parts.length !== 1) {
    return '';
  }
  const value = (parts[0] as { value?: unknown }).value;
  return typeof value === 'string' ? value : '';
}

function assertAllowedFunction(node: AstNode): void {
  const name = resolveFunctionName(node);
  if (name === null) {
    return;
  }
  if (!EXPLORE_ALLOWED_FUNCTIONS.has(name.toLowerCase())) {
    throw new ExploreEngineError(
      `Function "${name || 'unknown'}" is not allowed in explore queries.`
    );
  }
}

// Object identifier types (regclass, regrole, regproc, ...) resolve names
// against the system catalogs, which would turn casts into catalog probes.
function assertAllowedCast(node: AstNode): void {
  if (node.type !== 'cast' || !Array.isArray(node.target)) {
    return;
  }
  for (const target of node.target) {
    const dataType = isAstNode(target) ? target.dataType : null;
    if (
      typeof dataType === 'string' &&
      dataType.toUpperCase().startsWith('REG')
    ) {
      throw new ExploreEngineError(
        `Casting to ${dataType} is not allowed in explore queries.`
      );
    }
  }
}

function collectFromItems(select: AstNode, tableRefs: Set<AstNode>): void {
  if (Array.isArray(select.with) && select.with.length > 0) {
    throw new ExploreEngineError('WITH clauses are not supported.');
  }

  const into = select.into as { position?: unknown; expr?: unknown } | null;
  if (into?.position || into?.expr) {
    throw new ExploreEngineError('SELECT INTO is not allowed.');
  }

  const from = Array.isArray(select.from) ? select.from : [];
  for (const item of from) {
    if (!isAstNode(item)) {
      throw new ExploreEngineError('Unsupported FROM clause.');
    }
    if (item.join) {
      throw new ExploreEngineError(
        'JOINs are not supported. Query one table at a time: events, users, or sessions.'
      );
    }
    if (isTableRef(item)) {
      tableRefs.add(item);
      continue;
    }
    const subquery = isAstNode(item.expr) ? item.expr.ast : null;
    if (!isAstNode(subquery)) {
      throw new ExploreEngineError(
        'FROM may only reference events, users, sessions, or a subquery over them.'
      );
    }
  }
}

function resolveVirtualTable(ref: ExploreTableRef): ExploreVirtualTable {
  const name = ref.table.toLowerCase();
  if (
    ref.db === null &&
    EXPLORE_VIRTUAL_TABLES.includes(name as ExploreVirtualTable)
  ) {
    return name as ExploreVirtualTable;
  }
  const qualified = ref.db ? `${ref.db}.${ref.table}` : ref.table;
  throw new ExploreEngineError(
    `Unknown table "${qualified}". Use events, users, or sessions.`
  );
}

/**
 * Walks the whole AST and fails closed on anything outside the explore
 * sandbox: unknown or schema-qualified tables, table references outside a
 * plain FROM item, non-allowlisted functions, CTEs, SELECT INTO and bind
 * parameters. Returns the FROM table nodes so the rewriter can replace them.
 */
export function inspectExploreAst(select: Select): ExploreAstInspection {
  const fromRefs = new Set<AstNode>();
  const allRefs: AstNode[] = [];

  const visit = (node: AstNode): void => {
    if (FORBIDDEN_NODE_TYPES.has(node.type as string)) {
      throw new ExploreEngineError('Query parameters are not allowed.');
    }
    assertAllowedFunction(node);
    assertAllowedCast(node);
    if (node.type === 'select') {
      collectFromItems(node, fromRefs);
    }
    if (isTableRef(node)) {
      allRefs.push(node);
    }
    forEachChild(node, visit);
  };

  visit(select as unknown as AstNode);

  const tables = new Set<ExploreVirtualTable>();
  const tableRefs: ExploreTableRef[] = [];
  for (const ref of allRefs) {
    if (!(fromRefs.has(ref) && isTableRef(ref))) {
      throw new ExploreEngineError('Unsupported table reference.');
    }
    tables.add(resolveVirtualTable(ref));
    tableRefs.push(ref);
  }

  return { tables, tableRefs };
}
