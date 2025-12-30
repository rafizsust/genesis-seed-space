-- Create table to track daily Gemini API token usage per user
CREATE TABLE public.gemini_daily_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  requests_count INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- Enable Row Level Security
ALTER TABLE public.gemini_daily_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own usage"
ON public.gemini_daily_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage (handled by edge function with service role)
CREATE POLICY "Users can insert their own usage"
ON public.gemini_daily_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage (handled by edge function with service role)
CREATE POLICY "Users can update their own usage"
ON public.gemini_daily_usage
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_gemini_daily_usage_user_date ON public.gemini_daily_usage(user_id, usage_date);