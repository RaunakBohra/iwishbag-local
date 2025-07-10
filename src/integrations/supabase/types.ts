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
          query?: string
          variables?: Json
          extensions?: Json
          operationName?: string
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
      bank_account_details: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          country_code: string | null
          created_at: string
          custom_fields: Json | null
          display_order: number | null
          field_labels: Json | null
          iban: string | null
          id: string
          is_active: boolean | null
          is_fallback: boolean | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          country_code?: string | null
          created_at?: string
          custom_fields?: Json | null
          display_order?: number | null
          field_labels?: Json | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_fallback?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          country_code?: string | null
          created_at?: string
          custom_fields?: Json | null
          display_order?: number | null
          field_labels?: Json | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_fallback?: boolean | null
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_account_details_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_settings"
            referencedColumns: ["code"]
          },
        ]
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
          priority_thresholds: Json | null
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
          priority_thresholds?: Json | null
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
          priority_thresholds?: Json | null
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
          duty_percent: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duty_percent?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duty_percent?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customs_rules: {
        Row: {
          actions: Json
          advanced: Json | null
          conditions: Json
          created_at: string | null
          destination_country: string | null
          id: string
          is_active: boolean | null
          name: string
          origin_country: string | null
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          actions: Json
          advanced?: Json | null
          conditions: Json
          created_at?: string | null
          destination_country?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          origin_country?: string | null
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          advanced?: Json | null
          conditions?: Json
          created_at?: string | null
          destination_country?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          origin_country?: string | null
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_settings: {
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
      manual_analysis_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          notes: string | null
          priority: string | null
          quote_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          quote_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          quote_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_analysis_tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
          recipient_id: string | null
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
          recipient_id?: string | null
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
          recipient_id?: string | null
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
      payment_gateways: {
        Row: {
          code: string
          config: Json | null
          created_at: string
          description: string | null
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
          description?: string | null
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
          description?: string | null
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
      payment_records: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          quote_id: string | null
          recorded_by: string | null
          reference_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          quote_id?: string | null
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          quote_id?: string | null
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          created_at: string | null
          id: string
          quote_id: string | null
          reminder_type: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          quote_id?: string | null
          reminder_type: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          quote_id?: string | null
          reminder_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          gateway_response: Json | null
          id: string
          payment_method: string | null
          quote_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          gateway_response?: Json | null
          id?: string
          payment_method?: string | null
          quote_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          gateway_response?: Json | null
          id?: string
          payment_method?: string | null
          quote_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cod_enabled: boolean | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          internal_notes: string | null
          phone: string | null
          preferred_display_currency: string | null
          referral_code: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cod_enabled?: boolean | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          internal_notes?: string | null
          phone?: string | null
          preferred_display_currency?: string | null
          referral_code?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cod_enabled?: boolean | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          internal_notes?: string | null
          phone?: string | null
          preferred_display_currency?: string | null
          referral_code?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_address_history: {
        Row: {
          change_reason: string | null
          change_type: string | null
          changed_at: string | null
          changed_by: string | null
          id: number
          new_address: Json
          old_address: Json | null
          quote_id: string
        }
        Insert: {
          change_reason?: string | null
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: number
          new_address: Json
          old_address?: Json | null
          quote_id: string
        }
        Update: {
          change_reason?: string | null
          change_type?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: number
          new_address?: Json
          old_address?: Json | null
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_address_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_address_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_size: number
          file_url: string
          id: string
          is_customer_visible: boolean
          quote_id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          file_name: string
          file_size: number
          file_url: string
          id?: string
          is_customer_visible?: boolean
          quote_id: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          is_customer_visible?: boolean
          quote_id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_documents_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string | null
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
      quote_statuses: {
        Row: {
          color: string | null
          icon: string | null
          id: number
          is_active: boolean | null
          label: string
          value: string
        }
        Insert: {
          color?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          label: string
          value: string
        }
        Update: {
          color?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          label?: string
          value?: string
        }
        Relationships: []
      }
      quote_templates: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          item_price: number | null
          item_weight: number | null
          options: string | null
          product_name: string | null
          product_url: string | null
          quantity: number | null
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          item_price?: number | null
          item_weight?: number | null
          options?: string | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          item_price?: number | null
          item_weight?: number | null
          options?: string | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          address_locked: boolean | null
          address_updated_at: string | null
          address_updated_by: string | null
          admin_notes: string | null
          amount_paid: number | null
          approval_status:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at: string | null
          breakdown: Json | null
          calculated_at: string | null
          created_at: string
          currency: string
          current_location: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          customs_and_ecs: number | null
          customs_category_name: string | null
          customs_percentage: number | null
          delivered_at: string | null
          destination_country: string | null
          discount: number | null
          display_id: string | null
          domestic_shipping: number | null
          email: string | null
          enabled_delivery_options: Json | null
          estimated_delivery_date: string | null
          exchange_rate: number | null
          expires_at: string | null
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
          is_anonymous: boolean | null
          item_price: number | null
          item_weight: number | null
          items_currency: string | null
          last_tracking_update: string | null
          merchant_shipping_price: number | null
          options: string | null
          order_display_id: string | null
          ordered_at: string | null
          origin_country: string | null
          overpayment_amount: number | null
          paid_at: string | null
          payment_gateway_fee: number | null
          payment_method: string | null
          payment_reminder_count: number | null
          payment_reminder_sent_at: string | null
          payment_status: string | null
          priority: Database["public"]["Enums"]["quote_priority"] | null
          priority_auto: boolean | null
          product_name: string | null
          product_url: string | null
          quantity: number | null
          quote_source: string | null
          rejected_at: string | null
          rejection_details: string | null
          rejection_reason_id: string | null
          sales_tax_price: number | null
          sent_at: string | null
          share_token: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_carrier: string | null
          shipping_delivery_days: string | null
          shipping_method: string | null
          shipping_route_id: number | null
          social_handle: string | null
          status: string | null
          sub_total: number | null
          tracking_number: string | null
          updated_at: string
          user_id: string | null
          vat: number | null
        }
        Insert: {
          address_locked?: boolean | null
          address_updated_at?: string | null
          address_updated_by?: string | null
          admin_notes?: string | null
          amount_paid?: number | null
          approval_status?:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at?: string | null
          breakdown?: Json | null
          calculated_at?: string | null
          created_at?: string
          currency?: string
          current_location?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          customs_and_ecs?: number | null
          customs_category_name?: string | null
          customs_percentage?: number | null
          delivered_at?: string | null
          destination_country?: string | null
          discount?: number | null
          display_id?: string | null
          domestic_shipping?: number | null
          email?: string | null
          enabled_delivery_options?: Json | null
          estimated_delivery_date?: string | null
          exchange_rate?: number | null
          expires_at?: string | null
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
          is_anonymous?: boolean | null
          item_price?: number | null
          item_weight?: number | null
          items_currency?: string | null
          last_tracking_update?: string | null
          merchant_shipping_price?: number | null
          options?: string | null
          order_display_id?: string | null
          ordered_at?: string | null
          origin_country?: string | null
          overpayment_amount?: number | null
          paid_at?: string | null
          payment_gateway_fee?: number | null
          payment_method?: string | null
          payment_reminder_count?: number | null
          payment_reminder_sent_at?: string | null
          payment_status?: string | null
          priority?: Database["public"]["Enums"]["quote_priority"] | null
          priority_auto?: boolean | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          quote_source?: string | null
          rejected_at?: string | null
          rejection_details?: string | null
          rejection_reason_id?: string | null
          sales_tax_price?: number | null
          sent_at?: string | null
          share_token?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_delivery_days?: string | null
          shipping_method?: string | null
          shipping_route_id?: number | null
          social_handle?: string | null
          status?: string | null
          sub_total?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          vat?: number | null
        }
        Update: {
          address_locked?: boolean | null
          address_updated_at?: string | null
          address_updated_by?: string | null
          admin_notes?: string | null
          amount_paid?: number | null
          approval_status?:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at?: string | null
          breakdown?: Json | null
          calculated_at?: string | null
          created_at?: string
          currency?: string
          current_location?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          customs_and_ecs?: number | null
          customs_category_name?: string | null
          customs_percentage?: number | null
          delivered_at?: string | null
          destination_country?: string | null
          discount?: number | null
          display_id?: string | null
          domestic_shipping?: number | null
          email?: string | null
          enabled_delivery_options?: Json | null
          estimated_delivery_date?: string | null
          exchange_rate?: number | null
          expires_at?: string | null
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
          is_anonymous?: boolean | null
          item_price?: number | null
          item_weight?: number | null
          items_currency?: string | null
          last_tracking_update?: string | null
          merchant_shipping_price?: number | null
          options?: string | null
          order_display_id?: string | null
          ordered_at?: string | null
          origin_country?: string | null
          overpayment_amount?: number | null
          paid_at?: string | null
          payment_gateway_fee?: number | null
          payment_method?: string | null
          payment_reminder_count?: number | null
          payment_reminder_sent_at?: string | null
          payment_status?: string | null
          priority?: Database["public"]["Enums"]["quote_priority"] | null
          priority_auto?: boolean | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
          quote_source?: string | null
          rejected_at?: string | null
          rejection_details?: string | null
          rejection_reason_id?: string | null
          sales_tax_price?: number | null
          sent_at?: string | null
          share_token?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_delivery_days?: string | null
          shipping_method?: string | null
          shipping_route_id?: number | null
          social_handle?: string | null
          status?: string | null
          sub_total?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          vat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_country_code_fkey"
            columns: ["destination_country"]
            isOneToOne: false
            referencedRelation: "country_settings"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quotes_shipping_route_id_fkey"
            columns: ["shipping_route_id"]
            isOneToOne: false
            referencedRelation: "shipping_routes"
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
      route_customs_tiers: {
        Row: {
          created_at: string | null
          customs_percentage: number
          description: string | null
          destination_country: string
          id: string
          is_active: boolean
          logic_type: string
          origin_country: string
          price_max: number | null
          price_min: number | null
          priority_order: number
          rule_name: string
          updated_at: string | null
          vat_percentage: number
          weight_max: number | null
          weight_min: number | null
        }
        Insert: {
          created_at?: string | null
          customs_percentage: number
          description?: string | null
          destination_country: string
          id?: string
          is_active?: boolean
          logic_type: string
          origin_country: string
          price_max?: number | null
          price_min?: number | null
          priority_order?: number
          rule_name: string
          updated_at?: string | null
          vat_percentage: number
          weight_max?: number | null
          weight_min?: number | null
        }
        Update: {
          created_at?: string | null
          customs_percentage?: number
          description?: string | null
          destination_country?: string
          id?: string
          is_active?: boolean
          logic_type?: string
          origin_country?: string
          price_max?: number | null
          price_min?: number | null
          priority_order?: number
          rule_name?: string
          updated_at?: string | null
          vat_percentage?: number
          weight_max?: number | null
          weight_min?: number | null
        }
        Relationships: []
      }
      shipping_routes: {
        Row: {
          active: boolean | null
          base_shipping_cost: number
          carriers: Json | null
          cost_per_kg: number
          cost_percentage: number | null
          created_at: string | null
          customs_clearance_days: number | null
          delivery_options: Json | null
          destination_country: string
          exchange_rate: number | null
          id: number
          is_active: boolean | null
          max_weight: number | null
          origin_country: string
          processing_days: number | null
          requires_documentation: boolean | null
          restricted_items: string[] | null
          shipping_per_kg: number | null
          updated_at: string | null
          weight_tiers: Json | null
          weight_unit: string
        }
        Insert: {
          active?: boolean | null
          base_shipping_cost: number
          carriers?: Json | null
          cost_per_kg: number
          cost_percentage?: number | null
          created_at?: string | null
          customs_clearance_days?: number | null
          delivery_options?: Json | null
          destination_country: string
          exchange_rate?: number | null
          id?: number
          is_active?: boolean | null
          max_weight?: number | null
          origin_country: string
          processing_days?: number | null
          requires_documentation?: boolean | null
          restricted_items?: string[] | null
          shipping_per_kg?: number | null
          updated_at?: string | null
          weight_tiers?: Json | null
          weight_unit?: string
        }
        Update: {
          active?: boolean | null
          base_shipping_cost?: number
          carriers?: Json | null
          cost_per_kg?: number
          cost_percentage?: number | null
          created_at?: string | null
          customs_clearance_days?: number | null
          delivery_options?: Json | null
          destination_country?: string
          exchange_rate?: number | null
          id?: number
          is_active?: boolean | null
          max_weight?: number | null
          origin_country?: string
          processing_days?: number | null
          requires_documentation?: boolean | null
          restricted_items?: string[] | null
          shipping_per_kg?: number | null
          updated_at?: string | null
          weight_tiers?: Json | null
          weight_unit?: string
        }
        Relationships: []
      }
      status_transitions: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string
          id: string
          metadata: Json | null
          quote_id: string
          to_status: string
          trigger: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status: string
          id?: string
          metadata?: Json | null
          quote_id: string
          to_status: string
          trigger: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string
          id?: string
          metadata?: Json | null
          quote_id?: string
          to_status?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_transitions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
      user_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          country_code: string | null
          created_at: string
          destination_country: string | null
          id: string
          is_default: boolean | null
          phone: string | null
          postal_code: string
          recipient_name: string | null
          state_province_region: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country: string
          country_code?: string | null
          created_at?: string
          destination_country?: string | null
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postal_code: string
          recipient_name?: string | null
          state_province_region: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          country_code?: string | null
          created_at?: string
          destination_country?: string | null
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postal_code?: string
          recipient_name?: string | null
          state_province_region?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      ensure_user_profile: {
        Args: { _user_id: string }
        Returns: boolean
      }
      expire_quotes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_all_user_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          source: string
          email: string
          full_name: string
        }[]
      }
      get_shipping_cost: {
        Args: {
          p_destination_country: string
          p_weight: number
          p_price?: number
          p_origin_country: string
        }
        Returns: {
          carrier: string
          delivery_days: string
          cost: number
          method: string
        }[]
      }
      get_user_bank_accounts: {
        Args: { user_id: string }
        Returns: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          country_code: string | null
          created_at: string
          custom_fields: Json | null
          display_order: number | null
          field_labels: Json | null
          iban: string | null
          id: string
          is_active: boolean | null
          is_fallback: boolean | null
          swift_code: string | null
          updated_at: string
        }[]
      }
      has_any_role: {
        Args: { roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      lock_address_after_payment: {
        Args: { quote_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator"
      quote_approval_status: "pending" | "approved" | "rejected"
      quote_priority: "low" | "normal" | "high" | "urgent"
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
    },
  },
} as const

