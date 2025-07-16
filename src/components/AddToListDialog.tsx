import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { Loader2, UserPlus } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface AddToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listEvent: NostrEvent;
}

export function AddToListDialog({ open, onOpenChange, listEvent }: AddToListDialogProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();

  const author = useAuthor(user?.pubkey || '');
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(user?.pubkey || '');

  const listTitle = listEvent.tags.find(([name]) => name === 'title')?.[1] || 'Untitled List';
  const listId = listEvent.tags.find(([name]) => name === 'd')?.[1];

  const handleAddToList = async () => {
    if (!user || !listId) return;

    setIsAdding(true);
    try {
      // Get existing pubkeys from the list
      const existingPubkeys = listEvent.tags
        .filter(([name]) => name === 'p')
        .map(([, pubkey]) => pubkey);

      // Create new tags array with the user added
      const newTags = [
        ...listEvent.tags.filter(([name]) => name !== 'p'), // Remove existing p tags
        ...existingPubkeys.map(pubkey => ['p', pubkey]), // Add back existing pubkeys
        ['p', user.pubkey], // Add the current user
      ];

      // Create updated list event
      await createEvent({
        kind: 30000,
        content: listEvent.content,
        tags: newTags,
      });

      toast({
        title: 'Added to list!',
        description: `You've been added to "${listTitle}".`,
      });

      onOpenChange(false);
      
      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error('Failed to add to list:', error);
      toast({
        title: 'Error',
        description: 'Failed to add you to the list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Yourself to List</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              You're about to add yourself to:
            </p>
            <h3 className="font-semibold text-lg mb-6">"{listTitle}"</h3>
            
            {/* User Preview */}
            <div className="flex items-center justify-center space-x-3 p-4 border border-border rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={metadata?.picture} alt={displayName} />
                <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="font-medium">{displayName}</div>
                {metadata?.about && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {metadata.about}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button onClick={handleAddToList} disabled={isAdding}>
              {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <UserPlus className="w-4 h-4 mr-2" />
              Add to List
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}