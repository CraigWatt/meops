import { NextResponse } from "next/server";

import { getDashboardSignals } from "@meops/core";

export function GET() {
  return NextResponse.json({
    signals: getDashboardSignals()
  });
}
