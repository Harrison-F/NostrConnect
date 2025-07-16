import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useZap } from '@/hooks/useZap';
import { Loader2, Heart } from 'lucide-react';

interface SiteDonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000, 21000, 50000];

export function SiteDonationDialog({ open, onOpenChange }: SiteDonationDialogProps) {
  const [amount, setAmount] = useState(5000);
  const [comment, setComment] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const { zapSite, isZapping } = useZap();

  const handleDonate = async () => {
    const donationAmount = useCustomAmount ? parseInt(customAmount) || 0 : amount;
    if (donationAmount <= 0) return;

    const success = await zapSite(donationAmount, comment || undefined);
    if (success) {
      onOpenChange(false);
      setComment('');
      setCustomAmount('');
      setUseCustomAmount(false);
      setAmount(5000);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setComment('');
    setCustomAmount('');
    setUseCustomAmount(false);
    setAmount(5000);
  };

  const finalAmount = useCustomAmount ? parseInt(customAmount) || 0 : amount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            Support Nostr Connect
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Info */}
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <img src="/logo.png" alt="Nostr Connect" className="h-12" />
              <div>
                <div className="font-medium">Nostr Connect</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your donation helps support the development and maintenance of this open-source project.
            </p>
          </div>

          {/* Amount Selection */}
          <div className="space-y-3">
            <Label>
              Donation Amount (sats)
              <span className="text-red-500 ml-1">*</span>
            </Label>

            {!useCustomAmount && (
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((presetAmount) => (
                  <Button
                    key={presetAmount}
                    variant={amount === presetAmount ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(presetAmount)}
                  >
                    {presetAmount.toLocaleString()}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button
                variant={useCustomAmount ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustomAmount(!useCustomAmount)}
              >
                Custom
              </Button>
              {useCustomAmount && (
                <Input
                  type="number"
                  placeholder="Enter amount..."
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1"
                />
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="donation-comment">Message (Optional)</Label>
            <Textarea
              id="donation-comment"
              placeholder="Add a message with your donation..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-sm font-medium text-green-800 dark:text-green-200">
              Donating {finalAmount.toLocaleString()} sats to Nostr Connect
            </div>
            {comment && (
              <div className="text-sm text-green-600 dark:text-green-300 mt-1">
                "{comment}"
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isZapping}>
              Cancel
            </Button>
            <Button
              onClick={handleDonate}
              disabled={finalAmount <= 0 || isZapping}
              className="bg-primary hover:bg-primary/90"
            >
              {isZapping && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Heart className="w-4 h-4 mr-2" />
              Donate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}