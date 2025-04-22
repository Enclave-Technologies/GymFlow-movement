// "use client";
// import { useEffect, useState } from "react";
// import Image from "next/image";
// import { Edit } from "lucide-react";
// import RightModal from "@/components/pure-components/RightModal";
// import EditUserForm from "@/components/forms/edit-user-form";
import ClientDetails from "./client-details";

type ClientType = {
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

    // const [userDataState, setUserDataState] = useState<ClientType | null>(
    //     userdata
    // );
    // const [showRightModal, setShowRightModal] = useState(false);

    // useEffect(() => {
    //     setUserDataState(userdata);
    // }, [userdata]);

    // const rightModal = () => {
    //     return (
    //         <RightModal
    //             formTitle="Add User"
    //             isVisible={showRightModal}
    //             hideModal={() => {
    //                 setShowRightModal(false);
    //                 setUserDataState(null);
    //             }}
    //         >
    //             <EditUserForm
    //                 fetchData={reloadData}
    //                 clientData={userDataState}
    //             />
    //         </RightModal>
    //     );
    // };

    return (
        <div className="flex flex-col items-center justify-between text-black w-full h-full">
            <div className="text-center flex flex-col gap-8 w-full h-full">
                <ClientDetails client_id={userdata.userId} />
            </div>
            {/* {rightModal()} */}
        </div>
    );
};

export default ClientTabs;
