// MyFinance — Configuration
// Replace these with your actual Supabase project credentials and Finnhub API key.

export const SUPABASE_URL = 'https://anamcrmyjlibntjshllo.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYW1jcm15amxpYm50anNobGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTYxMDIsImV4cCI6MjA5Mjg5MjEwMn0.xLDi8iB2blbk3YsC1iP8jCSnbtO47nDkPkhCATosd3s';
export const FINNHUB_API_KEY = 'YOUR_FINNHUB_KEY';

// Stock price cache duration in minutes
export const STOCK_CACHE_MINUTES = 15;

// Show the Developer tools panel (test-data generator) in Settings.
export const DEV_TOOLS = true;

// Platform v2 (customizable dashboard pages). OFF = today's fixed app.
// Flipping this to true switches on the new dashboard system — instant rollback of the
// experience without a code revert. See sql/MIGRATIONS.md and the platform plan.
export const PLATFORM_V2 = false;
