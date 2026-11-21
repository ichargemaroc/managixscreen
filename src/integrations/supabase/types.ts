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
          size: number
          type: string
          user_id: string
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
          size?: number
          type: string
          user_id: string
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
          size?: number
          type?: string
          user_id?: string
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
      device_heartbeat: {
        Args: { p_device: string; p_hash: string }
        Returns: string
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
      revoke_screen_device: { Args: { p_screen: string }; Returns: undefined }
      save_video_wall: {
        Args: { p_config: Json; p_id: string; p_members: Json }
        Returns: string
      }
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
    Enums: {},
  },
} as const
