import React, { createContext, useContext, useState } from 'react';

export type MemberRole = 'admin' | 'member';

export type AlbumMember = {
  id: string;
  name: string;
  initial: string;
  avatarColor: string;
  role: MemberRole;
  isMe: boolean;
  isCreator: boolean;
};

export type Album = {
  id: string;
  babyName: string;
  albumName: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  color: string;
  members: AlbumMember[];
};

export type Notification = {
  id: string;
  albumId: string;
  type: 'role_change';
  actorName: string;
  actorInitial: string;
  actorAvatarColor: string;
  targetMemberName: string;
  newRole: MemberRole;
  timestamp: number;
};

type AlbumContextType = {
  albums: Album[];
  selectedAlbumId: string;
  selectedAlbum: Album;
  setSelectedAlbumId: (id: string) => void;
  addAlbum: (data: Omit<Album, 'id' | 'members'>) => void;
  updateAlbum: (id: string, data: Partial<Omit<Album, 'id' | 'members'>>) => void;
  deleteAlbum: (id: string) => void;
  inviteMember: (albumId: string, name: string, role: MemberRole) => void;
  removeMember: (albumId: string, memberId: string) => void;
  updateMemberRole: (albumId: string, memberId: string, role: MemberRole) => void;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
};

const INITIAL_ALBUMS: Album[] = [
  {
    id: '1',
    babyName: '하늘이',
    albumName: '하늘이의 앨범',
    birthYear: 2024,
    birthMonth: 2,
    birthDay: 15,
    color: '#FF6B8A',
    members: [
      { id: 'm1', name: '플라잉캣', initial: '플', avatarColor: '#FF6B8A', role: 'admin', isMe: true, isCreator: true },
      { id: 'm2', name: '크라잉넛', initial: '크', avatarColor: '#6B8AFF', role: 'member', isMe: false, isCreator: false },
    ],
  },
];

const AVATAR_COLORS = ['#6B8AFF', '#6BC97A', '#FF9F43', '#A29BFE', '#FD79A8', '#00CEC9'];

const AlbumContext = createContext<AlbumContextType | null>(null);

export function AlbumProvider({ children }: { children: React.ReactNode }) {
  const [albums, setAlbums] = useState<Album[]>(INITIAL_ALBUMS);
  const [selectedAlbumId, setSelectedAlbumId] = useState(INITIAL_ALBUMS[0].id);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (n: Omit<Notification, 'id'>) => {
    setNotifications((prev) => [{ ...n, id: Date.now().toString() }, ...prev]);
  };

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId) ?? albums[0];

  const addAlbum = (data: Omit<Album, 'id' | 'members'>) => {
    const me: AlbumMember = {
      id: 'm-me',
      name: '플라잉캣',
      initial: '플',
      avatarColor: '#FF6B8A',
      role: 'admin',
      isMe: true,
      isCreator: true,
    };
    const newAlbum: Album = { ...data, id: Date.now().toString(), members: [me] };
    setAlbums((prev) => [...prev, newAlbum]);
    setSelectedAlbumId(newAlbum.id);
  };

  const updateAlbum = (id: string, data: Partial<Omit<Album, 'id' | 'members'>>) => {
    setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  };

  const deleteAlbum = (id: string) => {
    setAlbums((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (selectedAlbumId === id && next.length > 0) setSelectedAlbumId(next[0].id);
      return next;
    });
  };

  const inviteMember = (albumId: string, name: string, role: MemberRole) => {
    const colorIdx = Math.floor(Math.random() * AVATAR_COLORS.length);
    const newMember: AlbumMember = {
      id: `m-${Date.now()}`,
      name: name.trim(),
      initial: name.trim()[0] ?? '?',
      avatarColor: AVATAR_COLORS[colorIdx],
      role,
      isMe: false,
      isCreator: false,
    };
    setAlbums((prev) =>
      prev.map((a) => (a.id === albumId ? { ...a, members: [...a.members, newMember] } : a))
    );
  };

  const removeMember = (albumId: string, memberId: string) => {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === albumId ? { ...a, members: a.members.filter((m) => m.id !== memberId) } : a
      )
    );
  };

  const updateMemberRole = (albumId: string, memberId: string, role: MemberRole) => {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === albumId
          ? { ...a, members: a.members.map((m) => (m.id === memberId ? { ...m, role } : m)) }
          : a
      )
    );
  };

  return (
    <AlbumContext.Provider
      value={{
        albums,
        selectedAlbumId,
        selectedAlbum,
        setSelectedAlbumId,
        addAlbum,
        updateAlbum,
        deleteAlbum,
        inviteMember,
        removeMember,
        updateMemberRole,
        notifications,
        addNotification,
      }}
    >
      {children}
    </AlbumContext.Provider>
  );
}

export function useAlbums() {
  const ctx = useContext(AlbumContext);
  if (!ctx) throw new Error('useAlbums must be used within AlbumProvider');
  return ctx;
}
