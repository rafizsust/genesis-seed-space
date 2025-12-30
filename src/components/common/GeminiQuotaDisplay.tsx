import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Zap, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Gemini free tier daily limit (approximate)
const GEMINI_FREE_DAILY_LIMIT = 1500000; // 1.5M tokens per day for free tier

interface GeminiQuotaDisplayProps {
  compact?: boolean;
  showCard?: boolean;
  className?: string;
}

export function GeminiQuotaDisplay({ compact = false, showCard = true, className }: GeminiQuotaDisplayProps) {
  const { user } = useAuth();
  const [tokensUsed, setTokensUsed] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    if (user) {
      fetchQuotaData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchQuotaData = async () => {
    setLoading(true);
    try {
      // Check if user has API key
      const { data: secretData } = await supabase
        .from('user_secrets')
        .select('id')
        .eq('user_id', user!.id)
        .eq('secret_name', 'GEMINI_API_KEY')
        .maybeSingle();

      setHasApiKey(!!secretData);

      if (!secretData) {
        setLoading(false);
        return;
      }

      // Fetch today's usage
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData, error } = await supabase
        .from('gemini_daily_usage')
        .select('tokens_used, requests_count')
        .eq('user_id', user!.id)
        .eq('usage_date', today)
        .maybeSingle();

      if (error) throw error;

      setTokensUsed(usageData?.tokens_used || 0);
      setRequestsCount(usageData?.requests_count || 0);
    } catch (error) {
      console.error('Error fetching quota data:', error);
    } finally {
      setLoading(false);
    }
  };

  const usagePercent = Math.min((tokensUsed / GEMINI_FREE_DAILY_LIMIT) * 100, 100);
  const remainingTokens = Math.max(GEMINI_FREE_DAILY_LIMIT - tokensUsed, 0);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  const getStatusColor = () => {
    if (usagePercent >= 90) return 'text-destructive';
    if (usagePercent >= 70) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = () => {
    if (usagePercent >= 90) return 'bg-destructive';
    if (usagePercent >= 70) return 'bg-warning';
    return 'bg-success';
  };

  if (loading) {
    return compact ? (
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
      </div>
    ) : (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading quota...</span>
      </div>
    );
  }

  if (!user || !hasApiKey) {
    if (compact) return null;
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Info className="w-4 h-4" />
        <span>Add your Gemini API key to track usage</span>
      </div>
    );
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 cursor-help", className)}>
            <Zap className={cn("w-3 h-3", getStatusColor())} />
            <span className="text-xs font-mono">{formatTokens(remainingTokens)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-medium">Daily Gemini Quota</p>
            <p>Used: {formatTokens(tokensUsed)} / {formatTokens(GEMINI_FREE_DAILY_LIMIT)}</p>
            <p>Remaining: {formatTokens(remainingTokens)}</p>
            <p className="text-muted-foreground">Resets at midnight UTC</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={cn("w-4 h-4", getStatusColor())} />
          <span className="text-sm font-medium">Today's Usage</span>
        </div>
        <Badge variant={usagePercent >= 90 ? "destructive" : usagePercent >= 70 ? "outline" : "secondary"}>
          {usagePercent.toFixed(1)}%
        </Badge>
      </div>
      
      <Progress value={usagePercent} className={cn("h-2", getProgressColor())} />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatTokens(tokensUsed)} used</span>
        <span>{formatTokens(remainingTokens)} remaining</span>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          {usagePercent >= 90 ? (
            <AlertTriangle className="w-3 h-3 text-destructive" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-success" />
          )}
          <span>{requestsCount} requests today</span>
        </div>
        <span className="text-muted-foreground">Resets at midnight UTC</span>
      </div>
    </div>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Gemini API Quota
        </CardTitle>
        <CardDescription>
          Free tier daily limit: {formatTokens(GEMINI_FREE_DAILY_LIMIT)} tokens
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

// Helper function to estimate token cost for different operations
export function estimateTokenCost(operation: 'reading' | 'listening' | 'writing' | 'speaking', difficulty: string = 'medium'): number {
  const baseCosts = {
    reading: 15000,    // ~15K tokens for reading test generation
    listening: 25000,  // ~25K tokens for listening (includes audio generation)
    writing: 20000,    // ~20K for writing generation + evaluation
    speaking: 18000,   // ~18K for speaking evaluation
  };

  const difficultyMultiplier = {
    easy: 0.8,
    medium: 1.0,
    hard: 1.2,
    expert: 1.4,
  };

  const base = baseCosts[operation] || 15000;
  const multiplier = difficultyMultiplier[difficulty as keyof typeof difficultyMultiplier] || 1.0;
  
  return Math.round(base * multiplier);
}

// Check if user has enough quota for an operation
export async function checkQuotaAvailability(userId: string, estimatedCost: number): Promise<{
  hasEnough: boolean;
  remaining: number;
  percentUsed: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabase
    .from('gemini_daily_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  const tokensUsed = data?.tokens_used || 0;
  const remaining = GEMINI_FREE_DAILY_LIMIT - tokensUsed;
  const percentUsed = (tokensUsed / GEMINI_FREE_DAILY_LIMIT) * 100;

  return {
    hasEnough: remaining >= estimatedCost,
    remaining,
    percentUsed,
  };
}

export { GEMINI_FREE_DAILY_LIMIT };
