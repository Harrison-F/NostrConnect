import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useZap } from '@/hooks/useZap';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap, Loader2 } from 'lucide-react';

interface ZapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientPubkey: string;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000, 10000, 21000];

export function ZapDialog({ open, onOpenChange, recipientPubkey }: ZapDialogProps) {
  const [amount, setAmount] = useState(1000);
  const [comment, setComment] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const { zapUser, isZapping } = useZap();
  const author = useAuthor(recipientPubkey);

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(recipientPubkey);

  const handleZap = async () => {
    const zapAmount = useCustomAmount ? parseInt(customAmount) || 0 : amount;
    if (zapAmount <= 0) return;

    const success = await zapUser(recipientPubkey, zapAmount, comment || undefined);
    if (success) {
      onOpenChange(false);
      setComment('');
      setCustomAmount('');
      setUseCustomAmount(false);
      setAmount(1000);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setComment('');
    setCustomAmount('');
    setUseCustomAmount(false);
    setAmount(1000);
  };

  const finalAmount = useCustomAmount ? parseInt(customAmount) || 0 : amount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-primary" />
            Send Zap
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Recipient Info */}
          <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{displayName}</div>
              <div className="text-sm text-muted-foreground">
                {recipientPubkey.slice(0, 8)}...{recipientPubkey.slice(-8)}
              </div>
            </div>
          </div>

          {/* Amount Selection */}
          <div className="space-y-3">
            <Label>Amount (sats)</Label>
            
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
            <Label htmlFor="zap-comment">Comment (Optional)</Label>
            <Textarea
              id="zap-comment"
              placeholder="Add a message with your zap..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Summary */}
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="text-sm font-medium">
              Zapping {finalAmount.toLocaleString()} sats to {displayName}
            </div>
            {comment && (
              <div className="text-sm text-muted-foreground mt-1">
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
              onClick={handleZap} 
              disabled={finalAmount <= 0 || isZapping}
            >
              {isZapping && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Zap className="w-4 h-4 mr-2" />
              Send Zap
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}