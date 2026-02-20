export interface DiscoveryProject {
  id: string;
  name: string;
  sector: string | null;
  context: string | null;
  report: ReportContent | null;
  createdAt: string;
}

export interface ReportSectionResult {
  sectionName: string;
  content: string;
}

export type ReportContent = ReportSectionResult[];
