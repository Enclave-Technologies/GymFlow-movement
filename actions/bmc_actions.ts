"use server";

import { BMCMeasurements, Users } from "@/db/schemas";
import { db } from "@/db/xata";
import { desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import "server-only";
import { updateUserIdealWeight } from "./client_actions";

export type BMCRecordInput = {
    measurementId?: string;
    userId: string;
    date: Date;
    height: number | null;
    weight: number | null;
    chin: number | null;
    cheek: number | null;
    pec: number | null;
    biceps: number | null;
    triceps: number | null;
    subscap: number | null;
    midax: number | null;
    supra: number | null;
    upperThigh: number | null;
    ubmil: number | null;
    knee: number | null;
    calf: number | null;
    quad: number | null;
    ham: number | null;
    // Add new girth measurements
    waistGirth: number | null;
    leftThighGirth: number | null;
    rightThighGirth: number | null;
    leftArmGirth: number | null;
    rightArmGirth: number | null;
    hipGirth: number | null;
    chestGirth: number | null;
    // End of new girth measurements
    bmi: number | null;
    bf: number | null;
    lm: number | null;
    photoPath: string | null;
};

/**
 * Save a BMC record to the database
 * @param record - The BMC record to save
 * @returns The saved BMC record
 */
export async function saveBMCRecord(record: BMCRecordInput) {
    try {
        // Note: BMI, BF%, and LM are now calculated client-side in the updateData function
        // and passed in the record parameter. No need to recalculate here.

        // Save the BMC record (update or insert)
        let result;
        if (record.measurementId && !record.measurementId.startsWith("temp-")) {
            result = await db
                .update(BMCMeasurements)
                .set({
                    date: record.date,
                    height: record.height,
                    weight: record.weight,
                    chin: record.chin,
                    cheek: record.cheek,
                    pec: record.pec,
                    biceps: record.biceps,
                    triceps: record.triceps,
                    subscap: record.subscap,
                    midax: record.midax,
                    supra: record.supra,
                    upperThigh: record.upperThigh,
                    ubmil: record.ubmil,
                    knee: record.knee,
                    calf: record.calf,
                    quad: record.quad,
                    ham: record.ham,
                    // Add new girth measurements
                    waistGirth: record.waistGirth,
                    leftThighGirth: record.leftThighGirth,
                    rightThighGirth: record.rightThighGirth,
                    leftArmGirth: record.leftArmGirth,
                    rightArmGirth: record.rightArmGirth,
                    hipGirth: record.hipGirth,
                    chestGirth: record.chestGirth,
                    // End of new girth measurements
                    bmi: record.bmi,
                    bf: record.bf,
                    lm: record.lm,
                    photoPath: record.photoPath,
                })
                .where(eq(BMCMeasurements.measurementId, record.measurementId))
                .returning();
        } else {
            result = await db
                .insert(BMCMeasurements)
                .values({
                    userId: record.userId,
                    date: record.date,
                    height: record.height,
                    weight: record.weight,
                    chin: record.chin,
                    cheek: record.cheek,
                    pec: record.pec,
                    biceps: record.biceps,
                    triceps: record.triceps,
                    subscap: record.subscap,
                    midax: record.midax,
                    supra: record.supra,
                    upperThigh: record.upperThigh,
                    ubmil: record.ubmil,
                    knee: record.knee,
                    calf: record.calf,
                    quad: record.quad,
                    ham: record.ham,
                    // Add new girth measurements
                    waistGirth: record.waistGirth,
                    leftThighGirth: record.leftThighGirth,
                    rightThighGirth: record.rightThighGirth,
                    leftArmGirth: record.leftArmGirth,
                    rightArmGirth: record.rightArmGirth,
                    hipGirth: record.hipGirth,
                    chestGirth: record.chestGirth,
                    // End of new girth measurements
                    bmi: record.bmi,
                    bf: record.bf,
                    lm: record.lm,
                    photoPath: record.photoPath,
                    measurementId: sql`uuid_generate_v4()`,
                })
                .returning();
        }

        // After saving, check if user's idealWeight is missing and height is present
        if (
            record.userId &&
            record.height &&
            typeof record.height === "number"
        ) {
            // Fetch the user
            const user = await db
                .select({ idealWeight: Users.idealWeight })
                .from(Users)
                .where(eq(Users.userId, record.userId));
            const currentIdealWeight = user[0]?.idealWeight;
            if (
                (currentIdealWeight === null ||
                    currentIdealWeight === undefined) &&
                record.height
            ) {
                // Calculate idealWeight and update
                const calculatedIdealWeight = 55 + (record.height - 160) / 2;
                await updateUserIdealWeight(
                    record.userId,
                    calculatedIdealWeight
                );
            }
        }

        return {
            success: true,
            message:
                record.measurementId &&
                !record.measurementId.startsWith("temp-")
                    ? "BMC record updated successfully"
                    : "BMC record created successfully",
            data: result[0],
        };
    } catch (error) {
        console.error("Error saving BMC record:", error);
        return {
            success: false,
            message: `Error saving BMC record: ${
                error instanceof Error ? error.message : String(error)
            }`,
            data: null,
        };
    }
}

/**
 * Delete a BMC record from the database
 * @param measurementId - The ID of the BMC record to delete
 * @returns Success status and message
 */
export async function deleteBMCRecord(measurementId: string) {
    try {
        await db
            .delete(BMCMeasurements)
            .where(eq(BMCMeasurements.measurementId, measurementId));

        return {
            success: true,
            message: "BMC record deleted successfully",
        };
    } catch (error) {
        console.error("Error deleting BMC record:", error);
        return {
            success: false,
            message: `Error deleting BMC record: ${
                error instanceof Error ? error.message : String(error)
            }`,
        };
    }
}

export async function getClientBMCRecordPaginated(
    params: Record<string, unknown> = {}
) {
    const clientId =
        typeof params.clientId === "string" ? params.clientId : null;

    if (!clientId) {
        return {
            data: [],
            meta: {
                totalCount: 0,
                page: 0,
                pageSize: 0,
                totalPages: 0,
                hasMore: false,
                totalRowCount: 0,
            },
        };
    }

    const pageIndex =
        typeof params.pageIndex === "number"
            ? params.pageIndex
            : typeof params.pageIndex === "string"
            ? parseInt(params.pageIndex, 10)
            : 0;

    const pageSize =
        typeof params.pageSize === "number"
            ? params.pageSize
            : typeof params.pageSize === "string"
            ? parseInt(params.pageSize, 10)
            : 10;

    const [countResult, BMCRecordData] = await Promise.all([
        db
            .select({ count: sql<number>`count(*)` })
            .from(BMCMeasurements)
            .where(eq(BMCMeasurements.userId, clientId)),
        db
            .select()
            .from(BMCMeasurements)
            .where(eq(BMCMeasurements.userId, clientId))
            .orderBy(desc(BMCMeasurements.date))
            .limit(pageSize)
            .offset(pageSize * pageIndex),
    ]);

    const totalCount = Number(countResult[0]?.count || 0);

    console.log(
        `[BMC RECORDS] Fetching BMC for ${clientId}, return ${totalCount} records!`
    );

    return {
        data: BMCRecordData,
        meta: {
            totalCount,
            page: pageIndex,
            pageSize,
            totalPages: Math.ceil(totalCount / pageSize),
            hasMore: (pageIndex + 1) * pageSize < totalCount,
            totalRowCount: totalCount,
        },
    };
}
