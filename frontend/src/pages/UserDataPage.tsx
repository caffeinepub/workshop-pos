import React, { useState } from 'react';
import { useAuth, WorkshopUser, UserRole } from '../hooks/useAuth';
import { PermissionsChecklist, Permission, getDefaultPermissions, ALL_PERMISSIONS } from '../components/user/PermissionsChecklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, UserPlus, Shield } from 'lucide-react';

const ROLE_COLORS: Record<UserRole, string> = {
  Admin: 'bg-primary text-primary-foreground',
  User: 'bg-secondary text-secondary-foreground',
  Kasir: 'bg-muted text-muted-foreground',
};

/** Parse accessibility JSON string into Permission[] */
function parsePermissions(accessibility: string): Permission[] {
  try {
    const ids: string[] = JSON.parse(accessibility);
    return ALL_PERMISSIONS.map((p) => ({ ...p, checked: ids.includes(p.id) }));
  } catch {
    return getDefaultPermissions('User');
  }
}

/** Serialize Permission[] back to JSON string of IDs */
function serializePermissions(permissions: Permission[]): string {
  return JSON.stringify(permissions.filter((p) => p.checked).map((p) => p.id));
}

interface AddFormState {
  name: string;
  username: string;
  password: string;
  userRole: UserRole;
  permissions: Permission[];
}

interface EditFormState {
  name: string;
  username: string;
  password: string;
  userRole: UserRole;
  permissions: Permission[];
}

interface AuthFormState {
  userRole: UserRole;
  permissions: Permission[];
}

