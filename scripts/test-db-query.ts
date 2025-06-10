/**
 * Simple script to test database queries
 */

import { db } from "@/db/xata";
import { Phases } from "@/db/schemas";
import { eq } from "drizzle-orm";

async function testQuery() {
    try {
        console.log("🔍 Querying database for phase...");
        
        const phaseId = 'd4d63af1-d081-4889-8844-d19c081d9a41';
        
        const phase = await db
            .select({
                phaseId: Phases.phaseId,
                phaseName: Phases.phaseName,
                planId: Phases.planId,
                isActive: Phases.isActive,
                orderNumber: Phases.orderNumber,
            })
            .from(Phases)
            .where(eq(Phases.phaseId, phaseId))
            .limit(1);
            
        if (phase.length > 0) {
            console.log("✅ Phase found:", phase[0]);
        } else {
            console.log("❌ Phase not found");
        }
        
    } catch (error) {
        console.error("❌ Database query failed:", error);
    }
    
    process.exit(0);
}

testQuery();
