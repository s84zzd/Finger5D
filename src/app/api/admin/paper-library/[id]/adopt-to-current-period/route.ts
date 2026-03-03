import { NextResponse } from "next/server";
import { adoptLibraryItemToCurrentPeriod } from "@/lib/admin-workflow";

export const runtime = "nodejs";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const result = adoptLibraryItemToCurrentPeriod(id);
        return NextResponse.json({
            ...result.state,
            adopted: result.adopted,
            message: result.message,
            taskId: result.taskId
        });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "入选当期失败" },
            { status: 400 }
        );
    }
}
