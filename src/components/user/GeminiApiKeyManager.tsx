import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface GeminiApiKeyManagerProps {
  onApiKeyChanged?: () => void;
}

export function GeminiApiKeyManager({ onApiKeyChanged }: GeminiApiKeyManagerProps) {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  const SECRET_NAME = 'GEMINI_API_KEY';

  useEffect(() => {
    if (user) {
      fetchApiKeyStatus();
    } else {
      setLoading(false);
      setHasKey(false);
      setApiKey('');
    }
  }, [user]);

  // Effect to check sessionStorage for a temporarily stored API key
  useEffect(() => {
    const tempApiKey = sessionStorage.getItem('tempGeminiApiKey');
    if (tempApiKey && !hasKey && !loading) {
      setApiKey(tempApiKey);
      // Do NOT remove from sessionStorage here, it's handled by Settings.tsx
      // This ensures the input is pre-filled if the user navigates directly to settings after signup.
    }
  }, [hasKey, loading]);


  const fetchApiKeyStatus = async () => {
    setLoading(true);
    try {
      // We cannot directly read the encrypted_value from client-side for security.
      // Instead, we check for the *existence* of the secret.
      const { data, error } = await supabase
        .from('user_secrets')
        .select('id')
        .eq('user_id', user!.id)
        .eq('secret_name', SECRET_NAME)
        .maybeSingle();

      if (error) throw error;

      setHasKey(!!data);
      if (data) {
        // If a key exists, we can't display it, but we can indicate it's set.
        setApiKey('********'); // Placeholder for existing key
      } else {
        setApiKey('');
      }
    } catch (error: any) {
      console.error('Error fetching API key status:', error);
      toast.error(`Failed to check API key status: ${error.message}`);
      setHasKey(false);
      setApiKey('');
    } finally {
      setLoading(false);
    }
  };

  const resetQuotaCounter = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Delete today's usage record to reset the counter for new API key
      await supabase
        .from('gemini_daily_usage')
        .delete()
        .eq('user_id', user.id)
        .eq('usage_date', today);
        
      console.log('Quota counter reset for new API key');
    } catch (error) {
      console.error('Error resetting quota counter:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!user) {
      toast.error('You must be logged in to save an API key.');
      return;
    }
    if (!apiKey || apiKey === '********') {
      toast.error('Please enter a valid Gemini API key.');
      return;
    }

    setSaving(true);
    try {
      // Call the new Edge Function to securely store the API key
      const { error } = await supabase.functions.invoke('set-user-gemini-api-key', {
        body: {
          secretName: SECRET_NAME,
          secretValue: apiKey,
        },
      });

      if (error) throw error;

      // Reset quota counter when API key changes (new key = fresh quota)
      await resetQuotaCounter();

      toast.success('Gemini API key saved securely!');
      setHasKey(true);
      setApiKey('********'); // Mask the key after saving
      sessionStorage.removeItem('tempGeminiApiKey'); // Clear temporary storage after successful save
      
      // Notify parent component to refresh quota display
      onApiKeyChanged?.();
    } catch (error: any) {
      console.error('Error saving API key:', error);
      toast.error(`Failed to save API key: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!user) {
      toast.error('You must be logged in to remove an API key.');
      return;
    }
    if (!confirm('Are you sure you want to remove your Gemini API key?')) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_secrets')
        .delete()
        .eq('user_id', user.id)
        .eq('secret_name', SECRET_NAME);

      if (error) throw error;

      toast.success('Gemini API key removed.');
      setHasKey(false);
      setApiKey('');
      
      // Notify parent component
      onApiKeyChanged?.();
    } catch (error: any) {
      console.error('Error removing API key:', error);
      toast.error(`Failed to remove API key: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span>Loading API key status...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-muted-foreground">
        Please log in to manage your AI integration settings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Label htmlFor="gemini-api-key" className="flex items-center gap-2">
        <KeyRound size={16} />
        Gemini API Key
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertCircle size={14} className="text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Your Gemini API key is stored securely and encrypted in our database. It is never exposed to the client-side.</p>
            <p className="mt-1">You can get your API key from <a href="https://ai.google.dev/gemini-api/docs/get-started/api-key" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>.</p>
          </TooltipContent>
        </Tooltip>
      </Label>
      <Input
        id="gemini-api-key"
        type="password"
        placeholder={hasKey ? '********' : 'Enter your Gemini API key'}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        disabled={saving}
      />
      <div className="flex gap-2">
        {hasKey ? (
          <>
            <Button onClick={handleSaveApiKey} disabled={saving || apiKey === '********'}>
              {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CheckCircle2 size={16} className="mr-2" />}
              {saving ? 'Updating...' : 'Update Key'}
            </Button>
            <Button variant="destructive" onClick={handleRemoveApiKey} disabled={saving}>
              {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              Remove Key
            </Button>
          </>
        ) : (
          <Button onClick={handleSaveApiKey} disabled={saving || !apiKey.trim()}>
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <KeyRound size={16} className="mr-2" />}
            {saving ? 'Saving...' : 'Save Key'}
          </Button>
        )}
      </div>
      {hasKey && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle2 size={16} /> Your Gemini API key is set.
        </p>
      )}
    </div>
  );
}
