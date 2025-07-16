import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostr } from '@nostrify/react';
import { useFollow } from '@/hooks/useFollow';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { nip19 } from 'nostr-tools';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { LoginArea } from '@/components/auth/LoginArea';
import { ListManagement } from '@/components/ListManagement';
import { AddToListDialog } from '@/components/AddToListDialog';
import { ShareListDialog } from '@/components/ShareListDialog';
import { ZapDialog } from '@/components/ZapDialog';
import {
  Users,
  UserPlus,
  Share2,
  ArrowLeft,
  ExternalLink,
  Zap,
  UserCheck,
  Link as LinkIcon,
  UserMinus,
  Trash2
} from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

export default function ListPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { isFollowingUser } = useFollow();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showFollowAllDialog, setShowFollowAllDialog] = useState(false);

  // Query for the list event
  const { data: listEvent, isLoading, error } = useQuery({
    queryKey: ['list', listId],
    queryFn: async (c) => {
      if (!listId) throw new Error('No list ID provided');

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Try to decode if it's a NIP-19 identifier
      let actualListId = listId;
      let authorPubkey: string | undefined;

      try {
        if (listId.startsWith('naddr1')) {
          const decoded = nip19.decode(listId);
          if (decoded.type === 'naddr') {
            actualListId = decoded.data.identifier;
            authorPubkey = decoded.data.pubkey;
          }
        }
      } catch {
        // If decoding fails, use the original listId
      }

      // Build the filter
      const filter: {
        kinds: number[];
        '#d': string[];
        limit: number;
        authors?: string[];
      } = {
        kinds: [30000],
        '#d': [actualListId],
        limit: 50, // Increase limit to get more results
      };

      // If we have an author pubkey from naddr, add it to the filter
      if (authorPubkey) {
        filter.authors = [authorPubkey];
      }

      const events = await nostr.query([filter], { signal });

      if (events.length === 0) {
        // Try a broader search to see if the list exists at all
        const broadEvents = await nostr.query([
          {
            kinds: [30000],
            limit: 200,
          }
        ], { signal });

        // Filter manually for the list ID
        const matchingEvents = broadEvents.filter(event => {
          const eventListId = event.tags.find(([name]) => name === 'd')?.[1];
          return eventListId === actualListId;
        });

        if (matchingEvents.length === 0) {
          throw new Error(`List not found. Searched for ID: ${actualListId}`);
        }

        return matchingEvents[0];
      }

      return events[0];
    },
    enabled: !!listId,
  });

  // Extract list metadata
  const listTitle = listEvent?.tags.find(([name]) => name === 'title')?.[1] || 'Untitled List';
  const listDescription = listEvent?.tags.find(([name]) => name === 'description')?.[1] || '';
  const listCreator = listEvent?.pubkey;
  const isCreator = user?.pubkey === listCreator;


  // Extract pubkeys from the list
  const pubkeysInList = listEvent?.tags
    .filter(([name]) => name === 'p')
    .map(([, pubkey]) => pubkey) || [];

  const isUserInList = user ? pubkeysInList.includes(user.pubkey) : false;

  // Determine Follow All button text
  const otherUsers = pubkeysInList.filter(pubkey => pubkey !== user?.pubkey);
  const followedUsers = otherUsers.filter(pubkey => isFollowingUser(pubkey));
  const unfollowedUsers = otherUsers.filter(pubkey => !isFollowingUser(pubkey));
  const isFollowAction = unfollowedUsers.length > followedUsers.length;
  const followAllButtonText = isFollowAction ? 'Follow All' : 'Unfollow All';

  useSeoMeta({
    title: `${listTitle} - Nostr Connect`,
    description: listDescription || `A Nostr Connect list with ${pubkeysInList.length} members`,
  });

  const handleAddSelfToList = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to add yourself to this list.',
      });
      return;
    }
    setShowAddDialog(true);
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const handleFollowAll = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to follow users.',
      });
      return;
    }
    setShowFollowAllDialog(true);
  };

  if (!listId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid List</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">List Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This list doesn't exist or couldn't be loaded.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Nostr Connect" className="h-10" />
              <span className="text-xl font-bold">Nostr Connect</span>
            </Link>
          </div>
          <LoginArea className="max-w-60" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <ListPageSkeleton />
          ) : (
            <>
              {/* List Header */}
              <Card className="mb-8">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="w-6 h-6 text-primary" />
                        <CardTitle className="text-2xl">{listTitle}</CardTitle>
                      </div>
                      {listDescription && (
                        <p className="text-muted-foreground mb-4">{listDescription}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{pubkeysInList.length} members</span>
                        {listCreator && <ListCreatorInfo pubkey={listCreator} />}
                      </div>
                      {listEvent && <ParentListsInfo listEvent={listEvent} />}
                    </div>
                    <div className="flex items-center space-x-2">
                      {pubkeysInList.length > 0 && user && (
                        <Button variant="outline" size="sm" onClick={handleFollowAll}>
                          <Users className="w-4 h-4 mr-2" />
                          {followAllButtonText}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                      {isCreator && listEvent && (
                        <ListManagement listEvent={listEvent} />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Action Buttons */}
              {user && !isUserInList && (
                <Card className="mb-8 border-primary/20 bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <h3 className="font-semibold mb-2">Join this list</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add yourself to this list to be part of the community
                    </p>
                    <Button onClick={handleAddSelfToList}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Myself to List
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Members List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Members ({pubkeysInList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pubkeysInList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No members in this list yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pubkeysInList.map((pubkey) => (
                        <MemberCard
                          key={pubkey}
                          pubkey={pubkey}
                          listEvent={listEvent}
                          isCreator={isCreator}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      {/* Dialogs */}
      {listEvent && (
        <>
          <AddToListDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            listEvent={listEvent}
          />
          <ShareListDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            listEvent={listEvent}
          />
          <FollowAllDialog
            open={showFollowAllDialog}
            onOpenChange={setShowFollowAllDialog}
            pubkeys={pubkeysInList}
            listTitle={listTitle}
          />
        </>
      )}
    </div>
  );
}

function ListPageSkeleton() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-4" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ListCreatorInfo({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const displayName = author.data?.metadata?.name || genUserName(pubkey);

  return (
    <span>
      Created by {displayName}
    </span>
  );
}

function MemberCard({ pubkey, listEvent, isCreator }: { pubkey: string; listEvent?: NostrEvent; isCreator: boolean }) {
  const [showZapDialog, setShowZapDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const author = useAuthor(pubkey);
  const { user } = useCurrentUser();
  const { followUser, unfollowUser, isFollowingUser, isFollowing } = useFollow();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  const isCurrentUser = user?.pubkey === pubkey;
  const isFollowed = isFollowingUser(pubkey);

  const handleViewProfile = () => {
    // Convert hex pubkey to npub for njump
    const npub = nip19.npubEncode(pubkey);
    window.open(`https://njump.me/${npub}`, '_blank');
  };

  const handleZap = () => {
    setShowZapDialog(true);
  };

  const handleFollow = () => {
    if (isFollowed) {
      unfollowUser(pubkey);
    } else {
      followUser(pubkey);
    }
  };

  const handleRemoveFromList = async () => {
    if (!user || !listEvent || !isCreator) return;

    setIsRemoving(true);
    try {
      // Get existing pubkeys from the list, excluding the one to remove
      const existingPubkeys = listEvent.tags
        .filter(([name]) => name === 'p')
        .map(([, existingPubkey]) => existingPubkey)
        .filter(existingPubkey => existingPubkey !== pubkey);

      // Create new tags array without the removed user
      const newTags = [
        ...listEvent.tags.filter(([name]) => name !== 'p'), // Remove all existing p tags
        ...existingPubkeys.map(existingPubkey => ['p', existingPubkey]), // Add back remaining pubkeys
      ];

      // Create updated list event
      await createEvent({
        kind: 30000,
        content: listEvent.content,
        tags: newTags,
      });

      toast({
        title: 'User removed',
        description: `${displayName} has been removed from the list.`,
      });

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error('Failed to remove user from list:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user from list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={metadata?.picture} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleViewProfile}
              className="font-medium hover:text-primary transition-colors"
            >
              {displayName}
            </button>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">You</Badge>
            )}
          </div>
          {metadata?.about && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {metadata.about}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {!isCurrentUser && user && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZap}
            >
              <Zap className="w-4 h-4 mr-1" />
              Zap
            </Button>
            <Button
              variant={isFollowed ? "secondary" : "default"}
              size="sm"
              onClick={handleFollow}
              disabled={isFollowing}
            >
              {isFollowed ? (
                <>
                  <UserCheck className="w-4 h-4 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Follow
                </>
              )}
            </Button>
          </>
        )}
        {isCreator && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveFromList}
            disabled={isRemoving}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isRemoving ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleViewProfile}>
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      {/* Zap Dialog */}
      <ZapDialog
        open={showZapDialog}
        onOpenChange={setShowZapDialog}
        recipientPubkey={pubkey}
      />
    </div>
  );
}

function FollowAllDialog({
  open,
  onOpenChange,
  pubkeys,
  listTitle
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pubkeys: string[];
  listTitle: string;
}) {
  const { user } = useCurrentUser();
  const { followUser, unfollowUser, isFollowingUser } = useFollow();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter out current user and count how many users would be followed/unfollowed
  const otherUsers = pubkeys.filter(pubkey => pubkey !== user?.pubkey);
  const followedUsers = otherUsers.filter(pubkey => isFollowingUser(pubkey));
  const unfollowedUsers = otherUsers.filter(pubkey => !isFollowingUser(pubkey));

  const isFollowAction = unfollowedUsers.length > followedUsers.length;
  const actionCount = isFollowAction ? unfollowedUsers.length : followedUsers.length;
  const actionText = isFollowAction ? 'follow' : 'unfollow';

  const handleConfirm = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      if (isFollowAction) {
        // Follow all unfollowed users
        for (const pubkey of unfollowedUsers) {
          await followUser(pubkey);
        }
        toast({
          title: 'Following users',
          description: `Now following ${unfollowedUsers.length} users from "${listTitle}".`,
        });
      } else {
        // Unfollow all followed users
        for (const pubkey of followedUsers) {
          await unfollowUser(pubkey);
        }
        toast({
          title: 'Unfollowed users',
          description: `Unfollowed ${followedUsers.length} users from "${listTitle}".`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to process follow action:', error);
      toast({
        title: 'Error',
        description: 'Failed to process follow action. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {isFollowAction ? (
              <UserPlus className="w-5 h-5 mr-2 text-primary" />
            ) : (
              <UserMinus className="w-5 h-5 mr-2 text-destructive" />
            )}
            {isFollowAction ? 'Follow All Users' : 'Unfollow All Users'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will {actionText} <strong>{actionCount}</strong> user{actionCount !== 1 ? 's' : ''} from "{listTitle}".
          </p>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant={isFollowAction ? "default" : "destructive"}
              onClick={handleConfirm}
              disabled={isProcessing || actionCount === 0}
              className={isFollowAction ? "bg-primary hover:bg-primary/90" : ""}
            >
              {isProcessing && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ParentListsInfo({ listEvent }: { listEvent: NostrEvent }) {
  const { nostr } = useNostr();
  const currentListId = listEvent.tags.find(([name]) => name === 'd')?.[1];
  const currentListRef = `30000:${listEvent.pubkey}:${currentListId}`;

  // Query for lists that contain this list as a child
  const { data: parentLists } = useQuery({
    queryKey: ['parent-lists', currentListRef],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([
        {
          kinds: [30000],
          '#a': [currentListRef],
          limit: 20,
        }
      ], { signal });

      return events;
    },
    enabled: !!currentListId,
  });

  if (!parentLists || parentLists.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <LinkIcon className="w-4 h-4" />
        <span>Part of:</span>
        <div className="flex flex-wrap gap-2">
          {parentLists.map((parentList) => {
            const parentListId = parentList.tags.find(([name]) => name === 'd')?.[1];
            const parentTitle = parentList.tags.find(([name]) => name === 'title')?.[1] || 'Untitled List';

            return (
              <Badge key={parentList.id} variant="secondary" className="text-xs">
                <Link to={`/list/${parentListId}`} className="hover:underline">
                  {parentTitle}
                </Link>
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}