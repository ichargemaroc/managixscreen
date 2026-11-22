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
      billing_events: {
        Row: {
          error_code: string | null
          id: string
          occurred_at: string | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          status: string
        }
        Insert: {
          error_code?: string | null
          id?: string
          occurred_at?: string | null
          processed_at?: string | null
          provider: string
          provider_event_id: string
          status?: string
        }
        Update: {
          error_code?: string | null
          id?: string
          occurred_at?: string | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          status?: string
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          capacity: number
          id: string
          monthly_amount: number | null
          name: string
          price_revision: number
          provider_annual_price: string | null
          provider_monthly_price: string | null
          published: boolean
          updated_at: string
        }
        Insert: {
          capacity: number
          id?: string
          monthly_amount?: number | null
          name: string
          price_revision?: number
          provider_annual_price?: string | null
          provider_monthly_price?: string | null
          published?: boolean
          updated_at?: string
        }
        Update: {
          capacity?: number
          id?: string
          monthly_amount?: number | null
          name?: string
          price_revision?: number
          provider_annual_price?: string | null
          provider_monthly_price?: string | null
          published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      billing_settings: {
        Row: {
          annual_discount_percent: number | null
          currency: string | null
          grace_days: number | null
          id: boolean
          provider: string | null
          provider_ready: boolean
          suspension_policy: string
          trial_capacity: number
          trial_days: number
          trial_one_per_email: boolean
          updated_at: string
        }
        Insert: {
          annual_discount_percent?: number | null
          currency?: string | null
          grace_days?: number | null
          id?: boolean
          provider?: string | null
          provider_ready?: boolean
          suspension_policy?: string
          trial_capacity?: number
          trial_days?: number
          trial_one_per_email?: boolean
          updated_at?: string
        }
        Update: {
          annual_discount_percent?: number | null
          currency?: string | null
          grace_days?: number | null
          id?: boolean
          provider?: string | null
          provider_ready?: boolean
          suspension_policy?: string
          trial_capacity?: number
          trial_days?: number
          trial_one_per_email?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      billing_trial_registry: {
        Row: {
          created_at: string
          email_hash: string
        }
        Insert: {
          created_at?: string
          email_hash: string
        }
        Update: {
          created_at?: string
          email_hash?: string
        }
        Relationships: []
      }
      content_team_drafts: {
        Row: {
          author_id: string
          created_at: string
          id: string
          items: Json
          name: string
          owner_id: string
          playlist_id: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          items: Json
          name: string
          owner_id: string
          playlist_id?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          items?: Json
          name?: string
          owner_id?: string
          playlist_id?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_team_drafts_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      content_team_invites: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          owner_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          owner_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          owner_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      content_team_members: {
        Row: {
          joined_at: string
          member_id: string
          owner_id: string
          revoked_at: string | null
        }
        Insert: {
          joined_at?: string
          member_id: string
          owner_id: string
          revoked_at?: string | null
        }
        Update: {
          joined_at?: string
          member_id?: string
          owner_id?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      device_commands: {
        Row: {
          acknowledged_at: string | null
          command: string
          created_at: string
          delivered_at: string | null
          device_id: string
          error_message: string | null
          expires_at: string
          id: string
          payload: Json | null
          screen_id: string
          status: string
          test_id: string | null
          user_id: string
          wall_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          command: string
          created_at?: string
          delivered_at?: string | null
          device_id: string
          error_message?: string | null
          expires_at?: string
          id?: string
          payload?: Json | null
          screen_id: string
          status?: string
          test_id?: string | null
          user_id: string
          wall_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          command?: string
          created_at?: string
          delivered_at?: string | null
          device_id?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          payload?: Json | null
          screen_id?: string
          status?: string
          test_id?: string | null
          user_id?: string
          wall_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pairing_sessions"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "device_commands_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_commands_wall_id_fkey"
            columns: ["wall_id"]
            isOneToOne: false
            referencedRelation: "video_walls"
            referencedColumns: ["id"]
          },
        ]
      }
      device_credentials: {
        Row: {
          device_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          device_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          device_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_credentials_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "pairing_sessions"
            referencedColumns: ["device_id"]
          },
        ]
      }
      device_pairing_config: {
        Row: {
          enabled: boolean
          id: boolean
        }
        Insert: {
          enabled?: boolean
          id?: boolean
        }
        Update: {
          enabled?: boolean
          id?: boolean
        }
        Relationships: []
      }
      device_request_limits: {
        Row: {
          attempts: number
          key: string
          window_start: string
        }
        Insert: {
          attempts?: number
          key: string
          window_start?: string
        }
        Update: {
          attempts?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      device_telemetry: {
        Row: {
          device_id: string
          device_info: Json
          last_sync_at: string | null
          playback_status: Json
          player_version: string | null
          updated_at: string
        }
        Insert: {
          device_id: string
          device_info?: Json
          last_sync_at?: string | null
          playback_status?: Json
          player_version?: string | null
          updated_at?: string
        }
        Update: {
          device_id?: string
          device_info?: Json
          last_sync_at?: string | null
          playback_status?: Json
          player_version?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_telemetry_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "pairing_sessions"
            referencedColumns: ["device_id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          location: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          duration: number | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          path: string
          refresh_minutes: number
          size: number
          type: string
          user_id: string
          webpage_fullscreen: boolean
          webpage_url: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          path: string
          refresh_minutes?: number
          size?: number
          type: string
          user_id: string
          webpage_fullscreen?: boolean
          webpage_url?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          path?: string
          refresh_minutes?: number
          size?: number
          type?: string
          user_id?: string
          webpage_fullscreen?: boolean
          webpage_url?: string | null
        }
        Relationships: []
      }
      pairing_sessions: {
        Row: {
          created_at: string
          device_id: string
          device_metadata: Json
          device_name: string
          expires_at: string
          id: string
          paired_at: string | null
          pairing_code: string
          screen_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          device_metadata?: Json
          device_name?: string
          expires_at?: string
          id?: string
          paired_at?: string | null
          pairing_code: string
          screen_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          device_metadata?: Json
          device_name?: string
          expires_at?: string
          id?: string
          paired_at?: string | null
          pairing_code?: string
          screen_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pairing_sessions_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string
          currency: string
          hosted_url: string | null
          id: string
          kind: string
          paid_at: string | null
          provider_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          hosted_url?: string | null
          id?: string
          kind: string
          paid_at?: string | null
          provider_id: string
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          hosted_url?: string | null
          id?: string
          kind?: string
          paid_at?: string | null
          provider_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          created_at: string
          duration: number
          id: string
          media_id: string
          playlist_id: string
          position: number
        }
        Insert: {
          created_at?: string
          duration?: number
          id?: string
          media_id: string
          playlist_id: string
          position?: number
        }
        Update: {
          created_at?: string
          duration?: number
          id?: string
          media_id?: string
          playlist_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          org_name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          org_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          org_name?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          created_at: string
          days: number[]
          end_date: string
          end_datetime: string | null
          end_time: string
          group_id: string | null
          id: string
          playlist_id: string
          screen_id: string | null
          start_date: string
          start_datetime: string | null
          start_time: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: number[]
          end_date: string
          end_datetime?: string | null
          end_time: string
          group_id?: string | null
          id?: string
          playlist_id: string
          screen_id?: string | null
          start_date: string
          start_datetime?: string | null
          start_time: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: number[]
          end_date?: string
          end_datetime?: string | null
          end_time?: string
          group_id?: string | null
          id?: string
          playlist_id?: string
          screen_id?: string | null
          start_date?: string
          start_datetime?: string | null
          start_time?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "screen_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_entitlements: {
        Row: {
          active: boolean
          device_id: string
          revision: number
          screen_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          device_id: string
          revision?: number
          screen_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          device_id?: string
          revision?: number
          screen_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_entitlements_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: true
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          screen_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          screen_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          screen_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "screen_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_group_members_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_layout_assignments: {
        Row: {
          layout_id: string
          screen_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          layout_id: string
          screen_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          layout_id?: string
          screen_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_layout_assignments_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "screen_layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_layout_assignments_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: true
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_layouts: {
        Row: {
          id: string
          name: string
          revision: number
          updated_at: string
          user_id: string
          zones: Json
        }
        Insert: {
          id?: string
          name: string
          revision?: number
          updated_at?: string
          user_id: string
          zones: Json
        }
        Update: {
          id?: string
          name?: string
          revision?: number
          updated_at?: string
          user_id?: string
          zones?: Json
        }
        Relationships: []
      }
      screens: {
        Row: {
          assignment_updated_at: string
          created_at: string
          current_playlist_id: string | null
          group_id: string | null
          id: string
          last_seen: string | null
          location: string
          name: string
          pairing_code: string
          playlist_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          assignment_updated_at?: string
          created_at?: string
          current_playlist_id?: string | null
          group_id?: string | null
          id?: string
          last_seen?: string | null
          location?: string
          name: string
          pairing_code: string
          playlist_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          assignment_updated_at?: string
          created_at?: string
          current_playlist_id?: string | null
          group_id?: string | null
          id?: string
          last_seen?: string | null
          location?: string
          name?: string
          pairing_code?: string
          playlist_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screens_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "screen_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          cancel_at_period_end: boolean
          capacity: number
          complimentary_screens: number
          currency: string | null
          current_period_end: string | null
          enforce_capacity: boolean
          grace_until: string | null
          interval: string
          legacy_access: boolean
          plan_id: string | null
          previous_status: Database["public"]["Enums"]["billing_status"] | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          scheduled_keep_screens: string[] | null
          scheduled_plan_id: string | null
          status: Database["public"]["Enums"]["billing_status"]
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          cancel_at_period_end?: boolean
          capacity?: number
          complimentary_screens?: number
          currency?: string | null
          current_period_end?: string | null
          enforce_capacity?: boolean
          grace_until?: string | null
          interval?: string
          legacy_access?: boolean
          plan_id?: string | null
          previous_status?: Database["public"]["Enums"]["billing_status"] | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          scheduled_keep_screens?: string[] | null
          scheduled_plan_id?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          cancel_at_period_end?: boolean
          capacity?: number
          complimentary_screens?: number
          currency?: string | null
          current_period_end?: string | null
          enforce_capacity?: boolean
          grace_until?: string | null
          interval?: string
          legacy_access?: boolean
          plan_id?: string | null
          previous_status?: Database["public"]["Enums"]["billing_status"] | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          scheduled_keep_screens?: string[] | null
          scheduled_plan_id?: string | null
          status?: Database["public"]["Enums"]["billing_status"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_scheduled_plan_id_fkey"
            columns: ["scheduled_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
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
      video_wall_events: {
        Row: {
          action: string
          created_at: string
          effective_at: string
          id: string
          position_seconds: number
          wall_id: string
        }
        Insert: {
          action: string
          created_at?: string
          effective_at: string
          id?: string
          position_seconds: number
          wall_id: string
        }
        Update: {
          action?: string
          created_at?: string
          effective_at?: string
          id?: string
          position_seconds?: number
          wall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_wall_events_wall_id_fkey"
            columns: ["wall_id"]
            isOneToOne: false
            referencedRelation: "video_walls"
            referencedColumns: ["id"]
          },
        ]
      }
      video_wall_screens: {
        Row: {
          assigned_at: string | null
          column_index: number
          row_index: number
          screen_id: string
          wall_id: string
        }
        Insert: {
          assigned_at?: string | null
          column_index: number
          row_index: number
          screen_id: string
          wall_id: string
        }
        Update: {
          assigned_at?: string | null
          column_index?: number
          row_index?: number
          screen_id?: string
          wall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_wall_screens_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: true
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_wall_screens_wall_id_fkey"
            columns: ["wall_id"]
            isOneToOne: false
            referencedRelation: "video_walls"
            referencedColumns: ["id"]
          },
        ]
      }
      video_walls: {
        Row: {
          columns: number
          created_at: string
          epoch: string
          gap_x: number
          gap_y: number
          height: number
          id: string
          media_id: string | null
          media_scale: number
          media_x: number
          media_y: number
          name: string
          orientation: string
          position_seconds: number
          revision: number
          rows: number
          state: string
          user_id: string
          width: number
        }
        Insert: {
          columns?: number
          created_at?: string
          epoch?: string
          gap_x?: number
          gap_y?: number
          height?: number
          id?: string
          media_id?: string | null
          media_scale?: number
          media_x?: number
          media_y?: number
          name: string
          orientation?: string
          position_seconds?: number
          revision?: number
          rows?: number
          state?: string
          user_id: string
          width?: number
        }
        Update: {
          columns?: number
          created_at?: string
          epoch?: string
          gap_x?: number
          gap_y?: number
          height?: number
          id?: string
          media_id?: string | null
          media_scale?: number
          media_x?: number
          media_y?: number
          name?: string
          orientation?: string
          position_seconds?: number
          revision?: number
          rows?: number
          state?: string
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_walls_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      screen_groups: {
        Row: {
          created_at: string | null
          id: string | null
          location: string | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          location?: string | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          location?: string | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_content_invite: {
        Args: { p_id: string; p_token: string }
        Returns: undefined
      }
      assign_screen_layout: {
        Args: { p_layout: string; p_screen: string }
        Returns: undefined
      }
      billing_admin_access: {
        Args: { p_action: string; p_plan?: string; p_user: string }
        Returns: undefined
      }
      billing_admin_client: { Args: { p_user: string }; Returns: Json }
      billing_admin_grant: {
        Args: {
          p_kind: string
          p_until?: string
          p_user: string
          p_value: number
        }
        Returns: undefined
      }
      billing_admin_overview: { Args: { p_page?: number }; Returns: Json }
      billing_admin_save_plan: {
        Args: {
          p_amount?: number
          p_capacity?: number
          p_id?: string
          p_name?: string
          p_published?: boolean
        }
        Returns: string
      }
      billing_admin_settings: {
        Args: { p_currency: string; p_discount: number; p_grace: number }
        Returns: undefined
      }
      billing_admin_trial_settings: {
        Args: { p_capacity: number; p_days: number; p_one_per_email: boolean }
        Returns: undefined
      }
      billing_apply_scheduled_change: {
        Args: { p_user: string }
        Returns: undefined
      }
      billing_check_place: { Args: { p_user: string }; Returns: undefined }
      billing_lock_account: { Args: { p_user: string }; Returns: undefined }
      billing_my_account: { Args: never; Returns: Json }
      billing_schedule_downgrade: {
        Args: { p_keep: string[]; p_plan: string }
        Returns: undefined
      }
      claim_pairing_code: {
        Args: {
          p_code: string
          p_group?: string
          p_location: string
          p_name: string
        }
        Returns: string
      }
      claim_pairing_code_internal: {
        Args: {
          p_code: string
          p_group: string
          p_location: string
          p_name: string
        }
        Returns: string
      }
      consume_device_limit: {
        Args: { p_key: string; p_max: number; p_seconds: number }
        Returns: boolean
      }
      content_team_data: { Args: never; Returns: Json }
      control_video_wall: {
        Args: { p_action: string; p_wall: string }
        Returns: undefined
      }
      control_wall_position_test: {
        Args: { p_action: string; p_duration?: number; p_wall: string }
        Returns: Json
      }
      device_ack_command: {
        Args: {
          p_command: string
          p_device: string
          p_error?: string
          p_hash: string
          p_status: string
        }
        Returns: boolean
      }
      device_content: {
        Args: { p_device: string; p_hash: string }
        Returns: Json
      }
      device_entitlement: {
        Args: { p_device: string; p_hash: string }
        Returns: Json
      }
      device_heartbeat: {
        Args: { p_device: string; p_hash: string }
        Returns: string
      }
      device_layout: {
        Args: { p_device: string; p_hash: string }
        Returns: Json
      }
      device_poll_commands: {
        Args: { p_device: string; p_hash: string }
        Returns: Json
      }
      device_record_sync: {
        Args: { p_device: string; p_hash: string }
        Returns: string
      }
      device_report: {
        Args: { p_device: string; p_hash: string; p_report: Json }
        Returns: string
      }
      device_screen: {
        Args: { p_device: string; p_hash: string }
        Returns: string
      }
      device_wall: { Args: { p_device: string; p_hash: string }; Returns: Json }
      enqueue_device_command: {
        Args: { p_command: string; p_screen: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_content_member: { Args: { p_email: string }; Returns: Json }
      manifest_media: {
        Args: { m: Database["public"]["Tables"]["media"]["Row"] }
        Returns: Json
      }
      register_pairing_session: {
        Args: {
          p_code: string
          p_device_id: string
          p_hash: string
          p_id: string
          p_metadata: Json
          p_name: string
        }
        Returns: undefined
      }
      replace_playlist_items: {
        Args: { p_items: Json; p_playlist_id: string }
        Returns: undefined
      }
      review_content_draft: {
        Args: { p_approve: boolean; p_id: string; p_items: Json }
        Returns: string
      }
      revoke_content_access: {
        Args: { p_invite: string; p_member: string }
        Returns: undefined
      }
      revoke_screen_device: { Args: { p_screen: string }; Returns: undefined }
      save_screen_layout: {
        Args: { p_id: string; p_name: string; p_zones: Json }
        Returns: string
      }
      save_video_wall: {
        Args: { p_config: Json; p_id: string; p_members: Json }
        Returns: string
      }
      set_screen_entitlement: {
        Args: { p_active: boolean; p_screen: string }
        Returns: undefined
      }
      submit_content_draft: {
        Args: {
          p_items: Json
          p_name: string
          p_owner: string
          p_playlist: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin"
      billing_status:
        | "active"
        | "trial"
        | "past_due"
        | "suspended"
        | "cancelled"
        | "expired"
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
      app_role: ["admin"],
      billing_status: [
        "active",
        "trial",
        "past_due",
        "suspended",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
