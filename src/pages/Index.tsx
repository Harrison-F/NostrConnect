import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Users, Zap } from 'lucide-react';
import { CreateListDialog } from '@/components/CreateListDialog';
import { SiteDonationDialog } from '@/components/SiteDonationDialog';
import LoginDialog from '@/components/auth/LoginDialog';
import SignupDialog from '@/components/auth/SignupDialog';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useCurrentUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDonationDialog, setShowDonationDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSignupDialog, setShowSignupDialog] = useState(false);

  useSeoMeta({
    title: 'Nostr Connect - Create and share joinable lists to easily follow each other on Nostr',
    description: 'Create and share joinable lists to easily follow each other on Nostr. Build your network and discover new connections.',
  });

  const handleCreateList = () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    setShowCreateDialog(true);
  };

  const handleLogin = () => {
    setShowLoginDialog(false);
    setShowSignupDialog(false);
    // After login, automatically open the create list dialog
    setShowCreateDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Nostr Connect" className="h-10" />
            <span className="text-xl font-bold">Nostr Connect</span>
          </Link>
          <LoginArea className="max-w-60" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo and Title */}
          <div className="mb-8">
            <div className="flex items-center justify-center mx-auto mb-6">
              <img src="/logo.png" alt="Nostr Connect" className="h-36" />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Nostr Connect
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Create and share joinable lists to easily follow each other on Nostr
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mb-16">
            <div className="flex items-center justify-center space-x-4">
              {user && (
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 h-auto bg-white text-black border-border hover:bg-gray-50"
                  asChild
                >
                  <Link to="/your-lists">
                    <Users className="w-5 h-5 mr-2" />
                    Your Lists
                  </Link>
                </Button>
              )}
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto"
                onClick={handleCreateList}
              >
                <Users className="w-5 h-5 mr-2" />
                Create List
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-muted-foreground mt-48">
            <div className="flex items-center justify-between">
              <div>
                <p>
                  Vibed with{' '}
                  <a
                    href="https://soapbox.pub/mkstack"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    MKStack
                  </a>
                </p>
              </div>

              <div className="flex items-center">
                {user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDonationDialog(true)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Donate
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href="https://njump.me/npub1dlkff8vcdwcty9hs3emc43yks8y7pr0tnn7jewvt63ph077sw48s4cc4qc"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create List Dialog */}
      <CreateListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Site Donation Dialog */}
      <SiteDonationDialog
        open={showDonationDialog}
        onOpenChange={setShowDonationDialog}
      />

      {/* Login Dialog */}
      <LoginDialog
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={handleLogin}
        onSignup={() => setShowSignupDialog(true)}
      />

      {/* Signup Dialog */}
      <SignupDialog
        isOpen={showSignupDialog}
        onClose={() => setShowSignupDialog(false)}
      />
    </div>
  );
};

export default Index;