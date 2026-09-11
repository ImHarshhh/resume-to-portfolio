import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  try {
    const { html, siteName, token, title } = await req.json();
    if (!html || !token) return NextResponse.json({ error: "Missing html or token" }, { status: 400 });

    // 1. Create site (name may collide -> let Netlify randomize if so)
    const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: siteName?.toLowerCase().replace(/[^a-z0-9-]/g, "-") || undefined }),
    });
    let site: any = null;
    if (createRes.ok) {
      site = await createRes.json();
    } else {
      // fallback: create unnamed site
      const retry = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!retry.ok) {
        const t = await createRes.text();
        return NextResponse.json({ error: `Netlify site create failed: ${t.slice(0, 300)}` }, { status: 400 });
      }
      site = await retry.json();
    }

    // 2. Zip the html
    const zip = new JSZip();
    zip.file("index.html", html);
    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

    // 3. Deploy zip
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: zipBuf as any,
    });
    if (!deployRes.ok) {
      const t = await deployRes.text();
      return NextResponse.json({ error: `Netlify deploy failed: ${t.slice(0, 300)}` }, { status: 400 });
    }
    const deploy = await deployRes.json();
    const url = deploy.ssl_url || deploy.deploy_ssl_url || site.ssl_url || site.url;
    return NextResponse.json({ url, siteId: site.id, deployId: deploy.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
