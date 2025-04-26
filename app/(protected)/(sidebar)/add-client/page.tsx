import AddClientForm from "@/components/client/add-client-form";
import { Card, CardContent } from "@/components/ui/card";

export default function AddClientPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add Client</h1>
        <p className="text-muted-foreground mt-2">
          Create a new client or update an existing client
        </p>
      </div>
      
      <Card>
        <CardContent>
          <AddClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
