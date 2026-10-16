/** Utilitários puros para a árvore do organograma. */

export type FlatNode = { id: string; parentId: string | null; order: number };
export type TreeNode<T extends FlatNode> = T & { children: TreeNode<T>[] };

/** Monta a árvore; nós com pai inexistente/inativo viram raízes. */
export function buildTree<T extends FlatNode>(nodes: T[]): TreeNode<T>[] {
  const map = new Map<string, TreeNode<T>>();
  for (const n of nodes) map.set(n.id, { ...n, children: [] });
  const roots: TreeNode<T>[] = [];
  for (const n of map.values()) {
    const parent = n.parentId ? map.get(n.parentId) : undefined;
    if (parent && parent.id !== n.id) parent.children.push(n);
    else roots.push(n);
  }
  const sort = (list: TreeNode<T>[]) => {
    list.sort((a, b) => a.order - b.order);
    list.forEach((c) => sort(c.children));
  };
  sort(roots);
  return roots;
}

/** Verdadeiro se mover `id` para baixo de `newParentId` criaria um ciclo. */
export function wouldCreateCycle(nodes: FlatNode[], id: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (newParentId === id) return true;
  const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
  let cursor: string | null | undefined = newParentId;
  for (let i = 0; cursor && i <= nodes.length; i++) {
    if (cursor === id) return true;
    cursor = parentOf.get(cursor);
  }
  return false;
}

/** Ids de `id` e todos os seus descendentes. */
export function descendantIds(nodes: FlatNode[], id: string): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
        out.add(n.id);
        grew = true;
      }
    }
  }
  return out;
}
