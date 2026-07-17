import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

interface User {
    UserID: number;
    WindowsUsername: string | null;
    FullName: string;
    RoleID: number;
    RoleName: string;
    Email: string | null;
    IsActive: number;
}
interface Role {
    RoleID: number;
    RoleName: string;
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [newUser, setNewUser] = useState({ windowsUsername: '', fullName: '', roleId: '', email: '' });
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
    const [savingRoleId, setSavingRoleId] = useState<number | null>(null);

    function load() {
        api.get('/api/admin/users').then(setUsers).catch((e) => setError(e.message));
        api.get('/api/admin/reference/roles').then(setRoles).catch(() => {});
    }
    useEffect(load, []);

    async function toggleActive(u: User) {
        try {
            await api.put(`/api/admin/users/${u.UserID}`, { isActive: !u.IsActive });
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    }

    async function changeRole(u: User, roleId: string) {
        if (!roleId || Number(roleId) === u.RoleID) return;
        setSavingRoleId(u.UserID);
        try {
            await api.put(`/api/admin/users/${u.UserID}`, { roleId: Number(roleId) });
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update role');
        } finally {
            setSavingRoleId(null);
        }
    }

    async function confirmDeleteUser() {
        if (!confirmDelete) return;
        const u = confirmDelete;
        setDeletingId(u.UserID);
        try {
            await api.del(`/api/admin/users/${u.UserID}`);
            setConfirmDelete(null);
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
            setConfirmDelete(null);
        } finally {
            setDeletingId(null);
        }
    }

    async function addUser(e: FormEvent) {
        e.preventDefault();
        if (!newUser.fullName || !newUser.roleId) return;
        try {
            await api.post('/api/admin/users', { ...newUser, roleId: Number(newUser.roleId) });
            setNewUser({ windowsUsername: '', fullName: '', roleId: '', email: '' });
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Add user failed');
        }
    }

    return (
        <div>
            <Link to="/admin" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                ← Back to Administration
            </Link>
            <h1 className="page-title" style={{ marginTop: 8 }}>
                User Management
            </h1>
            {error && <div className="error-banner">{error}</div>}

            <form className="card" onSubmit={addUser} style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <Field label="Windows Username">
                    <input value={newUser.windowsUsername} onChange={(e) => setNewUser({ ...newUser, windowsUsername: e.target.value })} placeholder="DOMAIN\username" />
                </Field>
                <Field label="Full Name *">
                    <input required value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} />
                </Field>
                <Field label="Role *">
                    <select required value={newUser.roleId} onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })}>
                        <option value="">Select…</option>
                        {roles.map((r) => (
                            <option key={r.RoleID} value={r.RoleID}>
                                {r.RoleName}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Email">
                    <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </Field>
                <button className="btn btn-primary" type="submit">
                    Add User
                </button>
            </form>

            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                <table>
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Windows Username</th>
                            <th>Role</th>
                            <th>Email</th>
                            <th>Active</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.UserID}>
                                <td>{u.FullName}</td>
                                <td>{u.WindowsUsername}</td>
                                <td>
                                    <select
                                        value={u.RoleID}
                                        disabled={savingRoleId === u.UserID}
                                        onChange={(e) => changeRole(u, e.target.value)}
                                    >
                                        {roles.map((r) => (
                                            <option key={r.RoleID} value={r.RoleID}>
                                                {r.RoleName}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td>{u.Email}</td>
                                <td>{u.IsActive ? 'Yes' : 'No'}</td>
                                <td style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={() => toggleActive(u)}>
                                        {u.IsActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button className="btn btn-danger" onClick={() => setConfirmDelete(u)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {confirmDelete && (
                <div className="modal-overlay">
                    <div className="card" style={{ width: 380, background: '#fff' }}>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Delete user?</div>
                        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 16 }}>
                            Permanently delete <strong>{confirmDelete.FullName}</strong>? This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" disabled={deletingId === confirmDelete.UserID} onClick={confirmDeleteUser}>
                                {deletingId === confirmDelete.UserID ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>{label}</label>
            {children}
        </div>
    );
}
