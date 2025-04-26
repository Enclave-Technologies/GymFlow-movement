// "use client";
// import { useEffect, useState } from "react";
// import Image from "next/image";
// import { Edit } from "lucide-react";
// import RightModal from "@/components/pure-components/RightModal";
// import EditUserForm from "@/components/forms/edit-user-form";
import ClientDetails from "./client-details";

export type ClientType = {
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  gender: "male" | "female" | "non-binary" | "prefer-not-to-say" | null;
  idealWeight: number | null;
  dob: Date | null;
  notes: string | null;
  registrationDate: Date | null;
};

const ClientTabs = ({ params }: { params: { userdata: ClientType } }) => {
  const { userdata } = params;

  return (
    <div className="flex flex-col items-center justify-between text-black w-full h-full">
      <div className="text-center flex flex-col gap-8 w-full h-full">
        <ClientDetails client_id={userdata.userId} userdata={userdata} />
      </div>
    </div>
  );
};

export default ClientTabs;
