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
      crm_contacts: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          lat: number | null
          linkedin_url: string | null
          lng: number | null
          phone: string | null
          state: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lat?: number | null
          linkedin_url?: string | null
          lng?: number | null
          phone?: string | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lat?: number | null
          linkedin_url?: string | null
          lng?: number | null
          phone?: string | null
          state?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      permits: {
        Row: {
          business_name: string | null
          created_at: string
          description: string | null
          effective_date: string | null
          fees: number | null
          home_owner: string | null
          id: string
          job_value: number | null
          permit_number: string | null
          permit_type: string | null
          property_address: string
          property_id: string | null
          status: string | null
          sub_type: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          fees?: number | null
          home_owner?: string | null
          id?: string
          job_value?: number | null
          permit_number?: string | null
          permit_type?: string | null
          property_address: string
          property_id?: string | null
          status?: string | null
          sub_type?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          description?: string | null
          effective_date?: string | null
          fees?: number | null
          home_owner?: string | null
          id?: string
          job_value?: number | null
          permit_number?: string | null
          permit_type?: string | null
          property_address?: string
          property_id?: string | null
          status?: string | null
          sub_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          apn: string | null
          assessed_value: number | null
          baths: number | null
          beds: number | null
          building_description: string | null
          city: string | null
          county: string | null
          created_at: string
          data_source: string
          deed_book: string | null
          deed_page: string | null
          gis_pin: string | null
          id: string
          improvement_value: number | null
          land_description: string | null
          land_value: number | null
          last_sale_date: string | null
          last_sale_price: number | null
          lat: number | null
          lng: number | null
          lot_size: string | null
          lot_size_acres: number | null
          market_value: number | null
          municipality: string | null
          net_value: number | null
          no_of_units: number | null
          owner_name: string | null
          owner_type: string | null
          permit_count: number | null
          permit_details: string | null
          property_class: string | null
          sq_ft: number | null
          state: string | null
          street_address: string | null
          street_city: string | null
          street_state: string | null
          street_zip: string | null
          tax_bill: number | null
          year_built: number | null
          zip: string | null
          zoning: string | null
        }
        Insert: {
          address: string
          apn?: string | null
          assessed_value?: number | null
          baths?: number | null
          beds?: number | null
          building_description?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          data_source: string
          deed_book?: string | null
          deed_page?: string | null
          gis_pin?: string | null
          id?: string
          improvement_value?: number | null
          land_description?: string | null
          land_value?: number | null
          last_sale_date?: string | null
          last_sale_price?: number | null
          lat?: number | null
          lng?: number | null
          lot_size?: string | null
          lot_size_acres?: number | null
          market_value?: number | null
          municipality?: string | null
          net_value?: number | null
          no_of_units?: number | null
          owner_name?: string | null
          owner_type?: string | null
          permit_count?: number | null
          permit_details?: string | null
          property_class?: string | null
          sq_ft?: number | null
          state?: string | null
          street_address?: string | null
          street_city?: string | null
          street_state?: string | null
          street_zip?: string | null
          tax_bill?: number | null
          year_built?: number | null
          zip?: string | null
          zoning?: string | null
        }
        Update: {
          address?: string
          apn?: string | null
          assessed_value?: number | null
          baths?: number | null
          beds?: number | null
          building_description?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          data_source?: string
          deed_book?: string | null
          deed_page?: string | null
          gis_pin?: string | null
          id?: string
          improvement_value?: number | null
          land_description?: string | null
          land_value?: number | null
          last_sale_date?: string | null
          last_sale_price?: number | null
          lat?: number | null
          lng?: number | null
          lot_size?: string | null
          lot_size_acres?: number | null
          market_value?: number | null
          municipality?: string | null
          net_value?: number | null
          no_of_units?: number | null
          owner_name?: string | null
          owner_type?: string | null
          permit_count?: number | null
          permit_details?: string | null
          property_class?: string | null
          sq_ft?: number | null
          state?: string | null
          street_address?: string | null
          street_city?: string | null
          street_state?: string | null
          street_zip?: string | null
          tax_bill?: number | null
          year_built?: number | null
          zip?: string | null
          zoning?: string | null
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          property_id: string | null
          source: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          property_id?: string | null
          source?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          property_id?: string | null
          source?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string
          description: string | null
          filters: Json
          id: string
          map_state: Json
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          map_state?: Json
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          map_state?: Json
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          action: string
          created_at: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          payload?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
