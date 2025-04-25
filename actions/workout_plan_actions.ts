"use server";

import { db } from "@/db/xata";
import {
  ExercisePlans,
  Phases,
  Sessions,
  ExercisePlanExercises,
  Exercises,
} from "@/db/schemas";
import { eq } from "drizzle-orm";
import "server-only";

export async function getWorkoutPlanByClientId(clientId: string) {
  // load all data in one query
  const rows = await db
    .select({
      phaseId: Phases.phaseId,
      phaseName: Phases.phaseName,
      phaseIsActive: Phases.isActive,
      phaseOrder: Phases.orderNumber,
      sessionId: Sessions.sessionId,
      sessionName: Sessions.sessionName,
      sessionTime: Sessions.sessionTime,
      sessionOrder: Sessions.orderNumber,
      exerciseId: ExercisePlanExercises.planExerciseId,
      exerciseOrder: ExercisePlanExercises.exerciseOrder,
      motion: ExercisePlanExercises.motion,
      targetArea: ExercisePlanExercises.targetArea,
      description: Exercises.exerciseName,
    })
    .from(ExercisePlanExercises)
    .innerJoin(
      Sessions,
      eq(ExercisePlanExercises.sessionId, Sessions.sessionId)
    )
    .innerJoin(Phases, eq(Sessions.phaseId, Phases.phaseId))
    .innerJoin(
      ExercisePlans,
      eq(Phases.planId, ExercisePlans.planId)
    )
    .innerJoin(
      Exercises,
      eq(ExercisePlanExercises.exerciseId, Exercises.exerciseId)
    )
    .where(eq(ExercisePlans.assignedToUserId, clientId))
    .orderBy(
      Phases.orderNumber,
      Sessions.orderNumber,
      ExercisePlanExercises.exerciseOrder,
    );

  if (!rows.length) {
    return [];
  }

  // define types for grouping
  interface ExerciseItem {
    id: string;
    order: string;
    motion: string | null;
    targetArea: string | null;
    description: string | null;
  }
  interface SessionItem {
    id: string;
    name: string;
    duration: number | null;
    isExpanded: boolean;
    exercises: ExerciseItem[];
  }
  interface PhaseItem {
    id: string;
    name: string;
    isActive: boolean;
    isExpanded: boolean;
    sessions: SessionItem[];
  }

  // group into phases -> sessions -> exercises
  const phasesMap = new Map<string, PhaseItem>();

  for (const row of rows) {
    // initialize phase
    let phase = phasesMap.get(row.phaseId);
    if (!phase) {
      phasesMap.set(row.phaseId, {
        id: row.phaseId,
        name: row.phaseName,
        isActive: row.phaseIsActive ?? false,
        isExpanded: true,
        sessions: [],
      });
      phase = phasesMap.get(row.phaseId)!;
    }

    // initialize session
    let session = phase.sessions.find((s) => s.id === row.sessionId);
    if (!session) {
      session = {
        id: row.sessionId,
        name: row.sessionName,
        duration: row.sessionTime,
        isExpanded: true,
        exercises: [],
      };
      phase.sessions.push(session);
    }

    // add exercise
    session.exercises.push({
      id: row.exerciseId,
      order: row.exerciseOrder != null ? String(row.exerciseOrder) : "",
      motion: row.motion,
      targetArea: row.targetArea,
      description: row.description,
    });
  }

  return Array.from(phasesMap.values());
}
