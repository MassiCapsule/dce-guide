import { NextResponse } from "next/server";

// Cette route n'est plus utilisee — la generation se fait entierement cote serveur dans le pipeline
export async function POST() {
  return NextResponse.json(
    { error: "Cette route n'est plus utilisee. La generation se fait via /generate." },
    { status: 410 }
  );
}
