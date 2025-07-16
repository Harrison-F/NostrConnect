import React, { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Calendar, ChevronDown, ChevronRight, Share2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShareListDialog } from '@/components/ShareListDialog';
import { DeleteListDialog } from '@/components/DeleteListDialog';
import type { NostrEvent } from '@nostrify/nostrify';

export function UserListsSection() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());

  // Query for lists created by the user
  const { data: createdLists, isLoading: isLoadingCreated } = useQuery({
    queryKey: ['user-created-lists', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([
        {
          kinds: [30000],
          authors: [user.pubkey],
          limit: 50,
        }
      ], { signal });

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.pubkey,
  });

  // Query for lists the user has joined (but didn't create)
  const { data: joinedLists, isLoading: isLoadingJoined } = useQuery({
    queryKey: ['user-joined-lists', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([
        {
          kinds: [30000],
          '#p': [user.pubkey],
          limit: 100,
        }
      ], { signal });

      // Filter out lists created by the user
      const joinedOnly = events.filter(event => event.pubkey !== user.pubkey);
      return joinedOnly.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.pubkey,
  });

  if (!user) return null;

  const isLoading = isLoadingCreated || isLoadingJoined;
  const hasLists = (createdLists?.length || 0) > 0 || (joinedLists?.length || 0) > 0;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Your Lists</h2>
        <p className="text-muted-foreground">
          Manage the lists you've created and joined
        </p>
      </div>

      {isLoading ? (
        <UserListsSkeleton />
      ) : !hasLists ? (
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No lists yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first list to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Created Lists */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Created by You ({createdLists?.length || 0})
            </h3>
            <div className="space-y-3">
              {createdLists && renderListsWithChildren(createdLists, createdLists, true, expandedLists, setExpandedLists)}
              {(createdLists?.length || 0) === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    You haven't created any lists yet
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Joined Lists */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Joined Lists ({joinedLists?.length || 0})
            </h3>
            <div className="space-y-3">
              {joinedLists && renderListsWithChildren(joinedLists, joinedLists, false, expandedLists, setExpandedLists)}
              {(joinedLists?.length || 0) === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    You haven't joined any lists yet
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to render lists with their children
function renderListsWithChildren(
  allLists: NostrEvent[],
  listsToRender: NostrEvent[],
  isCreator: boolean,
  expandedLists: Set<string>,
  setExpandedLists: (expanded: Set<string>) => void,
  depth: number = 0
): React.ReactNode {
  // Find top-level lists (those not referenced by any other list)
  const topLevelLists = listsToRender.filter(list => {
    const listId = list.tags.find(([name]) => name === 'd')?.[1];
    const listRef = `30000:${list.pubkey}:${listId}`;

    // Check if this list is referenced by any other list
    const isChild = allLists.some(otherList =>
      otherList.tags.some(([name, value]) => name === 'a' && value === listRef)
    );

    return !isChild;
  });

  return topLevelLists.map(list => (
    <div key={list.id}>
      <ListCard
        list={list}
        isCreator={isCreator}
        depth={depth}
        allLists={allLists}
        expandedLists={expandedLists}
        setExpandedLists={setExpandedLists}
      />
    </div>
  ));
}

interface ListCardProps {
  list: NostrEvent;
  isCreator: boolean;
  depth?: number;
  allLists?: NostrEvent[];
  expandedLists?: Set<string>;
  setExpandedLists?: (expanded: Set<string>) => void;
}

function ListCard({
  list,
  isCreator,
  depth = 0,
  allLists = [],
  expandedLists = new Set(),
  setExpandedLists
}: ListCardProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const listId = list.tags.find(([name]) => name === 'd')?.[1];
  const title = list.tags.find(([name]) => name === 'title')?.[1] || 'Untitled List';
  const description = list.tags.find(([name]) => name === 'description')?.[1];
  const memberCount = list.tags.filter(([name]) => name === 'p').length;

  // Format date
  const createdDate = new Date(list.created_at * 1000).toLocaleDateString();

  // Find child lists
  const childListRefs = list.tags
    .filter(([name]) => name === 'a')
    .map(([, ref]) => ref);

  const childLists = allLists.filter(childList => {
    const childListId = childList.tags.find(([name]) => name === 'd')?.[1];
    const childListRef = `30000:${childList.pubkey}:${childListId}`;
    return childListRefs.includes(childListRef);
  });

  const hasChildren = childLists.length > 0;
  const isExpanded = expandedLists.has(list.id);

  const toggleExpanded = () => {
    if (!setExpandedLists) return;
    const newExpanded = new Set(expandedLists);
    if (isExpanded) {
      newExpanded.delete(list.id);
    } else {
      newExpanded.add(list.id);
    }
    setExpandedLists(newExpanded);
  };

  return (
    <div style={{ marginLeft: `${depth * 24}px` }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {hasChildren && (
                  <button
                    onClick={toggleExpanded}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                )}
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-primary" />
                  <h4 className="font-medium truncate">{title}</h4>
                </div>
                {isCreator && (
                  <Badge variant="secondary" className="text-xs">Creator</Badge>
                )}
                {hasChildren && (
                  <Badge variant="outline" className="text-xs">
                    {childLists.length} sublist{childLists.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {memberCount} members
                </span>
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {createdDate}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DeleteButton list={list} isCreator={isCreator} />
              {!hasChildren && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/list/${listId}`}>
                    View
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Dialog */}
      <ShareListDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        listEvent={list}
      />

      {/* Render child lists */}
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {childLists.map(childList => (
            <ListCard
              key={childList.id}
              list={childList}
              isCreator={isCreator}
              depth={depth + 1}
              allLists={allLists}
              expandedLists={expandedLists}
              setExpandedLists={setExpandedLists}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteButton({ list, isCreator }: { list: NostrEvent; isCreator: boolean }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
      <DeleteListDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        listEvent={list}
        isCreator={isCreator}
        onDeleted={() => {
          // Refresh the lists by updating the refresh key
          window.location.reload();
        }}
      />
    </>
  );
}

function UserListsSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {[...Array(2)].map((_, i) => (
        <div key={i}>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <Card key={j}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-48 mb-2" />
                      <div className="flex space-x-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}