export const fetchApi = async (url: string | URL | Request, init?: RequestInit) => {
    return fetch(url, {
        ...init,
        credentials: "include",
    });
};
