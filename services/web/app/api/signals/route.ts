import { NextResponse } from "next/server";

import { getDashboardSignals } from "@meops/store";

export async function GET() {
  const signals = await getDashboardSignals();

  return NextResponse.json({
    signals
  });
}
