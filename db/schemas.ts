import {
    pgTable,
    text,
    integer, // Keep integer for non-key fields like orderNumber, reps, sets etc.
    boolean,
    timestamp,
    real,
    unique,
    uuid,
    pgEnum, // Import pgEnum
} from "drizzle-orm/pg-core";

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
import { relations, sql } from "drizzle-orm"; // Import sql from drizzle-orm

// -- Users Table --
export const Users = pgTable("Users", {
    userId: text("user_id")
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    appwrite_id: text("appwrite_id").unique().notNull(),
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
});

export type InsertUser = typeof Users.$inferInsert;
export type SelectUser = typeof Users.$inferSelect;

// -- Roles Table --
export const Roles = pgTable("Roles", {
    roleId: uuid("role_id")
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    roleName: text("role_name").unique().notNull(),
});

export type InsertRole = typeof Roles.$inferInsert;
export type SelectRole = typeof Roles.$inferSelect;

// -- UserRoles Table (Many-to-Many) --
export const UserRoles = pgTable(
    "UserRoles",
    {
        userRoleId: uuid("user_role_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        userId: text("user_id") // Changed to text
            .notNull()
            .references(() => Users.userId, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        roleId: uuid("role_id") // Changed to uuid
            .notNull()
            .references(() => Roles.roleId),
        approvedByAdmin: boolean("approved_by_admin").default(false),
    },
    (table) => [unique("uq_user_role").on(table.userId, table.roleId)]
);

export type InsertUserRole = typeof UserRoles.$inferInsert;
export type SelectUserRole = typeof UserRoles.$inferSelect;

// -- Exercises Table --
export const Exercises = pgTable("Exercises", {
    exerciseId: uuid("exercise_id") // Changed to uuid
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    exerciseName: text("exercise_name").notNull(),
    description: text("description"),
    uploadedByUserId: text("uploaded_by_user_id") // Changed to text
        .notNull()
        .references(() => Users.userId, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
    uploadDate: timestamp("upload_date").defaultNow().notNull(),
    approvedByAdmin: boolean("approved_by_admin"), // Nullable
    videoUrl: text("videoUrl"),
    motion: text("motion"),
    targetArea: text("targetArea"),
    movementType: movementTypeEnum("movement_type"),
    timeMultiplier: real("time_multiplier").default(1.0), // Used for session time calculations
});

export type InsertExercise = typeof Exercises.$inferInsert;
export type SelectExercise = typeof Exercises.$inferSelect;

// -- ExercisePlans Table --
export const ExercisePlans = pgTable("ExercisePlans", {
    planId: uuid("plan_id") // Changed to uuid
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    planName: text("plan_name").notNull(),
    createdByUserId: text("created_by_user_id") // Changed to text
        .notNull()
        .references(() => Users.userId, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
    createdDate: timestamp("created_date").defaultNow().notNull(),
    assignedToUserId: text("assigned_to_user_id") // Changed to text
        .references(() => Users.userId, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }), // Nullable
    isActive: boolean("is_active").default(false),
});

export type InsertExercisePlan = typeof ExercisePlans.$inferInsert;
export type SelectExercisePlan = typeof ExercisePlans.$inferSelect;

// -- Phases Table --
export const Phases = pgTable(
    "Phases",
    {
        phaseId: uuid("phase_id") // Changed to uuid
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        planId: uuid("plan_id") // Changed to uuid
            .notNull()
            .references(() => ExercisePlans.planId),
        phaseName: text("phase_name").notNull(),
        orderNumber: integer("order_number").notNull(), // Keep integer
        isActive: boolean("is_active").default(false),
    },
    (table) => [unique("uniquePlanOrder").on(table.planId, table.orderNumber)]
);

export type InsertPhase = typeof Phases.$inferInsert;
export type SelectPhase = typeof Phases.$inferSelect;

// -- Sessions Table --
export const Sessions = pgTable(
    "Sessions",
    {
        sessionId: uuid("session_id") // Changed to uuid
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        phaseId: uuid("phase_id") // Changed to uuid
            .notNull()
            .references(() => Phases.phaseId),
        sessionName: text("session_name").notNull(),
        orderNumber: integer("order_number").notNull(), // Keep integer
        sessionTime: real("session_time"),
    },
    (table) => [unique("uniquePhaseOrder").on(table.phaseId, table.orderNumber)]
);

export type InsertSession = typeof Sessions.$inferInsert;
export type SelectSession = typeof Sessions.$inferSelect;

// -- ExercisePlanExercises Table --
export const ExercisePlanExercises = pgTable(
    "ExercisePlanExercises",
    {
        planExerciseId: uuid("plan_exercise_id") // Changed to uuid
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        sessionId: uuid("session_id") // Changed to uuid
            .notNull()
            .references(() => Sessions.sessionId),
        exerciseId: uuid("exercise_id") // Changed to uuid
            .notNull()
            .references(() => Exercises.exerciseId),
        targetArea: text("targetArea"),
        motion: text("motion"),
        repsMin: integer("repsMin"), // Keep integer
        repsMax: integer("repsMax"), // Keep integer
        setsMin: integer("setsMin"), // Keep integer
        setsMax: integer("setsMax"), // Keep integer
        tempo: text("tempo"),
        tut: integer("TUT"), // Keep integer
        restMin: integer("restMin"), // Keep integer
        restMax: integer("restMax"), // Keep integer
        exerciseOrder: integer("exerciseOrder"), // Keep integer
        setOrderMarker: text("setOrderMarker"),
        customizations: text("customizations"),
        notes: text("notes").default(""), // Changed default to empty string
    }
    // Removed uniqueness constraint: (table) => [ unique("uniqueSessionExercise").on(table.sessionId, table.exerciseId) ]
);

export type InsertExercisePlanExercise =
    typeof ExercisePlanExercises.$inferInsert;
export type SelectExercisePlanExercise =
    typeof ExercisePlanExercises.$inferSelect;

// -- BMCMeasurements Table --
export const BMCMeasurements = pgTable(
    "BMCMeasurements",
    {
        measurementId: uuid("measurement_id") // Changed to uuid
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        userId: text("user_id") // Changed to text
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
        bmi: real("bmi"),
        bf: real("bf"), // Body Fat %
        lm: real("lm"), // Lean Mass
        photoPath: text("photo_path"),
    },
    (table) => [unique("uniqueUserDate").on(table.userId, table.date)]
);

export type InsertBMCMeasurement = typeof BMCMeasurements.$inferInsert;
export type SelectBMCMeasurement = typeof BMCMeasurements.$inferSelect;

// -- Enums for Goals --
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

// -- Goals Table --
export const Goals = pgTable("Goals", {
    goalId: uuid("goal_id") // Changed to uuid
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    userId: text("user_id") // Changed to text
        .notNull()
        .references(() => Users.userId, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
    goalDescription: text("goal_description").notNull(),
    goalStatus: goalStatusEnum("goal_status").default("in-progress").notNull(), // Use enum
    goalType: goalTypeEnum("goal_type").notNull(), // Use enum
    deadline: timestamp("deadline", { mode: "date" }), // Nullable
    coachComments: text("coach_comments"),
    createdDate: timestamp("created_date").defaultNow().notNull(),
});

export type InsertGoal = typeof Goals.$inferInsert;
export type SelectGoal = typeof Goals.$inferSelect;

// -- WorkoutSessionsLog Table --
export const WorkoutSessionsLog = pgTable("WorkoutSessionsLog", {
    workoutSessionLogId: uuid("workout_session_log_id") // Changed to uuid
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    userId: text("user_id") // Changed to text
        .notNull()
        .references(() => Users.userId, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
    // sessionId: uuid("session_id").notNull(), // Removed as per user request
    sessionName: text("session_name").notNull(),
    startTime: timestamp("start_time").defaultNow().notNull(),
    endTime: timestamp("end_time"), // Nullable
});

export type InsertWorkoutSessionLog = typeof WorkoutSessionsLog.$inferInsert;
export type SelectWorkoutSessionLog = typeof WorkoutSessionsLog.$inferSelect;

// -- WorkoutSessionDetails Table --
export const WorkoutSessionDetails = pgTable("WorkoutSessionDetails", {
    workoutDetailId: uuid("workout_detail_id") // Changed to uuid
        .primaryKey()
        .default(sql`uuid_generate_v4()`),
    workoutSessionLogId: uuid("workout_session_log_id") // Changed to uuid
        .notNull()
        .references(() => WorkoutSessionsLog.workoutSessionLogId),
    // exerciseId: uuid("exercise_id").notNull(), // Removed as per user request
    exerciseName: text("exercise_name").notNull(),
    sets: integer("sets"), // Keep integer
    reps: integer("reps"), // Keep integer
    weight: real("weight"),
    workoutVolume: real("workout_volume"),
    coachNote: text("coach_note"),
    entryTime: timestamp("entry_time").defaultNow(),
});

export type InsertWorkoutSessionDetail =
    typeof WorkoutSessionDetails.$inferInsert;
export type SelectWorkoutSessionDetail =
    typeof WorkoutSessionDetails.$inferSelect;

// --- NEW TABLES ---
// TrainerClients Table (Explicit trainer-client relationships)
export const TrainerClients = pgTable(
    "TrainerClients",
    {
        relationshipId: uuid("relationship_id")
            .primaryKey()
            .default(sql`uuid_generate_v4()`),
        trainerId: text("trainer_id")
            .notNull()
            .references(() => Users.userId, {
                onUpdate: "cascade",
            }),
        clientId: text("client_id")
            .notNull()
            .references(() => Users.userId, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        assignedDate: timestamp("assigned_date").defaultNow().notNull(),
        isActive: boolean("is_active").default(true),
        notes: text("notes"),
    },
    (table) => [unique("uq_trainer_client").on(table.trainerId, table.clientId)]
);

export type InsertTrainerClient = typeof TrainerClients.$inferInsert;
export type SelectTrainerClient = typeof TrainerClients.$inferSelect;

// --- RELATIONS ---
// Relations should automatically work with the updated UUID types

// Users Relations
export const usersRelations = relations(Users, ({ many }) => ({
    userRoles: many(UserRoles),
    trainerClientsAsTrainer: many(TrainerClients, {
        relationName: "TrainerRelationships",
    }),
    trainerClientsAsClient: many(TrainerClients, {
        relationName: "ClientRelationships",
    }),
    uploadedExercises: many(Exercises, { relationName: "UploadedExercises" }),
    createdExercisePlans: many(ExercisePlans, { relationName: "CreatedPlans" }),
    assignedExercisePlans: many(ExercisePlans, {
        relationName: "AssignedPlans",
    }),
    bmcMeasurements: many(BMCMeasurements),
    goals: many(Goals),
    workoutSessionsLogs: many(WorkoutSessionsLog),
}));

// Roles Relations
export const rolesRelations = relations(Roles, ({ many }) => ({
    userRoles: many(UserRoles),
}));

// UserRoles Relations (Many-to-Many Join Table)
export const userRolesRelations = relations(UserRoles, ({ one }) => ({
    user: one(Users, {
        fields: [UserRoles.userId],
        references: [Users.userId],
    }),
    role: one(Roles, {
        fields: [UserRoles.roleId],
        references: [Roles.roleId],
    }),
}));

// Exercises Relations
export const exercisesRelations = relations(Exercises, ({ one, many }) => ({
    uploader: one(Users, {
        fields: [Exercises.uploadedByUserId],
        references: [Users.userId],
        relationName: "UploadedExercises",
    }),
    planExercises: many(ExercisePlanExercises),
    workoutSessionDetails: many(WorkoutSessionDetails), // Relation might need adjustment if FK removed
}));

// ExercisePlans Relations
export const exercisePlansRelations = relations(
    ExercisePlans,
    ({ one, many }) => ({
        creator: one(Users, {
            fields: [ExercisePlans.createdByUserId],
            references: [Users.userId],
            relationName: "CreatedPlans",
        }),
        assignedUser: one(Users, {
            fields: [ExercisePlans.assignedToUserId],
            references: [Users.userId],
            relationName: "AssignedPlans",
        }),
        phases: many(Phases),
    })
);

// Phases Relations
export const phasesRelations = relations(Phases, ({ one, many }) => ({
    exercisePlan: one(ExercisePlans, {
        fields: [Phases.planId],
        references: [ExercisePlans.planId],
    }),
    sessions: many(Sessions),
}));

// Sessions Relations
export const sessionsRelations = relations(Sessions, ({ one, many }) => ({
    phase: one(Phases, {
        fields: [Sessions.phaseId],
        references: [Phases.phaseId],
    }),
    planExercises: many(ExercisePlanExercises),
    workoutSessionsLogs: many(WorkoutSessionsLog), // Relation might need adjustment if FK removed
}));

// ExercisePlanExercises Relations
export const exercisePlanExercisesRelations = relations(
    ExercisePlanExercises,
    ({ one }) => ({
        session: one(Sessions, {
            fields: [ExercisePlanExercises.sessionId],
            references: [Sessions.sessionId],
        }),
        exercise: one(Exercises, {
            fields: [ExercisePlanExercises.exerciseId],
            references: [Exercises.exerciseId],
        }),
    })
);

// BMCMeasurements Relations
export const bmcMeasurementsRelations = relations(
    BMCMeasurements,
    ({ one }) => ({
        user: one(Users, {
            fields: [BMCMeasurements.userId],
            references: [Users.userId],
        }),
    })
);

// Goals Relations
export const goalsRelations = relations(Goals, ({ one }) => ({
    user: one(Users, {
        fields: [Goals.userId],
        references: [Users.userId],
    }),
}));

// WorkoutSessionsLog Relations
export const workoutSessionsLogRelations = relations(
    WorkoutSessionsLog,
    ({ one, many }) => ({
        user: one(Users, {
            fields: [WorkoutSessionsLog.userId],
            references: [Users.userId],
        }),
        // Session relation intentionally removed as sessionId column is removed from WorkoutSessionsLog
        details: many(WorkoutSessionDetails),
    })
);

// TrainerClients Relations
export const trainerClientsRelations = relations(TrainerClients, ({ one }) => ({
    trainer: one(Users, {
        fields: [TrainerClients.trainerId],
        references: [Users.userId],
        relationName: "TrainerRelationships",
    }),
    client: one(Users, {
        fields: [TrainerClients.clientId],
        references: [Users.userId],
        relationName: "ClientRelationships",
    }),
}));

// WorkoutSessionDetails Relations
export const workoutSessionDetailsRelations = relations(
    WorkoutSessionDetails,
    ({ one }) => ({
        log: one(WorkoutSessionsLog, {
            fields: [WorkoutSessionDetails.workoutSessionLogId],
            references: [WorkoutSessionsLog.workoutSessionLogId],
        }),
        // Exercise relation intentionally removed as exerciseId column is removed from WorkoutSessionDetails
    })
);
