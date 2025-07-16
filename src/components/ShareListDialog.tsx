import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { Copy, QrCode, Link2, Check } from 'lucide-react';
import QRCode from 'qrcode';
import type { NostrEvent } from '@nostrify/nostrify';

interface ShareListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listEvent: NostrEvent;
}

export function ShareListDialog({ open, onOpenChange, listEvent }: ShareListDialogProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedShortUrl, setCopiedShortUrl] = useState(false);
  const { toast } = useToast();

  const listId = listEvent.tags.find(([name]) => name === 'd')?.[1];
  const listTitle = listEvent.tags.find(([name]) => name === 'title')?.[1] || 'Untitled List';

  // Create URL-friendly version of the list title
  const urlFriendlyTitle = listTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Full URL with list name
  const fullUrl = `${window.location.origin}/list/${listId}/${urlFriendlyTitle}`;

  // For demo purposes, we'll create a "shortened" URL
  const shortUrl = `nostr.co/${urlFriendlyTitle.slice(0, 12)}`;

  useEffect(() => {
    if (open && fullUrl) {
      // Generate QR code
      QRCode.toDataURL(fullUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(setQrCodeDataUrl)
        .catch(() => {
          // Handle QR code generation error silently
        });
    }
  }, [open, fullUrl]);

  const copyToClipboard = async (text: string, type: 'url' | 'short') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedShortUrl(true);
        setTimeout(() => setCopiedShortUrl(false), 2000);
      }
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `${listTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share List</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <Link2 className="w-4 h-4 mr-2" />
              Link
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="full-url">Full URL</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="full-url"
                    value={fullUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(fullUrl, 'url')}
                  >
                    {copiedUrl ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="short-url">Short URL (Demo)</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="short-url"
                    value={shortUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(shortUrl, 'short')}
                  >
                    {copiedShortUrl ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  * This is a demo URL. In production, integrate with a URL shortening service.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center">
                {qrCodeDataUrl ? (
                  <div className="space-y-4">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="mx-auto border border-border rounded-lg"
                    />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Scan this QR code to open the list
                      </p>
                      <Button variant="outline" onClick={downloadQRCode}>
                        Download QR Code
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="w-16 h-16 bg-muted rounded-lg mx-auto mb-4 animate-pulse" />
                    <p className="text-muted-foreground">Generating QR code...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Share Permissions</h4>
          <p className="text-sm text-muted-foreground">
            <strong>Anyone with the link</strong> can view this list and add themselves to it.
            Only you can edit the list name, description, and remove members.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}