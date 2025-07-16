import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';

export function useZap() {
  const [isZapping, setIsZapping] = useState(false);
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();

  const zapUser = async (recipientPubkey: string, amount: number = 1000, comment?: string) => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to send zaps.',
        variant: 'destructive',
      });
      return false;
    }

    setIsZapping(true);
    try {
      // Create a zap request event (kind 9734)
      await createEvent({
        kind: 9734,
        content: comment || '',
        tags: [
          ['p', recipientPubkey],
          ['amount', amount.toString()],
          ['relays', 'wss://relay.primal.net'], // Add relay for zap
        ],
      });

      // Note: Full implementation would integrate with lightning wallets
      toast({
        title: 'Zap request created!',
        description: `Zap request for ${amount} sats has been created. In a full implementation, this would open your lightning wallet.`,
      });

      return true;
    } catch (error) {
      console.error('Failed to create zap request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create zap request. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsZapping(false);
    }
  };

  const zapSite = async (amount: number = 1000, comment?: string) => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please log in to send donations.',
        variant: 'destructive',
      });
      return false;
    }

    setIsZapping(true);
    try {
      // Create a lightning payment request for harrisonf@getalby.com
      const lightningAddress = 'harrisonf@getalby.com';

      // Create a zap request event (kind 9734) for site donation
      await createEvent({
        kind: 9734,
        content: comment || '',
        tags: [
          ['lnurl', lightningAddress],
          ['amount', amount.toString()],
          ['relays', 'wss://relay.primal.net'],
          ['description', 'Donation to Nostr Connect'],
        ],
      });

      toast({
        title: 'Thank you for your support!',
        description: `Donation request for ${amount} sats created for ${lightningAddress}. In a full implementation, this would open your lightning wallet.`,
      });

      return true;
    } catch (error) {
      console.error('Failed to create donation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create donation request. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsZapping(false);
    }
  };

  return {
    zapUser,
    zapSite,
    isZapping,
  };
}