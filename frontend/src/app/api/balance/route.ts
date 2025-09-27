import { NextResponse } from "next/server";

import { getBalance } from "@/data/balance";

export async function GET() {
  return NextResponse.json(getBalance());
}
