/**
 * Simple script to check Sessions table content
 */

import { db } from "@/db/xata";
import { Sessions, Phases } from "@/db/schemas";
// import { eq } from "drizzle-orm";

async function checkSessions() {
    try {
        console.log("🔍 Querying Sessions table...");

        const sessions = await db
            .select({
                sessionId: Sessions.sessionId,
                sessionName: Sessions.sessionName,
                phaseId: Sessions.phaseId,
                orderNumber: Sessions.orderNumber,
                sessionTime: Sessions.sessionTime,
            })
            .from(Sessions)
            .orderBy(Sessions.sessionName);

        console.log(`📊 Found ${sessions.length} sessions in database:`);

        if (sessions.length > 0) {
            sessions.forEach((session, index) => {
                console.log(
                    `${index + 1}. ${session.sessionName} (ID: ${
                        session.sessionId
                    })`
                );
                console.log(`   Phase ID: ${session.phaseId}`);
                console.log(`   Order: ${session.orderNumber}`);
                console.log(`   Duration: ${session.sessionTime || "Not set"}`);
                console.log("");
            });
        } else {
            console.log("❌ No sessions found in database");
        }

        // Also check phases for context
        console.log("🔍 Checking related phases...");
        const phases = await db
            .select({
                phaseId: Phases.phaseId,
                phaseName: Phases.phaseName,
                planId: Phases.planId,
                isActive: Phases.isActive,
            })
            .from(Phases)
            .orderBy(Phases.phaseName);

        console.log(`📊 Found ${phases.length} phases in database:`);
        phases.forEach((phase, index) => {
            console.log(
                `${index + 1}. ${phase.phaseName} (ID: ${phase.phaseId})`
            );
            console.log(`   Plan ID: ${phase.planId}`);
            console.log(`   Active: ${phase.isActive}`);
            console.log("");
        });
    } catch (error) {
        console.error("❌ Database query failed:", error);
    }

    process.exit(0);
}

checkSessions();
