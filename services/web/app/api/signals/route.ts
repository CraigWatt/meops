import { NextResponse } from "next/server";

import { getDashboardSignals } from "../../../lib/signals";

export function GET() {
  return NextResponse.json({
    signals: getDashboardSignals()
  });
}

