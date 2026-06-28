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
  public: {
    Tables: {
      approval_history: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_id: string
          comment: string | null
          created_at: string
          id: string
          request_id: string
          stage: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_id: string
          comment?: string | null
          created_at?: string
          id?: string
          request_id: string
          stage: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          approver_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          request_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_logs: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["gate_direction"]
          guard_id: string | null
          id: string
          note: string | null
          pass_id: string
          student_id: string
          verified_via: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["gate_direction"]
          guard_id?: string | null
          id?: string
          note?: string | null
          pass_id: string
          student_id: string
          verified_via: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["gate_direction"]
          guard_id?: string | null
          id?: string
          note?: string | null
          pass_id?: string
          student_id?: string
          verified_via?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_logs_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "gate_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_passes: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          manual_code: string
          qr_token: string
          request_id: string
          student_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          manual_code: string
          qr_token: string
          request_id: string
          student_id: string
          valid_from: string
          valid_until: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          manual_code?: string
          qr_token?: string
          request_id?: string
          student_id?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_passes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_categories: {
        Row: {
          description: string | null
          id: string
          max_days: number | null
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          max_days?: number | null
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          max_days?: number | null
          name?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          ai_is_emergency: boolean | null
          ai_risk_explanation: string | null
          ai_risk_score: number | null
          category_id: string
          created_at: string
          current_stage: string
          destination: string | null
          end_date: string
          id: string
          parent_call_url: string | null
          reason: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          ai_is_emergency?: boolean | null
          ai_risk_explanation?: string | null
          ai_risk_score?: number | null
          category_id: string
          created_at?: string
          current_stage?: string
          destination?: string | null
          end_date: string
          id?: string
          parent_call_url?: string | null
          reason: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          ai_is_emergency?: boolean | null
          ai_risk_explanation?: string | null
          ai_risk_score?: number | null
          category_id?: string
          created_at?: string
          current_stage?: string
          destination?: string | null
          end_date?: string
          id?: string
          parent_call_url?: string | null
          reason?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "leave_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_slots: {
        Row: {
          id: string
          request_id: string
          slot_end: string
          slot_start: string
        }
        Insert: {
          id?: string
          request_id: string
          slot_end: string
          slot_start: string
        }
        Update: {
          id?: string
          request_id?: string
          slot_end?: string
          slot_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_slots_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          advisor_id: string | null
          attendance_pct: number | null
          cgpa: number | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          hostel_resident: boolean | null
          id: string
          parent_phone: string | null
          phone: string | null
          placement_eligible: boolean | null
          roll_number: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          advisor_id?: string | null
          attendance_pct?: number | null
          cgpa?: number | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          hostel_resident?: boolean | null
          id: string
          parent_phone?: string | null
          phone?: string | null
          placement_eligible?: boolean | null
          roll_number?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          advisor_id?: string | null
          attendance_pct?: number | null
          cgpa?: number | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          hostel_resident?: boolean | null
          id?: string
          parent_phone?: string | null
          phone?: string | null
          placement_eligible?: boolean | null
          roll_number?: string | null
          updated_at?: string
          year?: number | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "student"
        | "advisor"
        | "hod"
        | "dean"
        | "vp"
        | "security"
        | "admin"
      approval_action: "approve" | "reject" | "escalate"
      gate_direction: "exit" | "entry"
      leave_status:
        | "pending"
        | "approved"
        | "rejected"
        | "escalated"
        | "cancelled"
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
  public: {
    Enums: {
      app_role: [
        "student",
        "advisor",
        "hod",
        "dean",
        "vp",
        "security",
        "admin",
      ],
      approval_action: ["approve", "reject", "escalate"],
      gate_direction: ["exit", "entry"],
      leave_status: [
        "pending",
        "approved",
        "rejected",
        "escalated",
        "cancelled",
      ],
    },
  },
} as const
