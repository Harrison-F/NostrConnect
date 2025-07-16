import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Loader2 } from 'lucide-react';

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateListDialog({ open, onOpenChange }: CreateListDialogProps) {
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!user || !listName.trim()) return;

    setIsCreating(true);
    try {
      // Generate a unique identifier for the list
      const listId = Math.random().toString(36).substring(2, 15);

      // Create a NIP-51 Follow set (kind 30000) with the user's profile
      const tags = [
        ['d', listId],
        ['title', listName.trim()],
      ];

      // Add description if provided
      if (listDescription.trim()) {
        tags.push(['description', listDescription.trim()]);
      }

      // Add creator to the list
      tags.push(['p', user.pubkey]);

      await createEvent({
        kind: 30000,
        content: '',
        tags,
      });

      toast({
        title: 'List created!',
        description: `"${listName}" has been created and you've been added to it.`,
      });

      // Navigate to the list page
      navigate(`/list/${listId}`);
      onOpenChange(false);
      setListName('');
      setListDescription('');
    } catch (error) {
      console.error('Failed to create list:', error);
      toast({
        title: 'Error',
        description: 'Failed to create list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setListName('');
    setListDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">
              List Name
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="list-name"
              placeholder="e.g., Bitcoin Developers, Nostr Artists..."
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && listName.trim() && !isCreating) {
                  handleCreate();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="list-description">Description (Optional)</Label>
            <Textarea
              id="list-description"
              placeholder="Describe the purpose of this list..."
              value={listDescription}
              onChange={(e) => setListDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!listName.trim() || isCreating}
            >
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create List
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}