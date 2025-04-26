import AddTrainerForm from "@/components/trainer/add-trainer-form";
import { Card, CardContent } from "@/components/ui/card";

export default function AddTrainerPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add Trainer</h1>
        <p className="text-muted-foreground mt-2">
          Create a new trainer or add trainer role to an existing user
        </p>
      </div>
      
      <Card>
        <CardContent>
          <AddTrainerForm />
        </CardContent>
      </Card>
    </div>
  );
}
