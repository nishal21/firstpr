export type AssigneeStatus = "none" | "assigned";

/** Public issue fields stored in the Algolia index. No issue body. */
export type AlgoliaIssueRecord = {
  objectID: string;
  title: string;
  repo: string;
  url: string;
  labels: string[];
  language: string;
  stars: number;
  created_at: number;
  updated_at: number;
  comments: number;
  assignee: AssigneeStatus;
};
