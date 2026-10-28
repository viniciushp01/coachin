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
      completions: {
        Row: {
          client_action_id: string
          day_id: string
          done_on: string
          id: string
          marked_at: string
          received_at: string
          student_id: string
          workout_id: string
        }
        Insert: {
          client_action_id: string
          day_id: string
          done_on: string
          id?: string
          marked_at: string
          received_at?: string
          student_id: string
          workout_id: string
        }
        Update: {
          client_action_id?: string
          day_id?: string
          done_on?: string
          id?: string
          marked_at?: string
          received_at?: string
          student_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completions_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "completions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["current_workout_id"]
          },
          {
            foreignKeyName: "completions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["scheduled_workout_id"]
          },
          {
            foreignKeyName: "completions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_hidden: {
        Row: {
          exercise_id: string
          hidden_at: string
          teacher_id: string
        }
        Insert: {
          exercise_id: string
          hidden_at?: string
          teacher_id: string
        }
        Update: {
          exercise_id?: string
          hidden_at?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_hidden_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_hidden_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          muscle_group: string | null
          name: string
          name_normalized: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          muscle_group?: string | null
          name: string
          name_normalized: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          muscle_group?: string | null
          name?: string
          name_normalized?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          declined_at: string | null
          email: string | null
          expires_at: string
          id: string
          invitee_name: string | null
          inviter_id: string
          kind: Database["public"]["Enums"]["invite_kind"]
          replaced_at: string | null
          status: Database["public"]["Enums"]["invite_status"]
          student_id: string | null
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          declined_at?: string | null
          email?: string | null
          expires_at: string
          id?: string
          invitee_name?: string | null
          inviter_id: string
          kind: Database["public"]["Enums"]["invite_kind"]
          replaced_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          student_id?: string | null
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          declined_at?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          invitee_name?: string | null
          inviter_id?: string
          kind?: Database["public"]["Enums"]["invite_kind"]
          replaced_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          student_id?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["student_id"]
          },
        ]
      }
      load_history: {
        Row: {
          client_action_id: string
          edited_at: string
          exercise_id: string
          exercise_name: string
          id: string
          kg: number
          received_at: string
          user_id: string
        }
        Insert: {
          client_action_id: string
          edited_at: string
          exercise_id: string
          exercise_name: string
          id?: string
          kg: number
          received_at?: string
          user_id: string
        }
        Update: {
          client_action_id?: string
          edited_at?: string
          exercise_id?: string
          exercise_name?: string
          id?: string
          kg?: number
          received_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "load_history_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "load_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["account_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["account_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_exercise_loads: {
        Row: {
          edited_at: string
          exercise_id: string
          kg: number
          user_id: string
        }
        Insert: {
          edited_at: string
          exercise_id: string
          kg: number
          user_id: string
        }
        Update: {
          edited_at?: string
          exercise_id?: string
          kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_exercise_loads_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exercise_loads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profile_changes: {
        Row: {
          changed_at: string
          field: string
          id: number
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          field: string
          id?: never
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          field?: string
          id?: never
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profile_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          birth_date: string | null
          completed_at: string | null
          created_at: string
          height_m: number | null
          notice_accepted_at: string | null
          phone: string | null
          restrictions: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          completed_at?: string | null
          created_at?: string
          height_m?: number | null
          notice_accepted_at?: string | null
          phone?: string | null
          restrictions?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          completed_at?: string | null
          created_at?: string
          height_m?: number | null
          notice_accepted_at?: string | null
          phone?: string | null
          restrictions?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          created_at: string
          email: string | null
          id: string
          linked_at: string | null
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["link_status"]
          teacher_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linked_at?: string | null
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          teacher_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linked_at?: string | null
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          teacher_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_requests: {
        Row: {
          canceled_at: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["request_status"]
          student_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          student_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["student_id"]
          },
        ]
      }
      workout_days: {
        Row: {
          created_at: string
          id: string
          letter: string
          name: string
          position: number
          removed_at: string | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          letter: string
          name: string
          position: number
          removed_at?: string | null
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          letter?: string
          name?: string
          position?: number
          removed_at?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_days_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["current_workout_id"]
          },
          {
            foreignKeyName: "workout_days_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["scheduled_workout_id"]
          },
          {
            foreignKeyName: "workout_days_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          day_id: string
          exercise_id: string
          id: string
          note: string | null
          position: number
          reps: string
          rest_seconds: number
          sets: number
        }
        Insert: {
          day_id: string
          exercise_id: string
          id?: string
          note?: string | null
          position: number
          reps: string
          rest_seconds?: number
          sets: number
        }
        Update: {
          day_id?: string
          exercise_id?: string
          id?: string
          note?: string | null
          position?: number
          reps?: string
          rest_seconds?: number
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "workout_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_seen: {
        Row: {
          seen_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          seen_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          seen_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_seen_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_seen_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["current_workout_id"]
          },
          {
            foreignKeyName: "workout_seen_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["scheduled_workout_id"]
          },
          {
            foreignKeyName: "workout_seen_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          letters_used: number
          name: string
          start_date: string
          student_id: string
          suggested_frequency: string | null
          teacher_id: string
          updated_at: string
          weeks: number
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          letters_used?: number
          name: string
          start_date: string
          student_id: string
          suggested_frequency?: string | null
          teacher_id: string
          updated_at?: string
          weeks: number
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          letters_used?: number
          name?: string
          start_date?: string
          student_id?: string
          suggested_frequency?: string | null
          teacher_id?: string
          updated_at?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "workouts_student_id_teacher_id_fkey"
            columns: ["student_id", "teacher_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "teacher_id"]
          },
          {
            foreignKeyName: "workouts_student_id_teacher_id_fkey"
            columns: ["student_id", "teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_student_list"
            referencedColumns: ["student_id", "teacher_id"]
          },
        ]
      }
    }
    Views: {
      teacher_student_list: {
        Row: {
          current_concluded: boolean | null
          current_end_date: string | null
          current_start_date: string | null
          current_workout_id: string | null
          current_workout_name: string | null
          email: string | null
          has_open_request: boolean | null
          invite_declined_at: string | null
          invite_expires_at: string | null
          invite_id: string | null
          invite_state: string | null
          last_done_on: string | null
          link_status: Database["public"]["Enums"]["link_status"] | null
          list_status: string | null
          name: string | null
          phone: string | null
          request_cancelable: boolean | null
          request_created_at: string | null
          scheduled_start_date: string | null
          scheduled_workout_id: string | null
          student_id: string | null
          teacher_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_data_notice: { Args: never; Returns: undefined }
      accept_student_invite: {
        Args: { p_confirm_switch?: boolean; p_token: string }
        Returns: Json
      }
      accept_teacher_invite: { Args: { p_token: string }; Returns: Json }
      acknowledge_new_workout: {
        Args: { p_workout_id: string }
        Returns: undefined
      }
      admin_teacher_student_counts: {
        Args: never
        Returns: {
          active_students: number
          teacher_id: string
        }[]
      }
      cancel_scheduled_workout: {
        Args: { p_workout_id: string }
        Returns: undefined
      }
      cancel_training_request: { Args: never; Returns: undefined }
      create_exercise: {
        Args: { p_muscle_group?: string; p_name: string }
        Returns: {
          created_at: string
          id: string
          muscle_group: string | null
          name: string
          name_normalized: string
          owner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "exercises"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_student_with_invite: {
        Args: { p_email?: string; p_name: string; p_phone?: string }
        Returns: Json
      }
      create_teacher_invite: {
        Args: { p_email: string; p_name: string }
        Returns: Json
      }
      decline_invite: { Args: { p_token: string }; Returns: undefined }
      delete_my_account: { Args: never; Returns: undefined }
      get_invite_preview: { Args: { p_token: string }; Returns: Json }
      mark_done: {
        Args: {
          p_client_action_id: string
          p_client_ts?: string
          p_day_id: string
          p_done_on: string
        }
        Returns: undefined
      }
      pending_new_workout_notice: { Args: never; Returns: Json }
      reissue_invite: {
        Args: { p_invite_id: string; p_new_email?: string }
        Returns: Json
      }
      request_new_workout: { Args: never; Returns: string }
      save_student_profile: {
        Args: {
          p_birth_date: string
          p_full_name: string
          p_height_m: number
          p_phone: string
          p_restrictions?: string
          p_weight_kg: number
        }
        Returns: undefined
      }
      save_workout: {
        Args: { p_data: Json; p_student_id: string; p_workout_id: string }
        Returns: string
      }
      search_exercises: {
        Args: { p_hidden_only?: boolean; p_limit?: number; p_query?: string }
        Returns: {
          created_at: string
          id: string
          muscle_group: string | null
          name: string
          name_normalized: string
          owner_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "exercises"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_exercise_hidden: {
        Args: { p_exercise_id: string; p_hidden: boolean }
        Returns: undefined
      }
      set_load: {
        Args: {
          p_client_action_id: string
          p_edited_at?: string
          p_exercise_id: string
          p_kg: number
        }
        Returns: undefined
      }
      set_teacher_status: {
        Args: {
          p_status: Database["public"]["Enums"]["account_status"]
          p_teacher_id: string
        }
        Returns: undefined
      }
      similar_exercises: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          id: string
          muscle_group: string | null
          name: string
          name_normalized: string
          owner_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "exercises"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      undo_done: {
        Args: { p_day_id: string; p_done_on: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "blocked"
      app_role: "admin" | "professor" | "aluno"
      invite_kind: "student" | "teacher"
      invite_status: "pending" | "accepted" | "declined" | "replaced"
      link_status: "invited" | "active" | "archived"
      request_status: "open" | "canceled" | "closed"
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
      account_status: ["active", "blocked"],
      app_role: ["admin", "professor", "aluno"],
      invite_kind: ["student", "teacher"],
      invite_status: ["pending", "accepted", "declined", "replaced"],
      link_status: ["invited", "active", "archived"],
      request_status: ["open", "canceled", "closed"],
    },
  },
} as const
