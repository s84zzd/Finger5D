import { NextResponse } from "next/server";
import { getMonthlyPlanTaskGenerationPreview } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function GET() {
    const preview = getMonthlyPlanTaskGenerationPreview();
    return NextResponse.json(preview);
}
