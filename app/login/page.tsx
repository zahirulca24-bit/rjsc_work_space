"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PrimaryButton } from "@/components/UI";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login({ email, password });
            // auth provider redirects
        } catch (err: any) {
            setError(err.message || "Failed to login. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#cfe9dd]">
            <div className="w-full max-w-md rounded-2xl bg-[#fff8e8] p-8 shadow-xl">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#315f55] text-white shadow-md">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-[#294f48]">ZA Corporate Desk</h1>
                    <p className="mt-1 text-sm font-medium text-[#4a6b63]">Internal Office Workspace · Sign in</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#294f48]">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="user@example.com"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#315f55]"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-[#294f48]">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#315f55]"
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#315f55] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#294f48] disabled:opacity-70"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
