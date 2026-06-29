import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const CURRENT_USER = {
  id: 'u_006',
  username: 'you',
  name: 'You',
  avatarColor: '#F59E0B',
  avatarInitials: 'Y',
};

export const useAppStore = create(
  persist(
    (set, get) => ({
      isDark: false,
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),

      currentUser: CURRENT_USER,

      likedPosts: {},
      toggleLike: (postId) =>
        set((s) => {
          const liked = !s.likedPosts[postId];
          const next = { ...s.likedPosts };
          if (liked) next[postId] = true;
          else delete next[postId];
          return { likedPosts: next };
        }),
      isLiked: (postId) => Boolean(get().likedPosts[postId]),

      savedPosts: {},
      toggleSave: (postId) =>
        set((s) => {
          const saved = !s.savedPosts[postId];
          const next = { ...s.savedPosts };
          if (saved) next[postId] = true;
          else delete next[postId];
          return { savedPosts: next };
        }),
      isSaved: (postId) => Boolean(get().savedPosts[postId]),

      followingIds: {},
      toggleFollow: (userId) =>
        set((s) => {
          const following = !s.followingIds[userId];
          const next = { ...s.followingIds };
          if (following) next[userId] = true;
          else delete next[userId];
          return { followingIds: next };
        }),
      isFollowing: (userId) => Boolean(get().followingIds[userId]),
    }),
    {
      name: 'triboo-social-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        isDark: s.isDark,
        likedPosts: s.likedPosts,
        savedPosts: s.savedPosts,
        followingIds: s.followingIds,
      }),
    }
  )
);
