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
      blogs: {
        Row: {
          category: string
          content: Json
          created_at: string
          created_by: string | null
          excerpt: string
          featured_image_path: string | null
          id: string
          keywords: string[]
          lang: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          excerpt?: string
          featured_image_path?: string | null
          id?: string
          keywords?: string[]
          lang?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          excerpt?: string
          featured_image_path?: string | null
          id?: string
          keywords?: string[]
          lang?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      eco_card_events: {
        Row: {
          actor_id: string | null
          card_id: string
          created_at: string
          event: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          card_id: string
          created_at?: string
          event: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          card_id?: string
          created_at?: string
          event?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_card_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "eco_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_cards: {
        Row: {
          card_number: string
          created_at: string
          id: string
          participant_id: string
          rules_snapshot: Json
          snapshot: Json
          status: string
          template_id: string
        }
        Insert: {
          card_number?: string
          created_at?: string
          id?: string
          participant_id: string
          rules_snapshot: Json
          snapshot: Json
          status?: string
          template_id: string
        }
        Update: {
          card_number?: string
          created_at?: string
          id?: string
          participant_id?: string
          rules_snapshot?: Json
          snapshot?: Json
          status?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_cards_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "eco_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_cards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "eco_template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_contribution_snapshots: {
        Row: {
          activity_date: string
          activity_id: string
          category: string
          comments: string
          participant_id: string
          photo_count: number
          plastic_kg: number
          reviewed_at: string | null
          reviewed_by: string | null
          saplings: number
          status: string
          version: number
        }
        Insert: {
          activity_date: string
          activity_id: string
          category: string
          comments?: string
          participant_id: string
          photo_count?: number
          plastic_kg?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          saplings?: number
          status?: string
          version?: number
        }
        Update: {
          activity_date?: string
          activity_id?: string
          category?: string
          comments?: string
          participant_id?: string
          photo_count?: number
          plastic_kg?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          saplings?: number
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "eco_contribution_snapshots_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "eco_submission_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eco_contribution_snapshots_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "eco_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_eligibility_settings: {
        Row: {
          id: number
          published: boolean
          rules: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          published?: boolean
          rules: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          published?: boolean
          rules?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      eco_participants: {
        Row: {
          consent_at: string
          created_at: string
          display_id: string
          email: string
          email_verified: boolean
          hidden: boolean
          id: string
          name: string
          profile_path: string | null
          public_consent: boolean
          removal_requested_at: string | null
        }
        Insert: {
          consent_at?: string
          created_at?: string
          display_id?: string
          email: string
          email_verified?: boolean
          hidden?: boolean
          id?: string
          name: string
          profile_path?: string | null
          public_consent?: boolean
          removal_requested_at?: string | null
        }
        Update: {
          consent_at?: string
          created_at?: string
          display_id?: string
          email?: string
          email_verified?: boolean
          hidden?: boolean
          id?: string
          name?: string
          profile_path?: string | null
          public_consent?: boolean
          removal_requested_at?: string | null
        }
        Relationships: []
      }
      eco_review_events: {
        Row: {
          activity_id: string
          actor_id: string
          created_at: string
          id: string
          new_values: Json
          participant_id: string
          previous_values: Json
          reason: string
        }
        Insert: {
          activity_id: string
          actor_id: string
          created_at?: string
          id?: string
          new_values: Json
          participant_id: string
          previous_values: Json
          reason: string
        }
        Update: {
          activity_id?: string
          actor_id?: string
          created_at?: string
          id?: string
          new_values?: Json
          participant_id?: string
          previous_values?: Json
          reason?: string
        }
        Relationships: []
      }
      eco_sessions: {
        Row: {
          created_at: string
          expires_at: string
          participant_id: string
          revoked: boolean
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          participant_id: string
          revoked?: boolean
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          participant_id?: string
          revoked?: boolean
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "eco_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_submission_outbox: {
        Row: {
          created_at: string
          drive_ids: string[]
          id: string
          idempotency_key: string
          last_error: string | null
          participant_id: string
          payload: Json
          sheet_ack: boolean
          staged_paths: string[]
          sync_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_ids?: string[]
          id?: string
          idempotency_key: string
          last_error?: string | null
          participant_id: string
          payload: Json
          sheet_ack?: boolean
          staged_paths?: string[]
          sync_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_ids?: string[]
          id?: string
          idempotency_key?: string
          last_error?: string | null
          participant_id?: string
          payload?: Json
          sheet_ack?: boolean
          staged_paths?: string[]
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eco_submission_outbox_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "eco_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      eco_sync_state: {
        Row: {
          folder_id: string
          id: number
          last_error: string | null
          last_synced_at: string | null
          spreadsheet_id: string
          tab: string
        }
        Insert: {
          folder_id: string
          id?: number
          last_error?: string | null
          last_synced_at?: string | null
          spreadsheet_id: string
          tab?: string
        }
        Update: {
          folder_id?: string
          id?: number
          last_error?: string | null
          last_synced_at?: string | null
          spreadsheet_id?: string
          tab?: string
        }
        Relationships: []
      }
      eco_template_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          settings: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          settings: Json
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          settings?: Json
          version?: number
        }
        Relationships: []
      }
      knowledge_entries: {
        Row: {
          answer: Json
          category: string
          created_at: string
          id: string
          keywords: string[]
          question: Json
          sort_order: number
          source_label: string | null
          source_url: string | null
          status: string
          ttd_verified: boolean
          updated_at: string
        }
        Insert: {
          answer?: Json
          category?: string
          created_at?: string
          id?: string
          keywords?: string[]
          question?: Json
          sort_order?: number
          source_label?: string | null
          source_url?: string | null
          status?: string
          ttd_verified?: boolean
          updated_at?: string
        }
        Update: {
          answer?: Json
          category?: string
          created_at?: string
          id?: string
          keywords?: string[]
          question?: Json
          sort_order?: number
          source_label?: string | null
          source_url?: string | null
          status?: string
          ttd_verified?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          aliases: string[]
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
          aliases?: string[]
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
          aliases?: string[]
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
          manual_compartments: number | null
          manual_mode: string
          manual_updated_at: string | null
          manual_wait_max_hours: number | null
          manual_wait_min_hours: number | null
          updated_at: string
        }
        Insert: {
          crowd_level?: string | null
          darshan_note?: Json
          darshan_wait_hours?: number | null
          id?: number
          manual_compartments?: number | null
          manual_mode?: string
          manual_updated_at?: string | null
          manual_wait_max_hours?: number | null
          manual_wait_min_hours?: number | null
          updated_at?: string
        }
        Update: {
          crowd_level?: string | null
          darshan_note?: Json
          darshan_wait_hours?: number | null
          id?: number
          manual_compartments?: number | null
          manual_mode?: string
          manual_updated_at?: string | null
          manual_wait_max_hours?: number | null
          manual_wait_min_hours?: number | null
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
      voice_announcement_langs: {
        Row: {
          announcement_id: string
          audio_hash: string | null
          audio_path: string | null
          audio_status: string
          error: string | null
          id: string
          lang: string
          text: string | null
          text_hash: string | null
          text_status: string
          updated_at: string
        }
        Insert: {
          announcement_id: string
          audio_hash?: string | null
          audio_path?: string | null
          audio_status?: string
          error?: string | null
          id?: string
          lang: string
          text?: string | null
          text_hash?: string | null
          text_status?: string
          updated_at?: string
        }
        Update: {
          announcement_id?: string
          audio_hash?: string | null
          audio_path?: string | null
          audio_status?: string
          error?: string | null
          id?: string
          lang?: string
          text?: string | null
          text_hash?: string | null
          text_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_announcement_langs_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "voice_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          source_lang: string
          source_text: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          source_lang?: string
          source_text: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          source_lang?: string
          source_text?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_query_training: {
        Row: {
          active: boolean
          intent_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          intent_id: string
          payload: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          intent_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      voice_settings: {
        Row: {
          autoplay_enabled: boolean
          id: number
          repeat_enabled: boolean
          repeat_minutes: number
          updated_at: string
        }
        Insert: {
          autoplay_enabled?: boolean
          id?: number
          repeat_enabled?: boolean
          repeat_minutes?: number
          updated_at?: string
        }
        Update: {
          autoplay_enabled?: boolean
          id?: number
          repeat_enabled?: boolean
          repeat_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      voice_training_sync: {
        Row: {
          id: number
          last_error: string | null
          last_synced_at: string | null
          row_count: number
          sheet_range: string
          spreadsheet_id: string | null
        }
        Insert: {
          id?: number
          last_error?: string | null
          last_synced_at?: string | null
          row_count?: number
          sheet_range?: string
          spreadsheet_id?: string | null
        }
        Update: {
          id?: number
          last_error?: string | null
          last_synced_at?: string | null
          row_count?: number
          sheet_range?: string
          spreadsheet_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      blog_image_is_public: { Args: { _path: string }; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      eco_review_activity: {
        Args: {
          _comments: string
          _expected_version: number
          _id: string
          _plastic: number
          _saplings: number
          _status: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      publish_voice_announcement: { Args: { _id: string }; Returns: boolean }
      replace_voice_training: { Args: { _rows: Json }; Returns: number }
      transport_category_is_published: {
        Args: { _category_id: string }
        Returns: boolean
      }
      transport_offer_is_live: { Args: { _offer_id: string }; Returns: boolean }
      transport_provider_is_public: {
        Args: { _provider_id: string }
        Returns: boolean
      }
      voice_announcement_is_published: {
        Args: { _id: string }
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
