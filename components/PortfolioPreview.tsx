"use client";
import { useMemo } from "react";
import { PortfolioData } from "../lib/portfolio";
import { generateStaticHTML } from "../lib/staticExport";

/**
 * WYSIWYG preview: renders the EXACT html that gets downloaded / deployed,
 * so what you see is literally what goes live.
 */
export default function PortfolioPreview({ data }: { data: PortfolioData }) {
  const html = useMemo(() => generateStaticHTML(data), [data]);
  return (
    <iframe
      title="Portfolio preview"
      srcDoc={html}
      style={{ width: "100%", height: "72vh", minHeight: 560, border: 0, display: "block", background: "#fff" }}
    />
  );
}
