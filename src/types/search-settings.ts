/** Template for a default column applied to every new project on upload */
export interface DefaultColumnTemplate {
  type: "text" | "formula" | "ai";
  header: string;
  /** Required when type === "formula" */
  formula?: string;
  /** Required when type === "ai" */
  prompt?: string;
  /** For type === "ai"; default "single" */
  outputStyle?: "single" | "rating_and_reason";
  /** For type === "ai" when outputStyle === "rating_and_reason" */
  headerCol1?: string;
  headerCol2?: string;
}

export interface SearchSettingsData {
  defaultColumns: DefaultColumnTemplate[];
}
