export type SegmentType = "head" | "body" | "tail";

export type SelectedItem =
  | { type: "collision"; id: string }
  | { type: "frontConnection" }
  | { type: "backConnection" }
  | { type: "frontPoint"; id: string }
  | { type: "backPoint"; id: string }
  | null;
