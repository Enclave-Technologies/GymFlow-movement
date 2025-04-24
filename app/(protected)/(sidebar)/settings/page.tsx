import { checkGuestApproval } from "@/lib/auth-utils";
import React from "react";
import { SettingsClient } from "./settings-client";

const Settings = async () => {
  await checkGuestApproval();

  return <SettingsClient />;
};

export default Settings;
