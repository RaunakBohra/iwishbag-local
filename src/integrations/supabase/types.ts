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
          variables?: Json
          extensions?: Json
          query?: string
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
            referencedRelation: "quotes"
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
      customer_discount_usage: {
        Row: {
          customer_id: string
          discount_amount: number | null
          discount_code_id: string
          id: string
          quote_id: string | null
          used_at: string | null
        }
        Insert: {
          customer_id: string
          discount_amount?: number | null
          discount_code_id: string
          id?: string
          quote_id?: string | null
          used_at?: string | null
        }
        Update: {
          customer_id?: string
          discount_amount?: number | null
          discount_code_id?: string
          id?: string
          quote_id?: string | null
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
      delivery_addresses: {
        Row: {
          address_label: string | null
          address_line1: string
          address_line2: string | null
          address_type: string | null
          city: string
          company_name: string | null
          country: string | null
          created_at: string
          destination_country: string | null
          id: string
          is_default: boolean | null
          phone: string | null
          postal_code: string
          recipient_name: string | null
          save_to_profile: string | null
          state_province_region: string
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
          country?: string | null
          created_at?: string
          destination_country?: string | null
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postal_code: string
          recipient_name?: string | null
          save_to_profile?: string | null
          state_province_region: string
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
          country?: string | null
          created_at?: string
          destination_country?: string | null
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postal_code?: string
          recipient_name?: string | null
          save_to_profile?: string | null
          state_province_region?: string
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
            referencedRelation: "quotes"
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
      discount_types: {
        Row: {
          code: string
          conditions: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          value: number
        }
        Insert: {
          code: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          value: number
        }
        Update: {
          code?: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          value?: number
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
          preferred_display_currency: string | null
          referral_code: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
          profiles_quotes: Database["public"]["Tables"]["quotes"]["Row"] | null
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
          admin_notes: string | null
          calculation_data: Json | null
          calculation_method_preference: string | null
          consolidation_group_id: string | null
          costprice_total_quote_origincurrency: number
          created_at: string
          currency: string
          customer_data: Json | null
          delivery_actual_date: string | null
          delivery_estimated_date: string | null
          delivery_provider: string | null
          delivery_provider_order_id: string | null
          delivery_tracking_number: string | null
          destination_country: string
          display_id: string | null
          email_verified: boolean | null
          estimated_delivery_date: string | null
          expires_at: string | null
          final_total_origincurrency: number
          first_viewed_at: string | null
          forwarding_data: Json | null
          forwarding_type: string | null
          id: string
          in_cart: boolean | null
          internal_notes: string | null
          is_anonymous: boolean | null
          items: Json
          iwish_tracking_id: string | null
          last_viewed_at: string | null
          ncm_delivery_instruction: string | null
          ncm_from_branch: string | null
          ncm_to_branch: string | null
          operational_data: Json | null
          optimization_score: number | null
          origin_country: string
          package_ids: string[] | null
          quote_source: string | null
          share_token: string | null
          shipping_carrier: string | null
          smart_suggestions: Json | null
          status: string
          storage_fees_included: boolean | null
          total_view_duration: number | null
          tracking_number: string | null
          tracking_status: string | null
          updated_at: string
          user_id: string | null
          valuation_method_preference: string | null
          verification_expires_at: string | null
          verification_sent_at: string | null
          verification_token: string | null
          view_count: number | null
          weight_confidence: number | null
          quotes_profile: Database["public"]["Tables"]["profiles"]["Row"] | null
        }
        Insert: {
          admin_notes?: string | null
          calculation_data?: Json | null
          calculation_method_preference?: string | null
          consolidation_group_id?: string | null
          costprice_total_quote_origincurrency?: number
          created_at?: string
          currency?: string
          customer_data?: Json | null
          delivery_actual_date?: string | null
          delivery_estimated_date?: string | null
          delivery_provider?: string | null
          delivery_provider_order_id?: string | null
          delivery_tracking_number?: string | null
          destination_country: string
          display_id?: string | null
          email_verified?: boolean | null
          estimated_delivery_date?: string | null
          expires_at?: string | null
          final_total_origincurrency?: number
          first_viewed_at?: string | null
          forwarding_data?: Json | null
          forwarding_type?: string | null
          id?: string
          in_cart?: boolean | null
          internal_notes?: string | null
          is_anonymous?: boolean | null
          items?: Json
          iwish_tracking_id?: string | null
          last_viewed_at?: string | null
          ncm_delivery_instruction?: string | null
          ncm_from_branch?: string | null
          ncm_to_branch?: string | null
          operational_data?: Json | null
          optimization_score?: number | null
          origin_country?: string
          package_ids?: string[] | null
          quote_source?: string | null
          share_token?: string | null
          shipping_carrier?: string | null
          smart_suggestions?: Json | null
          status?: string
          storage_fees_included?: boolean | null
          total_view_duration?: number | null
          tracking_number?: string | null
          tracking_status?: string | null
          updated_at?: string
          user_id?: string | null
          valuation_method_preference?: string | null
          verification_expires_at?: string | null
          verification_sent_at?: string | null
          verification_token?: string | null
          view_count?: number | null
          weight_confidence?: number | null
        }
        Update: {
          admin_notes?: string | null
          calculation_data?: Json | null
          calculation_method_preference?: string | null
          consolidation_group_id?: string | null
          costprice_total_quote_origincurrency?: number
          created_at?: string
          currency?: string
          customer_data?: Json | null
          delivery_actual_date?: string | null
          delivery_estimated_date?: string | null
          delivery_provider?: string | null
          delivery_provider_order_id?: string | null
          delivery_tracking_number?: string | null
          destination_country?: string
          display_id?: string | null
          email_verified?: boolean | null
          estimated_delivery_date?: string | null
          expires_at?: string | null
          final_total_origincurrency?: number
          first_viewed_at?: string | null
          forwarding_data?: Json | null
          forwarding_type?: string | null
          id?: string
          in_cart?: boolean | null
          internal_notes?: string | null
          is_anonymous?: boolean | null
          items?: Json
          iwish_tracking_id?: string | null
          last_viewed_at?: string | null
          ncm_delivery_instruction?: string | null
          ncm_from_branch?: string | null
          ncm_to_branch?: string | null
          operational_data?: Json | null
          optimization_score?: number | null
          origin_country?: string
          package_ids?: string[] | null
          quote_source?: string | null
          share_token?: string | null
          shipping_carrier?: string | null
          smart_suggestions?: Json | null
          status?: string
          storage_fees_included?: boolean | null
          total_view_duration?: number | null
          tracking_number?: string | null
          tracking_status?: string | null
          updated_at?: string
          user_id?: string | null
          valuation_method_preference?: string | null
          verification_expires_at?: string | null
          verification_sent_at?: string | null
          verification_token?: string | null
          view_count?: number | null
          weight_confidence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_consolidation_group_id_fkey"
            columns: ["consolidation_group_id"]
            isOneToOne: false
            referencedRelation: "consolidation_groups"
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
            referencedRelation: "quotes"
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
      tax_calculation_audit_log: {
        Row: {
          admin_id: string | null
          calculation_comparison: Json | null
          calculation_method: string
          change_details: Json | null
          change_reason: string | null
          created_at: string
          expires_at: string | null
          id: string
          item_level_overrides: Json | null
          previous_calculation_method: string | null
          previous_valuation_method: string | null
          quote_id: string | null
          valuation_method: string
        }
        Insert: {
          admin_id?: string | null
          calculation_comparison?: Json | null
          calculation_method: string
          change_details?: Json | null
          change_reason?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          item_level_overrides?: Json | null
          previous_calculation_method?: string | null
          previous_valuation_method?: string | null
          quote_id?: string | null
          valuation_method: string
        }
        Update: {
          admin_id?: string | null
          calculation_comparison?: Json | null
          calculation_method?: string
          change_details?: Json | null
          change_reason?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          item_level_overrides?: Json | null
          previous_calculation_method?: string | null
          previous_valuation_method?: string | null
          quote_id?: string | null
          valuation_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_calculation_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_calculation_audit_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_configuration: {
        Row: {
          config_data: Json
          config_key: string
          config_type: string
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
          version: number | null
        }
        Insert: {
          config_data?: Json
          config_key: string
          config_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          config_data?: Json
          config_key?: string
          config_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      warehouse_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completion_notes: string | null
          consolidation_group_id: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          instructions: string | null
          package_ids: string[] | null
          priority: string | null
          status: string | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          consolidation_group_id?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          package_ids?: string[] | null
          priority?: string | null
          status?: string | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          consolidation_group_id?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          package_ids?: string[] | null
          priority?: string | null
          status?: string | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_tasks_consolidation_group_id_fkey"
            columns: ["consolidation_group_id"]
            isOneToOne: false
            referencedRelation: "consolidation_groups"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "quotes"
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
            referencedRelation: "quotes"
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
        Args: {
          p_is_internal?: boolean
          p_interaction_type: string
          p_content: Json
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
        Args: { p_updates: Json; p_market_id: string }
        Returns: number
      }
      bulk_update_tax_methods: {
        Args: {
          p_change_reason?: string
          p_calculation_method: string
          p_admin_id: string
          p_quote_ids: string[]
        }
        Returns: Json
      }
      calculate_and_create_storage_fees: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          total_fees_amount: number
          new_fees_count: number
        }[]
      }
      calculate_applicable_discounts: {
        Args: {
          p_quote_total: number
          p_customer_id: string
          p_country_code: string
          p_payment_method: string
          p_handling_fee: number
        }
        Returns: {
          discount_id: string
          applicable_amount: number
          value: number
          discount_amount: number
          priority: number
          discount_type: string
          discount_code: string
        }[]
      }
      calculate_membership_discount: {
        Args: { p_customer_id: string; p_amount: number }
        Returns: {
          membership_name: string
          has_discount: boolean
          discount_percentage: number
          discount_amount: number
        }[]
      }
      calculate_storage_fees: {
        Args:
          | { end_date?: string; package_id: string }
          | {
              p_storage_days: number
              p_customer_id: string
              p_package_id: string
            }
        Returns: {
          free_days_used: number
          final_fee: number
          base_fee: number
          discount_percentage: number
        }[]
      }
      check_customer_membership: {
        Args: { p_customer_id: string }
        Returns: {
          membership_tier_id: string
          has_membership: boolean
          membership_tier_name: string
          discount_percentage: number
          benefits: Json
        }[]
      }
      cleanup_expired_authenticated_checkout_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_guest_sessions: {
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
        Args: { p_reconciliation_id: string; p_notes?: string }
        Returns: Json
      }
      complete_supplier_pickup: {
        Args: { p_return_id: string; p_notes?: string }
        Returns: Json
      }
      confirm_backup_codes_saved: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      confirm_payment_from_proof: {
        Args: {
          p_payment_status: string
          p_amount_paid: number
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
          p_from_country: string
          p_to_country: string
          p_fields?: string[]
        }
        Returns: boolean
      }
      create_consolidation_quote: {
        Args: {
          p_destination_country: string
          p_consolidation_group_id: string
          p_customer_data?: Json
        }
        Returns: string
      }
      create_credit_note: {
        Args: {
          p_valid_days?: number
          p_minimum_order_value?: number
          p_refund_request_id?: string
          p_quote_id?: string
          p_description?: string
          p_reason: string
          p_currency: string
          p_amount: number
          p_customer_id: string
          p_auto_approve?: boolean
        }
        Returns: Json
      }
      create_package_forwarding_quote: {
        Args: {
          p_customer_data?: Json
          p_package_id: string
          p_destination_country: string
        }
        Returns: string
      }
      create_payment_with_ledger_entry: {
        Args: {
          p_reference_number?: string
          p_quote_id: string
          p_amount: number
          p_currency: string
          p_payment_method: string
          p_payment_type?: string
          p_gateway_code?: string
          p_gateway_transaction_id?: string
          p_notes?: string
          p_user_id?: string
          p_message_id?: string
        }
        Returns: Json
      }
      create_refund_request: {
        Args: {
          p_refund_type: string
          p_amount: number
          p_currency: string
          p_quote_id: string
          p_reason_code: string
          p_reason_description: string
          p_customer_notes?: string
          p_internal_notes?: string
          p_refund_method?: string
          p_payment_ids?: string[]
        }
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
      expire_quotes: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      extend_storage_exemption: {
        Args: {
          p_reason: string
          p_package_id: string
          p_additional_days: number
          p_admin_id: string
        }
        Returns: string
      }
      extract_oauth_user_info: {
        Args: { user_metadata: Json }
        Returns: Json
      }
      force_update_payment: {
        Args: {
          payment_currency?: string
          p_quote_id: string
          new_amount_paid: number
          new_payment_status: string
          payment_method?: string
          reference_number?: string
          notes?: string
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
      get_active_payment_link_for_quote: {
        Args: { quote_uuid: string }
        Returns: {
          status: string
          id: string
          payment_url: string
          api_version: string
          expires_at: string
          link_code: string
        }[]
      }
      get_admin_activity_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          count: number
          recent_timestamp: string
          action: string
        }[]
      }
      get_all_user_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          source: string
          user_id: string
          email: string
          full_name: string
        }[]
      }
      get_available_credit_notes: {
        Args: { p_customer_id?: string; p_min_amount?: number }
        Returns: {
          valid_until: string
          reason: string
          amount_available: number
          currency: string
          amount: number
          note_number: string
          credit_note_id: string
          minimum_order_value: number
        }[]
      }
      get_bank_account_for_order: {
        Args: { p_destination_country?: string; p_country_code: string }
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
          max_variance: number
          accuracy_score: number
          average_variance: number
          conversion_count: number
          currency_pair: string
        }[]
      }
      get_currency_mismatches: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          order_display_id: string
          quote_currency: string
          payment_currency: string
          quote_amount: number
          payment_amount: number
          created_at: string
          payment_method: string
          gateway_transaction_id: string
          quote_id: string
        }[]
      }
      get_currency_statistics: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          payment_count: number
          currency: string
          total_payments: number
          total_refunds: number
          net_amount: number
          refund_count: number
          average_payment: number
          last_payment_date: string
          unique_customers: number
        }[]
      }
      get_customer_membership: {
        Args: { p_customer_id: string }
        Returns: {
          benefits: Json
          expires_at: string
          status: string
          discount_percentage: number
          tier_slug: string
          tier_name: string
          tier_id: string
          membership_id: string
        }[]
      }
      get_discount_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          conversion_rate: number
          total_discounts_used: number
          total_savings: number
          active_campaigns: number
        }[]
      }
      get_effective_tax_method: {
        Args: { quote_id_param: string }
        Returns: {
          source: string
          valuation_method: string
          calculation_method: string
          confidence: number
        }[]
      }
      get_exchange_rate_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          age_minutes: number
          is_fallback: boolean
          is_stale: boolean
          last_updated: string
          current_rate: number
          currency: string
        }[]
      }
      get_market_countries: {
        Args: { p_market_id: string }
        Returns: {
          display_order: number
          country_code: string
          country_name: string
          currency: string
          is_primary_in_market: boolean
        }[]
      }
      get_membership_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          revenue_this_month: number
          expired_members: number
          total_members: number
          active_members: number
          average_lifetime_value: number
          churn_rate: number
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
      get_orders_with_payment_proofs: {
        Args: { status_filter?: string; limit_count?: number }
        Returns: {
          verification_status: string
          admin_notes: string
          amount_paid: number
          attachment_file_name: string
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
        }[]
      }
      get_packages_approaching_fees: {
        Args: { p_warning_days?: number }
        Returns: {
          estimated_daily_fee: number
          user_id: string
          days_until_fees: number
          days_in_storage: number
          package_id: string
          tracking_number: string
          sender_name: string
        }[]
      }
      get_payment_history: {
        Args: {
          p_quote_id?: string
          p_customer_id?: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          base_amount: number
          payment_id: string
          quote_id: string
          order_display_id: string
          payment_date: string
          payment_type: string
          payment_method: string
          gateway_name: string
          amount: number
          currency: string
          running_balance: number
          reference_number: string
          status: string
          notes: string
          created_by_name: string
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
          category_name: string
          featured_image_url: string
          excerpt: string
          slug: string
          title: string
          id: string
          reading_time_minutes: number
          published_at: string
          views_count: number
        }[]
      }
      get_quote_items: {
        Args: { quote_row: Database["public"]["Tables"]["quotes"]["Row"] }
        Returns: {
          price_usd: number
          weight_confidence: number
          weight_kg: number
          id: string
          quantity: number
          name: string
        }[]
      }
      get_quote_message_thread: {
        Args: { p_quote_id: string }
        Returns: {
          is_internal: boolean
          id: string
          sender_id: string
          sender_name: string
          sender_email: string
          content: string
          message_type: string
          thread_type: string
          priority: string
          attachment_url: string
          attachment_file_name: string
          is_read: boolean
          read_at: string
          created_at: string
          verification_status: string
          admin_notes: string
        }[]
      }
      get_related_posts: {
        Args: { limit_count?: number; post_slug: string }
        Returns: {
          views_count: number
          id: string
          title: string
          slug: string
          excerpt: string
          featured_image_url: string
          published_at: string
          reading_time_minutes: number
          category_name: string
        }[]
      }
      get_shipping_cost: {
        Args: {
          p_origin_country: string
          p_destination_country: string
          p_weight: number
          p_price?: number
        }
        Returns: {
          carrier: string
          cost: number
          delivery_days: string
          method: string
        }[]
      }
      get_shipping_options: {
        Args: { quote_row: Database["public"]["Tables"]["quotes"]["Row"] }
        Returns: Json
      }
      get_suspicious_payment_amounts: {
        Args: { start_date?: string; end_date?: string; tolerance?: number }
        Returns: {
          amount_difference: number
          quote_id: string
          order_display_id: string
          quote_amount: number
          quote_currency: string
          payment_amount: number
          payment_currency: string
          created_at: string
          suspicion_level: string
        }[]
      }
      get_tax_method_recommendations: {
        Args: {
          p_analysis_days?: number
          p_origin_country: string
          p_destination_country: string
        }
        Returns: Json
      }
      get_timeline: {
        Args: { quote_row: Database["public"]["Tables"]["quotes"]["Row"] }
        Returns: Json
      }
      get_transaction_refund_eligibility: {
        Args: { transaction_id: string }
        Returns: {
          refundable_amount: number
          can_refund: boolean
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
          country: string | null
          created_at: string
          destination_country: string | null
          id: string
          is_default: boolean | null
          phone: string | null
          postal_code: string
          recipient_name: string | null
          save_to_profile: string | null
          state_province_region: string
          updated_at: string
          user_id: string
          validated_at: string | null
          validation_status: string | null
        }
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
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_ltree: {
        Args: { "": unknown }
        Returns: number
      }
      increment_post_views: {
        Args: { post_slug: string }
        Returns: undefined
      }
      initiate_quote_email_verification: {
        Args: { p_quote_id: string; p_email: string }
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
      lca: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      lock_address_after_payment: {
        Args: { quote_uuid: string }
        Returns: boolean
      }
      log_share_action: {
        Args: {
          p_user_agent?: string
          p_quote_id: string
          p_user_id: string
          p_action: string
          p_ip_address?: unknown
          p_details?: Json
        }
        Returns: string
      }
      log_tax_method_change: {
        Args: {
          p_quote_id: string
          p_valuation_method: string
          p_calculation_method: string
          p_admin_id: string
          p_change_details?: Json
          p_change_reason?: string
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
          p_guest_session_token?: string
          p_payment_data: Json
          p_quote_ids: string[]
          p_payment_status: string
          p_create_order?: boolean
          p_guest_session_data?: Json
        }
        Returns: {
          quotes_updated: boolean
          guest_session_updated: boolean
          order_id: string
          error_message: string
          payment_ledger_entry_id: string
          payment_transaction_id: string
          success: boolean
        }[]
      }
      process_refund_atomic: {
        Args: {
          p_quote_id: string
          p_refund_amount: number
          p_refund_data: Json
          p_gateway_response: Json
          p_processed_by: string
        }
        Returns: {
          refund_id: string
          success: boolean
          payment_transaction_updated: boolean
          quote_updated: boolean
          ledger_entry_id: string
          error_message: string
        }[]
      }
      process_refund_item: {
        Args: {
          p_status?: string
          p_gateway_refund_id: string
          p_gateway_response?: Json
          p_refund_item_id: string
        }
        Returns: Json
      }
      profiles_quotes: {
        Args: { "": Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: {
          admin_notes: string | null
          calculation_data: Json | null
          calculation_method_preference: string | null
          consolidation_group_id: string | null
          costprice_total_quote_origincurrency: number
          created_at: string
          currency: string
          customer_data: Json | null
          delivery_actual_date: string | null
          delivery_estimated_date: string | null
          delivery_provider: string | null
          delivery_provider_order_id: string | null
          delivery_tracking_number: string | null
          destination_country: string
          display_id: string | null
          email_verified: boolean | null
          estimated_delivery_date: string | null
          expires_at: string | null
          final_total_origincurrency: number
          first_viewed_at: string | null
          forwarding_data: Json | null
          forwarding_type: string | null
          id: string
          in_cart: boolean | null
          internal_notes: string | null
          is_anonymous: boolean | null
          items: Json
          iwish_tracking_id: string | null
          last_viewed_at: string | null
          ncm_delivery_instruction: string | null
          ncm_from_branch: string | null
          ncm_to_branch: string | null
          operational_data: Json | null
          optimization_score: number | null
          origin_country: string
          package_ids: string[] | null
          quote_source: string | null
          share_token: string | null
          shipping_carrier: string | null
          smart_suggestions: Json | null
          status: string
          storage_fees_included: boolean | null
          total_view_duration: number | null
          tracking_number: string | null
          tracking_status: string | null
          updated_at: string
          user_id: string | null
          valuation_method_preference: string | null
          verification_expires_at: string | null
          verification_sent_at: string | null
          verification_token: string | null
          view_count: number | null
          weight_confidence: number | null
        }[]
      }
      quotes_profile: {
        Args: { "": Database["public"]["Tables"]["quotes"]["Row"] }
        Returns: {
          avatar_url: string | null
          cod_enabled: boolean | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          internal_notes: string | null
          preferred_display_currency: string | null
          referral_code: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }[]
      }
      record_payment_with_ledger_and_triggers: {
        Args: {
          p_payment_method: string
          p_recorded_by?: string
          p_notes?: string
          p_currency: string
          p_amount: number
          p_transaction_reference: string
          p_payment_date?: string
          p_quote_id: string
        }
        Returns: Json
      }
      record_paypal_payment_to_ledger: {
        Args: {
          p_payer_email?: string
          p_capture_id?: string
          p_quote_id: string
          p_transaction_id: string
          p_amount: number
          p_currency: string
          p_order_id: string
        }
        Returns: Json
      }
      regenerate_backup_codes: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      requires_mfa: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      reverse_financial_transaction: {
        Args: { p_user_id: string; p_transaction_id: string; p_reason: string }
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
          p_supplier_name?: string
          p_instructions?: string
          p_pickup_address: Json
          p_pickup_time_slot: string
          p_pickup_date: string
          p_return_id: string
        }
        Returns: Json
      }
      select_delivery_provider: {
        Args: {
          p_from_country: string
          p_to_country: string
          p_weight: number
          p_requires_cod?: boolean
          p_preferred_provider?: string
        }
        Returns: {
          provider_name: string
          priority: number
          provider_code: string
        }[]
      }
      start_reconciliation_session: {
        Args: {
          p_statement_end_date?: string
          p_payment_method: string
          p_gateway_code?: string
          p_statement_date?: string
          p_statement_start_date?: string
        }
        Returns: Json
      }
      test_payment_update_direct: {
        Args: {
          new_amount_paid: number
          quote_id: string
          new_payment_status: string
        }
        Returns: Json
      }
      test_storage_fee_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_read_fees: boolean
          can_call_extend: boolean
          can_call_waive: boolean
          current_user_role: string
        }[]
      }
      text2ltree: {
        Args: { "": string }
        Returns: unknown
      }
      update_customer_segments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_location_capacity: {
        Args: { capacity_change: number; location_code: string }
        Returns: undefined
      }
      update_quote_view_tracking: {
        Args: { p_duration_seconds?: number; p_quote_id: string }
        Returns: undefined
      }
      update_support_ticket_status: {
        Args: {
          p_new_status: string
          p_user_id: string
          p_reason?: string
          p_support_id: string
        }
        Returns: boolean
      }
      validate_quotes_unified: {
        Args: Record<PropertyKey, never>
        Returns: {
          severity: string
          issue: string
          quote_id: string
        }[]
      }
      verify_mfa_login: {
        Args: { p_code: string; p_is_backup_code?: boolean }
        Returns: {
          verified: boolean
          session_token: string
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
        Args: { p_user_id: string; p_code: string; p_window?: number }
        Returns: boolean
      }
      verify_totp_setup: {
        Args: { p_code: string }
        Returns: Json
      }
      waive_storage_fees: {
        Args: { p_admin_id: string; p_reason: string; p_package_id: string }
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

