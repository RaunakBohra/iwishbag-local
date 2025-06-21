export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      bank_account_details: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          created_at: string
          iban: string | null
          id: string
          is_active: boolean | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      country_settings: {
        Row: {
          additional_shipping: number | null
          additional_weight: number | null
          code: string
          created_at: string
          currency: string
          min_shipping: number | null
          name: string
          payment_gateway: string | null
          payment_gateway_fixed_fee: number | null
          payment_gateway_percent_fee: number | null
          purchase_allowed: boolean | null
          rate_from_usd: number
          sales_tax: number | null
          shipping_allowed: boolean | null
          updated_at: string
          vat: number | null
          volumetric_divisor: number | null
          weight_unit: string | null
        }
        Insert: {
          additional_shipping?: number | null
          additional_weight?: number | null
          code: string
          created_at?: string
          currency: string
          min_shipping?: number | null
          name: string
          payment_gateway?: string | null
          payment_gateway_fixed_fee?: number | null
          payment_gateway_percent_fee?: number | null
          purchase_allowed?: boolean | null
          rate_from_usd: number
          sales_tax?: number | null
          shipping_allowed?: boolean | null
          updated_at?: string
          vat?: number | null
          volumetric_divisor?: number | null
          weight_unit?: string | null
        }
        Update: {
          additional_shipping?: number | null
          additional_weight?: number | null
          code?: string
          created_at?: string
          currency?: string
          min_shipping?: number | null
          name?: string
          payment_gateway?: string | null
          payment_gateway_fixed_fee?: number | null
          payment_gateway_percent_fee?: number | null
          purchase_allowed?: boolean | null
          rate_from_usd?: number
          sales_tax?: number | null
          shipping_allowed?: boolean | null
          updated_at?: string
          vat?: number | null
          volumetric_divisor?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      customs_categories: {
        Row: {
          created_at: string
          duty_percent: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duty_percent?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duty_percent?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      footer_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          id: string
          social_links: Json | null
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          id?: string
          social_links?: Json | null
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          id?: string
          social_links?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      membership_tiers: {
        Row: {
          annual_price: number | null
          benefits: Json | null
          created_at: string
          description: string | null
          free_shipping_threshold: number | null
          id: string
          is_active: boolean | null
          monthly_price: number | null
          name: string
          priority_processing: boolean | null
          service_fee_discount: number | null
          updated_at: string
        }
        Insert: {
          annual_price?: number | null
          benefits?: Json | null
          created_at?: string
          description?: string | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          name: string
          priority_processing?: boolean | null
          service_fee_discount?: number | null
          updated_at?: string
        }
        Update: {
          annual_price?: number | null
          benefits?: Json | null
          created_at?: string
          description?: string | null
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          name?: string
          priority_processing?: boolean | null
          service_fee_discount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_file_name: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string | null
          quote_id: string | null
          recipient_id: string
          reply_to_message_id: string | null
          sender_email: string | null
          sender_id: string
          sender_name: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          attachment_file_name?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          quote_id?: string | null
          recipient_id: string
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id: string
          sender_name?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          attachment_file_name?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          quote_id?: string | null
          recipient_id?: string
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id?: string
          sender_name?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_order_updates: boolean | null
          email_promotions: boolean | null
          email_quote_updates: boolean | null
          id: string
          in_app_notifications: boolean | null
          sms_order_updates: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_order_updates?: boolean | null
          email_promotions?: boolean | null
          email_quote_updates?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          sms_order_updates?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_order_updates?: boolean | null
          email_promotions?: boolean | null
          email_quote_updates?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          sms_order_updates?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking_events: {
        Row: {
          actual_timestamp: string | null
          carrier: string | null
          created_at: string
          description: string | null
          estimated_delivery: string | null
          event_type: string
          id: string
          location: string | null
          quote_id: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          actual_timestamp?: string | null
          carrier?: string | null
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          event_type: string
          id?: string
          location?: string | null
          quote_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          actual_timestamp?: string | null
          carrier?: string | null
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          event_type?: string
          id?: string
          location?: string | null
          quote_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          code: string
          config: Json | null
          created_at: string
          fee_fixed: number | null
          fee_percent: number | null
          id: string
          is_active: boolean | null
          name: string
          supported_countries: string[] | null
          supported_currencies: string[] | null
          test_mode: boolean | null
          updated_at: string
        }
        Insert: {
          code: string
          config?: Json | null
          created_at?: string
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          supported_countries?: string[] | null
          supported_currencies?: string[] | null
          test_mode?: boolean | null
          updated_at?: string
        }
        Update: {
          code?: string
          config?: Json | null
          created_at?: string
          fee_fixed?: number | null
          fee_percent?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          supported_countries?: string[] | null
          supported_currencies?: string[] | null
          test_mode?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cod_enabled: boolean | null
          country: string
          created_at: string
          full_name: string | null
          id: string
          internal_notes: string | null
          phone: string | null
          preferred_display_currency: string
          referral_code: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cod_enabled?: boolean | null
          country?: string
          created_at?: string
          full_name?: string | null
          id: string
          internal_notes?: string | null
          phone?: string | null
          preferred_display_currency?: string
          referral_code?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cod_enabled?: boolean | null
          country?: string
          created_at?: string
          full_name?: string | null
          id?: string
          internal_notes?: string | null
          phone?: string | null
          preferred_display_currency?: string
          referral_code?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          item_currency: string
          item_price: number | null
          item_weight: number | null
          options: string | null
          product_name: string | null
          product_url: string | null
          quantity: number | null
          quote_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_currency: string
          item_price?: number | null
          item_weight?: number | null
          options?: string | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          quote_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_currency?: string
          item_price?: number | null
          item_weight?: number | null
          options?: string | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          quote_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approval_status:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at: string | null
          country_code: string | null
          created_at: string
          currency: string
          current_location: string | null
          customs_and_ecs: number | null
          customs_category_name: string | null
          discount: number | null
          display_id: string | null
          domestic_shipping: number | null
          email: string
          estimated_delivery_date: string | null
          exchange_rate: number | null
          final_currency: string | null
          final_total: number | null
          final_total_local: number | null
          handling_charge: number | null
          id: string
          image_url: string | null
          in_cart: boolean | null
          insurance_amount: number | null
          internal_notes: string | null
          international_shipping: number | null
          item_price: number | null
          item_weight: number | null
          items_currency: string | null
          last_tracking_update: string | null
          merchant_shipping_price: number | null
          options: string | null
          order_display_id: string | null
          paid_at: string | null
          payment_gateway_fee: number | null
          payment_method: string | null
          priority: Database["public"]["Enums"]["quote_priority"] | null
          product_name: string | null
          product_url: string | null
          quantity: number | null
          rejected_at: string | null
          rejection_details: string | null
          rejection_reason_id: string | null
          sales_tax_price: number | null
          shipped_at: string | null
          shipping_carrier: string | null
          status: Database["public"]["Enums"]["quote_status"] | null
          sub_total: number | null
          tracking_number: string | null
          updated_at: string
          user_id: string
          vat: number | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string
          current_location?: string | null
          customs_and_ecs?: number | null
          customs_category_name?: string | null
          discount?: number | null
          display_id?: string | null
          domestic_shipping?: number | null
          email: string
          estimated_delivery_date?: string | null
          exchange_rate?: number | null
          final_currency?: string | null
          final_total?: number | null
          final_total_local?: number | null
          handling_charge?: number | null
          id?: string
          image_url?: string | null
          in_cart?: boolean | null
          insurance_amount?: number | null
          internal_notes?: string | null
          international_shipping?: number | null
          item_price?: number | null
          item_weight?: number | null
          items_currency?: string | null
          last_tracking_update?: string | null
          merchant_shipping_price?: number | null
          options?: string | null
          order_display_id?: string | null
          paid_at?: string | null
          payment_gateway_fee?: number | null
          payment_method?: string | null
          priority?: Database["public"]["Enums"]["quote_priority"] | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          rejected_at?: string | null
          rejection_details?: string | null
          rejection_reason_id?: string | null
          sales_tax_price?: number | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          sub_total?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          vat?: number | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string
          current_location?: string | null
          customs_and_ecs?: number | null
          customs_category_name?: string | null
          discount?: number | null
          display_id?: string | null
          domestic_shipping?: number | null
          email?: string
          estimated_delivery_date?: string | null
          exchange_rate?: number | null
          final_currency?: string | null
          final_total?: number | null
          final_total_local?: number | null
          handling_charge?: number | null
          id?: string
          image_url?: string | null
          in_cart?: boolean | null
          insurance_amount?: number | null
          internal_notes?: string | null
          international_shipping?: number | null
          item_price?: number | null
          item_weight?: number | null
          items_currency?: string | null
          last_tracking_update?: string | null
          merchant_shipping_price?: number | null
          options?: string | null
          order_display_id?: string | null
          paid_at?: string | null
          payment_gateway_fee?: number | null
          payment_method?: string | null
          priority?: Database["public"]["Enums"]["quote_priority"] | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          rejected_at?: string | null
          rejection_details?: string | null
          rejection_reason_id?: string | null
          sales_tax_price?: number | null
          shipped_at?: string | null
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          sub_total?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_settings"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quotes_customs_category_name_fkey"
            columns: ["customs_category_name"]
            isOneToOne: false
            referencedRelation: "customs_categories"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "quotes_rejection_reason_id_fkey"
            columns: ["rejection_reason_id"]
            isOneToOne: false
            referencedRelation: "rejection_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          name: string
          reward_type: string
          reward_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          name: string
          reward_type: string
          reward_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          name?: string
          reward_type?: string
          reward_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referee_id: string | null
          referral_code: string
          referred_at: string
          referrer_id: string | null
          reward_amount: number | null
          reward_currency: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string | null
          referral_code: string
          referred_at?: string
          referrer_id?: string | null
          reward_amount?: number | null
          reward_currency?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string | null
          referral_code?: string
          referred_at?: string
          referrer_id?: string | null
          reward_amount?: number | null
          reward_currency?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rejection_reasons: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          reason: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          reason: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      tracking_templates: {
        Row: {
          carrier: string | null
          country_from: string
          country_to: string
          created_at: string
          estimated_days: number | null
          id: string
          name: string
          template_steps: Json
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          country_from: string
          country_to: string
          created_at?: string
          estimated_days?: number | null
          id?: string
          name: string
          template_steps: Json
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          country_from?: string
          country_to?: string
          created_at?: string
          estimated_days?: number | null
          id?: string
          name?: string
          template_steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
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
    }
    Enums: {
      app_role: "admin" | "user" | "moderator"
      quote_approval_status: "pending" | "approved" | "rejected"
      quote_priority: "low" | "normal" | "high" | "urgent"
      quote_status:
        | "pending"
        | "calculated"
        | "sent"
        | "accepted"
        | "paid"
        | "ordered"
        | "shipped"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user", "moderator"],
      quote_approval_status: ["pending", "approved", "rejected"],
      quote_priority: ["low", "normal", "high", "urgent"],
      quote_status: [
        "pending",
        "calculated",
        "sent",
        "accepted",
        "paid",
        "ordered",
        "shipped",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

