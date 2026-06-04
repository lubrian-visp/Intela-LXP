// SCORM package unpacker
// - Downloads uploaded .zip from staging path
// - Extracts to scorm-packages/<package_id>/...
// - Parses imsmanifest.xml → launch path, version, organizations
// - Updates scorm_packages row to status='ready'
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { unzip } from "npm:fflate@0.8.2";
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Req {
  package_id: string;
  staging_path: string;   // path inside scorm-packages bucket (uploaded zip)
  content_block_id?: string;
  tenant_id?: string;
  title?: string;
}

function unzipAsync(buf: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(buf, (err, files) => (err ? reject(err) : resolve(files)));
  });
}

function detectMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    html: "text/html", htm: "text/html",
    js: "application/javascript", css: "text/css",
    json: "application/json", xml: "application/xml",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
    mp4: "video/mp4", mp3: "audio/mpeg", wav: "audio/wav",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    pdf: "application/pdf", txt: "text/plain",
  };
  return map[ext] || "application/octet-stream";
}

function parseManifest(xml: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
  });
  const doc = parser.parse(xml);
  const manifest = doc.manifest || doc["imscp:manifest"] || {};
  const metadata = manifest.metadata || {};
  const schema = metadata.schema || metadata["imsmd:schema"] || "";
  const schemaversion = metadata.schemaversion || metadata["imsmd:schemaversion"] || "";

  // Detect version
  let version: "scorm_12" | "scorm_2004" | "xapi" | "cmi5" = "scorm_2004";
  const sv = String(schemaversion).toLowerCase();
  if (sv.includes("1.2")) version = "scorm_12";
  else if (sv.includes("2004") || sv.includes("cam 1.3")) version = "scorm_2004";

  // Find resources
  const resources = manifest.resources?.resource;
  const resList = Array.isArray(resources) ? resources : resources ? [resources] : [];

  // Find launch href - prefer SCO type resource
  let launchPath = "index.html";
  const sco = resList.find((r: any) =>
    String(r["@_adlcp:scormtype"] || r["@_adlcp:scormType"] || "").toLowerCase() === "sco"
  ) || resList[0];
  if (sco?.["@_href"]) launchPath = sco["@_href"];

  // Build a lightweight org tree for analytics
  const organizations = manifest.organizations?.organization;
  const orgList = Array.isArray(organizations) ? organizations : organizations ? [organizations] : [];

  return {
    version,
    launchPath,
    schema: String(schema),
    schemaversion: String(schemaversion),
    organizations: orgList,
    resourceCount: resList.length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Req;
    if (!body.package_id || !body.staging_path) {
      return new Response(JSON.stringify({ error: "package_id and staging_path are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Mark unpacking
    await supabase
      .from("scorm_packages")
      .update({ status: "unpacking" })
      .eq("id", body.package_id);

    // Download zip
    const { data: zipBlob, error: dlErr } = await supabase.storage
      .from("scorm-packages")
      .download(body.staging_path);

    if (dlErr || !zipBlob) throw new Error(`Download failed: ${dlErr?.message}`);
    const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());

    // Unzip
    const files = await unzipAsync(zipBytes);

    // Find manifest
    const manifestKey = Object.keys(files).find(
      (k) => k.toLowerCase().endsWith("imsmanifest.xml")
    );
    if (!manifestKey) throw new Error("imsmanifest.xml not found in package (not a valid SCORM zip)");

    const manifestXml = new TextDecoder().decode(files[manifestKey]);
    const parsed = parseManifest(manifestXml);

    // Manifest may live in a subfolder — strip prefix
    const prefix = manifestKey.replace(/imsmanifest\.xml$/i, "");

    // Upload all files to <package_id>/
    const destFolder = body.package_id;
    let uploaded = 0;
    for (const [relPath, bytes] of Object.entries(files)) {
      if (relPath.endsWith("/")) continue; // skip directory entries
      // Skip files outside the manifest folder
      if (prefix && !relPath.startsWith(prefix)) continue;
      const cleanRel = prefix ? relPath.slice(prefix.length) : relPath;
      if (!cleanRel) continue;

      const dest = `${destFolder}/${cleanRel}`;
      const { error: upErr } = await supabase.storage
        .from("scorm-packages")
        .upload(dest, bytes, {
          contentType: detectMimeType(cleanRel),
          upsert: true,
          cacheControl: "3600",
        });
      if (upErr) throw new Error(`Upload ${dest} failed: ${upErr.message}`);
      uploaded++;
    }

    // Clean up staging zip
    await supabase.storage.from("scorm-packages").remove([body.staging_path]);

    // Update package row
    const { error: updErr } = await supabase
      .from("scorm_packages")
      .update({
        status: "ready",
        storage_path: destFolder,
        launch_path: parsed.launchPath,
        scorm_version: parsed.version,
        manifest: {
          schema: parsed.schema,
          schemaversion: parsed.schemaversion,
          organizations: parsed.organizations,
          resource_count: parsed.resourceCount,
          file_count: uploaded,
        },
      })
      .eq("id", body.package_id);

    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({
        success: true,
        package_id: body.package_id,
        launch_path: parsed.launchPath,
        version: parsed.version,
        files_uploaded: uploaded,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("scorm-unpack error:", message);
    // Best-effort: mark failed
    try {
      const body = await req.clone().json();
      if (body.package_id) {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
        await supabase
          .from("scorm_packages")
          .update({ status: "failed", error_message: message })
          .eq("id", body.package_id);
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
