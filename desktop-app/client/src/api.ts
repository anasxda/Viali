// Thin fetch wrapper talking to the local Express server (same origin,
// session cookie carries auth) - keeps the same get/post/put/del(url, body)
// shape every page already calls.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request(method: string, url: string, body?: unknown): Promise<any> {
    const res = await fetch(url, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!res.ok) {
        const message =
            data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
                ? String((data as Record<string, unknown>).error)
                : `Request failed (${res.status})`;
        throw new Error(message);
    }
    return data;
}

export const api = {
    get: (url: string) => request('GET', url),
    post: (url: string, body?: unknown) => request('POST', url, body ?? {}),
    put: (url: string, body?: unknown) => request('PUT', url, body ?? {}),
    del: (url: string) => request('DELETE', url),
};
