import * as z from "zod";

// Schema for the main settings form
export const settingsFormSchema = z.object({
    fullName: z
        .string()
        .min(2, { message: "Full name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    phone: z.string().optional(),
    gender: z
        .enum(["male", "female", "non-binary", "prefer-not-to-say"])
        .optional(),
    jobTitle: z.string().optional(),
});

// Schema for the password change form
export const passwordFormSchema = z
    .object({
        currentPassword: z
            .string()
            .min(8, { message: "Current password is required." }),
        newPassword: z
            .string()
            .min(8, { message: "Password must be at least 8 characters." }),
        confirmPassword: z
            .string()
            .min(8, { message: "Please confirm your password." }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

// Schema for the password verification dialog
export const passwordVerificationSchema = z.object({
    password: z.string().min(1, { message: "Password is required." }),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
export type PasswordFormValues = z.infer<typeof passwordFormSchema>;
export type PasswordVerificationValues = z.infer<typeof passwordVerificationSchema>;
