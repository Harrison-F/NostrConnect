import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@nostrify/react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';

export function useFollow() {
  const [isFollowing, setIsFollowing] = useState(false);
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();

  // Get current follow list
  const { data: followList, refetch: refetchFollowList } = useQuery({
    queryKey: ['follow-list', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return null;
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [3],
          authors: [user.pubkey],
          limit: 1,
        }
      ], { signal });

      return events[0] || null;
    },
    enabled: !!user?.pubkey,
  });

  const followUser = async (pubkeyToFollow: string) => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to follow users.',
        variant: 'destructive',
      });
      return false;
    }

    setIsFollowing(true);
    try {
      // Get existing follows
      const existingFollows = followList?.tags
        .filter(([name]) => name === 'p')
        .map(([, pubkey]) => pubkey) || [];

      // Check if already following
      if (existingFollows.includes(pubkeyToFollow)) {
        toast({
          title: 'Already following',
          description: 'You are already following this user.',
        });
        setIsFollowing(false);
        return true;
      }

      // Create new follow list with the new user
      const newTags = [
        ...existingFollows.map(pubkey => ['p', pubkey]),
        ['p', pubkeyToFollow],
      ];

      await createEvent({
        kind: 3,
        content: followList?.content || '',
        tags: newTags,
      });

      toast({
        title: 'Following!',
        description: 'You are now following this user.',
      });

      // Refetch the follow list
      refetchFollowList();
      return true;
    } catch (error) {
      console.error('Failed to follow user:', error);
      toast({
        title: 'Error',
        description: 'Failed to follow user. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsFollowing(false);
    }
  };

  const unfollowUser = async (pubkeyToUnfollow: string) => {
    if (!user) return false;

    setIsFollowing(true);
    try {
      // Get existing follows
      const existingFollows = followList?.tags
        .filter(([name]) => name === 'p')
        .map(([, pubkey]) => pubkey) || [];

      // Remove the user from follows
      const newTags = existingFollows
        .filter(pubkey => pubkey !== pubkeyToUnfollow)
        .map(pubkey => ['p', pubkey]);

      await createEvent({
        kind: 3,
        content: followList?.content || '',
        tags: newTags,
      });

      toast({
        title: 'Unfollowed',
        description: 'You are no longer following this user.',
      });

      // Refetch the follow list
      refetchFollowList();
      return true;
    } catch (error) {
      console.error('Failed to unfollow user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unfollow user. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsFollowing(false);
    }
  };

  const isFollowingUser = (pubkey: string) => {
    if (!followList) return false;
    const follows = followList.tags
      .filter(([name]) => name === 'p')
      .map(([, pubkey]) => pubkey);
    return follows.includes(pubkey);
  };

  return {
    followUser,
    unfollowUser,
    isFollowingUser,
    isFollowing,
    followList,
  };
}