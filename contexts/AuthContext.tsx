import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { guestRegister } from '@/services/api';

// 웹은 SecureStore 미지원 → localStorage 폴백
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    return SecureStore.deleteItemAsync(key);
  },
};

export type UserRole = 'mom' | 'dad';

export type GuestSession = {
  userId: number;
  albumId: number;
  token: string;
  nickname: string;
  role: UserRole;
  babyName: string;
  babyBirth: string;
};

type AuthContextType = {
  session: GuestSession | null;
  isLoading: boolean;
  createGuestSession: (data: Pick<GuestSession, 'nickname' | 'role' | 'babyName' | 'babyBirth'>) => Promise<void>;
  switchAlbum: (albumId: number, babyName: string, babyBirth: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

const SESSION_KEY = 'family_photo_guest_session';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const stored = await storage.get(SESSION_KEY);
      if (stored) {
        setSession(JSON.parse(stored));
      }
    } catch {
      // 무시
    } finally {
      setIsLoading(false);
    }
  }

  async function createGuestSession(
    data: Pick<GuestSession, 'nickname' | 'role' | 'babyName' | 'babyBirth'>
  ) {
    // API 호출 → 유저 + 앨범 생성 + JWT 발급
    const res = await guestRegister({
      nickname: data.nickname,
      role: data.role,
      babyName: data.babyName,
      babyBirth: data.babyBirth,
    });

    const newSession: GuestSession = {
      userId: res.user.id,
      albumId: res.album.id,
      token: res.token,
      nickname: data.nickname,
      role: data.role,
      babyName: data.babyName,
      babyBirth: data.babyBirth,
    };

    await storage.set(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }

  async function switchAlbum(albumId: number, babyName: string, babyBirth: string) {
    if (!session) return;
    const updated = { ...session, albumId, babyName, babyBirth };
    await storage.set(SESSION_KEY, JSON.stringify(updated));
    setSession(updated);
  }

  async function clearSession() {
    await storage.remove(SESSION_KEY);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, createGuestSession, switchAlbum, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
