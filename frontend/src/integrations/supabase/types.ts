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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string
          closes_at: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
        }
        Insert: {
          address: string
          closes_at?: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
        }
        Update: {
          address?: string
          closes_at?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          capacity: number
          id: string
          lat: number
          lng: number
          name: string
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          vehicle: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          capacity?: number
          id?: string
          lat: number
          lng: number
          name: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          vehicle?: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          capacity?: number
          id?: string
          lat?: number
          lng?: number
          name?: string
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          vehicle?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: []
      }
      pickups: {
        Row: {
          business_id: string
          created_at: string
          driver_id: string | null
          expires_at: string
          food_description: string
          id: string
          quantity: number
          shelter_id: string
          status: Database["public"]["Enums"]["pickup_status"]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          driver_id?: string | null
          expires_at: string
          food_description: string
          id?: string
          quantity?: number
          shelter_id: string
          status?: Database["public"]["Enums"]["pickup_status"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          driver_id?: string | null
          expires_at?: string
          food_description?: string
          id?: string
          quantity?: number
          shelter_id?: string
          status?: Database["public"]["Enums"]["pickup_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickups_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      shelters: {
        Row: {
          accepts_until: string
          address: string
          capacity: number
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
        }
        Insert: {
          accepts_until?: string
          address: string
          capacity?: number
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
        }
        Update: {
          accepts_until?: string
          address?: string
          capacity?: number
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_pickup: {
        Args: { _driver_id: string; _pickup_id: string }
        Returns: {
          business_id: string
          created_at: string
          driver_id: string | null
          expires_at: string
          food_description: string
          id: string
          quantity: number
          shelter_id: string
          status: Database["public"]["Enums"]["pickup_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pickups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_driver_location: {
        Args: { _driver_id: string; _lat: number; _lng: number }
        Returns: {
          capacity: number
          id: string
          lat: number
          lng: number
          name: string
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          vehicle: Database["public"]["Enums"]["vehicle_type"]
        }
        SetofOptions: {
          from: "*"
          to: "drivers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      driver_status: "available" | "en_route" | "offline"
      pickup_status:
        | "pending"
        | "claimed"
        | "in_transit"
        | "delivered"
        | "expired"
      vehicle_type: "bike" | "car" | "van" | "truck"
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
      driver_status: ["available", "en_route", "offline"],
      pickup_status: [
        "pending",
        "claimed",
        "in_transit",
        "delivered",
        "expired",
      ],
      vehicle_type: ["bike", "car", "van", "truck"],
    },
  },
} as const