export default function UserDataPage() {
  const { users, addUser, updateUser, deleteUser, currentUser } = useAuth();

  const isAdmin = currentUser?.userRole === 'Admin';

  // --- Add User Dialog ---
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>({
    name: '',
    username: '',
    password: '',
    userRole: 'User',
    permissions: getDefaultPermissions('User'),
  });

  const openAdd = () => {
    setAddForm({ name: '', username: '', password: '', userRole: 'User', permissions: getDefaultPermissions('User') });
    setAddOpen(true);
  };

  const handleAddRoleChange = (role: UserRole) => {
    setAddForm(f => ({ ...f, userRole: role, permissions: getDefaultPermissions(role) }));
  };

  const handleAddSave = () => {
    if (!addForm.name.trim() || !addForm.username.trim() || !addForm.password.trim()) return;
    addUser({
      name: addForm.name.trim(),
      username: addForm.username.trim(),
      password: addForm.password,
      userRole: addForm.userRole,
      accessibility: serializePermissions(addForm.permissions),
    });
    setAddOpen(false);
  };

  // --- Edit User Dialog (full) ---
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkshopUser | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    username: '',
    password: '',
    userRole: 'User',
    permissions: getDefaultPermissions('User'),
  });

  const openEdit = (user: WorkshopUser) => {
    setEditTarget(user);
    setEditForm({
      name: user.name,
      username: user.username,
      password: user.password,
      userRole: user.userRole,
      permissions: parsePermissions(user.accessibility),
    });
    setEditOpen(true);
  };

  const handleEditRoleChange = (role: UserRole) => {
    setEditForm(f => ({ ...f, userRole: role, permissions: getDefaultPermissions(role) }));
  };

  const handleEditSave = () => {
    if (!editTarget || !editForm.name.trim() || !editForm.username.trim()) return;
    updateUser(editTarget.id, {
      name: editForm.name.trim(),
      username: editForm.username.trim(),
      password: editForm.password,
      userRole: editForm.userRole,
      accessibility: serializePermissions(editForm.permissions),
    });
    setEditOpen(false);
    setEditTarget(null);
  };

  // --- Edit Authorization Dialog (role + permissions only) ---
  const [authEditOpen, setAuthEditOpen] = useState(false);
  const [authEditTarget, setAuthEditTarget] = useState<WorkshopUser | null>(null);
  const [authEditForm, setAuthEditForm] = useState<AuthFormState>({
    userRole: 'User',
    permissions: getDefaultPermissions('User'),
  });

  const openAuthEdit = (user: WorkshopUser) => {
    setAuthEditTarget(user);
    setAuthEditForm({
      userRole: user.userRole,
      permissions: parsePermissions(user.accessibility),
    });
    setAuthEditOpen(true);
  };

  const handleAuthEditRoleChange = (role: UserRole) => {
    setAuthEditForm(f => ({ ...f, userRole: role, permissions: getDefaultPermissions(role) }));
  };

  const handleAuthEditSave = () => {
    if (!authEditTarget) return;
    updateUser(authEditTarget.id, {
      userRole: authEditForm.userRole,
      accessibility: serializePermissions(authEditForm.permissions),
    });
    setAuthEditOpen(false);
    setAuthEditTarget(null);
  };

  // --- Delete Dialog ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkshopUser | null>(null);

  const openDelete = (user: WorkshopUser) => {
    setDeleteTarget(user);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteUser(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Pengguna</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola akun dan otorisasi pengguna</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Tambah Pengguna
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Izin Akses</TableHead>
              {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const perms = parsePermissions(user.accessibility);
              const checkedPerms = perms.filter(p => p.checked);

              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                        {user.id === currentUser?.id && (
                          <div className="text-xs text-primary font-medium">(Anda)</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.userRole]}`}>
                      {user.userRole}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {checkedPerms.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Tidak ada izin</span>
                      ) : checkedPerms.length > 4 ? (
                        <>
                          {checkedPerms.slice(0, 3).map(p => (
                            <Badge key={p.id} variant="outline" className="text-xs">{p.label}</Badge>
                          ))}
                          <Badge variant="secondary" className="text-xs">+{checkedPerms.length - 3} lainnya</Badge>
                        </>
                      ) : (
                        checkedPerms.map(p => (
                          <Badge key={p.id} variant="outline" className="text-xs">{p.label}</Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAuthEdit(user)}
                          className="gap-1.5 text-xs"
                          title="Edit Otorisasi"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Otorisasi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(user)}
                          className="gap-1.5 text-xs"
                          title="Edit Pengguna"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDelete(user)}
                            className="gap-1.5 text-xs"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                  Belum ada pengguna
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna</DialogTitle>
            <DialogDescription>Buat akun pengguna baru dengan role dan izin akses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                value={addForm.username}
                onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Masukkan username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Masukkan password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={addForm.userRole} onValueChange={v => handleAddRoleChange(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Kasir">Kasir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Izin Akses</Label>
              <p className="text-xs text-muted-foreground">Pilih role untuk mengisi izin default, atau sesuaikan secara manual.</p>
              <PermissionsChecklist
                permissions={addForm.permissions}
                onChange={perms => setAddForm(f => ({ ...f, permissions: perms }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button
              onClick={handleAddSave}
              disabled={!addForm.name.trim() || !addForm.username.trim() || !addForm.password.trim()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog (full) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>Ubah data akun pengguna.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                value={editForm.username}
                onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Masukkan username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Masukkan password baru"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editForm.userRole} onValueChange={v => handleEditRoleChange(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Kasir">Kasir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Izin Akses</Label>
              <PermissionsChecklist
                permissions={editForm.permissions}
                onChange={perms => setEditForm(f => ({ ...f, permissions: perms }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button
              onClick={handleEditSave}
              disabled={!editForm.name.trim() || !editForm.username.trim()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Authorization Dialog (role + permissions only) */}
      <Dialog open={authEditOpen} onOpenChange={setAuthEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Edit Otorisasi — {authEditTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Ubah role dan izin akses pengguna ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={authEditForm.userRole} onValueChange={v => handleAuthEditRoleChange(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Kasir">Kasir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Izin Akses</Label>
              <p className="text-xs text-muted-foreground">Pilih role untuk mengisi izin default, atau sesuaikan secara manual.</p>
              <PermissionsChecklist
                permissions={authEditForm.permissions}
                onChange={perms => setAuthEditForm(f => ({ ...f, permissions: perms }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthEditOpen(false)}>Batal</Button>
            <Button onClick={handleAuthEditSave}>
              Simpan Otorisasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengguna <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
