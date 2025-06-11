import { NextRequest, NextResponse } from "next/server";
import { initializeQueueSystem, getQueueStatus } from "@/lib/queue-init-on-demand";

/**
 * API route to initialize queue system on demand
 * This prevents the queue from auto-starting on every page load
 */

export async function POST(request: NextRequest) {
    try {
        // In production, you might want to add authentication here
        if (process.env.NODE_ENV === "production") {
            const authHeader = request.headers.get("authorization");
            const adminKey = process.env.QUEUE_ADMIN_KEY;

            if (!authHeader || !adminKey || authHeader !== `Bearer ${adminKey}`) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                );
            }
        }

        const body = await request.json().catch(() => ({}));
        const { schedulerInterval = 15 } = body;

        // Initialize the queue system
        await initializeQueueSystem(schedulerInterval);

        const status = getQueueStatus();

        return NextResponse.json({
            success: true,
            message: "Queue system initialized successfully",
            status,
        });
    } catch (error) {
        console.error("Failed to initialize queue system:", error);
        return NextResponse.json(
            {
                error: "Failed to initialize queue system",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const status = getQueueStatus();
        
        return NextResponse.json({
            success: true,
            status,
        });
    } catch (error) {
        console.error("Failed to get queue status:", error);
        return NextResponse.json(
            {
                error: "Failed to get queue status",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
