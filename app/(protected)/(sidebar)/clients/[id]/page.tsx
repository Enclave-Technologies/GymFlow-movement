import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getClientById } from "@/actions/client_actions";
import { formatDate } from "@/lib/utils";

interface PageProps {
    params: {
        id: string;
    };
}

export default async function ClientProfilePage({ params }: PageProps) {
    const client = await getClientById(params.id);

    if (!client) {
        notFound();
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={client.imageUrl || undefined} />
                            <AvatarFallback>
                                {client.fullName?.[0]?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-2xl font-bold">
                                {client.fullName}
                            </h1>
                            <p className="text-muted-foreground">
                                {client.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Member since{" "}
                                {formatDate(client.registrationDate)}
                            </p>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Phone
                            </p>
                            <p className="font-medium">
                                {client.phone || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Gender
                            </p>
                            <p className="font-medium capitalize">
                                {client.gender?.toLowerCase() || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Date of Birth
                            </p>
                            <p className="font-medium">
                                {client.dob ? formatDate(client.dob) : "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Ideal Weight
                            </p>
                            <p className="font-medium">
                                {client.idealWeight
                                    ? `${client.idealWeight} kg`
                                    : "N/A"}
                            </p>
                        </div>
                    </div>

                    {client.notes && (
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Additional Notes
                            </p>
                            <p className="font-medium whitespace-pre-wrap">
                                {client.notes}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Assigned Exercises</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Exercise list component to be added */}
                    <p className="text-muted-foreground">
                        Exercise list coming soon
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
