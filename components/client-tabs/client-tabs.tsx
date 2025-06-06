import { SelectExercise } from "@/db/schemas";
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

type ClientTabsProps = {
  params: { userdata: ClientType };
  exercises: Array<SelectExercise>;
};

const ClientTabs = ({ params, exercises }: ClientTabsProps) => {
  const { userdata } = params;

  return (
    <div className="flex flex-col items-center justify-between w-full h-full">
      <div className="flex flex-col w-full h-full">
        <ClientDetails
          client_id={userdata.userId}
          userdata={userdata}
          exercises={exercises}
        />
      </div>
    </div>
  );
};

export default ClientTabs;
