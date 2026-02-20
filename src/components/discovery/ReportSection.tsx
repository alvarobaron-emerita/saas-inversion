"use client";

import ReactMarkdown from "react-markdown";
import type { ReportSectionResult } from "@/types/discovery";

interface ReportSectionProps {
  section: ReportSectionResult;
}

export function ReportSectionDisplay({ section }: ReportSectionProps) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">
        {section.sectionName}
      </h2>
      <div className="prose prose-zinc prose-sm max-w-none">
        <ReactMarkdown
          components={{
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mt-4 mb-2">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-sm font-semibold mt-3 mb-1">{children}</h4>
            ),
            p: ({ children }) => <p className="mb-2">{children}</p>,
            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
          }}
        >
          {section.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
