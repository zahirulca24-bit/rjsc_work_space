"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getMe, login as loginApi, logout as logoutApi } from "@/lib/api/auth";
import { onSessionExpired } from "@/lib/api/fetchApi";
import { useRouter, usePathname } from "next/navigation";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => {},
    logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchUser = async () => {
        try {
            const data = await getMe();
            setUser(data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    // Subscribe to centralized session expiration events from protected API calls
    useEffect(() => {
        const unsubscribe = onSessionExpired((destination) => {
            setUser(null);
            setLoading(false);
            if (pathname !== "/login") {
                const target = destination || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
                const redirectTarget = target && target !== "/" && !target.startsWith("/login")
                    ? `/login?returnUrl=${encodeURIComponent(target)}`
                    : "/login";
                router.push(redirectTarget);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [pathname, router]);

    useEffect(() => {
        if (!loading) {
            if (!user && pathname !== "/login") {
                const target = pathname && pathname !== "/" ? `?returnUrl=${encodeURIComponent(pathname)}` : "";
                router.push(`/login${target}`);
            }
        }
    }, [user, loading, pathname, router]);

    const login = async (credentials: any) => {
        await loginApi(credentials);
        await fetchUser();
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const returnUrl = params.get("returnUrl");
            if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
                router.push(returnUrl);
                return;
            }
        }
        router.push("/dashboard");
    };

    const logout = async () => {
        await logoutApi();
        setUser(null);
        router.push("/login");
    };

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[#F3F7F6]">Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
