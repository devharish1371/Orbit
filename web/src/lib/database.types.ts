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
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      _migrations: {
        Row: {
          applied_at: string
          checksum: string | null
          name: string
        }
        Insert: {
          applied_at?: string
          checksum?: string | null
          name: string
        }
        Update: {
          applied_at?: string
          checksum?: string | null
          name?: string
        }
        Relationships: []
      }
      capsules: {
        Row: {
          author_id: string
          body: string
          couple_id: string
          created_at: string
          id: string
          notified_at: string | null
          opened_at: string | null
          title: string
          unlock_at: string
        }
        Insert: {
          author_id: string
          body: string
          couple_id: string
          created_at?: string
          id?: string
          notified_at?: string | null
          opened_at?: string | null
          title: string
          unlock_at: string
        }
        Update: {
          author_id?: string
          body?: string
          couple_id?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          opened_at?: string | null
          title?: string
          unlock_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'capsule_member'
            columns: ['author_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['user_id', 'couple_id']
          },
          {
            foreignKeyName: 'capsules_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          couple_id: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          couple_id: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          couple_id?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comment_post'
            columns: ['post_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id', 'couple_id']
          },
          {
            foreignKeyName: 'comments_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
        ]
      }
      couples: {
        Row: {
          anniversary: string | null
          created_at: string
          id: string
          keepsake_quota_mb: number
          meet_url: string | null
          name: string
          retention_days: number
          social_revision: number
          timezone: string
        }
        Insert: {
          anniversary?: string | null
          created_at?: string
          id?: string
          keepsake_quota_mb?: number
          meet_url?: string | null
          name?: string
          retention_days?: number
          social_revision?: number
          timezone?: string
        }
        Update: {
          anniversary?: string | null
          created_at?: string
          id?: string
          keepsake_quota_mb?: number
          meet_url?: string | null
          name?: string
          retention_days?: number
          social_revision?: number
          timezone?: string
        }
        Relationships: []
      }
      daily_summary: {
        Row: {
          couple_id: string
          day: string
          distance_km: number
          points: number
          user_id: string
        }
        Insert: {
          couple_id: string
          day: string
          distance_km?: number
          points?: number
          user_id: string
        }
        Update: {
          couple_id?: string
          day?: string
          distance_km?: number
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_summary_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'summary_member'
            columns: ['user_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['user_id', 'couple_id']
          },
        ]
      }
      device_tokens: {
        Row: {
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          couple_id: string
          created_at: string
          expires_at: string
          id: string
          payload: Json
          place_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          place_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          place_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'event_member'
            columns: ['user_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['user_id', 'couple_id']
          },
          {
            foreignKeyName: 'event_place'
            columns: ['place_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'places'
            referencedColumns: ['id', 'couple_id']
          },
          {
            foreignKeyName: 'events_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'events_place_id_fkey'
            columns: ['place_id']
            isOneToOne: false
            referencedRelation: 'places'
            referencedColumns: ['id']
          },
        ]
      }
      live_location: {
        Row: {
          accuracy_m: number | null
          battery_pct: number | null
          charging: boolean | null
          couple_id: string
          fuzzed: boolean
          heading: number | null
          is_moving: boolean
          lat: number
          lng: number
          recorded_at: string
          speed_mps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_m?: number | null
          battery_pct?: number | null
          charging?: boolean | null
          couple_id: string
          fuzzed?: boolean
          heading?: number | null
          is_moving?: boolean
          lat: number
          lng: number
          recorded_at: string
          speed_mps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_m?: number | null
          battery_pct?: number | null
          charging?: boolean | null
          couple_id?: string
          fuzzed?: boolean
          heading?: number | null
          is_moving?: boolean
          lat?: number
          lng?: number
          recorded_at?: string
          speed_mps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'live_location_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'live_member'
            columns: ['user_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['user_id', 'couple_id']
          },
        ]
      }
      location_history: {
        Row: {
          accuracy_m: number | null
          battery_pct: number | null
          client_id: string | null
          couple_id: string
          expires_at: string
          id: number
          lat: number
          lng: number
          recorded_at: string
          speed_mps: number | null
          user_id: string
        }
        Insert: {
          accuracy_m?: number | null
          battery_pct?: number | null
          client_id?: string | null
          couple_id: string
          expires_at?: string
          id?: never
          lat: number
          lng: number
          recorded_at: string
          speed_mps?: number | null
          user_id: string
        }
        Update: {
          accuracy_m?: number | null
          battery_pct?: number | null
          client_id?: string | null
          couple_id?: string
          expires_at?: string
          id?: never
          lat?: number
          lng?: number
          recorded_at?: string
          speed_mps?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'history_member'
            columns: ['user_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['user_id', 'couple_id']
          },
          {
            foreignKeyName: 'location_history_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
        ]
      }
      media_gc: {
        Row: {
          claimed_at: string
          path: string
        }
        Insert: {
          claimed_at?: string
          path: string
        }
        Update: {
          claimed_at?: string
          path?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          avatar_path: string | null
          color: string
          couple_id: string
          created_at: string
          display_name: string
          location_epoch: number
          nickname: string | null
          notify_prefs: Json
          partner_nickname: string | null
          phone: string | null
          quiet_end: string
          quiet_start: string
          share_mode: string
          share_mode_until: string | null
          stale_notified: boolean
          telegram_chat_id: string | null
          theme_accent: string
          theme_mode: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          color?: string
          couple_id: string
          created_at?: string
          display_name: string
          location_epoch?: number
          nickname?: string | null
          notify_prefs?: Json
          partner_nickname?: string | null
          phone?: string | null
          quiet_end?: string
          quiet_start?: string
          share_mode?: string
          share_mode_until?: string | null
          stale_notified?: boolean
          telegram_chat_id?: string | null
          theme_accent?: string
          theme_mode?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          color?: string
          couple_id?: string
          created_at?: string
          display_name?: string
          location_epoch?: number
          nickname?: string | null
          notify_prefs?: Json
          partner_nickname?: string | null
          phone?: string | null
          quiet_end?: string
          quiet_start?: string
          share_mode?: string
          share_mode_until?: string | null
          stale_notified?: boolean
          telegram_chat_id?: string | null
          theme_accent?: string
          theme_mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'members_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
        ]
      }
      place_presence: {
        Row: {
          changed_at: string
          couple_id: string
          inside: boolean
          place_id: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          couple_id: string
          inside: boolean
          place_id: string
          user_id: string
        }
        Update: {
          changed_at?: string
          couple_id?: string
          inside?: boolean
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'place_presence_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'place_presence_place_id_fkey'
            columns: ['place_id']
            isOneToOne: false
            referencedRelation: 'places'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'presence_member'
            columns: ['user_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['user_id', 'couple_id']
          },
          {
            foreignKeyName: 'presence_place'
            columns: ['place_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'places'
            referencedColumns: ['id', 'couple_id']
          },
        ]
      }
      places: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string | null
          emoji: string
          id: string
          lat: number
          lng: number
          name: string
          notify_arrive: boolean
          notify_leave: boolean
          radius_m: number
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by?: string | null
          emoji?: string
          id?: string
          lat: number
          lng: number
          name: string
          notify_arrive?: boolean
          notify_leave?: boolean
          radius_m?: number
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string | null
          emoji?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          notify_arrive?: boolean
          notify_leave?: boolean
          radius_m?: number
        }
        Relationships: [
          {
            foreignKeyName: 'places_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string | null
          channel: string
          couple_id: string
          created_at: string
          deleting_at: string | null
          deletion_token: string | null
          expires_at: string | null
          id: string
          keep: boolean
          kept_at: string | null
          kept_by: string | null
          kind: string
          lat: number | null
          lng: number | null
          media_bytes: number
          media_duration_s: number | null
          media_height: number | null
          media_path: string | null
          media_width: number | null
          thumb_bytes: number
          thumb_path: string | null
          ttl_hours: number | null
          unsent_at: string | null
          waveform: number[] | null
        }
        Insert: {
          author_id: string
          body?: string | null
          channel: string
          couple_id: string
          created_at?: string
          deleting_at?: string | null
          deletion_token?: string | null
          expires_at?: string | null
          id?: string
          keep?: boolean
          kept_at?: string | null
          kept_by?: string | null
          kind: string
          lat?: number | null
          lng?: number | null
          media_bytes?: number
          media_duration_s?: number | null
          media_height?: number | null
          media_path?: string | null
          media_width?: number | null
          thumb_bytes?: number
          thumb_path?: string | null
          ttl_hours?: number | null
          unsent_at?: string | null
          waveform?: number[] | null
        }
        Update: {
          author_id?: string
          body?: string | null
          channel?: string
          couple_id?: string
          created_at?: string
          deleting_at?: string | null
          deletion_token?: string | null
          expires_at?: string | null
          id?: string
          keep?: boolean
          kept_at?: string | null
          kept_by?: string | null
          kind?: string
          lat?: number | null
          lng?: number | null
          media_bytes?: number
          media_duration_s?: number | null
          media_height?: number | null
          media_path?: string | null
          media_width?: number | null
          thumb_bytes?: number
          thumb_path?: string | null
          ttl_hours?: number | null
          unsent_at?: string | null
          waveform?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: 'post_member'
            columns: ['author_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['user_id', 'couple_id']
          },
          {
            foreignKeyName: 'posts_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
        ]
      }
      question_answers: {
        Row: {
          answer: string
          couple_id: string
          created_at: string
          day: string
          question_idx: number
          user_id: string
        }
        Insert: {
          answer: string
          couple_id: string
          created_at?: string
          day: string
          question_idx: number
          user_id: string
        }
        Update: {
          answer?: string
          couple_id?: string
          created_at?: string
          day?: string
          question_idx?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'answer_member'
            columns: ['user_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['user_id', 'couple_id']
          },
          {
            foreignKeyName: 'question_answers_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
        ]
      }
      reactions: {
        Row: {
          couple_id: string
          created_at: string
          emoji: string
          post_id: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          emoji: string
          post_id: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          emoji?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reaction_post'
            columns: ['post_id', 'couple_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id', 'couple_id']
          },
          {
            foreignKeyName: 'reactions_couple_id_fkey'
            columns: ['couple_id']
            isOneToOne: false
            referencedRelation: 'couples'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reactions_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
        ]
      }
      retention_runs: {
        Row: {
          bytes_freed: number
          error: string | null
          events_deleted: number
          files_deleted: number
          history_deleted: number
          id: number
          orphans_deleted: number
          posts_deleted: number
          ran_at: string
        }
        Insert: {
          bytes_freed?: number
          error?: string | null
          events_deleted?: number
          files_deleted?: number
          history_deleted?: number
          id?: never
          orphans_deleted?: number
          posts_deleted?: number
          ran_at?: string
        }
        Update: {
          bytes_freed?: number
          error?: string | null
          events_deleted?: number
          files_deleted?: number
          history_deleted?: number
          id?: never
          orphans_deleted?: number
          posts_deleted?: number
          ran_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_expired_posts: {
        Args: { p_limit?: number }
        Returns: {
          author_id: string
          body: string | null
          channel: string
          couple_id: string
          created_at: string
          deleting_at: string | null
          deletion_token: string | null
          expires_at: string | null
          id: string
          keep: boolean
          kept_at: string | null
          kept_by: string | null
          kind: string
          lat: number | null
          lng: number | null
          media_bytes: number
          media_duration_s: number | null
          media_height: number | null
          media_path: string | null
          media_width: number | null
          thumb_bytes: number
          thumb_path: string | null
          ttl_hours: number | null
          unsent_at: string | null
          waveform: number[] | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'posts'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_notification_jobs: {
        Args: { p_id?: string; p_limit?: number }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'notification_jobs'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_orphan_media: { Args: { p_paths: string[] }; Returns: string[] }
      create_shared_post: {
        Args: { p_post: Json }
        Returns: {
          author_id: string
          body: string | null
          channel: string
          couple_id: string
          created_at: string
          deleting_at: string | null
          deletion_token: string | null
          expires_at: string | null
          id: string
          keep: boolean
          kept_at: string | null
          kept_by: string | null
          kind: string
          lat: number | null
          lng: number | null
          media_bytes: number
          media_duration_s: number | null
          media_height: number | null
          media_path: string | null
          media_width: number | null
          thumb_bytes: number
          thumb_path: string | null
          ttl_hours: number | null
          unsent_at: string | null
          waveform: number[] | null
        }
        SetofOptions: {
          from: '*'
          to: 'posts'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finish_expired_post: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
      }
      finish_notification: {
        Args: { p_id: string; p_status: string; p_tokens?: string[] }
        Returns: undefined
      }
      finish_orphan_media: { Args: { p_paths: string[] }; Returns: undefined }
      request_unsend: { Args: { p_id: string }; Returns: boolean }
      reserve_notification: {
        Args: { p_id: string; p_key: string }
        Returns: boolean
      }
      send_attention: {
        Args: { p_id: string; p_type: string }
        Returns: string
      }
      set_post_reaction: {
        Args: { p_emoji?: string; p_id: string }
        Returns: undefined
      }
      storage_summary: { Args: never; Returns: Json }
      submit_locations: {
        Args: {
          p_epoch: number
          p_fixes: Json
          p_low_battery?: boolean
          p_transitions?: Json
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
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
