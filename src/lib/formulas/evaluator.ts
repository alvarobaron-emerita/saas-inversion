import { create, all } from "mathjs";

const math = create(all);

export function evaluateFormula(
  formula: string,
  rowData: Record<string, string | number | null>
): string | number | null {
  try {
    const expr = formula.trim();
    if (!expr.startsWith("=")) return null;

    let parsed = expr.slice(1);

    for (const [key, value] of Object.entries(rowData)) {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (!isNaN(num)) {
        parsed = parsed.replace(
          new RegExp(`\\b${escapeRegex(key)}\\b`, "gi"),
          String(num)
        );
      }
    }

    const result = math.evaluate(parsed);
    if (typeof result === "number" && !isNaN(result)) return result;
    if (typeof result === "string") return result;
    return null;
  } catch {
    return null;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
