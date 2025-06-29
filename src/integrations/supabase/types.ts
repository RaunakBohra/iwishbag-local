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
<<<<<<< HEAD
          variables?: Json
          extensions?: Json
          query?: string
          operationName?: string
=======
          operationName?: string
          extensions?: Json
          variables?: Json
          query?: string
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
      auto_quote_analytics: {
        Row: {
          created_at: string | null
          id: string
          processing_time: number | null
          quote_id: string | null
          rule_performance: Json
          success_rate: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          processing_time?: number | null
          quote_id?: string | null
          rule_performance: Json
          success_rate?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          processing_time?: number | null
          quote_id?: string | null
          rule_performance?: Json
          success_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_quote_analytics_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_quote_settings: {
        Row: {
          auto_approval_limit: number | null
          confidence_threshold: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          markup_percentage: number | null
          name: string
          price_validation: string | null
          requires_admin_review: boolean | null
          updated_at: string | null
          website_domain: string
          weight_estimation_method: string | null
        }
        Insert: {
          auto_approval_limit?: number | null
          confidence_threshold?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          markup_percentage?: number | null
          name: string
          price_validation?: string | null
          requires_admin_review?: boolean | null
          updated_at?: string | null
          website_domain: string
          weight_estimation_method?: string | null
        }
        Update: {
          auto_approval_limit?: number | null
          confidence_threshold?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          markup_percentage?: number | null
          name?: string
          price_validation?: string | null
          requires_admin_review?: boolean | null
          updated_at?: string | null
          website_domain?: string
          weight_estimation_method?: string | null
        }
        Relationships: []
      }
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
      customs_rules: {
        Row: {
          actions: Json
          advanced: Json | null
          conditions: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          actions: Json
          advanced?: Json | null
          conditions: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          advanced?: Json | null
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
          business_hours: string | null
          company_description: string | null
          company_name: string | null
          contact_email: string | null
          created_at: string
          hero_banner_url: string | null
          hero_cta_link: string | null
          hero_cta_text: string | null
          hero_headline: string | null
          hero_subheadline: string | null
          how_it_works_steps: Json | null
          id: string
          primary_address: string | null
          primary_email: string | null
          primary_phone: string | null
          secondary_address: string | null
          secondary_phone: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_links: Json | null
          social_twitter: string | null
          support_email: string | null
          updated_at: string
          value_props: Json | null
          website_logo_url: string | null
        }
        Insert: {
          business_hours?: string | null
          company_description?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          hero_banner_url?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          how_it_works_steps?: Json | null
          id?: string
          primary_address?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          secondary_address?: string | null
          secondary_phone?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_links?: Json | null
          social_twitter?: string | null
          support_email?: string | null
          updated_at?: string
          value_props?: Json | null
          website_logo_url?: string | null
        }
        Update: {
          business_hours?: string | null
          company_description?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          hero_banner_url?: string | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          how_it_works_steps?: Json | null
          id?: string
          primary_address?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          secondary_address?: string | null
          secondary_phone?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_links?: Json | null
          social_twitter?: string | null
          support_email?: string | null
          updated_at?: string
          value_props?: Json | null
          website_logo_url?: string | null
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
      order_workflow_steps: {
        Row: {
          country_specific: string[] | null
          created_at: string
          description: string | null
          estimated_duration_hours: number | null
          id: string
          is_customer_visible: boolean | null
          name: string
          order_position: number
          requires_admin_action: boolean | null
          updated_at: string
        }
        Insert: {
          country_specific?: string[] | null
          created_at?: string
          description?: string | null
          estimated_duration_hours?: number | null
          id?: string
          is_customer_visible?: boolean | null
          name: string
          order_position: number
          requires_admin_action?: boolean | null
          updated_at?: string
        }
        Update: {
          country_specific?: string[] | null
          created_at?: string
          description?: string | null
          estimated_duration_hours?: number | null
          id?: string
          is_customer_visible?: boolean | null
          name?: string
          order_position?: number
          requires_admin_action?: boolean | null
          updated_at?: string
        }
        Relationships: []
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
<<<<<<< HEAD
      pricing_rules: {
        Row: {
          actions: Json
          advanced: Json | null
          conditions: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          actions: Json
          advanced?: Json | null
          conditions: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          advanced?: Json | null
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
      profiles: {
        Row: {
          avatar_url: string | null
          cod_enabled: boolean | null
          country: string
          created_at: string
<<<<<<< HEAD
          email: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          email?: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          email?: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
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
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          address_locked: boolean | null
          address_updated_at: string | null
          address_updated_by: string | null
          applied_rules: Json | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          approval_status:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at: string | null
<<<<<<< HEAD
          confidence_score: number | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          enabled_delivery_options: Json | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          origin_country: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          paid_at: string | null
          payment_gateway_fee: number | null
          payment_method: string | null
          priority: Database["public"]["Enums"]["quote_priority"] | null
          product_name: string | null
          product_url: string | null
          quantity: number | null
<<<<<<< HEAD
          quote_type: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          rejected_at: string | null
          rejection_details: string | null
          rejection_reason_id: string | null
          sales_tax_price: number | null
<<<<<<< HEAD
          scraped_data: Json | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_carrier: string | null
          shipping_method: string | null
          shipping_route_id: number | null
=======
          shipped_at: string | null
          shipping_carrier: string | null
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          status: Database["public"]["Enums"]["quote_status"] | null
          sub_total: number | null
          tracking_number: string | null
          updated_at: string
          user_id: string
          vat: number | null
        }
        Insert: {
<<<<<<< HEAD
          address_locked?: boolean | null
          address_updated_at?: string | null
          address_updated_by?: string | null
          applied_rules?: Json | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          approval_status?:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at?: string | null
<<<<<<< HEAD
          confidence_score?: number | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          enabled_delivery_options?: Json | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          origin_country?: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          paid_at?: string | null
          payment_gateway_fee?: number | null
          payment_method?: string | null
          priority?: Database["public"]["Enums"]["quote_priority"] | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
<<<<<<< HEAD
          quote_type?: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          rejected_at?: string | null
          rejection_details?: string | null
          rejection_reason_id?: string | null
          sales_tax_price?: number | null
<<<<<<< HEAD
          scraped_data?: Json | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_method?: string | null
          shipping_route_id?: number | null
=======
          shipped_at?: string | null
          shipping_carrier?: string | null
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          status?: Database["public"]["Enums"]["quote_status"] | null
          sub_total?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
          vat?: number | null
        }
        Update: {
<<<<<<< HEAD
          address_locked?: boolean | null
          address_updated_at?: string | null
          address_updated_by?: string | null
          applied_rules?: Json | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          approval_status?:
            | Database["public"]["Enums"]["quote_approval_status"]
            | null
          approved_at?: string | null
<<<<<<< HEAD
          confidence_score?: number | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          enabled_delivery_options?: Json | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
          origin_country?: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          paid_at?: string | null
          payment_gateway_fee?: number | null
          payment_method?: string | null
          priority?: Database["public"]["Enums"]["quote_priority"] | null
          product_name?: string | null
          product_url?: string | null
          quantity?: number | null
<<<<<<< HEAD
          quote_type?: string | null
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          rejected_at?: string | null
          rejection_details?: string | null
          rejection_reason_id?: string | null
          sales_tax_price?: number | null
<<<<<<< HEAD
          scraped_data?: Json | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_method?: string | null
          shipping_route_id?: number | null
=======
          shipped_at?: string | null
          shipping_carrier?: string | null
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
          status?: Database["public"]["Enums"]["quote_status"] | null
          sub_total?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
          vat?: number | null
        }
        Relationships: [
          {
<<<<<<< HEAD
            foreignKeyName: "quotes_address_updated_by_fkey"
            columns: ["address_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
            foreignKeyName: "quotes_shipping_route_id_fkey"
            columns: ["shipping_route_id"]
            isOneToOne: false
            referencedRelation: "shipping_routes"
            referencedColumns: ["id"]
          },
          {
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
<<<<<<< HEAD
      shipping_routes: {
        Row: {
          base_shipping_cost: number
          carriers: Json | null
          cost_per_kg: number
          cost_percentage: number | null
          created_at: string | null
          destination_country: string
          id: number
          is_active: boolean | null
          max_weight: number | null
          origin_country: string
          requires_documentation: boolean | null
          restricted_items: string[] | null
          updated_at: string | null
          weight_tiers: Json | null
          weight_unit: string
        }
        Insert: {
          base_shipping_cost: number
          carriers?: Json | null
          cost_per_kg: number
          cost_percentage?: number | null
          created_at?: string | null
          destination_country: string
          id?: number
          is_active?: boolean | null
          max_weight?: number | null
          origin_country: string
          requires_documentation?: boolean | null
          restricted_items?: string[] | null
          updated_at?: string | null
          weight_tiers?: Json | null
          weight_unit?: string
        }
        Update: {
          base_shipping_cost?: number
          carriers?: Json | null
          cost_per_kg?: number
          cost_percentage?: number | null
          created_at?: string | null
          destination_country?: string
          id?: number
          is_active?: boolean | null
          max_weight?: number | null
          origin_country?: string
          requires_documentation?: boolean | null
          restricted_items?: string[] | null
          updated_at?: string | null
          weight_tiers?: Json | null
          weight_unit?: string
        }
        Relationships: []
      }
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
      user_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          country_code: string | null
          created_at: string
          id: string
          is_default: boolean | null
<<<<<<< HEAD
          phone: string | null
          postal_code: string
          recipient_name: string | null
=======
          postal_code: string
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
          id?: string
          is_default?: boolean | null
<<<<<<< HEAD
          phone?: string | null
          postal_code: string
          recipient_name?: string | null
=======
          postal_code: string
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
          id?: string
          is_default?: boolean | null
<<<<<<< HEAD
          phone?: string | null
          postal_code?: string
          recipient_name?: string | null
=======
          postal_code?: string
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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
      user_memberships: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string | null
          stripe_subscription_id: string | null
          tier_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_subscription_id?: string | null
          tier_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_fkey"
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
      user_wishlist_items: {
        Row: {
          category: string | null
          created_at: string
          currency: string | null
          estimated_price: number | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          notes: string | null
          product_name: string | null
          product_url: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string | null
          estimated_price?: number | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          notes?: string | null
          product_name?: string | null
          product_url: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string | null
          estimated_price?: number | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          notes?: string | null
          product_name?: string | null
          product_url?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_wishlist_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
<<<<<<< HEAD
      website_scraping_rules: {
        Row: {
          created_at: string | null
          id: string
          price_extraction: Json
          selectors: Json
          updated_at: string | null
          validation_rules: Json
          website_domain: string
          weight_extraction: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          price_extraction: Json
          selectors: Json
          updated_at?: string | null
          validation_rules: Json
          website_domain: string
          weight_extraction: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          price_extraction?: Json
          selectors?: Json
          updated_at?: string | null
          validation_rules?: Json
          website_domain?: string
          weight_extraction?: Json
        }
        Relationships: []
      }
      weight_rules: {
        Row: {
          actions: Json
          advanced: Json | null
          conditions: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          actions: Json
          advanced?: Json | null
          conditions: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          advanced?: Json | null
          conditions?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
=======
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_user_profile: {
        Args: { _user_id: string }
        Returns: boolean
      }
<<<<<<< HEAD
      get_shipping_cost: {
        Args: {
          p_origin_country: string
          p_destination_country: string
          p_weight: number
          p_price?: number
        }
        Returns: {
          cost: number
          method: string
          delivery_days: string
          carrier: string
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      lock_address_after_payment: {
        Args: { quote_uuid: string }
        Returns: boolean
      }
=======
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
>>>>>>> ed4ff60d414419cde21cca73f742c35e0184a312
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

