import { NextRequest, NextResponse } from "next/server";
import { updateWeeklyReview } from "@/lib/admin-workflow";

export const runtime = "nodejs";

interface PatchBody {
    summary?: string;
    retrievalInbox?: string;
    wins?: string;
    blockers?: string;
    actionItems?: string;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json() as PatchBody;

    try {
        const state = updateWeeklyReview(id, (review) => ({
            ...review,
            summary: body.summary ?? review.summary,
            retrievalInbox: body.retrievalInbox ?? review.retrievalInbox,
            wins: body.wins ?? review.wins,
            blockers: body.blockers ?? review.blockers,
            actionItems: body.actionItems ?? review.actionItems
        }));

        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to update weekly review" },
            { status: 404 }
        );
    }
}
