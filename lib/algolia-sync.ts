import { algoliasearch } from "algoliasearch";
import { ALGOLIA_INDEX_DEFAULT } from "@/lib/algolia-plan";
import { getEnv } from "@/lib/env";
import { listOpenIssuesForIndex, listStaleIssueObjectIds } from "@/lib/github";

export type SyncIssuesResult = {
  indexed: number;
  removed: number;
  complete: boolean;
  rateLimited: boolean;
};

type AdminClient = ReturnType<typeof algoliasearch>;

const INDEX_SETTINGS = {
  searchableAttributes: ["title", "repo", "labels", "language"],
  attributesForFaceting: ["language", "labels"],
  customRanking: ["desc(created_at)", "desc(stars)"],
  typoTolerance: true,
  attributesToHighlight: ["title", "repo"],
};

async function deleteMissing(client: AdminClient, indexName: string, keep: Set<string>): Promise<number> {
  const stale: string[] = [];
  try {
    await client.browseObjects<{ objectID: string }>({
      indexName,
      browseParams: { attributesToRetrieve: ["objectID"] },
      aggregator: (response) => {
        for (const hit of response.hits) {
          if (hit.objectID && !keep.has(hit.objectID)) stale.push(hit.objectID);
        }
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return 0;
    throw err;
  }
  if (stale.length === 0) return 0;
  await client.deleteObjects({ indexName, objectIDs: stale });
  return stale.length;
}

/** Pull open beginner issues from GitHub and upsert them. Drops closed or assigned ids. */
export async function syncIssuesIndex(): Promise<SyncIssuesResult> {
  const env = getEnv();
  const appId = env.ALGOLIA_APP_ID;
  const adminKey = env.ALGOLIA_ADMIN_KEY;
  if (!appId || !adminKey) {
    throw new Error("Algolia admin credentials are not set");
  }
  const indexName = env.ALGOLIA_INDEX_NAME || ALGOLIA_INDEX_DEFAULT;
  const client = algoliasearch(appId, adminKey);
  const open = await listOpenIssuesForIndex();

  await client.setSettings({
    indexName,
    indexSettings: INDEX_SETTINGS,
  });

  if (open.records.length > 0) {
    await client.saveObjects({
      indexName,
      objects: open.records,
    });
  }

  const keep = new Set(open.records.map((record) => record.objectID));
  if (open.records.length === 0) {
    return { indexed: 0, removed: 0, complete: false, rateLimited: open.rateLimited };
  }

  if (open.complete && !open.rateLimited) {
    const removed = await deleteMissing(client, indexName, keep);
    return { indexed: open.records.length, removed, complete: true, rateLimited: false };
  }

  let removed = 0;
  if (!open.rateLimited) {
    const stale = (await listStaleIssueObjectIds()).filter((id) => !keep.has(id));
    if (stale.length > 0) {
      await client.deleteObjects({ indexName, objectIDs: stale });
      removed = stale.length;
    }
  }
  return { indexed: open.records.length, removed, complete: false, rateLimited: open.rateLimited };
}
