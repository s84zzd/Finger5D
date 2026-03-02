import { NextRequest, NextResponse } from "next/server";
import { updateMonthlyPlan } from "@/lib/admin-workflow";
import { FIVE_D_CATEGORIES, type FiveDCategory } from "@/lib/admin-types";

export const runtime = "nodejs";

interface PatchBody {
    title?: string;
    objective?: string;
    categoryFocus?: FiveDCategory[];
    weekSlots?: string[];
    status?: "draft" | "active" | "closed";
    note?: string;
}

function normalizeCategoryFocus(input: FiveDCategory[] | undefined): FiveDCategory[] | undefined {
    if (!Array.isArray(input)) {
        return undefined;
    }
    const filtered = input.filter((cat): cat is FiveDCategory => FIVE_D_CATEGORIES.includes(cat));
    return filtered.length > 0 ? filtered : undefined;
}

function normalizeWeekSlots(input: string[] | undefined): string[] | undefined {
    if (!Array.isArray(input)) {
        return undefined;
    }
    return [...input, "", "", ""].slice(0, 4).map((slot) => String(slot ?? ""));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json() as PatchBody;

    try {
        const state = updateMonthlyPlan(id, (plan) => ({
            ...plan,
            title: body.title ?? plan.title,
            objective: body.objective ?? plan.objective,
            categoryFocus: normalizeCategoryFocus(body.categoryFocus) ?? plan.categoryFocus,
            weekSlots: normalizeWeekSlots(body.weekSlots) ?? plan.weekSlots,
            status: body.status ?? plan.status,
            note: body.note ?? plan.note
        }));

        return NextResponse.json(state);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Failed to update monthly plan" },
            { status: 404 }
        );
    }
}
