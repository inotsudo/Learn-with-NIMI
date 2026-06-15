export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      child_badges: {
        Row: {
          badge_slug: string
          child_id: string
          earned_at: string | null
          id: string
        }
        Insert: {
          badge_slug: string
          child_id: string
          earned_at?: string | null
          id?: string
        }
        Update: {
          badge_slug?: string
          child_id?: string
          earned_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      child_progress: {
        Row: {
          child_id: string
          completed_at: string | null
          id: string
          mission_id: string
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          id?: string
          mission_id: string
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string | null
          id: string
          language: string | null
          name: string
          parent_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          name: string
          parent_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          name?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      coloring_pages: {
        Row: {
          id: string
          page_number: number
          story_id: string
          template_image_url: string | null
        }
        Insert: {
          id?: string
          page_number: number
          story_id: string
          template_image_url?: string | null
        }
        Update: {
          id?: string
          page_number?: number
          story_id?: string
          template_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coloring_pages_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      coloring_saves: {
        Row: {
          canvas_data: Json | null
          child_id: string
          coloring_page_id: string
          id: string
          saved_at: string | null
        }
        Insert: {
          canvas_data?: Json | null
          child_id: string
          coloring_page_id: string
          id?: string
          saved_at?: string | null
        }
        Update: {
          canvas_data?: Json | null
          child_id?: string
          coloring_page_id?: string
          id?: string
          saved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coloring_saves_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coloring_saves_coloring_page_id_fkey"
            columns: ["coloring_page_id"]
            isOneToOne: false
            referencedRelation: "coloring_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          day_number: number
          duration_minutes: number | null
          id: string
          media_url: string | null
          page_end: number | null
          page_start: number | null
          story_id: string
          title: string
          type: string
        }
        Insert: {
          day_number: number
          duration_minutes?: number | null
          id?: string
          media_url?: string | null
          page_end?: number | null
          page_start?: number | null
          story_id: string
          title: string
          type: string
        }
        Update: {
          day_number?: number
          duration_minutes?: number | null
          id?: string
          media_url?: string | null
          page_end?: number | null
          page_start?: number | null
          story_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      parental_settings: {
        Row: {
          child_id: string
          daily_limit_minutes: number | null
          id: string
          notifications_enabled: boolean | null
          parent_id: string
        }
        Insert: {
          child_id: string
          daily_limit_minutes?: number | null
          id?: string
          notifications_enabled?: boolean | null
          parent_id: string
        }
        Update: {
          child_id?: string
          daily_limit_minutes?: number | null
          id?: string
          notifications_enabled?: boolean | null
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parental_settings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parental_settings_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          cover_url: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      story_pages: {
        Row: {
          audio_url: string | null
          duration_seconds: number | null
          id: string
          image_url: string | null
          page_number: number
          story_id: string
          text: string | null
        }
        Insert: {
          audio_url?: string | null
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          page_number: number
          story_id: string
          text?: string | null
        }
        Update: {
          audio_url?: string | null
          duration_seconds?: number | null
          id?: string
          image_url?: string | null
          page_number?: number
          story_id?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_pages_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_my_child: { Args: { p_child_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
