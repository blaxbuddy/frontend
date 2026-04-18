// Dijkstra shortest-path on a fully-connected geographic graph.
// Nodes are identified by string IDs and have lat/lng coordinates.
// Edge weights = haversine distance (km) between every pair of nodes.

export type GeoNode = { id: string; lat: number; lng: number };

const R_KM = 6371;

export function haversineKm(a: GeoNode, b: GeoNode): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R_KM * Math.asin(Math.sqrt(x));
}

/**
 * Dijkstra over a complete graph defined by `nodes`.
 * Returns the shortest path (sequence of node IDs) and total distance (km)
 * from `sourceId` to `targetId`.
 *
 * On a complete graph the shortest path is simply the direct edge, so we
 * support an optional `waypointId` that MUST be visited in between
 * (e.g. driver -> business -> shelter). When a waypoint is provided we
 * run Dijkstra twice and concatenate the legs.
 */
export function shortestPath(
  nodes: GeoNode[],
  sourceId: string,
  targetId: string,
  waypointId?: string,
): { path: string[]; distanceKm: number } | null {
  if (waypointId) {
    const leg1 = dijkstra(nodes, sourceId, waypointId);
    const leg2 = dijkstra(nodes, waypointId, targetId);
    if (!leg1 || !leg2) return null;
    return {
      path: [...leg1.path, ...leg2.path.slice(1)],
      distanceKm: leg1.distanceKm + leg2.distanceKm,
    };
  }
  return dijkstra(nodes, sourceId, targetId);
}

function dijkstra(
  nodes: GeoNode[],
  sourceId: string,
  targetId: string,
): { path: string[]; distanceKm: number } | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(sourceId) || !byId.has(targetId)) return null;

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const n of nodes) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
    unvisited.add(n.id);
  }
  dist.set(sourceId, 0);

  while (unvisited.size > 0) {
    // Pick unvisited node with smallest tentative distance
    let u: string | null = null;
    let best = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id)!;
      if (d < best) {
        best = d;
        u = id;
      }
    }
    if (u === null || best === Infinity) break;
    if (u === targetId) break;
    unvisited.delete(u);

    const uNode = byId.get(u)!;
    // Complete graph: relax edges to every remaining neighbour
    for (const vId of unvisited) {
      const vNode = byId.get(vId)!;
      const alt = best + haversineKm(uNode, vNode);
      if (alt < dist.get(vId)!) {
        dist.set(vId, alt);
        prev.set(vId, u);
      }
    }
  }

  const total = dist.get(targetId);
  if (total === undefined || !isFinite(total)) return null;

  const path: string[] = [];
  let cur: string | null = targetId;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  if (path[0] !== sourceId) return null;
  return { path, distanceKm: total };
}
