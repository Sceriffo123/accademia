import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'user' | 'admin';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'user' | 'admin';
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'user' | 'admin';
        };
      };
      normatives: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: string;
          type: 'law' | 'regulation' | 'ruling';
          reference_number: string;
          publication_date: string;
          effective_date: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          content: string;
          category: string;
          type: 'law' | 'regulation' | 'ruling';
          reference_number: string;
          publication_date: string;
          effective_date: string;
          tags?: string[];
        };
        Update: {
          title?: string;
          content?: string;
          category?: string;
          type?: 'law' | 'regulation' | 'ruling';
          reference_number?: string;
          publication_date?: string;
          effective_date?: string;
          tags?: string[];
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          details: Record<string, any>;
          created_at: string;
        };
        Insert: {
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          details?: Record<string, any>;
        };
        Update: Record<string, never>;
      };
    };
  };
}