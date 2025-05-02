import EditClientForm from "@/components/client/edit-client-form";
import { Card, CardContent } from "@/components/ui/card";

export default function EditClientPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Client</h1>
        <p className="text-muted-foreground mt-2">
          Edit a client&apos;s details
        </p>
      </div>

      <Card>
        <CardContent>
          <EditClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
