"use client";

import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser } from "@/lib/api/users";
import { PageHeader, ContentCard, Table, Th, Td, StatusBadge } from "@/components/SharedUI";
import { PrimaryButton } from "@/components/UI";
import { Users as UsersIcon, PlusCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function UsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddMode, setIsAddMode] = useState(false);
    const [passwordTarget, setPasswordTarget] = useState<{ id: string; name: string } | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordNotice, setPasswordNotice] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "JUNIOR"
    });

    useEffect(() => {
        if (user?.role === "ADMIN") {
            loadUsers();
        }
    }, [user]);

    const loadUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createUser(formData);
            setIsAddMode(false);
            setFormData({ name: "", email: "", password: "", role: "JUNIOR" });
            loadUsers();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const closePasswordForm = () => {
        setPasswordTarget(null);
        setNewPassword("");
        setConfirmPassword("");
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordTarget || savingPassword) return;
        if (newPassword.length < 8) {
            alert("Use at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        setSavingPassword(true);
        try {
            await updateUser(passwordTarget.id, { password: newPassword });
            setPasswordNotice("Password updated for " + passwordTarget.name + ". Share the new password privately.");
            closePasswordForm();
        } catch (e: any) {
            alert(e.message || "Could not update password");
        } finally {
            setSavingPassword(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await updateUser(id, { is_active: !currentStatus });
            loadUsers();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleChangeRole = async (id: string, newRole: string) => {
        try {
            await updateUser(id, { role: newRole });
            loadUsers();
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (user?.role !== "ADMIN") {
        return <div className="p-8 text-center text-red-500 font-bold">Access Denied</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center"><PageHeader title="User Management" subtitle="Manage office staff, roles, and access permissions." icon={UsersIcon} /><PrimaryButton onClick={() => setIsAddMode(true)}>Add User</PrimaryButton></div>

            {isAddMode && (
                <ContentCard className="mb-6 p-4 border border-[#315f55]/20 bg-white shadow-sm">
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-[#47765a] mb-1">Name</label>
                            <input className="w-full rounded-lg border border-gray-300 px-3 py-2" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-[#47765a] mb-1">Email</label>
                            <input className="w-full rounded-lg border border-gray-300 px-3 py-2" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-[#47765a] mb-1">Password</label>
                            <input className="w-full rounded-lg border border-gray-300 px-3 py-2" type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-[#47765a] mb-1">Role</label>
                            <select className="w-full rounded-lg border border-gray-300 px-3 py-2" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                <option value="ADMIN">Admin</option>
                                <option value="MANAGER">Manager</option>
                                <option value="SENIOR">Senior</option>
                                <option value="JUNIOR">Junior</option>
                            </select>
                        </div>
                        <div className="md:col-span-1 flex gap-2">
                            <PrimaryButton >Save</PrimaryButton>
                            <button type="button" onClick={() => setIsAddMode(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
                        </div>
                    </form>
                </ContentCard>
            )}

            {passwordNotice && (
                <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                    {passwordNotice}
                </div>
            )}

            {passwordTarget && (
                <ContentCard className="p-4">
                    <form onSubmit={handleSetPassword} className="space-y-4">
                        <h2 className="text-lg font-bold text-[#294f48]">Change Password — {passwordTarget.name}</h2>
                        <p className="text-xs text-gray-600">Admin sets a new password; the existing password is never displayed.</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="block text-sm font-semibold">
                                New Password
                                <input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                            </label>
                            <label className="block text-sm font-semibold">
                                Confirm Password
                                <input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" disabled={savingPassword} className="rounded-lg bg-[#315f55] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingPassword ? "Saving..." : "Save Password"}</button>
                            <button type="button" onClick={closePasswordForm} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button>
                        </div>
                    </form>
                </ContentCard>
            )}

            <ContentCard>
                <div className="overflow-x-auto">
                    <Table>
                        <thead>
                            <tr>
                                <Th>Name</Th>
                                <Th>Email</Th>
                                <Th>Role</Th>
                                <Th>Status</Th>
                                <Th>Actions</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-t border-black/5">
                                    <Td><div className="font-semibold text-[#353731]">{u.name}</div></Td>
                                    <Td>{u.email}</Td>
                                    <Td>
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                            className="rounded-lg border border-gray-200 px-2 py-1 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#79b993]"
                                        >
                                            <option value="ADMIN">ADMIN</option>
                                            <option value="MANAGER">MANAGER</option>
                                            <option value="SENIOR">SENIOR</option>
                                            <option value="JUNIOR">JUNIOR</option>
                                        </select>
                                    </Td>
                                    <Td>
                                        <StatusBadge 
                                            status={u.is_active ? "ACTIVE" : "INACTIVE"}
                                             
                                        />
                                    </Td>
                                    <Td>
                                        <button 
                                            onClick={() => handleToggleStatus(u.id, u.is_active)}
                                            className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                                        >
                                            {u.is_active ? "Deactivate" : "Activate"}
                                        </button>
                                        <button type="button" onClick={() => {
                                            setPasswordNotice("");
                                            setPasswordTarget({ id: u.id, name: u.name });
                                            setNewPassword("");
                                            setConfirmPassword("");
                                        }} className="ml-2 rounded-full bg-[#e7f5ec] px-3 py-1 text-xs font-semibold text-[#315f55] hover:bg-[#cfe9dd]">
                                            Change Password
                                        </button>
                                    </Td>
                                </tr>
                            ))}
                            {users.length === 0 && !loading && (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No users found.</td></tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </ContentCard>
        </div>
    );
}
