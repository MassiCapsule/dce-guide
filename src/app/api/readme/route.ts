import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const content = readFileSync(join(process.cwd(), "README.md"), "utf-8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: "README.md introuvable." });
  }
}
