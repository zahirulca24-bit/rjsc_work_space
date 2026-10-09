import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export const metadata={title:"RJSC Office Management",description:"Internal RJSC workflow automation"};
export default function RootLayout({children}:{children:React.ReactNode}){
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <AppShell>{children}</AppShell>
                </AuthProvider>
            </body>
        </html>
    );
}
