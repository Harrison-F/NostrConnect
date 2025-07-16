import { useSeoMeta } from '@unhead/react';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Users, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserListsSection } from '@/components/UserListsSection';
import { useState } from 'react';
import { CreateListDialog } from '@/components/CreateListDialog';

export default function YourListsPage() {
  const { user } = useCurrentUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useSeoMeta({
    title: 'Your Lists - Nostr Connect',
    description: 'Manage all your Nostr Connect lists in one place.',
  });

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
        <div className="max-w-6xl mx-auto">
          {!user ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Your Lists</h1>
              <p className="text-muted-foreground mb-8">
                Log in to view and manage your Nostr Connect lists
              </p>
              <LoginArea className="max-w-60 mx-auto" />
            </div>
          ) : (
            <>
              {/* Page Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Your Lists</h1>
                  <p className="text-muted-foreground">
                    Manage all your created and joined lists
                  </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create List
                </Button>
              </div>

              {/* Lists Section */}
              <UserListsSection />
            </>
          )}
        </div>
      </main>

      {/* Create List Dialog */}
      <CreateListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}