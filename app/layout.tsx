import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export const metadata={title:"ZA Corporate Desk",description:"Internal corporate compliance and office management by Zahir & Associate"};
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
