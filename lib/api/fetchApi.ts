export interface FetchApiOptions extends RequestInit {
    skipAuthExpiry?: boolean;
}

export type SessionExpiredListener = (destination?: string) => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

export const onSessionExpired = (listener: SessionExpiredListener): (() => void) => {
    sessionExpiredListeners.add(listener);
    return () => {
        sessionExpiredListeners.delete(listener);
    };
};

export const notifySessionExpired = (destination?: string) => {
    sessionExpiredListeners.forEach((listener) => {
        try {
            listener(destination);
        } catch (err) {
            console.error("Session expired listener error:", err);
        }
    });

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("rjsc:session-expired", {
                detail: { destination },
            })
        );
    }
};

const isAuthBypassUrl = (url: string | URL | Request): boolean => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : (url as Request).url || "";
    // Exclude login endpoints so failed credentials are not treated as expired sessions
    return urlStr.includes("/api/auth/login");
};

export const fetchApi = async (url: string | URL | Request, init?: FetchApiOptions) => {
    const res = await fetch(url, {
        ...init,
        credentials: "include",
    });

    if (res.status === 401 && !init?.skipAuthExpiry && !isAuthBypassUrl(url)) {
        let destination: string | undefined;
        if (typeof window !== "undefined" && window.location) {
            const path = window.location.pathname + window.location.search;
            if (!path.startsWith("/login")) {
                destination = path;
            }
        }
        notifySessionExpired(destination);
    }

    return res;
};

