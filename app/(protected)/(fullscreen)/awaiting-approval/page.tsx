// import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
// import { logout } from "@/actions/auth_actions";
import { LogoutButton } from "@/components/auth/logout-button";
// import { redirect } from "next/navigation";
import { get_logged_in_user } from "@/actions/logged_in_user_actions";
import { redirect } from "next/navigation";

export default async function AwaitingApprovalPage() {
    // Check if the user is authenticated
    const auth_user = await get_logged_in_user();

    if (auth_user && auth_user.roles?.includes("Guest")) {
        redirect("/my-clients");
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Awaiting Approval</CardTitle>
                    <CardDescription>
                        Your account is currently pending approval by an
                        administrator.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">
                        Thank you for registering with Movement Fitness. Your
                        account has been created successfully, but it requires
                        administrator approval before you can access the full
                        features of the platform.
                    </p>
                    <p className="text-muted-foreground">
                        Please check back later or contact support if you
                        believe this is an error.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <LogoutButton />
                    {/* <form action={logout}>
                        <Button type="submit" variant="outline">
                            Sign Out
                        </Button>
                    </form> */}
                </CardFooter>
            </Card>
        </div>
    );
}
