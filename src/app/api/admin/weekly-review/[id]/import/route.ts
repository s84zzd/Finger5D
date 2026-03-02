import { NextResponse } from "next/server";
import { importWeeklyRetrievalInbox } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const state = importWeeklyRetrievalInbox(id);
        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to import weekly retrieval inbox" },
            { status: 404 }
        );
    }
}
