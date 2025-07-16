import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Settings, Edit3, Loader2, UserPlus } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

interface ListManagementProps {
  listEvent: NostrEvent;
}

export function ListManagement({ listEvent }: ListManagementProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  const listTitle = listEvent.tags.find(([name]) => name === 'title')?.[1] || '';
  const listDescription = listEvent.tags.find(([name]) => name === 'description')?.[1] || '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Manage
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
          <Edit3 className="w-4 h-4 mr-2" />
          Edit List
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowAddMemberDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Member
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Edit List Dialog */}
      <EditListDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        listEvent={listEvent}
        currentTitle={listTitle}
        currentDescription={listDescription}
      />

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        listEvent={listEvent}
      />
    </DropdownMenu>
  );
}

interface EditListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listEvent: NostrEvent;
  currentTitle: string;
  currentDescription: string;
}

function EditListDialog({
  open,
  onOpenChange,
  listEvent,
  currentTitle,
  currentDescription
}: EditListDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription);
  const [isUpdating, setIsUpdating] = useState(false);
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();

  const handleUpdate = async () => {
    if (!title.trim()) return;

    setIsUpdating(true);
    try {
      // Update the list with new title and description
      const newTags = listEvent.tags.map(([name, value, ...rest]) => {
        if (name === 'title') return ['title', title.trim()];
        if (name === 'description') return ['description', description.trim()];
        return [name, value, ...rest];
      });

      // Add description tag if it doesn't exist
      if (!newTags.some(([name]) => name === 'description')) {
        newTags.push(['description', description.trim()]);
      }

      await createEvent({
        kind: 30000,
        content: listEvent.content,
        tags: newTags,
      });

      toast({
        title: 'List updated!',
        description: 'Your changes have been saved.',
      });

      onOpenChange(false);

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error('Failed to update list:', error);
      toast({
        title: 'Error',
        description: 'Failed to update list. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">List Name</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter list name..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your list..."
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!title.trim() || isUpdating}>
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update List
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listEvent: NostrEvent;
}

function AddMemberDialog({ open, onOpenChange, listEvent }: AddMemberDialogProps) {
  const [pubkeyInput, setPubkeyInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();

  const handleAddMember = async () => {
    const trimmedInput = pubkeyInput.trim();
    if (!trimmedInput) return;

    let hexPubkey: string;

    try {
      // Check if it's an npub
      if (trimmedInput.startsWith('npub1')) {
        const decoded = nip19.decode(trimmedInput);
        if (decoded.type !== 'npub') {
          throw new Error('Invalid npub format');
        }
        hexPubkey = decoded.data;
      }
      // Check if it's already hex (64 characters)
      else if (/^[a-fA-F0-9]{64}$/.test(trimmedInput)) {
        hexPubkey = trimmedInput;
      }
      else {
        throw new Error('Invalid format');
      }
    } catch {
      toast({
        title: 'Invalid pubkey',
        description: 'Please enter a valid npub (npub1...) or 64-character hex pubkey.',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      // Get existing pubkeys from the list
      const existingPubkeys = listEvent.tags
        .filter(([name]) => name === 'p')
        .map(([, pubkey]) => pubkey);

      // Check if pubkey is already in the list
      if (existingPubkeys.includes(hexPubkey)) {
        toast({
          title: 'Already in list',
          description: 'This user is already in the list.',
          variant: 'destructive',
        });
        setIsAdding(false);
        return;
      }

      // Create new tags array with the new member
      const newTags = [
        ...listEvent.tags.filter(([name]) => name !== 'p'), // Remove existing p tags
        ...existingPubkeys.map(pubkey => ['p', pubkey]), // Add back existing pubkeys
        ['p', hexPubkey], // Add the new pubkey
      ];

      // Create updated list event
      await createEvent({
        kind: 30000,
        content: listEvent.content,
        tags: newTags,
      });

      toast({
        title: 'Member added!',
        description: 'The user has been added to the list.',
      });

      onOpenChange(false);
      setPubkeyInput('');

      // Refresh the page to show updated list
      window.location.reload();
    } catch (error) {
      console.error('Failed to add member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pubkey-input">User's Public Key</Label>
            <Input
              id="pubkey-input"
              value={pubkeyInput}
              onChange={(e) => setPubkeyInput(e.target.value)}
              placeholder="npub1... or hex pubkey"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter the user's npub (npub1...) or hex public key
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!pubkeyInput.trim() || isAdding}>
              {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}