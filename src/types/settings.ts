export interface KPI {
  id: string;
  name: string;
  min?: number;
  max?: number;
  unit?: string;
}

export interface ReportSection {
  id: string;
  name: string;
  prompt: string;
}

export interface SettingsData {
  thesis: string;
  kpis: KPI[];
  reportSections: ReportSection[];
}
