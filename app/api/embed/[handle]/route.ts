import { NextResponse } from "next/server";
import { getEmbedForHandle, getSiteOrigin } from "../../../lib/embedServer";

// GET /api/embed/[handle]
// The JSON Discord fetches for a profile's link preview. The profile page
// points at this from a <link rel="discord:component-embed"> in its <head>
// (see generateMetadata in app/[handle]/page.tsx). Same builder the
// dashboard preview uses, so they can't drift apart.
export async function GET(
  _request: Request,
  { params }: { params: { handle: string } }
) {
  const handle = params.handle.replace(/\.json$/i, "");
  const data = await getEmbedForHandle(handle, getSiteOrigin());

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(data.built.payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Short cache: edits in the dashboard show up quickly, but a burst of
      // people pasting the link doesn't hammer Supabase.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
