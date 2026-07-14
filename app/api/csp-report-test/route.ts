import { NextResponse } from "next/server";

export async function POST() {
  console.warn("CSP report test endpoint reached");
  return NextResponse.json({}, { status: 204 });
}
