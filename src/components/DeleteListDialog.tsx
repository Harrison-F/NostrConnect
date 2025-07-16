import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface DeleteListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listEvent: NostrEvent;
  isCreator: boolean;
  onDeleted: () => void;
}

export function DeleteListDialog({
  open,
  onOpenChange,
  listEvent,
  isCreator,
  onDeleted
}: DeleteListDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();

  const listTitle = listEvent.tags.find(([name]) => name === 'title')?.[1] || 'Untitled List';

  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      if (isCreator) {
        // Send deletion request to relays
        await createEvent({
          kind: 5, // Deletion request
          content: `Deleted list: ${listTitle}`,
          tags: [
            ['e', listEvent.id], // Reference to the event to delete
          ],
        });

        toast({
          title: 'List deletion requested',
          description: `Deletion request sent to relays for "${listTitle}".`,
        });
      } else {
        // For joined lists, just remove from local view (no actual deletion)
        toast({
          title: 'Removed from view',
          description: `"${listTitle}" has been hidden from your lists.`,
        });
      }

      onDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete list:', error);
      toast({
        title: 'Error',
        description: 'Failed to process deletion request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <Trash2 className="w-5 h-5 mr-2" />
            Delete List
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-destructive/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive mb-1">
                {isCreator ? 'Delete' : 'Remove'} "{listTitle}"
              </h4>
              {isCreator ? (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    This will send a deletion request to Nostr relays. Most relays will honor
                    this request and remove the list, but some copies might persist
                    on certain relays.
                  </p>
                  <p>
                    <strong>This action cannot be undone.</strong>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only the list creator can delete lists from Nostr. This will only remove
                  the list from your view - it will still exist for other users.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              {isCreator ? 'Delete' : 'Remove'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}