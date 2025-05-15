import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
}

export const LoadingOverlay = ({
    isVisible,
    message = "Saving changes...",
}: LoadingOverlayProps) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-foreground">{message}</p>
            </div>
        </div>
    );
};
