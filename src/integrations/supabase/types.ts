export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          category: string | null;
          created_at: string;
          id: string;
          pinned: boolean;
          title: string;
          updated_at: string;
          workspace_key: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
          workspace_key?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
          workspace_key?: string | null;
        };
        Relationships: [];
      };
      ai_knowledge_documents: {
        Row: {
          body: string;
          category: string | null;
          created_at: string;
          id: string;
          source: string | null;
          tags: string[];
          title: string;
          updated_at: string;
          workspace_key: string | null;
        };
        Insert: {
          body: string;
          category?: string | null;
          created_at?: string;
          id?: string;
          source?: string | null;
          tags?: string[];
          title: string;
          updated_at?: string;
          workspace_key?: string | null;
        };
        Update: {
          body?: string;
          category?: string | null;
          created_at?: string;
          id?: string;
          source?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
          workspace_key?: string | null;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          tokens: number | null;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          tokens?: number | null;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          tokens?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_prompts: {
        Row: {
          body: string;
          category: string | null;
          created_at: string;
          id: string;
          pinned: boolean;
          tags: string[];
          title: string;
          updated_at: string;
          usage_count: number;
          workspace_key: string | null;
        };
        Insert: {
          body: string;
          category?: string | null;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          tags?: string[];
          title: string;
          updated_at?: string;
          usage_count?: number;
          workspace_key?: string | null;
        };
        Update: {
          body?: string;
          category?: string | null;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          tags?: string[];
          title?: string;
          updated_at?: string;
          usage_count?: number;
          workspace_key?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ops_documents: {
        Row: {
          category: string | null;
          created_at: string;
          id: string;
          notes: string | null;
          title: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          title: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          title?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      ops_projects: {
        Row: {
          created_at: string;
          customer_id: string | null;
          due_date: string | null;
          id: string;
          name: string;
          notes: string | null;
          priority: string;
          progress: number;
          start_date: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          due_date?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          priority?: string;
          progress?: number;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          due_date?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          priority?: string;
          progress?: number;
          start_date?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ops_projects_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "sales_customers";
            referencedColumns: ["id"];
          },
        ];
      };
      ops_tasks: {
        Row: {
          assignee: string | null;
          created_at: string;
          due_at: string | null;
          id: string;
          notes: string | null;
          priority: string;
          project_id: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assignee?: string | null;
          created_at?: string;
          due_at?: string | null;
          id?: string;
          notes?: string | null;
          priority?: string;
          project_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee?: string | null;
          created_at?: string;
          due_at?: string | null;
          id?: string;
          notes?: string | null;
          priority?: string;
          project_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ops_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "ops_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_appointments: {
        Row: {
          created_at: string;
          customer_id: string | null;
          ends_at: string | null;
          id: string;
          location: string | null;
          notes: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_appointments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "sales_customers";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_companies: {
        Row: {
          created_at: string;
          id: string;
          industry: string | null;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          industry?: string | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          industry?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      sales_customers: {
        Row: {
          company_id: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_customers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "sales_companies";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_follow_ups: {
        Row: {
          created_at: string;
          customer_id: string | null;
          due_at: string;
          id: string;
          notes: string | null;
          status: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          due_at?: string;
          id?: string;
          notes?: string | null;
          status?: string;
          subject: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          due_at?: string;
          id?: string;
          notes?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_follow_ups_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "sales_customers";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_leads: {
        Row: {
          company: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          score: number;
          source: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          score?: number;
          source?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          score?: number;
          source?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales_opportunities: {
        Row: {
          created_at: string;
          customer_id: string | null;
          expected_close: string | null;
          id: string;
          notes: string | null;
          probability: number;
          stage: string;
          title: string;
          updated_at: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          expected_close?: string | null;
          id?: string;
          notes?: string | null;
          probability?: number;
          stage?: string;
          title: string;
          updated_at?: string;
          value?: number;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          expected_close?: string | null;
          id?: string;
          notes?: string | null;
          probability?: number;
          stage?: string;
          title?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_opportunities_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "sales_customers";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_quotations: {
        Row: {
          amount: number;
          created_at: string;
          customer_id: string | null;
          id: string;
          notes: string | null;
          number: string;
          opportunity_id: string | null;
          status: string;
          updated_at: string;
          valid_until: string | null;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          notes?: string | null;
          number: string;
          opportunity_id?: string | null;
          status?: string;
          updated_at?: string;
          valid_until?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          notes?: string | null;
          number?: string;
          opportunity_id?: string | null;
          status?: string;
          updated_at?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_quotations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "sales_customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_quotations_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "sales_opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      review_requests: {
        Row: {
          id: string;
          token: string;
          customer_name: string;
          customer_phone: string | null;
          project_title: string | null;
          sent_via: string;
          sent_at: string;
          clicked_at: string | null;
          click_count: number;
          created_by: string | null;
          delivery_status: string;
          prepared_at: string;
          delivered_at: string | null;
          delivery_evidence: string | null;
        };
        Insert: {
          id?: string;
          token: string;
          customer_name: string;
          customer_phone?: string | null;
          project_title?: string | null;
          sent_via?: string;
          sent_at?: string;
          clicked_at?: string | null;
          click_count?: number;
          created_by?: string | null;
          delivery_status?: string;
          prepared_at?: string;
          delivered_at?: string | null;
          delivery_evidence?: string | null;
        };
        Update: {
          id?: string;
          token?: string;
          customer_name?: string;
          customer_phone?: string | null;
          project_title?: string | null;
          sent_via?: string;
          sent_at?: string;
          clicked_at?: string | null;
          click_count?: number;
          created_by?: string | null;
          delivery_status?: string;
          prepared_at?: string;
          delivered_at?: string | null;
          delivery_evidence?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
