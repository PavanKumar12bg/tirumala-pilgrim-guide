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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          created_at: string
          id: string
          sort_order: number
          text: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          text?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          sort_order?: number
          text?: Json
        }
        Relationships: []
      }
      places: {
        Row: {
          category: string
          coords_source: string | null
          coords_verified: boolean
          created_at: string
          description: Json
          featured: boolean
          id: string
          image_bytes: number | null
          image_height: number | null
          image_path: string | null
          image_url: string | null
          image_width: number | null
          lat: number | null
          lng: number | null
          name: Json
          needs_review: boolean
          osm_id: string | null
          osm_tags: Json
          slug: string
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          category?: string
          coords_source?: string | null
          coords_verified?: boolean
          created_at?: string
          description?: Json
          featured?: boolean
          id?: string
          image_bytes?: number | null
          image_height?: number | null
          image_path?: string | null
          image_url?: string | null
          image_width?: number | null
          lat?: number | null
          lng?: number | null
          name?: Json
          needs_review?: boolean
          osm_id?: string | null
          osm_tags?: Json
          slug: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          category?: string
          coords_source?: string | null
          coords_verified?: boolean
          created_at?: string
          description?: Json
          featured?: boolean
          id?: string
          image_bytes?: number | null
          image_height?: number | null
          image_path?: string | null
          image_url?: string | null
          image_width?: number | null
          lat?: number | null
          lng?: number | null
          name?: Json
          needs_review?: boolean
          osm_id?: string | null
          osm_tags?: Json
          slug?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      site_status: {
        Row: {
          crowd_level: string | null
          darshan_note: Json
          darshan_wait_hours: number | null
          id: number
          updated_at: string
        }
        Insert: {
          crowd_level?: string | null
          darshan_note?: Json
          darshan_wait_hours?: number | null
          id?: number
          updated_at?: string
        }
        Update: {
          crowd_level?: string | null
          darshan_note?: Json
          darshan_wait_hours?: number | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      status_history: {
        Row: {
          crowd_level: string | null
          darshan_note: Json
          darshan_wait_hours: number | null
          entry_date: string
          id: string
          recorded_at: string
          recorded_by: string | null
        }
        Insert: {
          crowd_level?: string | null
          darshan_note?: Json
          darshan_wait_hours?: number | null
          entry_date: string
          id?: string
          recorded_at?: string
          recorded_by?: string | null
        }
        Update: {
          crowd_level?: string | null
          darshan_note?: Json
          darshan_wait_hours?: number | null
          entry_date?: string
          id?: string
          recorded_at?: string
          recorded_by?: string | null
        }
        Relationships: []
      }
      transport_categories: {
        Row: {
          created_at: string
          description: Json
          icon: string
          id: string
          image_path: string | null
          last_verified_on: string | null
          sections: Json
          slug: string
          sort_order: number
          sources: Json
          status: string
          template: string
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json
          icon?: string
          id?: string
          image_path?: string | null
          last_verified_on?: string | null
          sections?: Json
          slug: string
          sort_order?: number
          sources?: Json
          status?: string
          template: string
          title?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json
          icon?: string
          id?: string
          image_path?: string | null
          last_verified_on?: string | null
          sections?: Json
          slug?: string
          sort_order?: number
          sources?: Json
          status?: string
          template?: string
          title?: Json
          updated_at?: string
        }
        Relationships: []
      }
      transport_items: {
        Row: {
          body: Json
          category_id: string
          created_at: string
          details: Json
          duration_text: string | null
          fare_text: string | null
          id: string
          kind: string
          last_verified_on: string | null
          notes: Json
          photo_paths: string[]
          place_id: string | null
          published: boolean
          sort_order: number
          source_url: string | null
          title: Json
          updated_at: string
        }
        Insert: {
          body?: Json
          category_id: string
          created_at?: string
          details?: Json
          duration_text?: string | null
          fare_text?: string | null
          id?: string
          kind: string
          last_verified_on?: string | null
          notes?: Json
          photo_paths?: string[]
          place_id?: string | null
          published?: boolean
          sort_order?: number
          source_url?: string | null
          title?: Json
          updated_at?: string
        }
        Update: {
          body?: Json
          category_id?: string
          created_at?: string
          details?: Json
          duration_text?: string | null
          fare_text?: string | null
          id?: string
          kind?: string
          last_verified_on?: string | null
          notes?: Json
          photo_paths?: string[]
          place_id?: string | null
          published?: boolean
          sort_order?: number
          source_url?: string | null
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transport_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_items_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_offers: {
        Row: {
          category_id: string
          created_at: string
          duration_text: string | null
          exclusions: string | null
          extra_charges: string | null
          id: string
          included_places: string | null
          inclusions: string | null
          price_text: string | null
          provider_id: string
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          duration_text?: string | null
          exclusions?: string | null
          extra_charges?: string | null
          id?: string
          included_places?: string | null
          inclusions?: string | null
          price_text?: string | null
          provider_id: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          duration_text?: string | null
          exclusions?: string | null
          extra_charges?: string | null
          id?: string
          included_places?: string | null
          inclusions?: string | null
          price_text?: string | null
          provider_id?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transport_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "transport_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_provider_private: {
        Row: {
          agreement_notes: string | null
          commission: string | null
          internal_notes: string | null
          private_phone: string | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          agreement_notes?: string | null
          commission?: string | null
          internal_notes?: string | null
          private_phone?: string | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          agreement_notes?: string | null
          commission?: string | null
          internal_notes?: string | null
          private_phone?: string | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_provider_private_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "transport_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_providers: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          display_name: string
          id: string
          public_phone: string | null
          service_area: string | null
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          display_name: string
          id?: string
          public_phone?: string | null
          service_area?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          display_name?: string
          id?: string
          public_phone?: string | null
          service_area?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      transport_category_is_published: {
        Args: { _category_id: string }
        Returns: boolean
      }
      transport_offer_is_live: { Args: { _offer_id: string }; Returns: boolean }
      transport_provider_is_public: {
        Args: { _provider_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
