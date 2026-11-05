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
      appointments: {
        Row: {
          cancel_reason: string | null
          code: string
          complaint: string | null
          created_at: string
          doctor_id: string
          ends_at: string
          id: string
          patient_id: string
          source: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          cancel_reason?: string | null
          code?: string
          complaint?: string | null
          created_at?: string
          doctor_id: string
          ends_at: string
          id?: string
          patient_id: string
          source?: string
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          cancel_reason?: string | null
          code?: string
          complaint?: string | null
          created_at?: string
          doctor_id?: string
          ends_at?: string
          id?: string
          patient_id?: string
          source?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          created_at: string
          doctor_id: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          full_name: string
          id?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          message_count: number
          rated_at: string | null
          rating: number | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          message_count?: number
          rated_at?: string | null
          rating?: number | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          message_count?: number
          rated_at?: string | null
          rating?: number | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          sources: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          sources?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      closed_days: {
        Row: {
          day: string
          reason: string | null
        }
        Insert: {
          day: string
          reason?: string | null
        }
        Update: {
          day?: string
          reason?: string | null
        }
        Relationships: []
      }
      department_faqs: {
        Row: {
          answer: string
          created_at: string
          department_id: string
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          department_id: string
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          department_id?: string
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "department_faqs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          icon: string
          id: string
          long_description: string | null
          name: string
          services: string[]
          short_description: string | null
          slug: string | null
          sort_order: number
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          long_description?: string | null
          name: string
          services?: string[]
          short_description?: string | null
          slug?: string | null
          sort_order?: number
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          long_description?: string | null
          name?: string
          services?: string[]
          short_description?: string | null
          slug?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      doctors: {
        Row: {
          active: boolean
          bio: string | null
          certifications: string[]
          created_at: string
          department_id: string
          education: Json
          experience: Json
          full_name: string
          id: string
          interests: string[]
          languages: string[]
          photo_url: string | null
          slot_minutes: number
          slug: string | null
          specialty: string | null
          title: string
          working_hours: Json
        }
        Insert: {
          active?: boolean
          bio?: string | null
          certifications?: string[]
          created_at?: string
          department_id: string
          education?: Json
          experience?: Json
          full_name: string
          id?: string
          interests?: string[]
          languages?: string[]
          photo_url?: string | null
          slot_minutes?: number
          slug?: string | null
          specialty?: string | null
          title?: string
          working_hours?: Json
        }
        Update: {
          active?: boolean
          bio?: string | null
          certifications?: string[]
          created_at?: string
          department_id?: string
          education?: Json
          experience?: Json
          full_name?: string
          id?: string
          interests?: string[]
          languages?: string[]
          photo_url?: string | null
          slot_minutes?: number
          slug?: string | null
          specialty?: string | null
          title?: string
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "doctors_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          sort_order: number
          source_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          sort_order?: number
          source_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          sort_order?: number
          source_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          phone: string
          tc_no: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone: string
          tc_no?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string
          tc_no?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          active: boolean
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_notes: {
        Row: {
          appointment_id: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string | null
          id: string
          notes: string
          patient_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          notes: string
          patient_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_notes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_appointment: {
        Args: {
          _complaint: string
          _doctor_id: string
          _email: string
          _full_name: string
          _phone: string
          _starts_at: string
          _tc_no: string
        }
        Returns: string
      }
      cancel_appointment_public: {
        Args: { _code: string; _phone: string }
        Returns: boolean
      }
      chat_append: {
        Args: { _content: string; _id: string; _role: string; _token: string }
        Returns: undefined
      }
      chat_append_assistant: {
        Args: { _content: string; _id: string; _sources: Json; _token: string }
        Returns: undefined
      }
      chat_check: { Args: { _id: string; _token: string }; Returns: boolean }
      chat_history: {
        Args: { _id: string; _token: string }
        Returns: {
          content: string
          created_at: string
          role: string
        }[]
      }
      chat_rate: {
        Args: {
          _feedback: string
          _id: string
          _rating: number
          _token: string
        }
        Returns: undefined
      }
      chat_start: {
        Args: never
        Returns: {
          id: string
          token: string
        }[]
      }
      get_booked_slots: {
        Args: { _doctor_id: string; _from: string; _to: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      lookup_appointment: {
        Args: { _code: string; _phone: string }
        Returns: {
          code: string
          department_name: string
          doctor_name: string
          patient_name: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      match_kb: {
        Args: { _count?: number; _embedding: string }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          title: string
        }[]
      }
      tr_slugify: { Args: { _t: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "reception" | "superadmin"
      appointment_status:
        | "pending"
        | "confirmed"
        | "arrived"
        | "completed"
        | "cancelled"
        | "no_show"
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
      app_role: ["admin", "reception", "superadmin"],
      appointment_status: [
        "pending",
        "confirmed",
        "arrived",
        "completed",
        "cancelled",
        "no_show",
      ],
    },
  },
} as const
