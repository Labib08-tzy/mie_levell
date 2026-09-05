import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.json({ success: true, redirect: "/login" });
  response.cookies.delete("mie_level_token");
  return response;
}
