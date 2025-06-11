/**
 * Worker-specific schema definitions
 * This file contains only the essential schema definitions needed by the worker
 * to avoid path resolution issues in production environments
 */

import {
    pgTable,
    text,
    integer,
    boolean,
    timestamp,
    real,
    unique,
    uuid,
    pgEnum,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const genderEnum = pgEnum("gender_enum", [
    "male",
    "female",
    "non-binary",
    "prefer-not-to-say",
]);

export const movementTypeEnum = pgEnum("movement_type_enum", [
    "bilateral",
    "unilateral",
    "compound",
    "isolation",
]);

export const goalStatusEnum = pgEnum("goal_status_enum", [
    "achieved",
    "in-progress",
]);

export const goalTypeEnum = pgEnum("goal_type_enum", [
    "physique goal",
    "lifestyle goal",
    "skill goal",
    "performance goal",
]);

// Essential tables for worker operations

// Users Table
export const Users = pgTable(
    "Users",
    {
        userId: text("user_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        appwrite_id: text("appwrite_id").unique(),
        has_auth: boolean("has_auth").default(false),
        fullName: text("full_name").notNull(),
        email: text("email").unique(),
        registrationDate: timestamp("registration_date").defaultNow().notNull(),
        notes: text("notes"),
        phone: text("phone"),
        imageUrl: text("image_url"),
        gender: genderEnum("gender"),
        idealWeight: real("ideal_weight"),
        dob: timestamp("dob"),
        height: real("height"),
        jobTitle: text("job_title"),
        address: text("address"),
        emergencyContactName: text("emergency_contact_name"),
        emergencyContactPhone: text("emergency_contact_phone"),
    },
    (table) => [index("idx_users_fullname").on(table.fullName)]
);

// Roles Table
export const Roles = pgTable("Roles", {
    roleId: uuid("role_id")
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    roleName: text("role_name").unique().notNull(),
});

// UserRoles Table
export const UserRoles = pgTable(
    "UserRoles",
    {
        userRoleId: uuid("user_role_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        userId: text("user_id")
            .notNull()
            .references(() => Users.userId, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        roleId: uuid("role_id")
            .notNull()
            .references(() => Roles.roleId),
        approvedByAdmin: boolean("approved_by_admin").default(false),
    },
    (table) => [unique("uq_user_role").on(table.userId, table.roleId)]
);

// Exercises Table
export const Exercises = pgTable(
    "Exercises",
    {
        exerciseId: uuid("exercise_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        exerciseName: text("exercise_name").notNull(),
        description: text("description"),
        uploadedByUserId: text("uploaded_by_user_id")
            .notNull()
            .references(() => Users.userId, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        uploadDate: timestamp("upload_date").defaultNow().notNull(),
        approvedByAdmin: boolean("approved_by_admin"),
        videoUrl: text("videoUrl"),
        motion: text("motion"),
        targetArea: text("targetArea"),
        movementType: movementTypeEnum("movement_type"),
        timeMultiplier: real("time_multiplier").default(1.0),
    },
    (table) => [
        index("idx_exercises_name").on(table.exerciseName),
        index("idx_exercises_uploader").on(table.uploadedByUserId),
        index("idx_exercises_approved").on(table.approvedByAdmin),
    ]
);

// ExercisePlans Table
export const ExercisePlans = pgTable(
    "ExercisePlans",
    {
        planId: uuid("plan_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        planName: text("plan_name").notNull(),
        createdByUserId: text("created_by_user_id")
            .notNull()
            .references(() => Users.userId, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        createdDate: timestamp("created_date").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
        assignedToUserId: text("assigned_to_user_id").references(
            () => Users.userId,
            {
                onDelete: "cascade",
                onUpdate: "cascade",
            }
        ),
        isActive: boolean("is_active").default(false),
    },
    (table) => [
        index("idx_plans_creator").on(table.createdByUserId),
        index("idx_plans_assigned").on(table.assignedToUserId),
        index("idx_plans_active").on(table.isActive),
    ]
);

// Phases Table
export const Phases = pgTable(
    "Phases",
    {
        phaseId: uuid("phase_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        planId: uuid("plan_id")
            .notNull()
            .references(() => ExercisePlans.planId),
        phaseName: text("phase_name").notNull(),
        orderNumber: integer("order_number").notNull(),
        isActive: boolean("is_active").default(false),
    },
    (table) => [
        uniqueIndex("unique_plan_order")
            .on(table.planId, table.orderNumber)
            .concurrently(),
        index("idx_phase_active").on(table.isActive),
    ]
);

// Sessions Table
export const Sessions = pgTable(
    "Sessions",
    {
        sessionId: uuid("session_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        phaseId: uuid("phase_id")
            .notNull()
            .references(() => Phases.phaseId),
        sessionName: text("session_name").notNull(),
        orderNumber: integer("order_number").notNull(),
        sessionTime: real("session_time"),
    },
    (table) => [
        index("idx_session_order").on(table.phaseId, table.orderNumber),
        index("idx_session_time").on(table.sessionTime.desc()),
    ]
);

// ExercisePlanExercises Table
export const ExercisePlanExercises = pgTable(
    "ExercisePlanExercises",
    {
        planExerciseId: uuid("plan_exercise_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        sessionId: uuid("session_id")
            .notNull()
            .references(() => Sessions.sessionId),
        exerciseId: uuid("exercise_id")
            .notNull()
            .references(() => Exercises.exerciseId),
        targetArea: text("targetArea"),
        motion: text("motion"),
        repsMin: integer("repsMin"),
        repsMax: integer("repsMax"),
        setsMin: integer("setsMin"),
        setsMax: integer("setsMax"),
        tempo: text("tempo"),
        tut: integer("TUT"),
        restMin: integer("restMin"),
        restMax: integer("restMax"),
        exerciseOrder: integer("exerciseOrder"),
        setOrderMarker: text("setOrderMarker"),
        customizations: text("customizations"),
        notes: text("notes").default(""),
    },
    (table) => [
        index("idx_session_exercise_order")
            .on(table.sessionId, table.exerciseOrder.asc())
            .concurrently(),
        index("idx_exercise_volume").on(table.repsMax, table.setsMax),
    ]
);

// Goals Table
export const Goals = pgTable("Goals", {
    goalId: uuid("goal_id")
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    userId: text("user_id")
        .notNull()
        .references(() => Users.userId, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
    goalDescription: text("goal_description").notNull(),
    goalStatus: goalStatusEnum("goal_status").default("in-progress").notNull(),
    goalType: goalTypeEnum("goal_type").notNull(),
    deadline: timestamp("deadline", { mode: "date" }),
    coachComments: text("coach_comments"),
    createdDate: timestamp("created_date").defaultNow().notNull(),
});

// BMCMeasurements Table
export const BMCMeasurements = pgTable(
    "BMCMeasurements",
    {
        measurementId: uuid("measurement_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        userId: text("user_id")
            .notNull()
            .references(() => Users.userId, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        date: timestamp("date").notNull(),
        height: real("height"),
        weight: real("weight"),
        chin: real("chin"),
        cheek: real("cheek"),
        pec: real("pec"),
        biceps: real("biceps"),
        triceps: real("triceps"),
        subscap: real("subscap"),
        midax: real("midax"),
        supra: real("supra"),
        upperThigh: real("upper_thigh"),
        ubmil: real("ubmil"),
        knee: real("knee"),
        calf: real("calf"),
        quad: real("quad"),
        ham: real("ham").default(0),
        waistGirth: real("waist_girth"),
        leftThighGirth: real("thigh_left_girth"),
        rightThighGirth: real("thigh_right_girth"),
        leftArmGirth: real("arm_left_girth"),
        rightArmGirth: real("arm_right_girth"),
        hipGirth: real("hip_girth"),
        chestGirth: real("chest_girth"),
        bmi: real("bmi"),
        bf: real("bf"),
        lm: real("lm"),
        photoPath: text("photo_path"),
    },
    (table) => [unique("uniqueUserDate").on(table.userId, table.date)]
);

// WorkoutSessionsLog Table
export const WorkoutSessionsLog = pgTable(
    "WorkoutSessionsLog",
    {
        workoutSessionLogId: uuid("workout_session_log_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        userId: text("user_id")
            .notNull()
            .references(() => Users.userId, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        sessionId: uuid("session_id").references(() => Sessions.sessionId),
        sessionName: text("session_name").notNull(),
        startTime: timestamp("start_time").defaultNow().notNull(),
        endTime: timestamp("end_time"),
    },
    (table) => [
        index("idx_user_session")
            .on(table.userId, table.sessionName.asc())
            .concurrently(),
        index("idx_user_starttime")
            .on(table.userId, table.startTime.desc())
            .concurrently()
            .where(sql`${table.endTime} IS NOT NULL`),
        index("idx_workoutsessionslog_sessionid")
            .on(table.sessionId)
            .where(sql`${table.sessionId} IS NOT NULL`),
    ]
);

// WorkoutSessionDetails Table
export const WorkoutSessionDetails = pgTable(
    "WorkoutSessionDetails",
    {
        workoutDetailId: uuid("workout_detail_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        workoutSessionLogId: uuid("workout_session_log_id")
            .notNull()
            .references(() => WorkoutSessionsLog.workoutSessionLogId),
        exerciseName: text("exercise_name").notNull(),
        sets: integer("sets"),
        reps: integer("reps"),
        weight: real("weight"),
        workoutVolume: real("workout_volume"),
        coachNote: text("coach_note"),
        setOrderMarker: text("setOrderMarker"),
        entryTime: timestamp("entry_time").defaultNow(),
    },
    (table) => [
        index("idx_details_logid").on(table.workoutSessionLogId),
        index("idx_details_exercisename").on(table.exerciseName),
    ]
);

// Type exports
export type InsertUser = typeof Users.$inferInsert;
export type SelectUser = typeof Users.$inferSelect;
export type InsertRole = typeof Roles.$inferInsert;
export type SelectRole = typeof Roles.$inferSelect;
export type InsertUserRole = typeof UserRoles.$inferInsert;
export type SelectUserRole = typeof UserRoles.$inferSelect;
export type InsertExercise = typeof Exercises.$inferInsert;
export type SelectExercise = typeof Exercises.$inferSelect;
export type InsertExercisePlan = typeof ExercisePlans.$inferInsert;
export type SelectExercisePlan = typeof ExercisePlans.$inferSelect;
export type InsertPhase = typeof Phases.$inferInsert;
export type SelectPhase = typeof Phases.$inferSelect;
export type InsertSession = typeof Sessions.$inferInsert;
export type SelectSession = typeof Sessions.$inferSelect;
export type InsertExercisePlanExercise =
    typeof ExercisePlanExercises.$inferInsert;
export type SelectExercisePlanExercise =
    typeof ExercisePlanExercises.$inferSelect;
export type InsertGoal = typeof Goals.$inferInsert;
export type SelectGoal = typeof Goals.$inferSelect;
export type InsertBMCMeasurement = typeof BMCMeasurements.$inferInsert;
export type SelectBMCMeasurement = typeof BMCMeasurements.$inferSelect;
export type InsertWorkoutSessionLog = typeof WorkoutSessionsLog.$inferInsert;
export type SelectWorkoutSessionLog = typeof WorkoutSessionsLog.$inferSelect;
export type InsertWorkoutSessionDetail =
    typeof WorkoutSessionDetails.$inferInsert;
export type SelectWorkoutSessionDetail =
    typeof WorkoutSessionDetails.$inferSelect;
