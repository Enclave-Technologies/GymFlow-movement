import EditTrainerForm from "@/components/trainer/edit-trainer-form";
import { Card, CardContent } from "@/components/ui/card";

export default function AddTrainerPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Trainer</h1>
        <p className="text-muted-foreground mt-2">
          Edit a trainer 
        </p>
      </div>

      <Card>
        <CardContent>
          <EditTrainerForm />
        </CardContent>
      </Card>
    </div>
  );
}
