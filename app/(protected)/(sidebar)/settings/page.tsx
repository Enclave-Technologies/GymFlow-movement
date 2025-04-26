import React from "react";
import { get_user_account } from "@/actions/auth_actions";
import { SettingsForm } from "@/components/settings/settings-form";
// import { Toaster } from "sonner";

const SettingsPage = async () => {
    const userData = await get_user_account();

    // Ensure all required fields are present
    const user = {
        userId: userData.userId || "",
        fullName: userData.fullName || "",
        email: userData.email || "",
        phone: userData.phone,
        gender: userData.gender,
        imageUrl: userData.imageUrl,
        jobTitle: userData.job_title,
    };

    return (
        <div className="container py-6">
            <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
            <SettingsForm user={user} />
            {/* <Toaster /> */}
        </div>
    );
};

export default SettingsPage;
