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
      abuse_attempts: {
        Row: {
          abuse_type: string
          block_duration: number | null
          created_at: string | null
          customer_id: string | null
          details: Json
          detected_at: string | null
          id: string
          ip_address: unknown | null
          notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          response_action: string
          session_id: string
          severity: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          abuse_type: string
          block_duration?: number | null
          created_at?: string | null
          customer_id?: string | null
          details?: Json
          detected_at?: string | null
          id?: string
          ip_address?: unknown | null
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          response_action: string
          session_id: string
          severity: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          abuse_type?: string
          block_duration?: number | null
          created_at?: string | null
          customer_id?: string | null
          details?: Json
          detected_at?: string | null
          id?: string
          ip_address?: unknown | null
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          response_action?: string
          session_id?: string
          severity?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      abuse_patterns: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          metadata: Json | null
          pattern_type: string
          response_action: string
          threshold: number
          time_window_minutes: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          metadata?: Json | null
          pattern_type: string
          response_action: string
          threshold: number
          time_window_minutes: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          metadata?: Json | null
          pattern_type?: string
          response_action?: string
          threshold?: number
          time_window_minutes?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      abuse_responses: {
        Row: {
          abuse_attempt_id: string | null
          action_type: string
          applied_at: string | null
          automated: boolean | null
          created_at: string | null
          duration_minutes: number | null
          escalation_level: string
          expires_at: string | null
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          abuse_attempt_id?: string | null
          action_type: string
          applied_at?: string | null
          automated?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          escalation_level: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          abuse_attempt_id?: string | null
          action_type?: string
          applied_at?: string | null
          automated?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          escalation_level?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_responses_abuse_attempt_id_fkey"
            columns: ["abuse_attempt_id"]
            isOneToOne: false
            referencedRelation: "abuse_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      active_blocks: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          block_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          reason: string
          target_type: string
          target_value: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          block_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason: string
          target_type: string
          target_value: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          block_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          target_type?: string
          target_value?: string
        }
        Relationships: []
      }
      addon_services: {
        Row: {
          badge_text: string | null
          business_rules: Json | null
          created_at: string
          default_rate: number
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean
          is_default_enabled: boolean | null
          max_amount: number | null
          min_amount: number | null
          pricing_type: string
          requires_order_value: boolean | null
          service_category: string
          service_description: string | null
          service_key: string
          service_name: string
          supported_order_types: string[] | null
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          business_rules?: Json | null
          created_at?: string
          default_rate?: number
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_default_enabled?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          pricing_type?: string
          requires_order_value?: boolean | null
          service_category?: string
          service_description?: string | null
          service_key: string
          service_name: string
          supported_order_types?: string[] | null
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          business_rules?: Json | null
          created_at?: string
          default_rate?: number
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_default_enabled?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          pricing_type?: string
          requires_order_value?: boolean | null
          service_category?: string
          service_description?: string | null
          service_key?: string
          service_name?: string
          supported_order_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_overrides: {
        Row: {
          admin_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          justification: string | null
          override_data: Json
          override_type: string
          scope: string
          scope_identifier: string | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          justification?: string | null
          override_data?: Json
          override_type: string
          scope: string
          scope_identifier?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          justification?: string | null
          override_data?: Json
          override_type?: string
          scope?: string
          scope_identifier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_account_details: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          country_code: string | null
          created_at: string
          currency_code: string | null
          custom_fields: Json | null
          destination_country: string | null
          display_order: number | null
          field_labels: Json | null
          iban: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_fallback: boolean | null
          payment_qr_url: string | null
          swift_code: string | null
          updated_at: string
          upi_id: string | null
          upi_qr_string: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name?: string | null
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          custom_fields?: Json | null
          destination_country?: string | null
          display_order?: number | null
          field_labels?: Json | null
          iban?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_fallback?: boolean | null
          payment_qr_url?: string | null
          swift_code?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_qr_string?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch_name?: string | null
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          custom_fields?: Json | null
          destination_country?: string | null
          display_order?: number | null
          field_labels?: Json | null
          iban?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_fallback?: boolean | null
          payment_qr_url?: string | null
          swift_code?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_qr_string?: string | null
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
      blog_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          author_email: string | null
          author_name: string | null
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          post_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          author_email?: string | null
          author_name?: string | null
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string | null
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          canonical_url: string | null
          category_id: string
          content: string
          created_at: string | null
          excerpt: string | null
          featured: boolean | null
          featured_image_url: string | null
          focus_keyword: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          published_at: string | null
          reading_time_minutes: number | null
          slug: string
          status: string | null
          title: string
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          author_id: string
          canonical_url?: string | null
          category_id: string
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug: string
          status?: string | null
          title: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string
          canonical_url?: string | null
          category_id?: string
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string
          status?: string | null
          title?: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          is_guest: boolean | null
          payment_amount: number
          payment_currency: string
          payment_method: string
          quote_ids: string[]
          session_token: string
          status: string
          temporary_shipping_address: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_guest?: boolean | null
          payment_amount: number
          payment_currency: string
          payment_method: string
          quote_ids: string[]
          session_token: string
          status?: string
          temporary_shipping_address?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_guest?: boolean | null
          payment_amount?: number
          payment_currency?: string
          payment_method?: string
          quote_ids?: string[]
          session_token?: string
          status?: string
          temporary_shipping_address?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      consolidation_groups: {
        Row: {
          consolidated_by_staff_id: string | null
          consolidated_dimensions: Json | null
          consolidated_photos: Json | null
          consolidated_weight_kg: number | null
          consolidation_date: string | null
          consolidation_fee_usd: number | null
          created_at: string | null
          delivered_date: string | null
          group_name: string | null
          id: string
          original_package_ids: string[] | null
          package_count: number | null
          quote_id: string | null
          service_fee_usd: number | null
          shipped_date: string | null
          shipping_carrier: string | null
          shipping_tracking_number: string | null
          status: string | null
          storage_fees_usd: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consolidated_by_staff_id?: string | null
          consolidated_dimensions?: Json | null
          consolidated_photos?: Json | null
          consolidated_weight_kg?: number | null
          consolidation_date?: string | null
          consolidation_fee_usd?: number | null
          created_at?: string | null
          delivered_date?: string | null
          group_name?: string | null
          id?: string
          original_package_ids?: string[] | null
          package_count?: number | null
          quote_id?: string | null
          service_fee_usd?: number | null
          shipped_date?: string | null
          shipping_carrier?: string | null
          shipping_tracking_number?: string | null
          status?: string | null
          storage_fees_usd?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consolidated_by_staff_id?: string | null
          consolidated_dimensions?: Json | null
          consolidated_photos?: Json | null
          consolidated_weight_kg?: number | null
          consolidation_date?: string | null
          consolidation_fee_usd?: number | null
          created_at?: string | null
          delivered_date?: string | null
          group_name?: string | null
          id?: string
          original_package_ids?: string[] | null
          package_count?: number | null
          quote_id?: string | null
          service_fee_usd?: number | null
          shipped_date?: string | null
          shipping_carrier?: string | null
          shipping_tracking_number?: string | null
          status?: string | null
          storage_fees_usd?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consolidation_groups_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consolidation_groups_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consolidation_groups_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consolidation_groups_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      continental_pricing: {
        Row: {
          continent: string
          created_at: string
          currency_code: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          notes: string | null
          rate: number
          service_id: string
          updated_at: string
        }
        Insert: {
          continent: string
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          notes?: string | null
          rate: number
          service_id: string
          updated_at?: string
        }
        Update: {
          continent?: string
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          notes?: string | null
          rate?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "continental_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "addon_services"
            referencedColumns: ["id"]
          },
        ]
      }
      country_configs: {
        Row: {
          classification_digits: number
          classification_system: string
          country_code: string
          country_name: string
          created_at: string | null
          created_by: string | null
          default_customs_rate: number
          default_local_tax_rate: number
          enable_category_suggestions: boolean | null
          enable_customs_valuation_override: boolean | null
          enable_weight_estimation: boolean | null
          id: string
          local_tax_name: string
          updated_at: string | null
        }
        Insert: {
          classification_digits?: number
          classification_system: string
          country_code: string
          country_name: string
          created_at?: string | null
          created_by?: string | null
          default_customs_rate?: number
          default_local_tax_rate?: number
          enable_category_suggestions?: boolean | null
          enable_customs_valuation_override?: boolean | null
          enable_weight_estimation?: boolean | null
          id?: string
          local_tax_name?: string
          updated_at?: string | null
        }
        Update: {
          classification_digits?: number
          classification_system?: string
          country_code?: string
          country_name?: string
          created_at?: string | null
          created_by?: string | null
          default_customs_rate?: number
          default_local_tax_rate?: number
          enable_category_suggestions?: boolean | null
          enable_customs_valuation_override?: boolean | null
          enable_weight_estimation?: boolean | null
          id?: string
          local_tax_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      country_discount_rules: {
        Row: {
          auto_apply: boolean | null
          component_discounts: Json | null
          country_code: string
          created_at: string | null
          description: string | null
          discount_conditions: Json | null
          discount_type_id: string | null
          id: string
          max_uses_per_customer: number | null
          min_order_amount: number | null
          priority: number | null
          requires_code: boolean | null
          updated_at: string | null
        }
        Insert: {
          auto_apply?: boolean | null
          component_discounts?: Json | null
          country_code: string
          created_at?: string | null
          description?: string | null
          discount_conditions?: Json | null
          discount_type_id?: string | null
          id?: string
          max_uses_per_customer?: number | null
          min_order_amount?: number | null
          priority?: number | null
          requires_code?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auto_apply?: boolean | null
          component_discounts?: Json | null
          country_code?: string
          created_at?: string | null
          description?: string | null
          discount_conditions?: Json | null
          discount_type_id?: string | null
          id?: string
          max_uses_per_customer?: number | null
          min_order_amount?: number | null
          priority?: number | null
          requires_code?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_discount_rules_discount_type_id_fkey"
            columns: ["discount_type_id"]
            isOneToOne: false
            referencedRelation: "discount_types"
            referencedColumns: ["id"]
          },
        ]
      }
      country_payment_preferences: {
        Row: {
          country_code: string
          created_at: string
          gateway_code: string
          id: string
          is_active: boolean | null
          priority: number
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          gateway_code: string
          id?: string
          is_active?: boolean | null
          priority: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          gateway_code?: string
          id?: string
          is_active?: boolean | null
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_country_payment_preferences_country"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_settings"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "fk_country_payment_preferences_gateway"
            columns: ["gateway_code"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["code"]
          },
        ]
      }
      country_pricing_overrides: {
        Row: {
          country_code: string
          created_at: string
          currency_code: string | null
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          notes: string | null
          rate: number
          reason: string | null
          service_id: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          currency_code?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          notes?: string | null
          rate: number
          reason?: string | null
          service_id: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          currency_code?: string | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          notes?: string | null
          rate?: number
          reason?: string | null
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_pricing_overrides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "addon_services"
            referencedColumns: ["id"]
          },
        ]
      }
      country_settings: {
        Row: {
          additional_shipping: number | null
          additional_weight: number | null
          address_format: Json | null
          auto_tax_calculation: boolean | null
          available_gateways: string[] | null
          code: string
          continent: string | null
          created_at: string
          currency: string
          date_format: string | null
          decimal_places: number | null
          decimal_separator: string | null
          default_gateway: string | null
          default_language: string | null
          display_name: string | null
          domestic_api_enabled: boolean | null
          domestic_delivery_provider: string | null
          domestic_fallback_enabled: boolean | null
          domestic_rural_rate: number | null
          domestic_urban_rate: number | null
          flag_emoji: string | null
          gateway_config: Json | null
          is_active: boolean | null
          languages: string[] | null
          min_shipping: number | null
          minimum_payment_amount: number | null
          name: string
          payment_gateway: string | null
          payment_gateway_fixed_fee: number | null
          payment_gateway_percent_fee: number | null
          phone_code: string | null
          popular_payment_methods: string[] | null
          postal_code_example: string | null
          postal_code_regex: string | null
          priority_thresholds: Json | null
          purchase_allowed: boolean | null
          rate_from_usd: number
          sales_tax: number | null
          shipping_allowed: boolean | null
          symbol_position: string | null
          symbol_space: boolean | null
          thousand_separator: string | null
          timezone: string | null
          updated_at: string
          vat: number | null
          volumetric_divisor: number | null
          weight_unit: string | null
        }
        Insert: {
          additional_shipping?: number | null
          additional_weight?: number | null
          address_format?: Json | null
          auto_tax_calculation?: boolean | null
          available_gateways?: string[] | null
          code: string
          continent?: string | null
          created_at?: string
          currency: string
          date_format?: string | null
          decimal_places?: number | null
          decimal_separator?: string | null
          default_gateway?: string | null
          default_language?: string | null
          display_name?: string | null
          domestic_api_enabled?: boolean | null
          domestic_delivery_provider?: string | null
          domestic_fallback_enabled?: boolean | null
          domestic_rural_rate?: number | null
          domestic_urban_rate?: number | null
          flag_emoji?: string | null
          gateway_config?: Json | null
          is_active?: boolean | null
          languages?: string[] | null
          min_shipping?: number | null
          minimum_payment_amount?: number | null
          name: string
          payment_gateway?: string | null
          payment_gateway_fixed_fee?: number | null
          payment_gateway_percent_fee?: number | null
          phone_code?: string | null
          popular_payment_methods?: string[] | null
          postal_code_example?: string | null
          postal_code_regex?: string | null
          priority_thresholds?: Json | null
          purchase_allowed?: boolean | null
          rate_from_usd: number
          sales_tax?: number | null
          shipping_allowed?: boolean | null
          symbol_position?: string | null
          symbol_space?: boolean | null
          thousand_separator?: string | null
          timezone?: string | null
          updated_at?: string
          vat?: number | null
          volumetric_divisor?: number | null
          weight_unit?: string | null
        }
        Update: {
          additional_shipping?: number | null
          additional_weight?: number | null
          address_format?: Json | null
          auto_tax_calculation?: boolean | null
          available_gateways?: string[] | null
          code?: string
          continent?: string | null
          created_at?: string
          currency?: string
          date_format?: string | null
          decimal_places?: number | null
          decimal_separator?: string | null
          default_gateway?: string | null
          default_language?: string | null
          display_name?: string | null
          domestic_api_enabled?: boolean | null
          domestic_delivery_provider?: string | null
          domestic_fallback_enabled?: boolean | null
          domestic_rural_rate?: number | null
          domestic_urban_rate?: number | null
          flag_emoji?: string | null
          gateway_config?: Json | null
          is_active?: boolean | null
          languages?: string[] | null
          min_shipping?: number | null
          minimum_payment_amount?: number | null
          name?: string
          payment_gateway?: string | null
          payment_gateway_fixed_fee?: number | null
          payment_gateway_percent_fee?: number | null
          phone_code?: string | null
          popular_payment_methods?: string[] | null
          postal_code_example?: string | null
          postal_code_regex?: string | null
          priority_thresholds?: Json | null
          purchase_allowed?: boolean | null
          rate_from_usd?: number
          sales_tax?: number | null
          shipping_allowed?: boolean | null
          symbol_position?: string | null
          symbol_space?: boolean | null
          thousand_separator?: string | null
          timezone?: string | null
          updated_at?: string
          vat?: number | null
          volumetric_divisor?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      customer_delivery_preferences: {
        Row: {
          consolidation_preference: string | null
          created_at: string | null
          customer_id: string | null
          delivery_method: string
          delivery_reason: string | null
          functionality_test_required: boolean | null
          id: string
          max_wait_days: number | null
          notification_frequency: string | null
          order_id: string | null
          photo_documentation_required: boolean | null
          preferred_communication: string | null
          priority: string | null
          quality_check_level: string | null
        }
        Insert: {
          consolidation_preference?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_method: string
          delivery_reason?: string | null
          functionality_test_required?: boolean | null
          id?: string
          max_wait_days?: number | null
          notification_frequency?: string | null
          order_id?: string | null
          photo_documentation_required?: boolean | null
          preferred_communication?: string | null
          priority?: string | null
          quality_check_level?: string | null
        }
        Update: {
          consolidation_preference?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivery_method?: string
          delivery_reason?: string | null
          functionality_test_required?: boolean | null
          id?: string
          max_wait_days?: number | null
          notification_frequency?: string | null
          order_id?: string | null
          photo_documentation_required?: boolean | null
          preferred_communication?: string | null
          priority?: string | null
          quality_check_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_delivery_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_delivery_preferences_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_delivery_preferences_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_discount_usage: {
        Row: {
          campaign_id: string | null
          component_breakdown: Json | null
          components_discounted: string[] | null
          created_at: string | null
          currency: string | null
          customer_id: string
          discount_amount: number | null
          discount_code_id: string
          id: string
          order_id: string | null
          original_amount: number | null
          quote_id: string | null
          updated_at: string | null
          used_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          component_breakdown?: Json | null
          components_discounted?: string[] | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          discount_amount?: number | null
          discount_code_id: string
          id?: string
          order_id?: string | null
          original_amount?: number | null
          quote_id?: string | null
          updated_at?: string | null
          used_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          component_breakdown?: Json | null
          components_discounted?: string[] | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          discount_amount?: number | null
          discount_code_id?: string
          id?: string
          order_id?: string | null
          original_amount?: number | null
          quote_id?: string | null
          updated_at?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_discount_usage_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_memberships: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          customer_id: string
          expires_at: string
          id: string
          last_payment_id: string | null
          metadata: Json | null
          payment_method: string | null
          plan_id: string
          started_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          customer_id: string
          expires_at: string
          id?: string
          last_payment_id?: string | null
          metadata?: Json | null
          payment_method?: string | null
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          customer_id?: string
          expires_at?: string
          id?: string
          last_payment_id?: string | null
          metadata?: Json | null
          payment_method?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          created_at: string | null
          default_consolidation_preference: string | null
          id: string
          notification_preferences: Json | null
          other_preferences: Json | null
          profile_id: string | null
          shipping_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_consolidation_preference?: string | null
          id?: string
          notification_preferences?: Json | null
          other_preferences?: Json | null
          profile_id?: string | null
          shipping_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_consolidation_preference?: string | null
          id?: string
          notification_preferences?: Json | null
          other_preferences?: Json | null
          profile_id?: string | null
          shipping_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_satisfaction_surveys: {
        Row: {
          additional_comments: string | null
          created_at: string
          experience_rating: number
          feedback: string | null
          id: string
          rating: number
          resolution_rating: number
          response_time_rating: number
          ticket_id: string
          updated_at: string
          would_recommend: boolean
        }
        Insert: {
          additional_comments?: string | null
          created_at?: string
          experience_rating: number
          feedback?: string | null
          id?: string
          rating: number
          resolution_rating: number
          response_time_rating: number
          ticket_id: string
          updated_at?: string
          would_recommend?: boolean
        }
        Update: {
          additional_comments?: string | null
          created_at?: string
          experience_rating?: number
          feedback?: string | null
          id?: string
          rating?: number
          resolution_rating?: number
          response_time_rating?: number
          ticket_id?: string
          updated_at?: string
          would_recommend?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_customer_satisfaction_surveys_ticket_id"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_system"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customer_satisfaction_surveys_ticket_id"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customer_satisfaction_surveys_ticket_id"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
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
      customs_valuation_overrides: {
        Row: {
          approved_by: string | null
          chosen_valuation_usd: number | null
          classification_code: string | null
          country_code: string | null
          created_at: string | null
          created_by: string
          customs_duty_saved_usd: number | null
          customs_rate_used: number | null
          id: string
          is_automatic: boolean | null
          justification_documents: Json | null
          minimum_valuation_usd: number | null
          order_id: string | null
          original_method: string
          original_value_usd: number
          override_method: string
          override_reason: string
          override_value_usd: number
          product_classification_id: string | null
          product_name: string | null
          product_price_usd: number | null
          quote_id: string | null
          valuation_method: string | null
        }
        Insert: {
          approved_by?: string | null
          chosen_valuation_usd?: number | null
          classification_code?: string | null
          country_code?: string | null
          created_at?: string | null
          created_by: string
          customs_duty_saved_usd?: number | null
          customs_rate_used?: number | null
          id?: string
          is_automatic?: boolean | null
          justification_documents?: Json | null
          minimum_valuation_usd?: number | null
          order_id?: string | null
          original_method: string
          original_value_usd: number
          override_method: string
          override_reason: string
          override_value_usd: number
          product_classification_id?: string | null
          product_name?: string | null
          product_price_usd?: number | null
          quote_id?: string | null
          valuation_method?: string | null
        }
        Update: {
          approved_by?: string | null
          chosen_valuation_usd?: number | null
          classification_code?: string | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string
          customs_duty_saved_usd?: number | null
          customs_rate_used?: number | null
          id?: string
          is_automatic?: boolean | null
          justification_documents?: Json | null
          minimum_valuation_usd?: number | null
          order_id?: string | null
          original_method?: string
          original_value_usd?: number
          override_method?: string
          override_reason?: string
          override_value_usd?: number
          product_classification_id?: string | null
          product_name?: string | null
          product_price_usd?: number | null
          quote_id?: string | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_valuation_overrides_product_classification_id_fkey"
            columns: ["product_classification_id"]
            isOneToOne: false
            referencedRelation: "product_classifications"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_addresses: {
        Row: {
          address_label: string | null
          address_line1: string
          address_line2: string | null
          address_type: string | null
          city: string
          company_name: string | null
          created_at: string
          delivery_instructions: string | null
          destination_country: string
          id: string
          is_default: boolean | null
          phone: string | null
          postal_code: string | null
          recipient_name: string | null
          save_to_profile: string | null
          state_province_region: string
          tax_id: string | null
          updated_at: string
          user_id: string
          validated_at: string | null
          validation_status: string | null
        }
        Insert: {
          address_label?: string | null
          address_line1: string
          address_line2?: string | null
          address_type?: string | null
          city: string
          company_name?: string | null
          created_at?: string
          delivery_instructions?: string | null
          destination_country?: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postal_code?: string | null
          recipient_name?: string | null
          save_to_profile?: string | null
          state_province_region: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validation_status?: string | null
        }
        Update: {
          address_label?: string | null
          address_line1?: string
          address_line2?: string | null
          address_type?: string | null
          city?: string
          company_name?: string | null
          created_at?: string
          delivery_instructions?: string | null
          destination_country?: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postal_code?: string | null
          recipient_name?: string | null
          save_to_profile?: string | null
          state_province_region?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validation_status?: string | null
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
      delivery_orders: {
        Row: {
          actual_delivery: string | null
          cod_amount: number | null
          created_at: string | null
          currency: string | null
          delivery_charge: number | null
          estimated_delivery: string | null
          events: Json | null
          from_address: Json
          id: string
          insurance_amount: number | null
          proof: Json | null
          provider_code: string
          provider_order_id: string | null
          provider_response: Json | null
          quote_id: string
          shipment_data: Json
          status: string
          to_address: Json
          total_charge: number | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery?: string | null
          cod_amount?: number | null
          created_at?: string | null
          currency?: string | null
          delivery_charge?: number | null
          estimated_delivery?: string | null
          events?: Json | null
          from_address: Json
          id?: string
          insurance_amount?: number | null
          proof?: Json | null
          provider_code: string
          provider_order_id?: string | null
          provider_response?: Json | null
          quote_id: string
          shipment_data: Json
          status?: string
          to_address: Json
          total_charge?: number | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery?: string | null
          cod_amount?: number | null
          created_at?: string | null
          currency?: string | null
          delivery_charge?: number | null
          estimated_delivery?: string | null
          events?: Json | null
          from_address?: Json
          id?: string
          insurance_amount?: number | null
          proof?: Json | null
          provider_code?: string
          provider_order_id?: string | null
          provider_response?: Json | null
          quote_id?: string
          shipment_data?: Json
          status?: string
          to_address?: Json
          total_charge?: number | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_provider_configs: {
        Row: {
          capabilities: Json
          code: string
          country_overrides: Json | null
          created_at: string | null
          credentials: Json
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          provider_type: string
          settings: Json
          supported_countries: string[]
          updated_at: string | null
        }
        Insert: {
          capabilities?: Json
          code: string
          country_overrides?: Json | null
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          provider_type: string
          settings?: Json
          supported_countries?: string[]
          updated_at?: string | null
        }
        Update: {
          capabilities?: Json
          code?: string
          country_overrides?: Json | null
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          provider_type?: string
          settings?: Json
          supported_countries?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_webhooks: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          provider_code: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          provider_code: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          provider_code?: string
          webhook_id?: string | null
        }
        Relationships: []
      }
      discount_application_log: {
        Row: {
          application_type: string | null
          applied_at: string | null
          component_breakdown: Json | null
          conditions_met: Json | null
          country_rule_id: string | null
          created_at: string | null
          customer_country: string | null
          customer_id: string | null
          delivery_order_id: string | null
          discount_amount: number | null
          discount_code_id: string | null
          discount_type_id: string | null
          id: string
          metadata: Json | null
          original_amount: number | null
          quote_id: string | null
        }
        Insert: {
          application_type?: string | null
          applied_at?: string | null
          component_breakdown?: Json | null
          conditions_met?: Json | null
          country_rule_id?: string | null
          created_at?: string | null
          customer_country?: string | null
          customer_id?: string | null
          delivery_order_id?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          discount_type_id?: string | null
          id?: string
          metadata?: Json | null
          original_amount?: number | null
          quote_id?: string | null
        }
        Update: {
          application_type?: string | null
          applied_at?: string | null
          component_breakdown?: Json | null
          conditions_met?: Json | null
          country_rule_id?: string | null
          created_at?: string | null
          customer_country?: string | null
          customer_id?: string | null
          delivery_order_id?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          discount_type_id?: string | null
          id?: string
          metadata?: Json | null
          original_amount?: number | null
          quote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_application_log_country_rule_id_fkey"
            columns: ["country_rule_id"]
            isOneToOne: false
            referencedRelation: "country_discount_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_application_log_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_application_log_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_application_log_discount_type_id_fkey"
            columns: ["discount_type_id"]
            isOneToOne: false
            referencedRelation: "discount_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_application_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_application_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_application_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_application_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_campaigns: {
        Row: {
          auto_apply: boolean | null
          campaign_type: string | null
          created_at: string | null
          description: string | null
          discount_type_id: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          start_date: string
          target_audience: Json | null
          target_segments: Json | null
          trigger_rules: Json | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          auto_apply?: boolean | null
          campaign_type?: string | null
          created_at?: string | null
          description?: string | null
          discount_type_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          start_date: string
          target_audience?: Json | null
          target_segments?: Json | null
          trigger_rules?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          auto_apply?: boolean | null
          campaign_type?: string | null
          created_at?: string | null
          description?: string | null
          discount_type_id?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          start_date?: string
          target_audience?: Json | null
          target_segments?: Json | null
          trigger_rules?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_campaigns_discount_type_id_fkey"
            columns: ["discount_type_id"]
            isOneToOne: false
            referencedRelation: "discount_types"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          campaign_id: string | null
          code: string
          created_at: string | null
          discount_type_id: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          usage_per_customer: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          campaign_id?: string | null
          code: string
          created_at?: string | null
          discount_type_id?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          usage_per_customer?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          campaign_id?: string | null
          code?: string
          created_at?: string | null
          discount_type_id?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          usage_per_customer?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "discount_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_codes_discount_type_id_fkey"
            columns: ["discount_type_id"]
            isOneToOne: false
            referencedRelation: "discount_types"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_settings: {
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
      discount_stacking_rules: {
        Row: {
          allowed_combinations: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_discounts: number | null
          name: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_combinations?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discounts?: number | null
          name: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_combinations?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discounts?: number | null
          name?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_tiers: {
        Row: {
          applicable_components: string[] | null
          avg_order_value: number | null
          created_at: string | null
          description: string | null
          discount_type_id: string | null
          discount_value: number
          id: string
          last_used_at: string | null
          max_order_value: number | null
          min_order_value: number
          priority: number | null
          total_savings: number | null
          usage_count: number | null
        }
        Insert: {
          applicable_components?: string[] | null
          avg_order_value?: number | null
          created_at?: string | null
          description?: string | null
          discount_type_id?: string | null
          discount_value: number
          id?: string
          last_used_at?: string | null
          max_order_value?: number | null
          min_order_value: number
          priority?: number | null
          total_savings?: number | null
          usage_count?: number | null
        }
        Update: {
          applicable_components?: string[] | null
          avg_order_value?: number | null
          created_at?: string | null
          description?: string | null
          discount_type_id?: string | null
          discount_value?: number
          id?: string
          last_used_at?: string | null
          max_order_value?: number | null
          min_order_value?: number
          priority?: number | null
          total_savings?: number | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_tiers_discount_type_id_fkey"
            columns: ["discount_type_id"]
            isOneToOne: false
            referencedRelation: "discount_types"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_types: {
        Row: {
          applicable_components: string[] | null
          code: string
          conditions: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          tier_rules: Json | null
          type: string
          value: number
        }
        Insert: {
          applicable_components?: string[] | null
          code: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          tier_rules?: Json | null
          type: string
          value: number
        }
        Update: {
          applicable_components?: string[] | null
          code?: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          tier_rules?: Json | null
          type?: string
          value?: number
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          attachment_count: number | null
          cc_addresses: string[] | null
          created_at: string | null
          customer_email: string | null
          direction: string
          from_address: string
          has_attachments: boolean | null
          html_body: string | null
          id: string
          message_id: string
          metadata: Json | null
          order_id: string | null
          processed_at: string | null
          quote_id: string | null
          raw_email: string | null
          received_at: string | null
          s3_bucket: string
          s3_key: string
          sent_at: string | null
          size_bytes: number | null
          status: string
          subject: string
          text_body: string | null
          to_addresses: string[]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attachment_count?: number | null
          cc_addresses?: string[] | null
          created_at?: string | null
          customer_email?: string | null
          direction: string
          from_address: string
          has_attachments?: boolean | null
          html_body?: string | null
          id?: string
          message_id: string
          metadata?: Json | null
          order_id?: string | null
          processed_at?: string | null
          quote_id?: string | null
          raw_email?: string | null
          received_at?: string | null
          s3_bucket?: string
          s3_key: string
          sent_at?: string | null
          size_bytes?: number | null
          status?: string
          subject: string
          text_body?: string | null
          to_addresses: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attachment_count?: number | null
          cc_addresses?: string[] | null
          created_at?: string | null
          customer_email?: string | null
          direction?: string
          from_address?: string
          has_attachments?: boolean | null
          html_body?: string | null
          id?: string
          message_id?: string
          metadata?: Json | null
          order_id?: string | null
          processed_at?: string | null
          quote_id?: string | null
          raw_email?: string | null
          received_at?: string | null
          s3_bucket?: string
          s3_key?: string
          sent_at?: string | null
          size_bytes?: number | null
          status?: string
          subject?: string
          text_body?: string | null
          to_addresses?: string[]
          updated_at?: string | null
          user_id?: string | null
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
      escalation_rules: {
        Row: {
          created_at: string | null
          description: string
          duration_minutes: number
          enabled: boolean | null
          id: string
          priority: number | null
          response_action: string
          time_window_hours: number
          updated_at: string | null
          violation_count: number
        }
        Insert: {
          created_at?: string | null
          description: string
          duration_minutes: number
          enabled?: boolean | null
          id?: string
          priority?: number | null
          response_action: string
          time_window_hours: number
          updated_at?: string | null
          violation_count: number
        }
        Update: {
          created_at?: string | null
          description?: string
          duration_minutes?: number
          enabled?: boolean | null
          id?: string
          priority?: number | null
          response_action?: string
          time_window_hours?: number
          updated_at?: string | null
          violation_count?: number
        }
        Relationships: []
      }
      gateway_refunds: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_note: string | null
          failed_at: string | null
          gateway_code: string
          gateway_refund_id: string
          gateway_response: Json | null
          gateway_status: string | null
          gateway_transaction_id: string | null
          id: string
          original_amount: number | null
          payment_transaction_id: string | null
          processed_by: string | null
          quote_id: string | null
          reason_code: string | null
          reason_description: string | null
          refund_amount: number
          refund_date: string | null
          refund_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          customer_note?: string | null
          failed_at?: string | null
          gateway_code: string
          gateway_refund_id: string
          gateway_response?: Json | null
          gateway_status?: string | null
          gateway_transaction_id?: string | null
          id?: string
          original_amount?: number | null
          payment_transaction_id?: string | null
          processed_by?: string | null
          quote_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          refund_amount: number
          refund_date?: string | null
          refund_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_note?: string | null
          failed_at?: string | null
          gateway_code?: string
          gateway_refund_id?: string
          gateway_response?: Json | null
          gateway_status?: string | null
          gateway_transaction_id?: string | null
          id?: string
          original_amount?: number | null
          payment_transaction_id?: string | null
          processed_by?: string | null
          quote_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          refund_amount?: number
          refund_date?: string | null
          refund_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_refunds_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_revisions: {
        Row: {
          admin_notes: string | null
          admin_user_id: string | null
          approved_at: string | null
          auto_approval_eligible: boolean | null
          auto_approval_reason: string | null
          auto_approved: boolean | null
          change_reason: string | null
          change_type: string
          created_at: string | null
          customer_approval_deadline: string | null
          customer_approval_status: string | null
          customer_notified: boolean | null
          customer_responded_at: string | null
          customer_response_notes: string | null
          customs_duty_impact: number | null
          id: string
          last_reminder_sent: string | null
          management_approved: boolean | null
          new_price: number | null
          new_weight: number | null
          notification_sent_at: string | null
          order_item_id: string | null
          original_price: number | null
          original_weight: number | null
          price_change_amount: number | null
          price_change_percentage: number | null
          recalculation_result: Json | null
          recalculation_used_quote_data: Json | null
          rejected_at: string | null
          reminder_count: number | null
          requires_management_approval: boolean | null
          revision_number: number | null
          shipping_cost_impact: number | null
          total_cost_impact: number
          weight_change_amount: number | null
          weight_change_percentage: number | null
        }
        Insert: {
          admin_notes?: string | null
          admin_user_id?: string | null
          approved_at?: string | null
          auto_approval_eligible?: boolean | null
          auto_approval_reason?: string | null
          auto_approved?: boolean | null
          change_reason?: string | null
          change_type: string
          created_at?: string | null
          customer_approval_deadline?: string | null
          customer_approval_status?: string | null
          customer_notified?: boolean | null
          customer_responded_at?: string | null
          customer_response_notes?: string | null
          customs_duty_impact?: number | null
          id?: string
          last_reminder_sent?: string | null
          management_approved?: boolean | null
          new_price?: number | null
          new_weight?: number | null
          notification_sent_at?: string | null
          order_item_id?: string | null
          original_price?: number | null
          original_weight?: number | null
          price_change_amount?: number | null
          price_change_percentage?: number | null
          recalculation_result?: Json | null
          recalculation_used_quote_data?: Json | null
          rejected_at?: string | null
          reminder_count?: number | null
          requires_management_approval?: boolean | null
          revision_number?: number | null
          shipping_cost_impact?: number | null
          total_cost_impact?: number
          weight_change_amount?: number | null
          weight_change_percentage?: number | null
        }
        Update: {
          admin_notes?: string | null
          admin_user_id?: string | null
          approved_at?: string | null
          auto_approval_eligible?: boolean | null
          auto_approval_reason?: string | null
          auto_approved?: boolean | null
          change_reason?: string | null
          change_type?: string
          created_at?: string | null
          customer_approval_deadline?: string | null
          customer_approval_status?: string | null
          customer_notified?: boolean | null
          customer_responded_at?: string | null
          customer_response_notes?: string | null
          customs_duty_impact?: number | null
          id?: string
          last_reminder_sent?: string | null
          management_approved?: boolean | null
          new_price?: number | null
          new_weight?: number | null
          notification_sent_at?: string | null
          order_item_id?: string | null
          original_price?: number | null
          original_weight?: number | null
          price_change_amount?: number | null
          price_change_percentage?: number | null
          recalculation_result?: Json | null
          recalculation_used_quote_data?: Json | null
          rejected_at?: string | null
          reminder_count?: number | null
          requires_management_approval?: boolean | null
          revision_number?: number | null
          shipping_cost_impact?: number | null
          total_cost_impact?: number
          weight_change_amount?: number | null
          weight_change_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_revisions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      market_countries: {
        Row: {
          country_code: string
          created_at: string
          display_order: number | null
          is_primary_in_market: boolean | null
          market_id: string
        }
        Insert: {
          country_code: string
          created_at?: string
          display_order?: number | null
          is_primary_in_market?: boolean | null
          market_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          display_order?: number | null
          is_primary_in_market?: boolean | null
          market_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_countries_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_settings"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "market_countries_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "market_country_summary"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "market_countries_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          benefits: Json
          created_at: string | null
          description: string | null
          duration_days: number
          id: string
          is_active: boolean | null
          name: string
          pricing: Json
          slug: string
          updated_at: string | null
          warehouse_benefits: Json | null
        }
        Insert: {
          benefits?: Json
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name: string
          pricing?: Json
          slug: string
          updated_at?: string | null
          warehouse_benefits?: Json | null
        }
        Update: {
          benefits?: Json
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          pricing?: Json
          slug?: string
          updated_at?: string | null
          warehouse_benefits?: Json | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          admin_notes: string | null
          attachment_file_name: string | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          is_read: boolean | null
          message_status: string | null
          message_type: string | null
          metadata: Json | null
          priority: string | null
          quote_id: string | null
          read_at: string | null
          recipient_id: string | null
          reply_to_message_id: string | null
          sender_email: string | null
          sender_id: string
          sender_name: string | null
          subject: string
          thread_type: string | null
          updated_at: string
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          attachment_file_name?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          is_read?: boolean | null
          message_status?: string | null
          message_type?: string | null
          metadata?: Json | null
          priority?: string | null
          quote_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id: string
          sender_name?: string | null
          subject: string
          thread_type?: string | null
          updated_at?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          attachment_file_name?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          is_read?: boolean | null
          message_status?: string | null
          message_type?: string | null
          metadata?: Json | null
          priority?: string | null
          quote_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          reply_to_message_id?: string | null
          sender_email?: string | null
          sender_id?: string
          sender_name?: string | null
          subject?: string
          thread_type?: string | null
          updated_at?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
          {
            foreignKeyName: "messages_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_exceptions: {
        Row: {
          admin_approval_notes: string | null
          admin_approved: boolean | null
          alternative_price_difference: number | null
          alternative_selected: boolean | null
          alternative_sellers_found: Json | null
          approved_at: string | null
          approved_by: string | null
          available_resolutions: Json
          cost_to_business: number | null
          created_at: string | null
          customer_choice: string | null
          customer_choice_reason: string | null
          customer_feedback: string | null
          customer_response_deadline: string | null
          customer_satisfaction_rating: number | null
          description: string
          detected_at: string | null
          detected_by: string | null
          exception_type: string
          id: string
          impact_category: string | null
          order_item_id: string | null
          photos: Json | null
          prevention_notes: string | null
          process_improvement_required: boolean | null
          recommended_resolution: string | null
          reported_by: string | null
          requires_admin_approval: boolean | null
          resolution_amount: number | null
          resolution_method: string | null
          resolution_notes: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          shipment_id: string | null
          supporting_documents: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_approval_notes?: string | null
          admin_approved?: boolean | null
          alternative_price_difference?: number | null
          alternative_selected?: boolean | null
          alternative_sellers_found?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          available_resolutions?: Json
          cost_to_business?: number | null
          created_at?: string | null
          customer_choice?: string | null
          customer_choice_reason?: string | null
          customer_feedback?: string | null
          customer_response_deadline?: string | null
          customer_satisfaction_rating?: number | null
          description: string
          detected_at?: string | null
          detected_by?: string | null
          exception_type: string
          id?: string
          impact_category?: string | null
          order_item_id?: string | null
          photos?: Json | null
          prevention_notes?: string | null
          process_improvement_required?: boolean | null
          recommended_resolution?: string | null
          reported_by?: string | null
          requires_admin_approval?: boolean | null
          resolution_amount?: number | null
          resolution_method?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          shipment_id?: string | null
          supporting_documents?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_approval_notes?: string | null
          admin_approved?: boolean | null
          alternative_price_difference?: number | null
          alternative_selected?: boolean | null
          alternative_sellers_found?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          available_resolutions?: Json
          cost_to_business?: number | null
          created_at?: string | null
          customer_choice?: string | null
          customer_choice_reason?: string | null
          customer_feedback?: string | null
          customer_response_deadline?: string | null
          customer_satisfaction_rating?: number | null
          description?: string
          detected_at?: string | null
          detected_by?: string | null
          exception_type?: string
          id?: string
          impact_category?: string | null
          order_item_id?: string | null
          photos?: Json | null
          prevention_notes?: string | null
          process_improvement_required?: boolean | null
          recommended_resolution?: string | null
          reported_by?: string | null
          requires_admin_approval?: boolean | null
          resolution_amount?: number | null
          resolution_method?: string | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          shipment_id?: string | null
          supporting_documents?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_exceptions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_exceptions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "order_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          actual_weight: number | null
          assigned_warehouse: string | null
          auto_approval_threshold_amount: number | null
          auto_approval_threshold_percentage: number | null
          automation_error_log: Json | null
          automation_retry_count: number | null
          brightdata_session_id: string | null
          cancellation_reason: string | null
          consolidation_group_id: string | null
          created_at: string | null
          currency: string
          current_price: number | null
          current_weight: number | null
          customer_notified_of_issues: boolean | null
          destination_country: string | null
          id: string
          item_data: Json | null
          item_status: string | null
          last_customer_notification: string | null
          order_automation_status: string | null
          order_id: string | null
          origin_country: string | null
          original_price: number | null
          original_weight: number | null
          price_variance: number | null
          product_name: string | null
          product_url: string | null
          quality_check_priority: string | null
          quality_check_requested: boolean | null
          quality_check_status: string | null
          quality_checked_at: string | null
          quality_inspector_id: string | null
          quality_notes: string | null
          quality_photos: Json | null
          quantity: number
          quote_id: string | null
          quote_item_id: string | null
          refund_amount: number | null
          refund_processed_at: string | null
          requires_customer_approval: boolean | null
          seller_account_type: string | null
          seller_order_date: string | null
          seller_order_id: string | null
          seller_platform: string | null
          seller_tracking_id: string | null
          total_price: number | null
          total_variance: number | null
          unit_price: number
          updated_at: string | null
          variance_auto_approved: boolean | null
          warehouse_arrival_date: string | null
          warehouse_dispatch_date: string | null
          weight_variance: number | null
        }
        Insert: {
          actual_weight?: number | null
          assigned_warehouse?: string | null
          auto_approval_threshold_amount?: number | null
          auto_approval_threshold_percentage?: number | null
          automation_error_log?: Json | null
          automation_retry_count?: number | null
          brightdata_session_id?: string | null
          cancellation_reason?: string | null
          consolidation_group_id?: string | null
          created_at?: string | null
          currency?: string
          current_price?: number | null
          current_weight?: number | null
          customer_notified_of_issues?: boolean | null
          destination_country?: string | null
          id?: string
          item_data?: Json | null
          item_status?: string | null
          last_customer_notification?: string | null
          order_automation_status?: string | null
          order_id?: string | null
          origin_country?: string | null
          original_price?: number | null
          original_weight?: number | null
          price_variance?: number | null
          product_name?: string | null
          product_url?: string | null
          quality_check_priority?: string | null
          quality_check_requested?: boolean | null
          quality_check_status?: string | null
          quality_checked_at?: string | null
          quality_inspector_id?: string | null
          quality_notes?: string | null
          quality_photos?: Json | null
          quantity?: number
          quote_id?: string | null
          quote_item_id?: string | null
          refund_amount?: number | null
          refund_processed_at?: string | null
          requires_customer_approval?: boolean | null
          seller_account_type?: string | null
          seller_order_date?: string | null
          seller_order_id?: string | null
          seller_platform?: string | null
          seller_tracking_id?: string | null
          total_price?: number | null
          total_variance?: number | null
          unit_price?: number
          updated_at?: string | null
          variance_auto_approved?: boolean | null
          warehouse_arrival_date?: string | null
          warehouse_dispatch_date?: string | null
          weight_variance?: number | null
        }
        Update: {
          actual_weight?: number | null
          assigned_warehouse?: string | null
          auto_approval_threshold_amount?: number | null
          auto_approval_threshold_percentage?: number | null
          automation_error_log?: Json | null
          automation_retry_count?: number | null
          brightdata_session_id?: string | null
          cancellation_reason?: string | null
          consolidation_group_id?: string | null
          created_at?: string | null
          currency?: string
          current_price?: number | null
          current_weight?: number | null
          customer_notified_of_issues?: boolean | null
          destination_country?: string | null
          id?: string
          item_data?: Json | null
          item_status?: string | null
          last_customer_notification?: string | null
          order_automation_status?: string | null
          order_id?: string | null
          origin_country?: string | null
          original_price?: number | null
          original_weight?: number | null
          price_variance?: number | null
          product_name?: string | null
          product_url?: string | null
          quality_check_priority?: string | null
          quality_check_requested?: boolean | null
          quality_check_status?: string | null
          quality_checked_at?: string | null
          quality_inspector_id?: string | null
          quality_notes?: string | null
          quality_photos?: Json | null
          quantity?: number
          quote_id?: string | null
          quote_item_id?: string | null
          refund_amount?: number | null
          refund_processed_at?: string | null
          requires_customer_approval?: boolean | null
          seller_account_type?: string | null
          seller_order_date?: string | null
          seller_order_id?: string | null
          seller_platform?: string | null
          seller_tracking_id?: string | null
          total_price?: number | null
          total_variance?: number | null
          unit_price?: number
          updated_at?: string | null
          variance_auto_approved?: boolean | null
          warehouse_arrival_date?: string | null
          warehouse_dispatch_date?: string | null
          weight_variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_quote_item_id_fkey"
            columns: ["quote_item_id"]
            isOneToOne: false
            referencedRelation: "quote_items_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipments: {
        Row: {
          actual_shipping_cost: number | null
          actual_weight_kg: number | null
          additional_fees: number | null
          billable_weight_kg: number | null
          consolidation_group: string | null
          created_at: string | null
          current_location: string | null
          current_status: string | null
          current_tier: string | null
          customer_delivery_date: string | null
          customer_delivery_preference: string | null
          customer_max_wait_date: string | null
          customer_notified: boolean | null
          customs_clearance_date: string | null
          customs_duty: number | null
          customs_entry_date: string | null
          delivery_attempted_date: string | null
          delivery_instructions: string | null
          dimensional_weight_kg: number | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_required: boolean | null
          estimated_delivery_date: string | null
          estimated_shipping_cost: number | null
          estimated_weight_kg: number | null
          exception_notes: string | null
          exception_status: string | null
          height_cm: number | null
          id: string
          inspector_id: string | null
          insurance_cost: number | null
          international_tracking_id: string | null
          last_notification_sent: string | null
          length_cm: number | null
          local_delivery_tracking_id: string | null
          local_facility_date: string | null
          notification_count: number | null
          order_id: string | null
          origin_warehouse: string
          out_for_delivery_date: string | null
          quality_check_completed_date: string | null
          quality_check_date: string | null
          quality_check_status: string | null
          quality_notes: string | null
          quality_photos: Json | null
          seller_name: string | null
          seller_order_id: string | null
          seller_platform: string | null
          seller_ship_date: string | null
          seller_tracking_id: string | null
          service_type: string | null
          shipment_number: string
          shipment_type: string
          shipping_carrier: string | null
          third_party_account_id: string | null
          third_party_service: string | null
          third_party_tracking_id: string | null
          updated_at: string | null
          warehouse_arrival_date: string | null
          warehouse_dispatch_date: string | null
          warehouse_location: Json | null
          weight_variance_approved: boolean | null
          width_cm: number | null
        }
        Insert: {
          actual_shipping_cost?: number | null
          actual_weight_kg?: number | null
          additional_fees?: number | null
          billable_weight_kg?: number | null
          consolidation_group?: string | null
          created_at?: string | null
          current_location?: string | null
          current_status?: string | null
          current_tier?: string | null
          customer_delivery_date?: string | null
          customer_delivery_preference?: string | null
          customer_max_wait_date?: string | null
          customer_notified?: boolean | null
          customs_clearance_date?: string | null
          customs_duty?: number | null
          customs_entry_date?: string | null
          delivery_attempted_date?: string | null
          delivery_instructions?: string | null
          dimensional_weight_kg?: number | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_required?: boolean | null
          estimated_delivery_date?: string | null
          estimated_shipping_cost?: number | null
          estimated_weight_kg?: number | null
          exception_notes?: string | null
          exception_status?: string | null
          height_cm?: number | null
          id?: string
          inspector_id?: string | null
          insurance_cost?: number | null
          international_tracking_id?: string | null
          last_notification_sent?: string | null
          length_cm?: number | null
          local_delivery_tracking_id?: string | null
          local_facility_date?: string | null
          notification_count?: number | null
          order_id?: string | null
          origin_warehouse: string
          out_for_delivery_date?: string | null
          quality_check_completed_date?: string | null
          quality_check_date?: string | null
          quality_check_status?: string | null
          quality_notes?: string | null
          quality_photos?: Json | null
          seller_name?: string | null
          seller_order_id?: string | null
          seller_platform?: string | null
          seller_ship_date?: string | null
          seller_tracking_id?: string | null
          service_type?: string | null
          shipment_number: string
          shipment_type: string
          shipping_carrier?: string | null
          third_party_account_id?: string | null
          third_party_service?: string | null
          third_party_tracking_id?: string | null
          updated_at?: string | null
          warehouse_arrival_date?: string | null
          warehouse_dispatch_date?: string | null
          warehouse_location?: Json | null
          weight_variance_approved?: boolean | null
          width_cm?: number | null
        }
        Update: {
          actual_shipping_cost?: number | null
          actual_weight_kg?: number | null
          additional_fees?: number | null
          billable_weight_kg?: number | null
          consolidation_group?: string | null
          created_at?: string | null
          current_location?: string | null
          current_status?: string | null
          current_tier?: string | null
          customer_delivery_date?: string | null
          customer_delivery_preference?: string | null
          customer_max_wait_date?: string | null
          customer_notified?: boolean | null
          customs_clearance_date?: string | null
          customs_duty?: number | null
          customs_entry_date?: string | null
          delivery_attempted_date?: string | null
          delivery_instructions?: string | null
          dimensional_weight_kg?: number | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_required?: boolean | null
          estimated_delivery_date?: string | null
          estimated_shipping_cost?: number | null
          estimated_weight_kg?: number | null
          exception_notes?: string | null
          exception_status?: string | null
          height_cm?: number | null
          id?: string
          inspector_id?: string | null
          insurance_cost?: number | null
          international_tracking_id?: string | null
          last_notification_sent?: string | null
          length_cm?: number | null
          local_delivery_tracking_id?: string | null
          local_facility_date?: string | null
          notification_count?: number | null
          order_id?: string | null
          origin_warehouse?: string
          out_for_delivery_date?: string | null
          quality_check_completed_date?: string | null
          quality_check_date?: string | null
          quality_check_status?: string | null
          quality_notes?: string | null
          quality_photos?: Json | null
          seller_name?: string | null
          seller_order_id?: string | null
          seller_platform?: string | null
          seller_ship_date?: string | null
          seller_tracking_id?: string | null
          service_type?: string | null
          shipment_number?: string
          shipment_type?: string
          shipping_carrier?: string | null
          third_party_account_id?: string | null
          third_party_service?: string | null
          third_party_tracking_id?: string | null
          updated_at?: string | null
          warehouse_arrival_date?: string | null
          warehouse_dispatch_date?: string | null
          warehouse_location?: Json | null
          weight_variance_approved?: boolean | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: string
          order_id: string | null
          previous_status: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          order_id?: string | null
          previous_status?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          order_id?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          active_items: number | null
          actual_delivery_date: string | null
          admin_notes: string | null
          amount_paid: number | null
          automation_enabled: boolean | null
          cancelled_items: number | null
          consolidation_preference: string | null
          created_at: string | null
          currency: string
          currency_fluctuation_amount: number | null
          current_order_total: number | null
          customer_id: string | null
          customer_notes: string | null
          delivered_at: string | null
          delivered_items: number | null
          delivery_address: Json | null
          delivery_method: string | null
          delivery_preference: string | null
          estimated_delivery_date: string | null
          first_shipment_date: string | null
          id: string
          last_delivery_date: string | null
          max_consolidation_wait_days: number | null
          order_data: Json | null
          order_number: string
          original_quote_data: Json | null
          original_quote_total: number | null
          overall_status: string | null
          payment_completed_at: string | null
          payment_method: string | null
          payment_status: string | null
          payment_verification_date: string | null
          photo_documentation_required: boolean | null
          primary_warehouse: string | null
          quality_check_requested: boolean | null
          quote_id: string | null
          refunded_items: number | null
          revision_pending_items: number | null
          seller_order_automation: Json | null
          shipped_at: string | null
          shipped_items: number | null
          status: string
          total_amount: number
          total_items: number | null
          total_refunded: number | null
          tracking_automation: Json | null
          tracking_id: string | null
          updated_at: string | null
          user_id: string | null
          variance_amount: number | null
        }
        Insert: {
          active_items?: number | null
          actual_delivery_date?: string | null
          admin_notes?: string | null
          amount_paid?: number | null
          automation_enabled?: boolean | null
          cancelled_items?: number | null
          consolidation_preference?: string | null
          created_at?: string | null
          currency?: string
          currency_fluctuation_amount?: number | null
          current_order_total?: number | null
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivered_items?: number | null
          delivery_address?: Json | null
          delivery_method?: string | null
          delivery_preference?: string | null
          estimated_delivery_date?: string | null
          first_shipment_date?: string | null
          id?: string
          last_delivery_date?: string | null
          max_consolidation_wait_days?: number | null
          order_data?: Json | null
          order_number: string
          original_quote_data?: Json | null
          original_quote_total?: number | null
          overall_status?: string | null
          payment_completed_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payment_verification_date?: string | null
          photo_documentation_required?: boolean | null
          primary_warehouse?: string | null
          quality_check_requested?: boolean | null
          quote_id?: string | null
          refunded_items?: number | null
          revision_pending_items?: number | null
          seller_order_automation?: Json | null
          shipped_at?: string | null
          shipped_items?: number | null
          status?: string
          total_amount?: number
          total_items?: number | null
          total_refunded?: number | null
          tracking_automation?: Json | null
          tracking_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          variance_amount?: number | null
        }
        Update: {
          active_items?: number | null
          actual_delivery_date?: string | null
          admin_notes?: string | null
          amount_paid?: number | null
          automation_enabled?: boolean | null
          cancelled_items?: number | null
          consolidation_preference?: string | null
          created_at?: string | null
          currency?: string
          currency_fluctuation_amount?: number | null
          current_order_total?: number | null
          customer_id?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          delivered_items?: number | null
          delivery_address?: Json | null
          delivery_method?: string | null
          delivery_preference?: string | null
          estimated_delivery_date?: string | null
          first_shipment_date?: string | null
          id?: string
          last_delivery_date?: string | null
          max_consolidation_wait_days?: number | null
          order_data?: Json | null
          order_number?: string
          original_quote_data?: Json | null
          original_quote_total?: number | null
          overall_status?: string | null
          payment_completed_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payment_verification_date?: string | null
          photo_documentation_required?: boolean | null
          primary_warehouse?: string | null
          quality_check_requested?: boolean | null
          quote_id?: string | null
          refunded_items?: number | null
          revision_pending_items?: number | null
          seller_order_automation?: Json | null
          shipped_at?: string | null
          shipped_items?: number | null
          status?: string
          total_amount?: number
          total_items?: number | null
          total_refunded?: number | null
          tracking_automation?: Json | null
          tracking_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          variance_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      package_events: {
        Row: {
          consolidation_group_id: string | null
          created_at: string | null
          event_data: Json | null
          event_description: string | null
          event_type: string
          from_location: string | null
          id: string
          package_id: string | null
          staff_id: string | null
          staff_notes: string | null
          to_location: string | null
        }
        Insert: {
          consolidation_group_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_description?: string | null
          event_type: string
          from_location?: string | null
          id?: string
          package_id?: string | null
          staff_id?: string | null
          staff_notes?: string | null
          to_location?: string | null
        }
        Update: {
          consolidation_group_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_description?: string | null
          event_type?: string
          from_location?: string | null
          id?: string
          package_id?: string | null
          staff_id?: string | null
          staff_notes?: string | null
          to_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_events_consolidation_group_id_fkey"
            columns: ["consolidation_group_id"]
            isOneToOne: false
            referencedRelation: "consolidation_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_adjustments: {
        Row: {
          adjusted_amount: number
          adjustment_reason: string
          adjustment_type: string
          adjustment_value: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          original_amount: number
          payment_ledger_id: string | null
          quote_id: string
          requested_at: string
          requested_by: string
          status: string | null
          updated_at: string
        }
        Insert: {
          adjusted_amount: number
          adjustment_reason: string
          adjustment_type: string
          adjustment_value: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency: string
          id?: string
          notes?: string | null
          original_amount: number
          payment_ledger_id?: string | null
          quote_id: string
          requested_at?: string
          requested_by: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          adjusted_amount?: number
          adjustment_reason?: string
          adjustment_type?: string
          adjustment_value?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          original_amount?: number
          payment_ledger_id?: string | null
          quote_id?: string
          requested_at?: string
          requested_by?: string
          status?: string | null
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
          priority: number | null
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
          priority?: number | null
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
          priority?: number | null
          supported_countries?: string[] | null
          supported_currencies?: string[] | null
          test_mode?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_health_logs: {
        Row: {
          alert_count: number
          avg_processing_time: number
          created_at: string | null
          error_rate: number
          id: string
          metrics: Json
          overall_health: string
          success_rate: number
          updated_at: string | null
        }
        Insert: {
          alert_count?: number
          avg_processing_time?: number
          created_at?: string | null
          error_rate?: number
          id?: string
          metrics?: Json
          overall_health?: string
          success_rate?: number
          updated_at?: string | null
        }
        Update: {
          alert_count?: number
          avg_processing_time?: number
          created_at?: string | null
          error_rate?: number
          id?: string
          metrics?: Json
          overall_health?: string
          success_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_method_discounts: {
        Row: {
          conditions: Json | null
          created_at: string | null
          discount_percentage: number
          id: string
          is_active: boolean | null
          is_stackable: boolean | null
          payment_method: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          discount_percentage: number
          id?: string
          is_active?: boolean | null
          is_stackable?: boolean | null
          payment_method: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean | null
          is_stackable?: boolean | null
          payment_method?: string
        }
        Relationships: []
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
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_reference: string | null
          created_at: string | null
          created_by: string | null
          credit_account: string | null
          currency: string | null
          customer_reference: string | null
          debit_account: string | null
          gateway_code: string | null
          gateway_response: Json | null
          gateway_transaction_id: string | null
          id: string
          is_fully_refunded: boolean | null
          last_refund_at: string | null
          metadata: Json | null
          notes: string | null
          parent_payment_id: string | null
          payment_method: string | null
          payment_proof_message_id: string | null
          payment_type: string | null
          paypal_capture_id: string | null
          paypal_order_id: string | null
          paypal_payer_email: string | null
          paypal_payer_id: string | null
          posted_at: string | null
          quote_id: string | null
          reference_number: string | null
          refund_count: number | null
          reversal_reason: string | null
          reversed_by: string | null
          status: string | null
          total_refunded: number | null
          transaction_type: string | null
          updated_at: string | null
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_reference?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_account?: string | null
          currency?: string | null
          customer_reference?: string | null
          debit_account?: string | null
          gateway_code?: string | null
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          is_fully_refunded?: boolean | null
          last_refund_at?: string | null
          metadata?: Json | null
          notes?: string | null
          parent_payment_id?: string | null
          payment_method?: string | null
          payment_proof_message_id?: string | null
          payment_type?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payer_email?: string | null
          paypal_payer_id?: string | null
          posted_at?: string | null
          quote_id?: string | null
          reference_number?: string | null
          refund_count?: number | null
          reversal_reason?: string | null
          reversed_by?: string | null
          status?: string | null
          total_refunded?: number | null
          transaction_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_reference?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_account?: string | null
          currency?: string | null
          customer_reference?: string | null
          debit_account?: string | null
          gateway_code?: string | null
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          is_fully_refunded?: boolean | null
          last_refund_at?: string | null
          metadata?: Json | null
          notes?: string | null
          parent_payment_id?: string | null
          payment_method?: string | null
          payment_proof_message_id?: string | null
          payment_type?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payer_email?: string | null
          paypal_payer_id?: string | null
          posted_at?: string | null
          quote_id?: string | null
          reference_number?: string | null
          refund_count?: number | null
          reversal_reason?: string | null
          reversed_by?: string | null
          status?: string | null
          total_refunded?: number | null
          transaction_type?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_verification_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          gateway: string
          gateway_response: Json | null
          id: string
          request_id: string
          success: boolean
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          gateway: string
          gateway_response?: Json | null
          id?: string
          request_id: string
          success?: boolean
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          gateway?: string
          gateway_response?: Json | null
          id?: string
          request_id?: string
          success?: boolean
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      paypal_refund_reasons: {
        Row: {
          code: string
          created_at: string
          customer_friendly_description: string | null
          description: string
          display_order: number | null
          is_active: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          customer_friendly_description?: string | null
          description: string
          display_order?: number | null
          is_active?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          customer_friendly_description?: string | null
          description?: string
          display_order?: number | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      paypal_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          resource_id: string | null
          resource_type: string | null
          summary: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          summary?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          summary?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          phone: string
          type: string | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          phone: string
          type?: string | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          phone?: string
          type?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      pickup_time_slots: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          slot_name: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          slot_name: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          slot_name?: string
          start_time?: string
        }
        Relationships: []
      }
      pricing_calculation_cache: {
        Row: {
          applicable_rate: number
          calculated_amount: number
          calculation_metadata: Json | null
          country_code: string
          created_at: string
          expires_at: string
          id: string
          max_amount: number | null
          min_amount: number | null
          order_value: number
          pricing_tier: string
          service_id: string
          source_id: string | null
        }
        Insert: {
          applicable_rate: number
          calculated_amount: number
          calculation_metadata?: Json | null
          country_code: string
          created_at?: string
          expires_at?: string
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          order_value: number
          pricing_tier: string
          service_id: string
          source_id?: string | null
        }
        Update: {
          applicable_rate?: number
          calculated_amount?: number
          calculation_metadata?: Json | null
          country_code?: string
          created_at?: string
          expires_at?: string
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          order_value?: number
          pricing_tier?: string
          service_id?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_calculation_cache_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "addon_services"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_change_approvals: {
        Row: {
          approval_reason: string | null
          approval_threshold_met: boolean | null
          approved_at: string | null
          approved_by: string | null
          change_log_id: string | null
          estimated_revenue_impact: number | null
          id: string
          impact_level: string | null
          requires_approval: boolean | null
          status: string
          submitted_at: string | null
        }
        Insert: {
          approval_reason?: string | null
          approval_threshold_met?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          change_log_id?: string | null
          estimated_revenue_impact?: number | null
          id?: string
          impact_level?: string | null
          requires_approval?: boolean | null
          status?: string
          submitted_at?: string | null
        }
        Update: {
          approval_reason?: string | null
          approval_threshold_met?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          change_log_id?: string | null
          estimated_revenue_impact?: number | null
          id?: string
          impact_level?: string | null
          requires_approval?: boolean | null
          status?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_change_approvals_change_log_id_fkey"
            columns: ["change_log_id"]
            isOneToOne: false
            referencedRelation: "pricing_change_log"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_change_log: {
        Row: {
          affected_countries: number | null
          batch_id: string | null
          change_method: string
          change_reason: string
          change_type: string
          changed_by: string | null
          created_at: string | null
          effective_from: string | null
          id: string
          identifier: string
          identifier_name: string | null
          ip_address: string | null
          new_max_amount: number | null
          new_min_amount: number | null
          new_rate: number
          old_max_amount: number | null
          old_min_amount: number | null
          old_rate: number | null
          service_id: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          affected_countries?: number | null
          batch_id?: string | null
          change_method?: string
          change_reason: string
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          effective_from?: string | null
          id?: string
          identifier: string
          identifier_name?: string | null
          ip_address?: string | null
          new_max_amount?: number | null
          new_min_amount?: number | null
          new_rate: number
          old_max_amount?: number | null
          old_min_amount?: number | null
          old_rate?: number | null
          service_id?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          affected_countries?: number | null
          batch_id?: string | null
          change_method?: string
          change_reason?: string
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          effective_from?: string | null
          id?: string
          identifier?: string
          identifier_name?: string | null
          ip_address?: string | null
          new_max_amount?: number | null
          new_min_amount?: number | null
          new_rate?: number
          old_max_amount?: number | null
          old_min_amount?: number | null
          old_rate?: number | null
          service_id?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_change_log_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "addon_services"
            referencedColumns: ["id"]
          },
        ]
      }
      product_classifications: {
        Row: {
          category: string
          classification_code: string
          confidence_score: number | null
          country_code: string
          country_data: Json
          created_at: string | null
          created_by: string | null
          customs_rate: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          minimum_valuation_usd: number | null
          product_name: string
          search_keywords: string[] | null
          subcategory: string | null
          tags: string[] | null
          typical_dimensions: Json | null
          typical_weight_kg: number | null
          updated_at: string | null
          usage_frequency: number | null
          valuation_method: string | null
          volume_category: string | null
          weight_variance_factor: number | null
        }
        Insert: {
          category: string
          classification_code: string
          confidence_score?: number | null
          country_code: string
          country_data?: Json
          created_at?: string | null
          created_by?: string | null
          customs_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          minimum_valuation_usd?: number | null
          product_name: string
          search_keywords?: string[] | null
          subcategory?: string | null
          tags?: string[] | null
          typical_dimensions?: Json | null
          typical_weight_kg?: number | null
          updated_at?: string | null
          usage_frequency?: number | null
          valuation_method?: string | null
          volume_category?: string | null
          weight_variance_factor?: number | null
        }
        Update: {
          category?: string
          classification_code?: string
          confidence_score?: number | null
          country_code?: string
          country_data?: Json
          created_at?: string | null
          created_by?: string | null
          customs_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          minimum_valuation_usd?: number | null
          product_name?: string
          search_keywords?: string[] | null
          subcategory?: string | null
          tags?: string[] | null
          typical_dimensions?: Json | null
          typical_weight_kg?: number | null
          updated_at?: string | null
          usage_frequency?: number | null
          valuation_method?: string | null
          volume_category?: string | null
          weight_variance_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_classifications_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_configs"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "product_classifications_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "smart_product_intelligence_summary"
            referencedColumns: ["country_code"]
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
          phone_verified: boolean | null
          preferred_display_currency: string | null
          preferred_payment_gateway: string | null
          referral_code: string | null
          tags: string | null
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
          phone_verified?: boolean | null
          preferred_display_currency?: string | null
          preferred_payment_gateway?: string | null
          referral_code?: string | null
          tags?: string | null
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
          phone_verified?: boolean | null
          preferred_display_currency?: string | null
          preferred_payment_gateway?: string | null
          referral_code?: string | null
          tags?: string | null
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
        Relationships: []
      }
      quote_items_v2: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          quantity: number
          quote_id: string | null
          subtotal_origin: number | null
          total_weight_kg: number | null
          unit_price_origin: number
          updated_at: string | null
          url: string | null
          weight_kg: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          quantity?: number
          quote_id?: string | null
          subtotal_origin?: number | null
          total_weight_kg?: number | null
          unit_price_origin: number
          updated_at?: string | null
          url?: string | null
          weight_kg?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          quantity?: number
          quote_id?: string | null
          subtotal_origin?: number | null
          total_weight_kg?: number | null
          unit_price_origin?: number
          updated_at?: string | null
          url?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_v2_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_v2_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_v2_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_v2_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
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
      quotes_v2: {
        Row: {
          admin_notes: string | null
          api_version: string | null
          applied_discount_codes: Json | null
          applied_discounts: Json | null
          approval_required: boolean | null
          approval_required_above: number | null
          approved_at: string | null
          approved_by: string | null
          calculated_at: string | null
          calculation_data: Json | null
          changes_summary: string | null
          converted_to_order_id: string | null
          costprice_total_origin: number | null
          created_at: string | null
          created_by: string | null
          customer_currency: string | null
          customer_email: string
          customer_id: string | null
          customer_message: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          delivery_address_id: string | null
          destination_country: string
          discount_amounts: Json | null
          discount_codes: string[] | null
          email_sent: boolean | null
          expires_at: string | null
          external_reference: string | null
          final_total_origin: number | null
          final_total_origincurrency: number | null
          has_documents: boolean | null
          id: string
          in_cart: boolean | null
          insurance_coverage_amount: number | null
          insurance_rate_percentage: number | null
          insurance_required: boolean | null
          ip_address: unknown | null
          is_latest_version: boolean | null
          items: Json
          last_reminder_at: string | null
          max_discount_allowed: number | null
          max_discount_percentage: number | null
          minimum_order_value: number | null
          options_last_updated_at: string | null
          options_last_updated_by: string | null
          origin_country: string
          original_quote_id: string | null
          parent_quote_id: string | null
          payment_terms: string | null
          preferred_contact: string | null
          quote_number: string | null
          reminder_count: number | null
          revision_reason: string | null
          selected_shipping_option_id: string | null
          sent_at: string | null
          share_token: string | null
          shipping_method: string | null
          sms_sent: boolean | null
          source: string | null
          status: string
          total_quote_origincurrency: number | null
          total_origin_currency: number | null
          total_quote_origincurrency: number | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          validity_days: number | null
          version: number | null
          viewed_at: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          api_version?: string | null
          applied_discount_codes?: Json | null
          applied_discounts?: Json | null
          approval_required?: boolean | null
          approval_required_above?: number | null
          approved_at?: string | null
          approved_by?: string | null
          calculated_at?: string | null
          calculation_data?: Json | null
          changes_summary?: string | null
          converted_to_order_id?: string | null
          costprice_total_origin?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_currency?: string | null
          customer_email: string
          customer_id?: string | null
          customer_message?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          delivery_address_id?: string | null
          destination_country: string
          discount_amounts?: Json | null
          discount_codes?: string[] | null
          email_sent?: boolean | null
          expires_at?: string | null
          external_reference?: string | null
          final_total_origin?: number | null
          final_total_origincurrency?: number | null
          has_documents?: boolean | null
          id?: string
          in_cart?: boolean | null
          insurance_coverage_amount?: number | null
          insurance_rate_percentage?: number | null
          insurance_required?: boolean | null
          ip_address?: unknown | null
          is_latest_version?: boolean | null
          items?: Json
          last_reminder_at?: string | null
          max_discount_allowed?: number | null
          max_discount_percentage?: number | null
          minimum_order_value?: number | null
          options_last_updated_at?: string | null
          options_last_updated_by?: string | null
          origin_country: string
          original_quote_id?: string | null
          parent_quote_id?: string | null
          payment_terms?: string | null
          preferred_contact?: string | null
          quote_number?: string | null
          reminder_count?: number | null
          revision_reason?: string | null
          selected_shipping_option_id?: string | null
          sent_at?: string | null
          share_token?: string | null
          shipping_method?: string | null
          sms_sent?: boolean | null
          source?: string | null
          status?: string
          total_quote_origincurrency?: number | null
          total_origin_currency?: number | null
          total_quote_origincurrency?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          validity_days?: number | null
          version?: number | null
          viewed_at?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          api_version?: string | null
          applied_discount_codes?: Json | null
          applied_discounts?: Json | null
          approval_required?: boolean | null
          approval_required_above?: number | null
          approved_at?: string | null
          approved_by?: string | null
          calculated_at?: string | null
          calculation_data?: Json | null
          changes_summary?: string | null
          converted_to_order_id?: string | null
          costprice_total_origin?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_currency?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_message?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          delivery_address_id?: string | null
          destination_country?: string
          discount_amounts?: Json | null
          discount_codes?: string[] | null
          email_sent?: boolean | null
          expires_at?: string | null
          external_reference?: string | null
          final_total_origin?: number | null
          final_total_origincurrency?: number | null
          has_documents?: boolean | null
          id?: string
          in_cart?: boolean | null
          insurance_coverage_amount?: number | null
          insurance_rate_percentage?: number | null
          insurance_required?: boolean | null
          ip_address?: unknown | null
          is_latest_version?: boolean | null
          items?: Json
          last_reminder_at?: string | null
          max_discount_allowed?: number | null
          max_discount_percentage?: number | null
          minimum_order_value?: number | null
          options_last_updated_at?: string | null
          options_last_updated_by?: string | null
          origin_country?: string
          original_quote_id?: string | null
          parent_quote_id?: string | null
          payment_terms?: string | null
          preferred_contact?: string | null
          quote_number?: string | null
          reminder_count?: number | null
          revision_reason?: string | null
          selected_shipping_option_id?: string | null
          sent_at?: string | null
          share_token?: string | null
          shipping_method?: string | null
          sms_sent?: boolean | null
          source?: string | null
          status?: string
          total_quote_origincurrency?: number | null
          total_origin_currency?: number | null
          total_quote_origincurrency?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          validity_days?: number | null
          version?: number | null
          viewed_at?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_v2_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "delivery_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_items: {
        Row: {
          created_at: string
          discrepancy_amount: number | null
          discrepancy_reason: string | null
          id: string
          match_confidence: number | null
          match_type: string | null
          matched: boolean | null
          matched_at: string | null
          matched_by: string | null
          payment_ledger_id: string | null
          reconciliation_id: string
          resolution_action: string | null
          resolution_notes: string | null
          statement_amount: number | null
          statement_date: string | null
          statement_description: string | null
          statement_reference: string | null
          status: string | null
          system_amount: number | null
          system_date: string | null
          system_description: string | null
          system_reference: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discrepancy_amount?: number | null
          discrepancy_reason?: string | null
          id?: string
          match_confidence?: number | null
          match_type?: string | null
          matched?: boolean | null
          matched_at?: string | null
          matched_by?: string | null
          payment_ledger_id?: string | null
          reconciliation_id: string
          resolution_action?: string | null
          resolution_notes?: string | null
          statement_amount?: number | null
          statement_date?: string | null
          statement_description?: string | null
          statement_reference?: string | null
          status?: string | null
          system_amount?: number | null
          system_date?: string | null
          system_description?: string | null
          system_reference?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discrepancy_amount?: number | null
          discrepancy_reason?: string | null
          id?: string
          match_confidence?: number | null
          match_type?: string | null
          matched?: boolean | null
          matched_at?: string | null
          matched_by?: string | null
          payment_ledger_id?: string | null
          reconciliation_id?: string
          resolution_action?: string | null
          resolution_notes?: string | null
          statement_amount?: number | null
          statement_date?: string | null
          statement_description?: string | null
          statement_reference?: string | null
          status?: string | null
          system_amount?: number | null
          system_date?: string | null
          system_description?: string | null
          system_reference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reconciliation_rules: {
        Row: {
          amount_tolerance: number | null
          auto_match: boolean | null
          confidence_threshold: number | null
          created_at: string
          created_by: string
          date_tolerance_days: number | null
          gateway_code: string | null
          id: string
          is_active: boolean | null
          match_field: string | null
          match_pattern: string | null
          payment_method: string | null
          priority: number | null
          rule_name: string
          rule_type: string
          success_count: number | null
          times_used: number | null
          updated_at: string
        }
        Insert: {
          amount_tolerance?: number | null
          auto_match?: boolean | null
          confidence_threshold?: number | null
          created_at?: string
          created_by: string
          date_tolerance_days?: number | null
          gateway_code?: string | null
          id?: string
          is_active?: boolean | null
          match_field?: string | null
          match_pattern?: string | null
          payment_method?: string | null
          priority?: number | null
          rule_name: string
          rule_type: string
          success_count?: number | null
          times_used?: number | null
          updated_at?: string
        }
        Update: {
          amount_tolerance?: number | null
          auto_match?: boolean | null
          confidence_threshold?: number | null
          created_at?: string
          created_by?: string
          date_tolerance_days?: number | null
          gateway_code?: string | null
          id?: string
          is_active?: boolean | null
          match_field?: string | null
          match_pattern?: string | null
          payment_method?: string | null
          priority?: number | null
          rule_name?: string
          rule_type?: string
          success_count?: number | null
          times_used?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      refund_items: {
        Row: {
          allocated_amount: number
          base_amount: number
          created_at: string
          currency: string
          exchange_rate: number | null
          gateway_code: string | null
          gateway_refund_id: string | null
          gateway_response: Json | null
          id: string
          notes: string | null
          payment_ledger_id: string
          processed_at: string | null
          refund_payment_id: string | null
          refund_request_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          allocated_amount: number
          base_amount: number
          created_at?: string
          currency: string
          exchange_rate?: number | null
          gateway_code?: string | null
          gateway_refund_id?: string | null
          gateway_response?: Json | null
          id?: string
          notes?: string | null
          payment_ledger_id: string
          processed_at?: string | null
          refund_payment_id?: string | null
          refund_request_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          base_amount?: number
          created_at?: string
          currency?: string
          exchange_rate?: number | null
          gateway_code?: string | null
          gateway_refund_id?: string | null
          gateway_response?: Json | null
          id?: string
          notes?: string | null
          payment_ledger_id?: string
          processed_at?: string | null
          refund_payment_id?: string | null
          refund_request_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_items_refund_request_id_fkey"
            columns: ["refund_request_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          approved_amount: number | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_notes: string | null
          id: string
          internal_notes: string | null
          metadata: Json | null
          payment_transaction_id: string | null
          processed_at: string | null
          processed_by: string | null
          quote_id: string
          reason_code: string
          reason_description: string
          refund_method: string | null
          refund_type: string
          requested_amount: number
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          approved_amount?: number | null
          completed_at?: string | null
          created_at?: string
          currency: string
          customer_notes?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          payment_transaction_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          quote_id: string
          reason_code: string
          reason_description: string
          refund_method?: string | null
          refund_type: string
          requested_amount: number
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          approved_amount?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_notes?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          payment_transaction_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          quote_id?: string
          reason_code?: string
          reason_description?: string
          refund_method?: string | null
          refund_type?: string
          requested_amount?: number
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_pricing: {
        Row: {
          country_codes: string[]
          created_at: string
          currency_code: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          notes: string | null
          priority: number | null
          rate: number
          region_description: string | null
          region_key: string
          region_name: string
          service_id: string
          updated_at: string
        }
        Insert: {
          country_codes: string[]
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          notes?: string | null
          priority?: number | null
          rate: number
          region_description?: string | null
          region_key: string
          region_name: string
          service_id: string
          updated_at?: string
        }
        Update: {
          country_codes?: string[]
          created_at?: string
          currency_code?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          notes?: string | null
          priority?: number | null
          rate?: number
          region_description?: string | null
          region_key?: string
          region_name?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "addon_services"
            referencedColumns: ["id"]
          },
        ]
      }
      rejection_reasons: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          updated_at?: string | null
        }
        Relationships: []
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
          sales_tax_percentage: number | null
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
          sales_tax_percentage?: number | null
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
          sales_tax_percentage?: number | null
          updated_at?: string | null
          vat_percentage?: number
          weight_max?: number | null
          weight_min?: number | null
        }
        Relationships: []
      }
      seller_order_automation: {
        Row: {
          api_response: Json | null
          automation_config: Json | null
          automation_status: string | null
          automation_type: string
          brightdata_session_id: string | null
          completed_at: string | null
          created_at: string | null
          data_quality_score: number | null
          error_message: string | null
          execution_time_seconds: number | null
          id: string
          manual_review_notes: string | null
          max_retries: number | null
          next_retry_at: string | null
          order_item_id: string | null
          requires_manual_review: boolean | null
          retry_count: number | null
          retry_delay_minutes: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          scraped_data: Json | null
          seller_account_type: string | null
          seller_platform: string
          started_at: string | null
          success: boolean | null
        }
        Insert: {
          api_response?: Json | null
          automation_config?: Json | null
          automation_status?: string | null
          automation_type: string
          brightdata_session_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          error_message?: string | null
          execution_time_seconds?: number | null
          id?: string
          manual_review_notes?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          order_item_id?: string | null
          requires_manual_review?: boolean | null
          retry_count?: number | null
          retry_delay_minutes?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scraped_data?: Json | null
          seller_account_type?: string | null
          seller_platform: string
          started_at?: string | null
          success?: boolean | null
        }
        Update: {
          api_response?: Json | null
          automation_config?: Json | null
          automation_status?: string | null
          automation_type?: string
          brightdata_session_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          error_message?: string | null
          execution_time_seconds?: number | null
          id?: string
          manual_review_notes?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          order_item_id?: string | null
          requires_manual_review?: boolean | null
          retry_count?: number | null
          retry_delay_minutes?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scraped_data?: Json | null
          seller_account_type?: string | null
          seller_platform?: string
          started_at?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_order_automation_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      share_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          quote_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          quote_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          quote_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_audit_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_audit_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_audit_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_audit_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          condition_photos: Json | null
          created_at: string | null
          customs_declared_value: number | null
          id: string
          item_value_in_shipment: number | null
          item_weight_in_shipment: number | null
          order_item_id: string | null
          quality_notes: string | null
          quantity_in_shipment: number
          received_condition: string | null
          shipment_id: string | null
        }
        Insert: {
          condition_photos?: Json | null
          created_at?: string | null
          customs_declared_value?: number | null
          id?: string
          item_value_in_shipment?: number | null
          item_weight_in_shipment?: number | null
          order_item_id?: string | null
          quality_notes?: string | null
          quantity_in_shipment?: number
          received_condition?: string | null
          shipment_id?: string | null
        }
        Update: {
          condition_photos?: Json | null
          created_at?: string | null
          customs_declared_value?: number | null
          id?: string
          item_value_in_shipment?: number | null
          item_weight_in_shipment?: number | null
          order_item_id?: string | null
          quality_notes?: string | null
          quantity_in_shipment?: number
          received_condition?: string | null
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "order_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_tracking_events: {
        Row: {
          admin_user_id: string | null
          api_response: Json | null
          carrier: string | null
          city: string | null
          country_code: string | null
          created_at: string | null
          customer_visible: boolean | null
          data_source: string | null
          description: string
          event_status: string
          event_timestamp: string | null
          event_type: string
          external_tracking_id: string | null
          id: string
          location: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          postal_code: string | null
          shipment_id: string | null
          system_generated: boolean | null
          tracking_tier: string
          webhook_data: Json | null
        }
        Insert: {
          admin_user_id?: string | null
          api_response?: Json | null
          carrier?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          customer_visible?: boolean | null
          data_source?: string | null
          description: string
          event_status: string
          event_timestamp?: string | null
          event_type: string
          external_tracking_id?: string | null
          id?: string
          location?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          postal_code?: string | null
          shipment_id?: string | null
          system_generated?: boolean | null
          tracking_tier: string
          webhook_data?: Json | null
        }
        Update: {
          admin_user_id?: string | null
          api_response?: Json | null
          carrier?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          customer_visible?: boolean | null
          data_source?: string | null
          description?: string
          event_status?: string
          event_timestamp?: string | null
          event_type?: string
          external_tracking_id?: string | null
          id?: string
          location?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          postal_code?: string | null
          shipment_id?: string | null
          system_generated?: boolean | null
          tracking_tier?: string
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "order_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_routes: {
        Row: {
          active: boolean | null
          api_configuration: Json | null
          base_shipping_cost: number
          cost_per_kg: number
          cost_percentage: number | null
          created_at: string | null
          customs_clearance_days: number | null
          delivery_options: Json | null
          destination_country: string
          exchange_rate: number | null
          id: number
          is_active: boolean | null
          origin_country: string
          processing_days: number | null
          shipping_per_kg: number | null
          tax_configuration: Json | null
          updated_at: string | null
          weight_configuration: Json | null
          weight_tiers: Json | null
          weight_unit: string
        }
        Insert: {
          active?: boolean | null
          api_configuration?: Json | null
          base_shipping_cost: number
          cost_per_kg: number
          cost_percentage?: number | null
          created_at?: string | null
          customs_clearance_days?: number | null
          delivery_options?: Json | null
          destination_country: string
          exchange_rate?: number | null
          id?: number
          is_active?: boolean | null
          origin_country: string
          processing_days?: number | null
          shipping_per_kg?: number | null
          tax_configuration?: Json | null
          updated_at?: string | null
          weight_configuration?: Json | null
          weight_tiers?: Json | null
          weight_unit?: string
        }
        Update: {
          active?: boolean | null
          api_configuration?: Json | null
          base_shipping_cost?: number
          cost_per_kg?: number
          cost_percentage?: number | null
          created_at?: string | null
          customs_clearance_days?: number | null
          delivery_options?: Json | null
          destination_country?: string
          exchange_rate?: number | null
          id?: number
          is_active?: boolean | null
          origin_country?: string
          processing_days?: number | null
          shipping_per_kg?: number | null
          tax_configuration?: Json | null
          updated_at?: string | null
          weight_configuration?: Json | null
          weight_tiers?: Json | null
          weight_unit?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          cost: number | null
          country_code: string | null
          created_at: string | null
          credits_used: number | null
          customer_phone: string | null
          delivered_at: string | null
          direction: string
          error_message: string | null
          failed_at: string | null
          from_phone: string
          id: string
          message: string
          message_id: string | null
          metadata: Json | null
          provider: string | null
          sent_at: string | null
          status: string
          to_phone: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cost?: number | null
          country_code?: string | null
          created_at?: string | null
          credits_used?: number | null
          customer_phone?: string | null
          delivered_at?: string | null
          direction: string
          error_message?: string | null
          failed_at?: string | null
          from_phone: string
          id?: string
          message: string
          message_id?: string | null
          metadata?: Json | null
          provider?: string | null
          sent_at?: string | null
          status?: string
          to_phone: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cost?: number | null
          country_code?: string | null
          created_at?: string | null
          credits_used?: number | null
          customer_phone?: string | null
          delivered_at?: string | null
          direction?: string
          error_message?: string | null
          failed_at?: string | null
          from_phone?: string
          id?: string
          message?: string
          message_id?: string | null
          metadata?: Json | null
          provider?: string | null
          sent_at?: string | null
          status?: string
          to_phone?: string
          updated_at?: string | null
          user_id?: string | null
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
        Relationships: []
      }
      support_interactions: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          interaction_type: string
          is_internal: boolean | null
          metadata: Json | null
          support_id: string | null
          user_id: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          interaction_type: string
          is_internal?: boolean | null
          metadata?: Json | null
          support_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          interaction_type?: string
          is_internal?: boolean | null
          metadata?: Json | null
          support_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_interactions_support_id_fkey"
            columns: ["support_id"]
            isOneToOne: false
            referencedRelation: "support_system"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_interactions_support_id_fkey"
            columns: ["support_id"]
            isOneToOne: false
            referencedRelation: "support_tickets_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_interactions_support_id_fkey"
            columns: ["support_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_system: {
        Row: {
          assignment_data: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notification_prefs: Json | null
          quote_id: string | null
          sla_data: Json | null
          system_type: string
          template_data: Json | null
          ticket_data: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assignment_data?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_prefs?: Json | null
          quote_id?: string | null
          sla_data?: Json | null
          system_type: string
          template_data?: Json | null
          ticket_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assignment_data?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_prefs?: Json | null
          quote_id?: string | null
          sla_data?: Json | null
          system_type?: string
          template_data?: Json | null
          ticket_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
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
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          request_id: string
          status: string
          updated_at: string | null
          user_agent: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_id: string
          status: string
          updated_at?: string | null
          user_agent?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          request_id?: string
          status?: string
          updated_at?: string | null
          user_agent?: string | null
          webhook_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_quotes: {
        Row: {
          admin_notes: string | null
          api_version: string | null
          approval_required: boolean | null
          approval_required_above: number | null
          approved_at: string | null
          approved_by: string | null
          calculated_at: string | null
          calculation_data: Json | null
          changes_summary: string | null
          converted_to_order_id: string | null
          created_at: string | null
          created_by: string | null
          customer_currency: string | null
          customer_email: string | null
          customer_id: string | null
          customer_message: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          destination_country: string | null
          email_sent: boolean | null
          expires_at: string | null
          external_reference: string | null
          id: string | null
          insurance_required: boolean | null
          ip_address: unknown | null
          is_active: boolean | null
          is_latest_version: boolean | null
          items: Json | null
          last_reminder_at: string | null
          max_discount_allowed: number | null
          max_discount_percentage: number | null
          minimum_order_value: number | null
          origin_country: string | null
          original_quote_id: string | null
          parent_quote_id: string | null
          payment_terms: string | null
          preferred_contact: string | null
          quote_number: string | null
          reminder_count: number | null
          revision_reason: string | null
          sent_at: string | null
          share_token: string | null
          shipping_method: string | null
          sms_sent: boolean | null
          source: string | null
          status: string | null
          time_remaining: unknown | null
          total_quote_origincurrency: number | null
          total_quote_origincurrency: number | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          validity_days: number | null
          version: number | null
          viewed_at: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          api_version?: string | null
          approval_required?: boolean | null
          approval_required_above?: number | null
          approved_at?: string | null
          approved_by?: string | null
          calculated_at?: string | null
          calculation_data?: Json | null
          changes_summary?: string | null
          converted_to_order_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_message?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          destination_country?: string | null
          email_sent?: boolean | null
          expires_at?: string | null
          external_reference?: string | null
          id?: string | null
          insurance_required?: boolean | null
          ip_address?: unknown | null
          is_active?: never
          is_latest_version?: boolean | null
          items?: Json | null
          last_reminder_at?: string | null
          max_discount_allowed?: number | null
          max_discount_percentage?: number | null
          minimum_order_value?: number | null
          origin_country?: string | null
          original_quote_id?: string | null
          parent_quote_id?: string | null
          payment_terms?: string | null
          preferred_contact?: string | null
          quote_number?: string | null
          reminder_count?: number | null
          revision_reason?: string | null
          sent_at?: string | null
          share_token?: string | null
          shipping_method?: string | null
          sms_sent?: boolean | null
          source?: string | null
          status?: string | null
          time_remaining?: never
          total_quote_origincurrency?: number | null
          total_quote_origincurrency?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          validity_days?: number | null
          version?: number | null
          viewed_at?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          api_version?: string | null
          approval_required?: boolean | null
          approval_required_above?: number | null
          approved_at?: string | null
          approved_by?: string | null
          calculated_at?: string | null
          calculation_data?: Json | null
          changes_summary?: string | null
          converted_to_order_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_message?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          destination_country?: string | null
          email_sent?: boolean | null
          expires_at?: string | null
          external_reference?: string | null
          id?: string | null
          insurance_required?: boolean | null
          ip_address?: unknown | null
          is_active?: never
          is_latest_version?: boolean | null
          items?: Json | null
          last_reminder_at?: string | null
          max_discount_allowed?: number | null
          max_discount_percentage?: number | null
          minimum_order_value?: number | null
          origin_country?: string | null
          original_quote_id?: string | null
          parent_quote_id?: string | null
          payment_terms?: string | null
          preferred_contact?: string | null
          quote_number?: string | null
          reminder_count?: number | null
          revision_reason?: string | null
          sent_at?: string | null
          share_token?: string | null
          shipping_method?: string | null
          sms_sent?: boolean | null
          source?: string | null
          status?: string | null
          time_remaining?: never
          total_quote_origincurrency?: number | null
          total_quote_origincurrency?: number | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          validity_days?: number | null
          version?: number | null
          viewed_at?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_v2_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_v2_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      market_country_summary: {
        Row: {
          active_country_count: number | null
          country_count: number | null
          is_primary_market: boolean | null
          market_code: string | null
          market_id: string | null
          market_name: string | null
          primary_country: string | null
        }
        Relationships: []
      }
      orders_with_details: {
        Row: {
          actual_delivery_date: string | null
          admin_notes: string | null
          amount_paid: number | null
          calculated_total: number | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_address: Json | null
          delivery_method: string | null
          estimated_delivery_date: string | null
          id: string | null
          item_count: number | null
          order_data: Json | null
          order_number: string | null
          payment_method: string | null
          payment_status: string | null
          shipped_at: string | null
          status: string | null
          total_amount: number | null
          tracking_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      payment_health_dashboard: {
        Row: {
          avg_error_rate: number | null
          avg_processing_time: number | null
          avg_success_rate: number | null
          check_count: number | null
          check_time: string | null
          overall_health: string | null
          total_alerts: number | null
        }
        Relationships: []
      }
      pricing_hierarchy_view: {
        Row: {
          continent: string | null
          continental_rate: number | null
          country_code: string | null
          country_rate: number | null
          country_reason: string | null
          default_rate: number | null
          is_active: boolean | null
          pricing_type: string | null
          region_key: string | null
          region_name: string | null
          regional_countries: string[] | null
          regional_priority: number | null
          regional_rate: number | null
          service_category: string | null
          service_key: string | null
          service_name: string | null
        }
        Relationships: []
      }
      pricing_summary_admin: {
        Row: {
          continental_rules: number | null
          country_overrides: number | null
          created_at: string | null
          default_rate: number | null
          is_active: boolean | null
          max_rate: number | null
          min_rate: number | null
          regional_rules: number | null
          service_key: string | null
          service_name: string | null
        }
        Relationships: []
      }
      quote_options_analytics: {
        Row: {
          applied_discounts: Json | null
          approved_at: string | null
          created_at: string | null
          customer_currency: string | null
          customer_email: string | null
          customer_id: string | null
          destination_country: string | null
          id: string | null
          insurance_required: boolean | null
          options_last_updated_at: string | null
          options_last_updated_by: string | null
          origin_country: string | null
          selected_shipping_option_id: string | null
          status: string | null
          total_quote_origincurrency: number | null
          total_quote_origincurrency: number | null
        }
        Insert: {
          applied_discounts?: Json | null
          approved_at?: string | null
          created_at?: string | null
          customer_currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          destination_country?: string | null
          id?: string | null
          insurance_required?: boolean | null
          options_last_updated_at?: string | null
          options_last_updated_by?: string | null
          origin_country?: string | null
          selected_shipping_option_id?: string | null
          status?: string | null
          total_quote_origincurrency?: number | null
          total_quote_origincurrency?: number | null
        }
        Update: {
          applied_discounts?: Json | null
          approved_at?: string | null
          created_at?: string | null
          customer_currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          destination_country?: string | null
          id?: string | null
          insurance_required?: boolean | null
          options_last_updated_at?: string | null
          options_last_updated_by?: string | null
          origin_country?: string | null
          selected_shipping_option_id?: string | null
          status?: string | null
          total_quote_origincurrency?: number | null
          total_quote_origincurrency?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_v2_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes_with_legacy_fields: {
        Row: {
          created_at: string | null
          customer_currency: string | null
          customer_email: string | null
          customer_id: string | null
          destination_country: string | null
          id: string | null
          legacy_total_customer_currency: number | null
          legacy_total_usd: number | null
          origin_country: string | null
          status: string | null
          total_quote_origincurrency: number | null
          total_quote_origincurrency: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          destination_country?: string | null
          id?: string | null
          legacy_total_customer_currency?: number | null
          legacy_total_usd?: number | null
          origin_country?: string | null
          status?: string | null
          total_quote_origincurrency?: number | null
          total_quote_origincurrency?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          destination_country?: string | null
          id?: string | null
          legacy_total_customer_currency?: number | null
          legacy_total_usd?: number | null
          origin_country?: string | null
          status?: string | null
          total_quote_origincurrency?: number | null
          total_quote_origincurrency?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_v2_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_product_intelligence_summary: {
        Row: {
          active_classifications: number | null
          avg_confidence: number | null
          categories_count: number | null
          classification_system: string | null
          country_code: string | null
          country_name: string | null
          total_classifications: number | null
        }
        Relationships: []
      }
      support_tickets_view: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          priority: string | null
          quote_id: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: never
          category?: never
          created_at?: string | null
          description?: never
          id?: string | null
          is_active?: boolean | null
          priority?: never
          quote_id?: string | null
          status?: never
          subject?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: never
          category?: never
          created_at?: string | null
          description?: never
          id?: string | null
          is_active?: boolean | null
          priority?: never
          quote_id?: string | null
          status?: never
          subject?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies_view: {
        Row: {
          created_at: string | null
          id: string | null
          is_internal: boolean | null
          message: string | null
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_internal?: boolean | null
          message?: never
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_internal?: boolean | null
          message?: never
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_interactions_support_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_system"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_interactions_support_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_interactions_support_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          priority: string | null
          quote_id: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: never
          category?: never
          created_at?: string | null
          description?: never
          id?: string | null
          is_active?: boolean | null
          priority?: never
          quote_id?: string | null
          status?: never
          subject?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: never
          category?: never
          created_at?: string | null
          description?: never
          id?: string | null
          is_active?: boolean | null
          priority?: never
          quote_id?: string | null
          status?: never
          subject?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "active_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_options_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_system_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes_with_legacy_fields"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      _ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      add_storage_fees_to_quote: {
        Args: { p_quote_id: string; p_user_id: string }
        Returns: number
      }
      add_support_interaction: {
        Args:
          | {
              p_content: Json
              p_interaction_type: string
              p_is_internal?: boolean
              p_support_id: string
              p_user_id: string
            }
          | {
              p_content: Json
              p_interaction_type: string
              p_is_internal?: boolean
              p_support_id: string
              p_user_id: string
            }
        Returns: string
      }
      analyze_tax_method_performance: {
        Args: {
          p_destination_country: string
          p_origin_country: string
          p_time_range_days?: number
        }
        Returns: Json
      }
      apply_abuse_block: {
        Args: {
          p_applied_by?: string
          p_block_type: string
          p_duration_minutes?: number
          p_reason: string
          p_target_type: string
          p_target_value: string
        }
        Returns: boolean
      }
      apply_discount_to_quote: {
        Args: {
          p_customer_id?: string
          p_discount_codes: string[]
          p_quote_id: string
        }
        Returns: {
          recalculated_quote: Json
          applied_discounts: Json[]
          new_total: number
          total_savings: number
          success: boolean
          message: string
        }[]
      }
      apply_market_settings: {
        Args: { p_market_code: string; p_settings: Json }
        Returns: number
      }
      approve_refund_request: {
        Args: {
          p_approved_amount?: number
          p_notes?: string
          p_refund_request_id: string
        }
        Returns: Json
      }
      auto_match_transactions: {
        Args: { p_reconciliation_id: string }
        Returns: Json
      }
      bulk_update_countries_by_market: {
        Args: { p_market_id: string; p_updates: Json }
        Returns: number
      }
      bulk_update_discount_status: {
        Args: { discount_ids: string[]; new_status: boolean }
        Returns: number
      }
      bulk_update_tax_methods: {
        Args: {
          p_admin_id: string
          p_calculation_method: string
          p_change_reason?: string
          p_quote_ids: string[]
        }
        Returns: Json
      }
      calculate_applicable_discounts: {
        Args: {
          p_country_code: string
          p_customer_id: string
          p_handling_fee: number
          p_payment_method: string
          p_quote_total: number
        }
        Returns: {
          discount_id: string
          discount_code: string
          discount_type: string
          value: number
          applicable_amount: number
          discount_amount: number
          priority: number
        }[]
      }
      calculate_membership_discount: {
        Args: { p_amount: number; p_customer_id: string }
        Returns: {
          membership_name: string
          has_discount: boolean
          discount_amount: number
          discount_percentage: number
        }[]
      }
      calculate_origin_totals_from_items: {
        Args: { quote_items: Json }
        Returns: {
          items_total: number
        }[]
      }
      calculate_storage_fees: {
        Args:
          | { end_date?: string; package_id: string }
          | {
              p_customer_id: string
              p_package_id: string
              p_storage_days: number
            }
        Returns: {
          base_fee: number
          free_days_used: number
          discount_percentage: number
          final_fee: number
        }[]
      }
      check_customer_membership: {
        Args: { p_customer_id: string }
        Returns: {
          has_membership: boolean
          benefits: Json
          discount_percentage: number
          membership_tier_name: string
          membership_tier_id: string
        }[]
      }
      check_expired_quotes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_authenticated_checkout_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_blocks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_guest_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_phone_otps: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_pricing_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_payment_error_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_payment_health_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_payment_verification_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_reconciliation: {
        Args: { p_notes?: string; p_reconciliation_id: string }
        Returns: Json
      }
      complete_supplier_pickup: {
        Args: { p_notes?: string; p_return_id: string }
        Returns: Json
      }
      confirm_backup_codes_saved: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      confirm_payment_from_proof: {
        Args: {
          p_amount_paid: number
          p_payment_status: string
          p_quote_id: string
        }
        Returns: Json
      }
      convert_minimum_valuation_usd_to_origin: {
        Args: { origin_country: string; usd_amount: number }
        Returns: Json
      }
      copy_country_settings: {
        Args: {
          p_fields?: string[]
          p_from_country: string
          p_to_country: string
        }
        Returns: boolean
      }
      create_consolidation_quote: {
        Args: {
          p_consolidation_group_id: string
          p_customer_data?: Json
          p_destination_country: string
        }
        Returns: string
      }
      create_credit_note: {
        Args: {
          p_amount: number
          p_auto_approve?: boolean
          p_currency: string
          p_customer_id: string
          p_description?: string
          p_minimum_order_value?: number
          p_quote_id?: string
          p_reason: string
          p_refund_request_id?: string
          p_valid_days?: number
        }
        Returns: Json
      }
      create_package_forwarding_quote: {
        Args: {
          p_customer_data?: Json
          p_destination_country: string
          p_package_id: string
        }
        Returns: string
      }
      create_payment_with_ledger_entry: {
        Args: {
          p_amount: number
          p_currency: string
          p_gateway_code?: string
          p_gateway_transaction_id?: string
          p_message_id?: string
          p_notes?: string
          p_payment_method: string
          p_payment_type?: string
          p_quote_id: string
          p_reference_number?: string
          p_user_id?: string
        }
        Returns: Json
      }
      create_quote_revision: {
        Args: { p_original_quote_id: string; p_revision_reason: string }
        Returns: string
      }
      create_refund_request: {
        Args: {
          p_amount: number
          p_currency: string
          p_customer_notes?: string
          p_internal_notes?: string
          p_payment_ids?: string[]
          p_quote_id: string
          p_reason_code: string
          p_reason_description: string
          p_refund_method?: string
          p_refund_type: string
        }
        Returns: Json
      }
      create_support_ticket: {
        Args: {
          p_category: string
          p_description: string
          p_priority: string
          p_quote_id: string
          p_subject: string
          p_user_id: string
        }
        Returns: string
      }
      daily_quote_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      encode_base32: {
        Args: { data: string }
        Returns: string
      }
      ensure_profile_exists: {
        Args: { user_id: string }
        Returns: string
      }
      ensure_user_profile: {
        Args: { _user_id: string }
        Returns: boolean
      }
      ensure_user_profile_exists: {
        Args: { _user_id: string }
        Returns: boolean
      }
      ensure_user_profile_with_oauth: {
        Args: { _user_id: string; _user_metadata?: Json }
        Returns: boolean
      }
      estimate_product_weight: {
        Args: {
          category_hint?: string
          price_usd?: number
          product_query: string
          target_country: string
        }
        Returns: {
          estimated_weight_kg: number
          confidence_score: number
          estimation_method: string
          classification_used: string
        }[]
      }
      expire_quotes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      extend_storage_exemption: {
        Args: {
          p_additional_days: number
          p_admin_id: string
          p_package_id: string
          p_reason: string
        }
        Returns: string
      }
      extract_oauth_user_info: {
        Args: { user_metadata: Json }
        Returns: Json
      }
      fix_missing_default_addresses: {
        Args: Record<PropertyKey, never>
        Returns: {
          address_id: string
          user_id: string
          success: boolean
        }[]
      }
      force_update_payment: {
        Args: {
          new_amount_paid: number
          new_payment_status: string
          notes?: string
          p_quote_id: string
          payment_currency?: string
          payment_method?: string
          reference_number?: string
        }
        Returns: Json
      }
      generate_backup_codes: {
        Args: { p_count?: number }
        Returns: string[]
      }
      generate_iwish_tracking_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_payment_link_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_quote_number_v2: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_quote_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_share_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_suite_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_verification_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_abuse_statistics: {
        Args: { p_timeframe?: string }
        Returns: {
          active_blocks: number
          blocked_attempts: number
          total_attempts: number
          hourly_trend: Json
          geographic_distribution: Json
          top_abuse_types: Json
          prevention_rate: number
        }[]
      }
      get_active_payment_link_for_quote: {
        Args: { quote_uuid: string }
        Returns: {
          link_code: string
          payment_url: string
          id: string
          expires_at: string
          status: string
          api_version: string
        }[]
      }
      get_admin_activity_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          recent_timestamp: string
          count: number
          action: string
        }[]
      }
      get_all_user_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          source: string
          full_name: string
          email: string
        }[]
      }
      get_automatic_country_discounts: {
        Args: {
          p_customer_country: string
          p_customer_id?: string
          p_order_total?: number
        }
        Returns: {
          rule_id: string
          discount_type_id: string
          country_code: string
          component_discounts: Json
          description: string
          priority: number
          conditions_met: boolean
        }[]
      }
      get_available_credit_notes: {
        Args: { p_customer_id?: string; p_min_amount?: number }
        Returns: {
          credit_note_id: string
          minimum_order_value: number
          valid_until: string
          amount_available: number
          reason: string
          currency: string
          amount: number
          note_number: string
        }[]
      }
      get_bank_account_for_order: {
        Args: { p_country_code: string; p_destination_country?: string }
        Returns: {
          account_name: string
          account_number: string
          bank_name: string
          branch_name: string | null
          country_code: string | null
          created_at: string
          currency_code: string | null
          custom_fields: Json | null
          destination_country: string | null
          display_order: number | null
          field_labels: Json | null
          iban: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_fallback: boolean | null
          payment_qr_url: string | null
          swift_code: string | null
          updated_at: string
          upi_id: string | null
          upi_qr_string: string | null
        }[]
      }
      get_bank_details_for_email: {
        Args: { payment_currency: string }
        Returns: string
      }
      get_category_intelligence_stats: {
        Args: { target_country: string }
        Returns: {
          avg_weight_kg: number
          avg_customs_rate: number
          most_used_classification: string
          classification_count: number
          avg_confidence: number
          total_usage: number
          category: string
        }[]
      }
      get_component_discounts: {
        Args: {
          p_country_code: string
          p_customer_id: string
          p_discount_codes?: string[]
          p_is_first_order?: boolean
          p_item_count?: number
          p_order_total: number
        }
        Returns: {
          discount_type_id: string
          discount_name: string
          discount_code: string
          discount_value: number
          applicable_components: string[]
          component_specific_values: Json
          source: string
        }[]
      }
      get_country_market: {
        Args: { p_country_code: string }
        Returns: {
          code: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          settings: Json | null
          updated_at: string
        }
      }
      get_currency_conversion_metrics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          conversion_count: number
          currency_pair: string
          max_variance: number
          accuracy_score: number
          average_variance: number
        }[]
      }
      get_currency_mismatches: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          payment_amount: number
          payment_method: string
          quote_amount: number
          gateway_transaction_id: string
          payment_currency: string
          quote_currency: string
          order_display_id: string
          quote_id: string
          created_at: string
        }[]
      }
      get_currency_statistics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          refund_count: number
          currency: string
          total_payments: number
          total_refunds: number
          net_amount: number
          payment_count: number
          average_payment: number
          last_payment_date: string
          unique_customers: number
        }[]
      }
      get_customer_discount_history: {
        Args: { p_customer_id: string; p_limit?: number }
        Returns: {
          order_id: string
          quote_id: string
          used_at: string
          components_discounted: string[]
          currency: string
          discount_code: string
          campaign_name: string
          original_amount: number
          discount_amount: number
          discount_id: string
        }[]
      }
      get_customer_membership: {
        Args: { p_customer_id: string }
        Returns: {
          tier_name: string
          tier_id: string
          membership_id: string
          expires_at: string
          status: string
          benefits: Json
          discount_percentage: number
          tier_slug: string
        }[]
      }
      get_discount_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_savings: number
          total_usage: number
          active_codes: number
          total_codes: number
          usage_by_country: Json
          top_codes: Json
        }[]
      }
      get_discount_type_tiers_with_analytics: {
        Args: { discount_type_id: string }
        Returns: {
          max_order_value: number
          id: string
          min_order_value: number
          discount_value: number
          applicable_components: string[]
          description: string
          priority: number
          usage_count: number
          total_savings: number
          avg_order_value: number
          last_used_at: string
          created_at: string
        }[]
      }
      get_discount_usage_analytics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          total_discount_amount: number
          unique_customers: number
          usage_date: string
          total_uses: number
          top_discount_code: string
          components_breakdown: Json
        }[]
      }
      get_domestic_delivery_config: {
        Args: { country_code: string }
        Returns: Json
      }
      get_effective_tax_method: {
        Args: { quote_id_param: string }
        Returns: {
          calculation_method: string
          valuation_method: string
          source: string
          confidence: number
        }[]
      }
      get_exchange_rate_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          age_minutes: number
          currency: string
          current_rate: number
          last_updated: string
          is_stale: boolean
          is_fallback: boolean
        }[]
      }
      get_insurance_estimate: {
        Args: { p_coverage_amount?: number; p_quote_id: string }
        Returns: {
          benefits: Json
          available: boolean
          fee_estimate: number
          coverage_amount: number
          percentage_rate: number
          min_fee: number
          max_fee: number
          currency: string
        }[]
      }
      get_market_countries: {
        Args: { p_market_id: string }
        Returns: {
          display_order: number
          is_primary_in_market: boolean
          country_name: string
          currency: string
          country_code: string
        }[]
      }
      get_membership_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          revenue_this_month: number
          average_lifetime_value: number
          total_members: number
          active_members: number
          expired_members: number
          churn_rate: number
        }[]
      }
      get_minimum_valuation: {
        Args: { p_classification_code: string; p_country_code: string }
        Returns: {
          minimum_valuation_usd: number
          valuation_method: string
        }[]
      }
      get_optimal_storage_location: {
        Args: { suite_number: string }
        Returns: string
      }
      get_or_create_customer_preferences: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string | null
          default_consolidation_preference: string | null
          id: string
          notification_preferences: Json | null
          other_preferences: Json | null
          profile_id: string | null
          shipping_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
      }
      get_or_create_profile_by_phone: {
        Args: { phone_number: string; user_id?: string }
        Returns: {
          avatar_url: string | null
          cod_enabled: boolean | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          internal_notes: string | null
          phone: string | null
          phone_verified: boolean | null
          preferred_display_currency: string | null
          preferred_payment_gateway: string | null
          referral_code: string | null
          tags: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
      }
      get_orders_with_payment_proofs: {
        Args: { limit_count?: number; status_filter?: string }
        Returns: {
          amount_paid: number
          attachment_url: string
          submitted_at: string
          verified_at: string
          order_id: string
          order_display_id: string
          final_total: number
          final_currency: string
          payment_status: string
          payment_method: string
          customer_email: string
          customer_id: string
          message_id: string
          verification_status: string
          admin_notes: string
          attachment_file_name: string
        }[]
      }
      get_payment_history: {
        Args: {
          p_customer_id?: string
          p_end_date?: string
          p_quote_id?: string
          p_start_date?: string
        }
        Returns: {
          amount: number
          currency: string
          base_amount: number
          running_balance: number
          reference_number: string
          status: string
          notes: string
          created_by_name: string
          payment_id: string
          quote_id: string
          order_display_id: string
          payment_date: string
          payment_type: string
          payment_method: string
          gateway_name: string
        }[]
      }
      get_payment_proof_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_payment_stats_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_popular_posts: {
        Args: { limit_count?: number }
        Returns: {
          id: string
          slug: string
          excerpt: string
          featured_image_url: string
          published_at: string
          reading_time_minutes: number
          category_name: string
          views_count: number
          title: string
        }[]
      }
      get_pricing_audit_stats: {
        Args: { p_days_back?: number }
        Returns: {
          changes_by_method: Json
          most_changed_services: Json
          total_changes: number
          most_active_users: Json
          changes_by_type: Json
        }[]
      }
      get_pricing_change_history: {
        Args: {
          p_days_back?: number
          p_identifier?: string
          p_limit?: number
          p_service_id?: string
        }
        Returns: {
          id: string
          new_rate: number
          change_method: string
          user_email: string
          created_at: string
          affected_countries: number
          change_reason: string
          old_rate: number
          identifier_name: string
          identifier: string
          change_type: string
          service_name: string
        }[]
      }
      get_product_suggestions: {
        Args: { p_category: string; p_country_code: string; p_limit?: number }
        Returns: {
          id: string
          product_name: string
          classification_code: string
          customs_rate: number
          confidence_score: number
          typical_weight_kg: number
        }[]
      }
      get_product_suggestions_v2: {
        Args: { p_category: string; p_country_code: string; p_limit?: number }
        Returns: {
          confidence_score: number
          id: string
          product_name: string
          classification_code: string
          customs_rate: number
          typical_weight_kg: number
        }[]
      }
      get_quote_message_thread: {
        Args: { p_quote_id: string }
        Returns: {
          is_read: boolean
          sender_email: string
          content: string
          attachment_file_name: string
          attachment_url: string
          priority: string
          thread_type: string
          message_type: string
          is_internal: boolean
          admin_notes: string
          verification_status: string
          created_at: string
          id: string
          sender_id: string
          read_at: string
          sender_name: string
        }[]
      }
      get_quote_options_state: {
        Args: { quote_id_param: string }
        Returns: Json
      }
      get_quotes_needing_reminders: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          customer_email: string
          customer_name: string
          quote_number: string
          reminder_count: number
          last_reminder_at: string
          share_token: string
        }[]
      }
      get_related_posts: {
        Args: { limit_count?: number; post_slug: string }
        Returns: {
          reading_time_minutes: number
          featured_image_url: string
          excerpt: string
          slug: string
          title: string
          id: string
          views_count: number
          category_name: string
          published_at: string
        }[]
      }
      get_shipping_cost: {
        Args: {
          p_destination_country: string
          p_origin_country: string
          p_price?: number
          p_weight: number
        }
        Returns: {
          cost: number
          carrier: string
          delivery_days: string
          method: string
        }[]
      }
      get_smart_product_suggestions: {
        Args: {
          category_filter?: string
          product_query: string
          result_limit?: number
          target_country: string
        }
        Returns: {
          classification_code: string
          product_name: string
          typical_weight_kg: number
          customs_rate: number
          category: string
          match_reason: string
          confidence_score: number
        }[]
      }
      get_smart_system_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_sms_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          credits_used_today: number
          sent_today: number
          total_received: number
          total_sent: number
          provider_stats: Json
          total_failed: number
          received_today: number
        }[]
      }
      get_suspicious_payment_amounts: {
        Args: { end_date?: string; start_date?: string; tolerance?: number }
        Returns: {
          amount_difference: number
          suspicion_level: string
          payment_currency: string
          quote_amount: number
          quote_currency: string
          order_display_id: string
          quote_id: string
          created_at: string
          payment_amount: number
        }[]
      }
      get_tax_method_recommendations: {
        Args: {
          p_analysis_days?: number
          p_destination_country: string
          p_origin_country: string
        }
        Returns: Json
      }
      get_tier_analytics: {
        Args: { tier_id: string }
        Returns: {
          total_savings: number
          avg_order_value: number
          avg_discount_per_use: number
          effectiveness_score: number
          last_used_at: string
          usage_count: number
        }[]
      }
      get_transaction_refund_eligibility: {
        Args: { transaction_id: string }
        Returns: {
          can_refund: boolean
          refundable_amount: number
          reason: string
        }[]
      }
      get_unread_message_count: {
        Args: { p_quote_id?: string; p_user_id?: string }
        Returns: number
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
          currency_code: string | null
          custom_fields: Json | null
          destination_country: string | null
          display_order: number | null
          field_labels: Json | null
          iban: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_fallback: boolean | null
          payment_qr_url: string | null
          swift_code: string | null
          updated_at: string
          upi_id: string | null
          upi_qr_string: string | null
        }[]
      }
      get_user_default_address: {
        Args: { p_user_id: string }
        Returns: {
          address_label: string | null
          address_line1: string
          address_line2: string | null
          address_type: string | null
          city: string
          company_name: string | null
          created_at: string
          delivery_instructions: string | null
          destination_country: string
          id: string
          is_default: boolean | null
          phone: string | null
          postal_code: string | null
          recipient_name: string | null
          save_to_profile: string | null
          state_province_region: string
          tax_id: string | null
          updated_at: string
          user_id: string
          validated_at: string | null
          validation_status: string | null
        }
      }
      get_users_without_default_address: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          address_count: number
        }[]
      }
      handle_mfa_failure: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      has_any_role: {
        Args: { roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args:
          | { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }
          | { role_name: string }
        Returns: boolean
      }
      hash_ltree: {
        Args: { "": unknown }
        Returns: number
      }
      increment_classification_usage: {
        Args: { classification_id: string }
        Returns: undefined
      }
      increment_discount_usage: {
        Args: { p_discount_code_id: string }
        Returns: undefined
      }
      increment_post_views: {
        Args: { post_slug: string }
        Returns: undefined
      }
      initiate_quote_email_verification: {
        Args: { p_email: string; p_quote_id: string }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_eligible_for_first_time_discount: {
        Args: { p_customer_id: string }
        Returns: boolean
      }
      is_quote_expired: {
        Args: { quote_id: string }
        Returns: boolean
      }
      is_target_blocked: {
        Args: { p_target_type: string; p_target_value: string }
        Returns: {
          block_type: string
          reason: string
          expires_at: string
          is_blocked: boolean
        }[]
      }
      lca: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      lock_address_after_payment: {
        Args: { quote_uuid: string }
        Returns: boolean
      }
      log_pricing_change: {
        Args: {
          p_affected_countries?: number
          p_batch_id?: string
          p_change_method?: string
          p_change_reason?: string
          p_change_type: string
          p_identifier: string
          p_identifier_name: string
          p_new_max_amount?: number
          p_new_min_amount?: number
          p_new_rate: number
          p_old_max_amount?: number
          p_old_min_amount?: number
          p_old_rate: number
          p_service_id: string
          p_session_id?: string
        }
        Returns: string
      }
      log_share_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_ip_address?: unknown
          p_quote_id: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      lquery_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      ltree_gist_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree2text: {
        Args: { "": unknown }
        Returns: string
      }
      ltxtq_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_send: {
        Args: { "": unknown }
        Returns: string
      }
      mark_messages_as_read: {
        Args: { p_message_ids: string[] }
        Returns: number
      }
      nlevel: {
        Args: { "": unknown }
        Returns: number
      }
      post_financial_transaction: {
        Args: { p_transaction_id: string; p_user_id: string }
        Returns: Json
      }
      process_campaign_triggers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_payment_webhook_atomic: {
        Args: {
          p_create_order?: boolean
          p_guest_session_data?: Json
          p_guest_session_token?: string
          p_payment_data: Json
          p_payment_status: string
          p_quote_ids: string[]
        }
        Returns: {
          quotes_updated: boolean
          payment_ledger_entry_id: string
          payment_transaction_id: string
          success: boolean
          guest_session_updated: boolean
          error_message: string
          order_id: string
        }[]
      }
      process_refund_atomic: {
        Args: {
          p_gateway_response: Json
          p_processed_by: string
          p_quote_id: string
          p_refund_amount: number
          p_refund_data: Json
        }
        Returns: {
          error_message: string
          ledger_entry_id: string
          quote_updated: boolean
          payment_transaction_updated: boolean
          refund_id: string
          success: boolean
        }[]
      }
      process_refund_item: {
        Args: {
          p_gateway_refund_id: string
          p_gateway_response?: Json
          p_refund_item_id: string
          p_status?: string
        }
        Returns: Json
      }
      record_payment_with_ledger_and_triggers: {
        Args: {
          p_amount: number
          p_currency: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method: string
          p_quote_id: string
          p_recorded_by?: string
          p_transaction_reference: string
        }
        Returns: Json
      }
      record_paypal_payment_to_ledger: {
        Args: {
          p_amount: number
          p_capture_id?: string
          p_currency: string
          p_order_id: string
          p_payer_email?: string
          p_quote_id: string
          p_transaction_id: string
        }
        Returns: Json
      }
      record_quote_view: {
        Args: { p_share_token: string }
        Returns: Json
      }
      refresh_discount_statistics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      regenerate_backup_codes: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      remove_abuse_block: {
        Args: {
          p_block_type?: string
          p_target_type: string
          p_target_value: string
        }
        Returns: boolean
      }
      remove_discount_from_quote: {
        Args: { p_discount_codes?: string[]; p_quote_id: string }
        Returns: {
          success: boolean
          message: string
          recalculated_quote: Json
          original_total: number
        }[]
      }
      requires_mfa: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      reverse_financial_transaction: {
        Args: { p_reason: string; p_transaction_id: string; p_user_id: string }
        Returns: Json
      }
      rollback_tax_standardization_20250128: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      schedule_supplier_pickup: {
        Args: {
          p_contact_name: string
          p_contact_phone: string
          p_instructions?: string
          p_pickup_address: Json
          p_pickup_date: string
          p_pickup_time_slot: string
          p_return_id: string
          p_supplier_name?: string
        }
        Returns: Json
      }
      search_product_classifications: {
        Args: {
          p_country_code?: string
          p_limit?: number
          p_search_text: string
        }
        Returns: {
          classification_code: string
          rank: number
          product_category: string
          product_name: string
          id: string
        }[]
      }
      search_product_classifications_fts: {
        Args: {
          result_limit?: number
          search_query: string
          target_country: string
        }
        Returns: {
          tags: string[]
          is_active: boolean
          created_by: string
          updated_at: string
          created_at: string
          search_keywords: string[]
          usage_frequency: number
          confidence_score: number
          minimum_valuation_usd: number
          valuation_method: string
          customs_rate: number
          volume_category: string
          typical_dimensions: Json
          weight_variance_factor: number
          typical_weight_kg: number
          country_data: Json
          description: string
          subcategory: string
          category: string
          product_name: string
          country_code: string
          classification_code: string
          id: string
        }[]
      }
      search_product_classifications_v2: {
        Args: {
          p_country_code?: string
          p_limit?: number
          p_search_text: string
        }
        Returns: {
          id: string
          product_name: string
          product_category: string
          classification_code: string
          rank: number
        }[]
      }
      select_delivery_provider: {
        Args: {
          p_from_country: string
          p_preferred_provider?: string
          p_requires_cod?: boolean
          p_to_country: string
          p_weight: number
        }
        Returns: {
          priority: number
          provider_code: string
          provider_name: string
        }[]
      }
      send_quote_reminder: {
        Args: { quote_id: string }
        Returns: boolean
      }
      start_reconciliation_session: {
        Args: {
          p_gateway_code?: string
          p_payment_method: string
          p_statement_date?: string
          p_statement_end_date?: string
          p_statement_start_date?: string
        }
        Returns: Json
      }
      sync_oauth_avatars_to_profiles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      test_payment_update_direct: {
        Args: {
          new_amount_paid: number
          new_payment_status: string
          quote_id: string
        }
        Returns: Json
      }
      test_storage_fee_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_call_waive: boolean
          current_user_role: string
          can_read_fees: boolean
          can_call_extend: boolean
        }[]
      }
      text2ltree: {
        Args: { "": string }
        Returns: unknown
      }
      track_quote_view: {
        Args: { quote_id: string; token?: string }
        Returns: boolean
      }
      update_customer_segments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_location_capacity: {
        Args: { capacity_change: number; location_code: string }
        Returns: undefined
      }
      update_quote_insurance: {
        Args: {
          p_customer_id?: string
          p_insurance_enabled: boolean
          p_quote_id: string
        }
        Returns: {
          new_total: number
          insurance_fee: number
          insurance_details: Json
          success: boolean
          message: string
          recalculated_quote: Json
        }[]
      }
      update_quote_options: {
        Args: {
          discount_amounts_param?: Json
          discount_codes_param?: Json
          insurance_enabled_param?: boolean
          quote_id_param: string
          shipping_method_param?: string
          shipping_option_id_param?: string
          updated_by_param?: string
        }
        Returns: Json
      }
      update_quote_view_tracking: {
        Args: { p_duration_seconds?: number; p_quote_id: string }
        Returns: undefined
      }
      update_support_ticket_status: {
        Args:
          | {
              p_new_status: string
              p_reason?: string
              p_support_id: string
              p_user_id: string
            }
          | {
              p_new_status: string
              p_reason?: string
              p_support_id: string
              p_user_id: string
            }
        Returns: boolean
      }
      update_tier_usage_analytics: {
        Args: { discount_amount: number; order_value: number; tier_id: string }
        Returns: undefined
      }
      validate_country_discount_code: {
        Args: {
          p_customer_country: string
          p_discount_code: string
          p_order_total?: number
        }
        Returns: {
          error_message: string
          is_valid: boolean
          discount_code_id: string
          discount_type_id: string
          country_rule_id: string
          discount_details: Json
        }[]
      }
      validate_discount_stacking: {
        Args: { customer_id?: string; discount_codes: string[] }
        Returns: {
          stacked_count: number
          error_message: string
          is_valid: boolean
          allowed_combination: boolean
          total_discount_percentage: number
        }[]
      }
      validate_quotes_unified: {
        Args: Record<PropertyKey, never>
        Returns: {
          issue: string
          quote_id: string
          severity: string
        }[]
      }
      verify_mfa_login: {
        Args: { p_code: string; p_is_backup_code?: boolean }
        Returns: {
          session_token: string
          verified: boolean
        }[]
      }
      verify_mfa_setup: {
        Args: { p_code: string }
        Returns: boolean
      }
      verify_quote_email: {
        Args: { p_verification_token: string }
        Returns: string
      }
      verify_totp_code: {
        Args: { p_code: string; p_user_id: string; p_window?: number }
        Returns: boolean
      }
      verify_totp_code_dev: {
        Args: { p_code: string; p_user_id: string; p_window?: number }
        Returns: boolean
      }
      verify_totp_setup: {
        Args: { p_code: string }
        Returns: Json
      }
      verify_usd_to_origin_migration: {
        Args: Record<PropertyKey, never>
        Returns: {
          quotes_with_usd_fields: number
          table_name: string
          total_quotes: number
          quotes_with_origin_fields: number
          migration_success: boolean
        }[]
      }
      waive_storage_fees: {
        Args: { p_admin_id: string; p_package_id: string; p_reason: string }
        Returns: number
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

