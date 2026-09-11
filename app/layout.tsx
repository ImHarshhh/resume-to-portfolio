import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ResumeCoded — Turn Your Resume Into a Portfolio",
  description: "Upload your resume, customize, and get a deployed portfolio URL instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
