const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const getClients = async (search?: string, entityType?: string, status?: string) => {
    let url = `${API_BASE}/api/clients?`;
    if (search) url += `search=${search}&`;
    if (entityType) url += `entity_type=${entityType}&`;
    if (status) url += `status=${status}&`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch clients");
    return res.json();
};

export const getClient = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/clients/${id}`);
    if (!res.ok) throw new Error("Failed to fetch client");
    return res.json();
};

export const createClient = async (clientData: any) => {
    const res = await fetch(`${API_BASE}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData)
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to create client");
    }
    return res.json();
};

export const updateClient = async (id: string, clientData: any) => {
    const res = await fetch(`${API_BASE}/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientData)
    });
    if (!res.ok) throw new Error("Failed to update client");
    return res.json();
};

export const getClientCurrentPosition = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/clients/${id}/current-position`);
    if (!res.ok) throw new Error("Failed to fetch current position");
    return res.json();
};

export const getClientHistory = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/clients/${id}/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
};

export const addClientHistory = async (id: string, type: string, data: any) => {
    // type e.g., 'registered-office-history'
    const res = await fetch(`${API_BASE}/api/clients/${id}/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to add ${type}`);
    return res.json();
};

// Import Bulk
export const bulkImportClients = async (clients: any[]) => {
    // We didn't create a bulk import endpoint. We will just loop.
    let created = 0;
    let conflicts = 0;
    let errors = 0;
    for (const c of clients) {
        try {
            await createClient(c);
            created++;
        } catch (e: any) {
            if (e.message.includes("exists")) conflicts++;
            else errors++;
        }
    }
    return { created, conflicts, errors };
};
