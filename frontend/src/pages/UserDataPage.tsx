// User Data management page with add/delete users, roles, accessibility, password, and profile photo
import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { WorkshopUser, UserRole, UserAccessibility } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Users, Upload, Camera, ShieldCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_OPTIONS: UserRole[] = ['Admin', 'Kasir', 'Teknisi'];
const ACCESSIBILITY_OPTIONS: UserAccessibility[] = ['Full Access', 'POS Only', 'Reports Only'];

function getRoleBadgeVariant(role?: UserRole): 'default' | 'secondary' | 'outline' {
  if (role === 'Admin') return 'default';
  if (role === 'Kasir') return 'secondary';
  return 'outline';
}

function getAccessibilityIcon(accessibility?: UserAccessibility) {
  if (accessibility === 'Full Access') return <ShieldCheck className="w-3 h-3 mr-1" />;
  if (accessibility === 'POS Only') return <Eye className="w-3 h-3 mr-1" />;
  return <Eye className="w-3 h-3 mr-1" />;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserDataPage() {
  const { getAllUsers, addUser, deleteUser, updateUserPhoto, currentUser } = useAuth();
  const [users, setUsers] = useState<WorkshopUser[]>(() => getAllUsers());

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Kasir');
  const [newAccessibility, setNewAccessibility] = useState<UserAccessibility>('POS Only');
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<WorkshopUser | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadPhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refreshUsers = () => setUsers(getAllUsers());

  const resetAddForm = () => {
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('Kasir');
    setNewAccessibility('POS Only');
    setNewPhoto('');
    setShowPassword(false);
  };

  const handleAddUser = async () => {
    if (!newName.trim()) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    if (!newUsername.trim()) {
      toast.error('Username wajib diisi');
      return;
    }
    if (!newPassword.trim()) {
      toast.error('Password wajib diisi');
      return;
    }
    setAdding(true);
    const success = addUser({
      username: newUsername.trim(),
      password: newPassword.trim(),
      name: newName.trim(),
      userRole: newRole,
      accessibility: newAccessibility,
      photoBase64: newPhoto || undefined,
    });
    setAdding(false);
    if (success) {
      toast.success(`User "${newName}" berhasil ditambahkan`);
      setShowAddDialog(false);
      resetAddForm();
      refreshUsers();
    } else {
      toast.error('Username sudah digunakan, gunakan username lain');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.username === 'admin') {
      toast.error('Admin default tidak dapat dihapus');
      setDeleteTarget(null);
      return;
    }
    deleteUser(deleteTarget.username);
    toast.success(`User "${deleteTarget.name || deleteTarget.username}" berhasil dihapus`);
    setDeleteTarget(null);
    refreshUsers();
  };

  const handlePhotoUpload = (username: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      updateUserPhoto(username, base64);
      toast.success('Foto profil diperbarui');
      refreshUsers();
    };
    reader.readAsDataURL(file);
  };

  const handleNewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Pengguna</h1>
            <p className="text-sm text-muted-foreground">Kelola akun pengguna sistem</p>
          </div>
        </div>
        <Button onClick={() => { resetAddForm(); setShowAddDialog(true); }} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Tambah User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Daftar Pengguna
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({users.length} user)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-16 pl-4">Foto</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Aksesibilitas</TableHead>
                  <TableHead className="text-right pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isDefaultAdmin = user.username === 'admin';
                  const isCurrentUser = user.username === currentUser?.username;
                  return (
                    <TableRow key={user.username} className="hover:bg-muted/30">
                      {/* Avatar + Upload */}
                      <TableCell className="pl-4">
                        <div className="relative group w-10 h-10">
                          <Avatar className="w-10 h-10 ring-2 ring-border">
                            <AvatarImage src={user.photoBase64} alt={user.name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                              {getInitials(user.name || user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => uploadPhotoRefs.current[user.username]?.click()}
                            title="Ganti foto"
                          >
                            <Camera className="w-4 h-4 text-white" />
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => { uploadPhotoRefs.current[user.username] = el; }}
                            onChange={(e) => handlePhotoUpload(user.username, e)}
                          />
                        </div>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {user.name || user.username}
                        </div>
                        {isCurrentUser && (
                          <div className="text-xs text-primary font-medium">● Anda</div>
                        )}
                      </TableCell>

                      {/* Username */}
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {user.username}
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.userRole)}>
                          {user.userRole || (isDefaultAdmin ? 'Admin' : 'Kasir')}
                        </Badge>
                      </TableCell>

                      {/* Accessibility */}
                      <TableCell>
                        <span className="inline-flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {getAccessibilityIcon(user.accessibility)}
                          {user.accessibility || (isDefaultAdmin ? 'Full Access' : 'POS Only')}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        {isDefaultAdmin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Admin default tidak dapat dihapus"
                            className="opacity-30 cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(user)}
                            title={`Hapus user ${user.name || user.username}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetAddForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Tambah User Baru
            </DialogTitle>
            <DialogDescription>
              Isi data lengkap untuk menambahkan pengguna baru ke sistem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                <Avatar className="w-24 h-24 ring-4 ring-border">
                  <AvatarImage src={newPhoto} />
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                    {newName ? getInitials(newName) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                  <span className="text-white text-xs mt-1">Upload</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {newPhoto ? 'Ganti Foto' : 'Upload Foto'}
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleNewPhotoUpload}
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="new-name">
                Nama Lengkap <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="new-username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Masukkan username"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Accessibility */}
            <div className="space-y-1.5">
              <Label>
                Aksesibilitas <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newAccessibility}
                onValueChange={(v) => setNewAccessibility(v as UserAccessibility)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih aksesibilitas" />
                </SelectTrigger>
                <SelectContent>
                  {ACCESSIBILITY_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newAccessibility === 'Full Access' && 'Akses penuh ke semua fitur sistem'}
                {newAccessibility === 'POS Only' && 'Hanya dapat mengakses fitur kasir/POS'}
                {newAccessibility === 'Reports Only' && 'Hanya dapat melihat laporan'}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowAddDialog(false); resetAddForm(); }}
            >
              Batal
            </Button>
            <Button onClick={handleAddUser} disabled={adding} className="gap-2">
              {adding ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Simpan User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Hapus Pengguna
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengguna{' '}
              <strong>"{deleteTarget?.name || deleteTarget?.username}"</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
