import { Platform } from 'react-native';


// 플랫폼별 API 베이스 URL
const API_BASE = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  default: 'http://localhost:3000/api',
});

// 정적 파일 베이스 URL (/files/... 경로를 절대 URL로 변환할 때 사용)
export const FILE_BASE = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
}) as string;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(err.error ?? `HTTP ${res.status}`, res.status);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export type GuestRegisterPayload = {
  nickname: string;
  role: 'mom' | 'dad';
  babyName: string;
  babyBirth: string;
};

export type GuestRegisterResponse = {
  token: string;
  user: { id: number; name: string };
  album: { id: number; name: string; baby_name: string };
};

export function guestRegister(payload: GuestRegisterPayload) {
  return request<GuestRegisterResponse>('/auth/guest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Photos ──────────────────────────────────────────────────────────────────

export type ApiPhoto = {
  id: number;
  album_id: number;
  uploader_id: number;
  uploader_name: string;
  thumb_url: string;
  medium_url: string;
  original_url: string;
  mime_type: string;
  width: number;
  height: number;
  taken_at: string | null;
  uploaded_at: string;
  visibility: 'public' | 'family' | 'private';
  like_count: number;
  liked_by_me: boolean;
};

export type ApiComment = {
  id: number;
  photo_id: number;
  user_id: number;
  user_name: string;
  body: string;
  parent_id: number | null;
  created_at: string;
  replies: ApiComment[];
};

export type PhotosResponse = {
  photos: ApiPhoto[];
  total: number;
  page: number;
};

export function getPhotos(albumId: number, token: string, page = 1, limit = 50) {
  return request<PhotosResponse>(
    `/albums/${albumId}/photos?page=${page}&limit=${limit}`,
    {},
    token
  );
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export function toggleLike(photoId: string, token: string) {
  return request<{ liked: boolean; count: number }>(`/photos/${photoId}/like`, { method: 'POST' }, token);
}

export function getComments(photoId: string, token: string) {
  return request<ApiComment[]>(`/photos/${photoId}/comments`, {}, token);
}

export function addComment(photoId: string, token: string, body: string, parentId?: number) {
  return request<ApiComment>(`/photos/${photoId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, parentId }),
  }, token);
}

export function deleteComment(commentId: number, token: string) {
  return request<{ success: boolean }>(`/comments/${commentId}`, { method: 'DELETE' }, token);
}

export function updateVisibility(photoId: string, token: string, visibility: 'public' | 'family' | 'private') {
  return request<{ visibility: string }>(`/photos/${photoId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
  }, token);
}

// ─── Albums ───────────────────────────────────────────────────────────────────

export type ApiAlbum = {
  id: number;
  name: string;
  baby_name: string;
  birth_date: string; // YYYY-MM-DD
  color: string;
  avatar_url?: string | null;
  created_by: number;
  role: 'admin' | 'member';
};

export function getAlbums(token: string) {
  return request<ApiAlbum[]>('/albums', {}, token);
}

export function createAlbum(token: string, data: { name: string; babyName: string; birthDate: string; color: string }) {
  return request<ApiAlbum>('/albums', { method: 'POST', body: JSON.stringify(data) }, token);
}

export function updateAlbumApi(albumId: number, token: string, data: { name?: string; babyName?: string; birthDate?: string; color?: string }) {
  return request<ApiAlbum>(`/albums/${albumId}`, { method: 'PUT', body: JSON.stringify(data) }, token);
}

export function deleteAlbumApi(albumId: number, token: string) {
  return request<{ success: boolean }>(`/albums/${albumId}`, { method: 'DELETE' }, token);
}

export async function uploadAlbumAvatar(albumId: number, token: string, uri: string, mimeType: string, fileName: string) {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append('file', blob, fileName);
  } else {
    formData.append('file', { uri, type: mimeType, name: fileName } as unknown as Blob);
  }
  return request<{ avatar_url: string }>(`/albums/${albumId}/avatar`, { method: 'POST', body: formData }, token);
}

// ─── Members ──────────────────────────────────────────────────────────────────

export type ApiMember = {
  id: number;
  name: string;
  role: 'admin' | 'member';
  display_role: string;
  joined_at: string;
  is_creator: boolean;
  avatar_url?: string | null;
};

export type ApiActivity = {
  uploader_id: number;
  uploader_name: string;
  avatar_url?: string | null;
  count: number;
  last_uploaded_at: string;
};

export function getMembers(albumId: number, token: string) {
  return request<ApiMember[]>(`/albums/${albumId}/members`, {}, token);
}

export function getActivity(albumId: number, token: string) {
  return request<ApiActivity[]>(`/albums/${albumId}/activity`, {}, token);
}

export function getPublicPhotos(albumId: number, token: string, page = 1, limit = 50) {
  return request<PhotosResponse>(
    `/albums/${albumId}/photos?page=${page}&limit=${limit}&visibility=public`,
    {},
    token
  );
}

export function removeMember(albumId: number, memberId: number, token: string) {
  return request<{ success: boolean }>(`/albums/${albumId}/members/${memberId}`, { method: 'DELETE' }, token);
}

export function updateMemberRoleApi(albumId: number, memberId: number, role: 'admin' | 'member', token: string) {
  return request<{ success: boolean }>(`/albums/${albumId}/members/${memberId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  }, token);
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export type InviteInfo = {
  albumId: number;
  albumName: string;
  babyName: string;
  birthDate: string;
  color: string;
  invitedRole: string;
  albumRole: 'admin' | 'member';
};

export type JoinInviteResponse = {
  token: string;
  user: { id: number; name: string };
  album: { id: number; name: string; baby_name: string; birth_date: string };
  invitedRole: string;
};

export function createInvite(
  albumId: number,
  token: string,
  invitedRole: string,
  albumRole: 'admin' | 'member',
) {
  return request<{ token: string }>(
    `/albums/${albumId}/invite`,
    { method: 'POST', body: JSON.stringify({ invitedRole, albumRole }) },
    token,
  );
}

export function getInviteInfo(inviteToken: string) {
  return request<InviteInfo>(`/invite/${inviteToken}`);
}

export function updateMe(token: string, name: string) {
  return request<{ id: number; name: string; avatar_url?: string | null }>('/users/me', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  }, token);
}

export async function uploadAvatar(token: string, uri: string, mimeType: string, fileName: string) {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append('file', blob, fileName);
  } else {
    formData.append('file', { uri, type: mimeType, name: fileName } as unknown as Blob);
  }
  return request<{ avatar_url: string }>('/users/me/avatar', { method: 'POST', body: formData }, token);
}

export function joinViaInvite(inviteToken: string, nickname: string) {
  return request<JoinInviteResponse>(`/invite/${inviteToken}/join`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadPhoto(
  albumId: number,
  token: string,
  uri: string,
  mimeType: string,
  fileName: string,
  takenAt?: number | null,  // Unix ms timestamp
): Promise<ApiPhoto> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append('file', blob, fileName);
  } else {
    formData.append('file', { uri, type: mimeType, name: fileName } as unknown as Blob);
  }

  if (takenAt) formData.append('taken_at', new Date(takenAt).toISOString());

  return request<ApiPhoto>(`/albums/${albumId}/photos`, {
    method: 'POST',
    body: formData,
  }, token);
}
