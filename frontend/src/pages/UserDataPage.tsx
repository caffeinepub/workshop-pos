// User Data management page with add/delete users and profile photo upload stored in localStorage
import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { WorkshopUser } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Users, Upload } from 'lucide-react';
import { toast } from 'sonner';

export function UserDataPage() {
  const { getAllUsers, addUser, deleteUser, updateUserPhoto, currentUser } = useAuth();
  const [users, setUsers] = useState<WorkshopUser[]>(() => getAllUsers());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhoto, setNewPhoto] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadPhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refreshUsers = () => setUsers(getAllUsers());

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error('Username dan password wajib diisi');
      return;
    }
    setAdding(true);
    const success = addUser(newUsername.trim(), newPassword.trim(), newPhoto || undefined);
    setAdding(false);
    if (success) {
      toast.success(`User "${newUsername}" berhasil ditambahkan`);
      setShowAddDialog(false);
      setNewUsername('');
      setNewPassword('');
      setNewPhoto('');
      refreshUsers();
    } else {
      toast.error('Username sudah digunakan');
    }
  };

  const handleDeleteUser = (username: string) => {
    if (username === 'admin') {
      toast.error('Admin tidak dapat dihapus');
      return;
    }
    if (username === currentUser?.username) {
      toast.error('Tidak dapat menghapus user yang sedang login');
      return;
    }
    deleteUser(username);
    toast.success(`User "${username}" berhasil dihapus`);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Data User</h1>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Tambah User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar User ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.username}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.photoBase64} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => uploadPhotoRefs.current[user.username]?.click()}
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Ganti
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => { uploadPhotoRefs.current[user.username] = el; }}
                        onChange={(e) => handlePhotoUpload(user.username, e)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    {user.isAdmin || user.username === 'admin' ? (
                      <Badge className="bg-primary text-primary-foreground">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.username)}
                      disabled={user.username === 'admin'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-20 h-20">
                <AvatarImage src={newPhoto} />
                <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                  {newUsername ? newUsername.charAt(0).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Foto
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleNewPhotoUpload}
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Masukkan username"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddUser} disabled={adding}>
              {adding ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
