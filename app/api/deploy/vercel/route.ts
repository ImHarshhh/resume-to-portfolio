import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { html, siteName, token } = await req.json();
    if (!html || !token) return NextResponse.json({ error: "Missing html or token" }, { status: 400 });

    const name = (siteName || "portfolio").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 52);
    const files = [
      { file: "index.html", data: Buffer.from(html).toString("base64"), encoding: "base64" as const },
      {
        file: "package.json",
        data: Buffer.from(JSON.stringify({ name })).toString("base64"),
        encoding: "base64" as const,
      },
    ];

    const res = await fetch("https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        files,
        projectSettings: { framework: null, buildCommand: null, outputDirectory: "." },
        target: "production",
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: j?.error?.message || JSON.stringify(j).slice(0, 300) }, { status: 400 });
    }
    const url = `https://${j.url}`;
    return NextResponse.json({ url, id: j.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
