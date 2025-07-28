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
          operationName?: string
          query?: string
          extensions?: Json
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
      authenticated_checkout_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          payment_amount: number
          payment_currency: string
          payment_method: string
          quote_ids: string[]
          session_token: string
          status: string
          temporary_shipping_address: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          payment_amount: number
          payment_currency: string
          payment_method: string
          quote_ids: string[]
          session_token: string
          status?: string
          temporary_shipping_address?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          payment_amount?: number
          payment_currency?: string
          payment_method?: string
          quote_ids?: string[]
          session_token?: string
          status?: string
          temporary_shipping_address?: Json | null
          updated_at?: string | null
          user_id?: string
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
      bank_statement_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: Json | null
          failed_rows: number | null
          file_format: string | null
          file_name: string
          file_url: string | null
          id: string
          imported_at: string
          imported_by: string
          processed_rows: number | null
          reconciliation_id: string | null
          status: string | null
          successful_rows: number | null
          total_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_rows?: number | null
          file_format?: string | null
          file_name: string
          file_url?: string | null
          id?: string
          imported_at?: string
          imported_by: string
          processed_rows?: number | null
          reconciliation_id?: string | null
          status?: string | null
          successful_rows?: number | null
          total_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_rows?: number | null
          file_format?: string | null
          file_name?: string
          file_url?: string | null
          id?: string
          imported_at?: string
          imported_by?: string
          processed_rows?: number | null
          reconciliation_id?: string | null
          status?: string | null
          successful_rows?: number | null
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "payment_reconciliation"
            referencedColumns: ["id"]
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
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          description: string | null
          is_active: boolean | null
          name: string
          parent_code: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean | null
          name: string
          parent_code?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean | null
          name?: string
          parent_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
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
          group_name: string | null
          id: string
          original_package_ids: string[] | null
          package_count: number | null
          quote_id: string | null
          service_fee_usd: number | null
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
          group_name?: string | null
          id?: string
          original_package_ids?: string[] | null
          package_count?: number | null
          quote_id?: string | null
          service_fee_usd?: number | null
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
          group_name?: string | null
          id?: string
          original_package_ids?: string[] | null
          package_count?: number | null
          quote_id?: string | null
          service_fee_usd?: number | null
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
          available_gateways: string[] | null
          code: string
          created_at: string
          currency: string
          decimal_places: number | null
          decimal_separator: string | null
          default_gateway: string | null
          gateway_config: Json | null
          min_shipping: number | null
          minimum_payment_amount: number | null
          name: string
          payment_gateway: string | null
          payment_gateway_fixed_fee: number | null
          payment_gateway_percent_fee: number | null
          priority_thresholds: Json | null
          purchase_allowed: boolean | null
          rate_from_usd: number
          sales_tax: number | null
          shipping_allowed: boolean | null
          symbol_position: string | null
          symbol_space: boolean | null
          thousand_separator: string | null
          updated_at: string
          vat: number | null
          volumetric_divisor: number | null
          weight_unit: string | null
        }
        Insert: {
          additional_shipping?: number | null
          additional_weight?: number | null
          available_gateways?: string[] | null
          code: string
          created_at?: string
          currency: string
          decimal_places?: number | null
          decimal_separator?: string | null
          default_gateway?: string | null
          gateway_config?: Json | null
          min_shipping?: number | null
          minimum_payment_amount?: number | null
          name: string
          payment_gateway?: string | null
          payment_gateway_fixed_fee?: number | null
          payment_gateway_percent_fee?: number | null
          priority_thresholds?: Json | null
          purchase_allowed?: boolean | null
          rate_from_usd: number
          sales_tax?: number | null
          shipping_allowed?: boolean | null
          symbol_position?: string | null
          symbol_space?: boolean | null
          thousand_separator?: string | null
          updated_at?: string
          vat?: number | null
          volumetric_divisor?: number | null
          weight_unit?: string | null
        }
        Update: {
          additional_shipping?: number | null
          additional_weight?: number | null
          available_gateways?: string[] | null
          code?: string
          created_at?: string
          currency?: string
          decimal_places?: number | null
          decimal_separator?: string | null
          default_gateway?: string | null
          gateway_config?: Json | null
          min_shipping?: number | null
          minimum_payment_amount?: number | null
          name?: string
          payment_gateway?: string | null
          payment_gateway_fixed_fee?: number | null
          payment_gateway_percent_fee?: number | null
          priority_thresholds?: Json | null
          purchase_allowed?: boolean | null
          rate_from_usd?: number
          sales_tax?: number | null
          shipping_allowed?: boolean | null
          symbol_position?: string | null
          symbol_space?: boolean | null
          thousand_separator?: string | null
          updated_at?: string
          vat?: number | null
          volumetric_divisor?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      credit_note_applications: {
        Row: {
          applied_amount: number
          applied_at: string
          applied_by: string
          base_amount: number
          created_at: string
          credit_note_id: string
          currency: string
          exchange_rate: number | null
          financial_transaction_id: string | null
          id: string
          notes: string | null
          payment_ledger_id: string | null
          quote_id: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string | null
        }
        Insert: {
          applied_amount: number
          applied_at?: string
          applied_by: string
          base_amount: number
          created_at?: string
          credit_note_id: string
          currency: string
          exchange_rate?: number | null
          financial_transaction_id?: string | null
          id?: string
          notes?: string | null
          payment_ledger_id?: string | null
          quote_id: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string | null
        }
        Update: {
          applied_amount?: number
          applied_at?: string
          applied_by?: string
          base_amount?: number
          created_at?: string
          credit_note_id?: string
          currency?: string
          exchange_rate?: number | null
          financial_transaction_id?: string | null
          id?: string
          notes?: string | null
          payment_ledger_id?: string | null
          quote_id?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_applications_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_applications_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_applications_payment_ledger_id_fkey"
            columns: ["payment_ledger_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_applications_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "credit_note_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_history: {
        Row: {
          action: string
          amount_change: number | null
          credit_note_id: string
          description: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          performed_at: string
          performed_by: string
          previous_status: string | null
        }
        Insert: {
          action: string
          amount_change?: number | null
          credit_note_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          performed_at?: string
          performed_by: string
          previous_status?: string | null
        }
        Update: {
          action?: string
          amount_change?: number | null
          credit_note_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          performed_at?: string
          performed_by?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_history_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          allowed_categories: string[] | null
          allowed_countries: string[] | null
          amount: number
          amount_available: number | null
          amount_used: number | null
          approved_at: string | null
          approved_by: string | null
          base_amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          currency: string
          customer_id: string
          description: string | null
          exchange_rate: number | null
          id: string
          internal_notes: string | null
          issued_at: string
          issued_by: string
          metadata: Json | null
          minimum_order_value: number | null
          note_number: string
          note_type: string
          quote_id: string | null
          reason: string
          refund_request_id: string | null
          status: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          allowed_categories?: string[] | null
          allowed_countries?: string[] | null
          amount: number
          amount_available?: number | null
          amount_used?: number | null
          approved_at?: string | null
          approved_by?: string | null
          base_amount: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          currency: string
          customer_id: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          internal_notes?: string | null
          issued_at?: string
          issued_by: string
          metadata?: Json | null
          minimum_order_value?: number | null
          note_number: string
          note_type: string
          quote_id?: string | null
          reason: string
          refund_request_id?: string | null
          status?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          allowed_categories?: string[] | null
          allowed_countries?: string[] | null
          amount?: number
          amount_available?: number | null
          amount_used?: number | null
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          description?: string | null
          exchange_rate?: number | null
          id?: string
          internal_notes?: string | null
          issued_at?: string
          issued_by?: string
          metadata?: Json | null
          minimum_order_value?: number | null
          note_number?: string
          note_type?: string
          quote_id?: string | null
          reason?: string
          refund_request_id?: string | null
          status?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_refund_request_id_fkey"
            columns: ["refund_request_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_type: string | null
          assigned_date: string | null
          created_at: string | null
          full_address: string
          id: string
          profile_id: string | null
          status: string | null
          suite_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_type?: string | null
          assigned_date?: string | null
          created_at?: string | null
          full_address: string
          id?: string
          profile_id?: string | null
          status?: string | null
          suite_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_type?: string | null
          assigned_date?: string | null
          created_at?: string | null
          full_address?: string
          id?: string
          profile_id?: string | null
          status?: string | null
          suite_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
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
          {
            foreignKeyName: "customer_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
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
      email_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          html_content: string
          id: string
          last_attempt_at: string | null
          max_attempts: number | null
          recipient_email: string
          related_entity_id: string | null
          related_entity_type: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
          text_content: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          html_content: string
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          recipient_email: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
          text_content?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          html_content?: string
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          recipient_email?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
          text_content?: string | null
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
          auto_send: boolean | null
          category: string | null
          created_at: string
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string
          trigger_conditions: Json | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          auto_send?: boolean | null
          category?: string | null
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type: string
          trigger_conditions?: Json | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          auto_send?: boolean | null
          category?: string | null
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string
          trigger_conditions?: Json | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          credit_account: string
          currency: string
          debit_account: string
          description: string
          id: string
          metadata: Json | null
          notes: string | null
          posted_at: string | null
          reference_id: string
          reference_type: string
          reversal_reason: string | null
          reversed_by: string | null
          status: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          credit_account: string
          currency: string
          debit_account: string
          description: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          posted_at?: string | null
          reference_id: string
          reference_type: string
          reversal_reason?: string | null
          reversed_by?: string | null
          status?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          credit_account?: string
          currency?: string
          debit_account?: string
          description?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          posted_at?: string | null
          reference_id?: string
          reference_type?: string
          reversal_reason?: string | null
          reversed_by?: string | null
          status?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_credit_account_fkey"
            columns: ["credit_account"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "financial_transactions_debit_account_fkey"
            columns: ["debit_account"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "financial_transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
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
      global_tax_method_preferences: {
        Row: {
          admin_id: string | null
          created_at: string
          default_calculation_method: string
          default_valuation_method: string
          fallback_chain: Json | null
          id: string
          is_active: boolean | null
          preference_scope: string
          scope_identifier: string | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          default_calculation_method?: string
          default_valuation_method?: string
          fallback_chain?: Json | null
          id?: string
          is_active?: boolean | null
          preference_scope: string
          scope_identifier?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          default_calculation_method?: string
          default_valuation_method?: string
          fallback_chain?: Json | null
          id?: string
          is_active?: boolean | null
          preference_scope?: string
          scope_identifier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_tax_method_preferences_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_tax_method_preferences_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_checkout_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          payment_amount: number
          payment_currency: string
          payment_method: string
          quote_id: string
          session_token: string
          shipping_address: Json
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          payment_amount: number
          payment_currency: string
          payment_method: string
          quote_id: string
          session_token: string
          shipping_address: Json
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          payment_amount?: number
          payment_currency?: string
          payment_method?: string
          quote_id?: string
          session_token?: string
          shipping_address?: Json
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hsn_master: {
        Row: {
          category: string
          classification_data: Json | null
          created_at: string
          description: string
          hsn_code: string
          id: string
          is_active: boolean | null
          keywords: string[] | null
          minimum_valuation_usd: number | null
          requires_currency_conversion: boolean | null
          subcategory: string | null
          tax_data: Json | null
          updated_at: string
          weight_data: Json | null
        }
        Insert: {
          category: string
          classification_data?: Json | null
          created_at?: string
          description: string
          hsn_code: string
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          minimum_valuation_usd?: number | null
          requires_currency_conversion?: boolean | null
          subcategory?: string | null
          tax_data?: Json | null
          updated_at?: string
          weight_data?: Json | null
        }
        Update: {
          category?: string
          classification_data?: Json | null
          created_at?: string
          description?: string
          hsn_code?: string
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          minimum_valuation_usd?: number | null
          requires_currency_conversion?: boolean | null
          subcategory?: string | null
          tax_data?: Json | null
          updated_at?: string
          weight_data?: Json | null
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
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
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
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          id: number
          ip_address: unknown | null
          metadata: Json | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: number
          ip_address?: unknown | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_configurations: {
        Row: {
          backup_codes: string | null
          backup_codes_generated_at: string | null
          backup_codes_used: number[] | null
          created_at: string
          failed_attempts: number | null
          id: string
          last_used_at: string | null
          last_used_ip: unknown | null
          locked_until: string | null
          totp_enabled: boolean | null
          totp_secret: string
          totp_verified: boolean | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string | null
          backup_codes_generated_at?: string | null
          backup_codes_used?: number[] | null
          created_at?: string
          failed_attempts?: number | null
          id?: string
          last_used_at?: string | null
          last_used_ip?: unknown | null
          locked_until?: string | null
          totp_enabled?: boolean | null
          totp_secret: string
          totp_verified?: boolean | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string | null
          backup_codes_generated_at?: string | null
          backup_codes_used?: number[] | null
          created_at?: string
          failed_attempts?: number | null
          id?: string
          last_used_at?: string | null
          last_used_ip?: unknown | null
          locked_until?: string | null
          totp_enabled?: boolean | null
          totp_secret?: string
          totp_verified?: boolean | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      mfa_sessions: {
        Row: {
          expires_at: string
          id: string
          ip_address: unknown | null
          session_token: string
          user_agent: string | null
          user_id: string
          verified_at: string
        }
        Insert: {
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          session_token: string
          user_agent?: string | null
          user_id: string
          verified_at?: string
        }
        Update: {
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      ml_category_weights: {
        Row: {
          avg_weight: number
          category: string
          id: string
          last_updated: string | null
          max_weight: number
          min_weight: number
          sample_count: number | null
        }
        Insert: {
          avg_weight: number
          category: string
          id?: string
          last_updated?: string | null
          max_weight: number
          min_weight: number
          sample_count?: number | null
        }
        Update: {
          avg_weight?: number
          category?: string
          id?: string
          last_updated?: string | null
          max_weight?: number
          min_weight?: number
          sample_count?: number | null
        }
        Relationships: []
      }
      ml_product_weights: {
        Row: {
          accuracy_score: number | null
          brand: string | null
          category: string | null
          confidence: number
          created_at: string | null
          created_by: string | null
          id: string
          learned_from_url: string | null
          normalized_name: string
          product_name: string
          training_count: number | null
          updated_at: string | null
          weight_kg: number
        }
        Insert: {
          accuracy_score?: number | null
          brand?: string | null
          category?: string | null
          confidence: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          learned_from_url?: string | null
          normalized_name: string
          product_name: string
          training_count?: number | null
          updated_at?: string | null
          weight_kg: number
        }
        Update: {
          accuracy_score?: number | null
          brand?: string | null
          category?: string | null
          confidence?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          learned_from_url?: string | null
          normalized_name?: string
          product_name?: string
          training_count?: number | null
          updated_at?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "ml_product_weights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_product_weights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_training_history: {
        Row: {
          accuracy: number
          actual_weight: number
          brand: string | null
          category: string | null
          confidence: number
          estimated_weight: number
          id: string
          product_name: string
          trained_at: string | null
          trained_by: string | null
          url: string | null
          user_confirmed: boolean | null
        }
        Insert: {
          accuracy: number
          actual_weight: number
          brand?: string | null
          category?: string | null
          confidence: number
          estimated_weight: number
          id?: string
          product_name: string
          trained_at?: string | null
          trained_by?: string | null
          url?: string | null
          user_confirmed?: boolean | null
        }
        Update: {
          accuracy?: number
          actual_weight?: number
          brand?: string | null
          category?: string | null
          confidence?: number
          estimated_weight?: number
          id?: string
          product_name?: string
          trained_at?: string | null
          trained_by?: string | null
          url?: string | null
          user_confirmed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_training_history_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_training_history_trained_by_fkey"
            columns: ["trained_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          allow_dismiss: boolean | null
          created_at: string | null
          data: Json | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          priority: string
          read_at: string | null
          requires_action: boolean | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_dismiss?: boolean | null
          created_at?: string | null
          data?: Json | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          priority?: string
          read_at?: string | null
          requires_action?: boolean | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_dismiss?: boolean | null
          created_at?: string | null
          data?: Json | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          priority?: string
          read_at?: string | null
          requires_action?: boolean | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_tokens: {
        Row: {
          access_token: string
          client_id: string
          created_at: string
          expires_at: string
          expires_in: number
          gateway_code: string
          id: string
          is_active: boolean | null
          scope: string
          token_type: string | null
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string
          expires_at: string
          expires_in: number
          gateway_code: string
          id?: string
          is_active?: boolean | null
          scope: string
          token_type?: string | null
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string
          expires_at?: string
          expires_in?: number
          gateway_code?: string
          id?: string
          is_active?: boolean | null
          scope?: string
          token_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_gateway_code_fkey"
            columns: ["gateway_code"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["code"]
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
          {
            foreignKeyName: "package_events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "received_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          delivery_method: string[] | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          package_id: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          delivery_method?: string[] | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          package_id?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          delivery_method?: string[] | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          package_id?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_notifications_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "received_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_photos: {
        Row: {
          caption: string | null
          consolidation_group_id: string | null
          created_at: string | null
          dimensions: Json | null
          file_size_bytes: number | null
          id: string
          package_id: string | null
          photo_type: string
          photo_url: string
        }
        Insert: {
          caption?: string | null
          consolidation_group_id?: string | null
          created_at?: string | null
          dimensions?: Json | null
          file_size_bytes?: number | null
          id?: string
          package_id?: string | null
          photo_type: string
          photo_url: string
        }
        Update: {
          caption?: string | null
          consolidation_group_id?: string | null
          created_at?: string | null
          dimensions?: Json | null
          file_size_bytes?: number | null
          id?: string
          package_id?: string | null
          photo_type?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_photos_consolidation_group_id_fkey"
            columns: ["consolidation_group_id"]
            isOneToOne: false
            referencedRelation: "consolidation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_photos_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "received_packages"
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
          financial_transaction_id: string | null
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
          financial_transaction_id?: string | null
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
          financial_transaction_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "payment_adjustments_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_adjustments_payment_ledger_id_fkey"
            columns: ["payment_ledger_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_alert_thresholds: {
        Row: {
          comparison_operator: string
          created_at: string | null
          critical_threshold: number
          description: string | null
          enabled: boolean
          id: string
          metric_name: string
          updated_at: string | null
          warning_threshold: number
        }
        Insert: {
          comparison_operator?: string
          created_at?: string | null
          critical_threshold: number
          description?: string | null
          enabled?: boolean
          id?: string
          metric_name: string
          updated_at?: string | null
          warning_threshold: number
        }
        Update: {
          comparison_operator?: string
          created_at?: string | null
          critical_threshold?: number
          description?: string | null
          enabled?: boolean
          id?: string
          metric_name?: string
          updated_at?: string | null
          warning_threshold?: number
        }
        Relationships: []
      }
      payment_error_logs: {
        Row: {
          amount: number | null
          context: Json | null
          created_at: string | null
          currency: string | null
          error_code: string
          error_message: string
          gateway: string
          id: string
          recovery_options: Json | null
          retry_delay: number | null
          severity: string
          should_retry: boolean
          transaction_id: string | null
          updated_at: string | null
          user_action: string | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          amount?: number | null
          context?: Json | null
          created_at?: string | null
          currency?: string | null
          error_code: string
          error_message: string
          gateway: string
          id?: string
          recovery_options?: Json | null
          retry_delay?: number | null
          severity?: string
          should_retry?: boolean
          transaction_id?: string | null
          updated_at?: string | null
          user_action?: string | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          amount?: number | null
          context?: Json | null
          created_at?: string | null
          currency?: string | null
          error_code?: string
          error_message?: string
          gateway?: string
          id?: string
          recovery_options?: Json | null
          retry_delay?: number | null
          severity?: string
          should_retry?: boolean
          transaction_id?: string | null
          updated_at?: string | null
          user_action?: string | null
          user_id?: string | null
          user_message?: string
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
      payment_ledger: {
        Row: {
          amount: number
          bank_reference: string | null
          created_at: string
          created_by: string
          currency: string
          customer_reference: string | null
          financial_transaction_id: string | null
          gateway_code: string | null
          gateway_response: Json | null
          gateway_transaction_id: string | null
          id: string
          metadata: Json | null
          notes: string | null
          parent_payment_id: string | null
          payment_date: string
          payment_method: string
          payment_proof_message_id: string | null
          payment_transaction_id: string | null
          payment_type: string
          quote_id: string
          reference_number: string | null
          status: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          created_at?: string
          created_by: string
          currency: string
          customer_reference?: string | null
          financial_transaction_id?: string | null
          gateway_code?: string | null
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          parent_payment_id?: string | null
          payment_date?: string
          payment_method: string
          payment_proof_message_id?: string | null
          payment_transaction_id?: string | null
          payment_type: string
          quote_id: string
          reference_number?: string | null
          status?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          customer_reference?: string | null
          financial_transaction_id?: string | null
          gateway_code?: string | null
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          parent_payment_id?: string | null
          payment_date?: string
          payment_method?: string
          payment_proof_message_id?: string | null
          payment_transaction_id?: string | null
          payment_type?: string
          quote_id?: string
          reference_number?: string | null
          status?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_ledger_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_payment_proof_message_id_fkey"
            columns: ["payment_proof_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_ledger_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          api_version: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          current_uses: number | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          expires_at: string | null
          gateway: string | null
          gateway_link_id: string | null
          gateway_request: Json | null
          gateway_response: Json | null
          id: string
          is_public: boolean | null
          link_code: string
          max_uses: number | null
          original_amount: number | null
          original_currency: string | null
          payment_url: string | null
          quote_id: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          api_version?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          current_uses?: number | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          gateway?: string | null
          gateway_link_id?: string | null
          gateway_request?: Json | null
          gateway_response?: Json | null
          id?: string
          is_public?: boolean | null
          link_code?: string
          max_uses?: number | null
          original_amount?: number | null
          original_currency?: string | null
          payment_url?: string | null
          quote_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          api_version?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          current_uses?: number | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          expires_at?: string | null
          gateway?: string | null
          gateway_link_id?: string | null
          gateway_request?: Json | null
          gateway_response?: Json | null
          id?: string
          is_public?: boolean | null
          link_code?: string
          max_uses?: number | null
          original_amount?: number | null
          original_currency?: string | null
          payment_url?: string | null
          quote_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation: {
        Row: {
          closing_difference: number | null
          completed_at: string | null
          created_at: string
          gateway_code: string | null
          id: string
          matched_count: number | null
          metadata: Json | null
          notes: string | null
          opening_difference: number | null
          payment_method: string
          reconciled_by: string
          reconciliation_date: string
          started_at: string
          statement_closing_balance: number | null
          statement_end_date: string | null
          statement_file_name: string | null
          statement_file_url: string | null
          statement_opening_balance: number | null
          statement_reference: string | null
          statement_start_date: string | null
          statement_total_credits: number | null
          statement_total_debits: number | null
          status: string | null
          system_closing_balance: number | null
          system_opening_balance: number | null
          system_total_credits: number | null
          system_total_debits: number | null
          total_matched_amount: number | null
          unmatched_statement_count: number | null
          unmatched_system_count: number | null
          updated_at: string
        }
        Insert: {
          closing_difference?: number | null
          completed_at?: string | null
          created_at?: string
          gateway_code?: string | null
          id?: string
          matched_count?: number | null
          metadata?: Json | null
          notes?: string | null
          opening_difference?: number | null
          payment_method: string
          reconciled_by: string
          reconciliation_date: string
          started_at?: string
          statement_closing_balance?: number | null
          statement_end_date?: string | null
          statement_file_name?: string | null
          statement_file_url?: string | null
          statement_opening_balance?: number | null
          statement_reference?: string | null
          statement_start_date?: string | null
          statement_total_credits?: number | null
          statement_total_debits?: number | null
          status?: string | null
          system_closing_balance?: number | null
          system_opening_balance?: number | null
          system_total_credits?: number | null
          system_total_debits?: number | null
          total_matched_amount?: number | null
          unmatched_statement_count?: number | null
          unmatched_system_count?: number | null
          updated_at?: string
        }
        Update: {
          closing_difference?: number | null
          completed_at?: string | null
          created_at?: string
          gateway_code?: string | null
          id?: string
          matched_count?: number | null
          metadata?: Json | null
          notes?: string | null
          opening_difference?: number | null
          payment_method?: string
          reconciled_by?: string
          reconciliation_date?: string
          started_at?: string
          statement_closing_balance?: number | null
          statement_end_date?: string | null
          statement_file_name?: string | null
          statement_file_url?: string | null
          statement_opening_balance?: number | null
          statement_reference?: string | null
          statement_start_date?: string | null
          statement_total_credits?: number | null
          statement_total_debits?: number | null
          status?: string | null
          system_closing_balance?: number | null
          system_opening_balance?: number | null
          system_total_credits?: number | null
          system_total_debits?: number | null
          total_matched_amount?: number | null
          unmatched_statement_count?: number | null
          unmatched_system_count?: number | null
          updated_at?: string
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
          created_at: string | null
          currency: string | null
          gateway_response: Json | null
          id: string
          is_fully_refunded: boolean | null
          last_refund_at: string | null
          payment_method: string | null
          paypal_capture_id: string | null
          paypal_order_id: string | null
          paypal_payer_email: string | null
          paypal_payer_id: string | null
          quote_id: string | null
          refund_count: number | null
          status: string | null
          total_refunded: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          gateway_response?: Json | null
          id?: string
          is_fully_refunded?: boolean | null
          last_refund_at?: string | null
          payment_method?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payer_email?: string | null
          paypal_payer_id?: string | null
          quote_id?: string | null
          refund_count?: number | null
          status?: string | null
          total_refunded?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          gateway_response?: Json | null
          id?: string
          is_fully_refunded?: boolean | null
          last_refund_at?: string | null
          payment_method?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payer_email?: string | null
          paypal_payer_id?: string | null
          quote_id?: string | null
          refund_count?: number | null
          status?: string | null
          total_refunded?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      paypal_refunds: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_note: string | null
          error_details: Json | null
          id: string
          original_amount: number
          original_transaction_id: string
          payment_transaction_id: string | null
          paypal_response: Json | null
          paypal_status: string | null
          processed_by: string | null
          quote_id: string | null
          reason_code: string | null
          reason_description: string | null
          refund_amount: number
          refund_date: string | null
          refund_id: string
          refund_type: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          customer_note?: string | null
          error_details?: Json | null
          id?: string
          original_amount: number
          original_transaction_id: string
          payment_transaction_id?: string | null
          paypal_response?: Json | null
          paypal_status?: string | null
          processed_by?: string | null
          quote_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          refund_amount: number
          refund_date?: string | null
          refund_id: string
          refund_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_note?: string | null
          error_details?: Json | null
          id?: string
          original_amount?: number
          original_transaction_id?: string
          payment_transaction_id?: string | null
          paypal_response?: Json | null
          paypal_status?: string | null
          processed_by?: string | null
          quote_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          refund_amount?: number
          refund_date?: string | null
          refund_id?: string
          refund_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paypal_refunds_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paypal_refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paypal_refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paypal_refunds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paypal_refunds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
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
          preferred_payment_gateway: string | null
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
          preferred_payment_gateway?: string | null
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
          preferred_payment_gateway?: string | null
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
            foreignKeyName: "quote_address_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
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
          {
            foreignKeyName: "quote_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
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
          costprice_total_usd: number
          created_at: string
          currency: string
          customer_data: Json | null
          destination_country: string
          display_id: string | null
          email_verified: boolean | null
          estimated_delivery_date: string | null
          expires_at: string | null
          final_total_usd: number
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
          costprice_total_usd?: number
          created_at?: string
          currency?: string
          customer_data?: Json | null
          destination_country: string
          display_id?: string | null
          email_verified?: boolean | null
          estimated_delivery_date?: string | null
          expires_at?: string | null
          final_total_usd?: number
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
          costprice_total_usd?: number
          created_at?: string
          currency?: string
          customer_data?: Json | null
          destination_country?: string
          display_id?: string | null
          email_verified?: boolean | null
          estimated_delivery_date?: string | null
          expires_at?: string | null
          final_total_usd?: number
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
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
      }
      received_packages: {
        Row: {
          carrier: string | null
          condition_notes: string | null
          consolidation_group_id: string | null
          contents_list: Json | null
          created_at: string | null
          customer_address_id: string
          declared_value_usd: number | null
          dimensional_weight_kg: number | null
          dimensions: Json
          id: string
          last_scanned_at: string | null
          package_description: string | null
          photos: Json | null
          quote_id: string | null
          received_by_staff_id: string | null
          received_date: string | null
          sender_address: Json | null
          sender_name: string | null
          sender_store: string | null
          status: string | null
          storage_fee_exempt_until: string | null
          storage_location: string | null
          storage_start_date: string | null
          tracking_number: string | null
          updated_at: string | null
          weight_kg: number
        }
        Insert: {
          carrier?: string | null
          condition_notes?: string | null
          consolidation_group_id?: string | null
          contents_list?: Json | null
          created_at?: string | null
          customer_address_id: string
          declared_value_usd?: number | null
          dimensional_weight_kg?: number | null
          dimensions: Json
          id?: string
          last_scanned_at?: string | null
          package_description?: string | null
          photos?: Json | null
          quote_id?: string | null
          received_by_staff_id?: string | null
          received_date?: string | null
          sender_address?: Json | null
          sender_name?: string | null
          sender_store?: string | null
          status?: string | null
          storage_fee_exempt_until?: string | null
          storage_location?: string | null
          storage_start_date?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          weight_kg: number
        }
        Update: {
          carrier?: string | null
          condition_notes?: string | null
          consolidation_group_id?: string | null
          contents_list?: Json | null
          created_at?: string | null
          customer_address_id?: string
          declared_value_usd?: number | null
          dimensional_weight_kg?: number | null
          dimensions?: Json
          id?: string
          last_scanned_at?: string | null
          package_description?: string | null
          photos?: Json | null
          quote_id?: string | null
          received_by_staff_id?: string | null
          received_date?: string | null
          sender_address?: Json | null
          sender_name?: string | null
          sender_store?: string | null
          status?: string | null
          storage_fee_exempt_until?: string | null
          storage_location?: string | null
          storage_start_date?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "received_packages_customer_address_id_fkey"
            columns: ["customer_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "received_packages_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
        Relationships: [
          {
            foreignKeyName: "reconciliation_items_payment_ledger_id_fkey"
            columns: ["payment_ledger_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "payment_reconciliation"
            referencedColumns: ["id"]
          },
        ]
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
          financial_transaction_id: string | null
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
          financial_transaction_id?: string | null
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
          financial_transaction_id?: string | null
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
            foreignKeyName: "refund_items_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_items_payment_ledger_id_fkey"
            columns: ["payment_ledger_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_items_refund_payment_id_fkey"
            columns: ["refund_payment_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
            referencedColumns: ["id"]
          },
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
          payment_ledger_id: string | null
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
          payment_ledger_id?: string | null
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
          payment_ledger_id?: string | null
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
            foreignKeyName: "refund_requests_payment_ledger_id_fkey"
            columns: ["payment_ledger_id"]
            isOneToOne: false
            referencedRelation: "payment_ledger"
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
          carriers: Json | null
          cost_per_kg: number
          cost_percentage: number | null
          created_at: string | null
          customs_clearance_days: number | null
          customs_percentage: number | null
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
          tax_configuration: Json | null
          updated_at: string | null
          vat_percentage: number | null
          weight_configuration: Json | null
          weight_tiers: Json | null
          weight_unit: string
        }
        Insert: {
          active?: boolean | null
          api_configuration?: Json | null
          base_shipping_cost: number
          carriers?: Json | null
          cost_per_kg: number
          cost_percentage?: number | null
          created_at?: string | null
          customs_clearance_days?: number | null
          customs_percentage?: number | null
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
          tax_configuration?: Json | null
          updated_at?: string | null
          vat_percentage?: number | null
          weight_configuration?: Json | null
          weight_tiers?: Json | null
          weight_unit?: string
        }
        Update: {
          active?: boolean | null
          api_configuration?: Json | null
          base_shipping_cost?: number
          carriers?: Json | null
          cost_per_kg?: number
          cost_percentage?: number | null
          created_at?: string | null
          customs_clearance_days?: number | null
          customs_percentage?: number | null
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
          tax_configuration?: Json | null
          updated_at?: string | null
          vat_percentage?: number | null
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
      storage_fees: {
        Row: {
          created_at: string | null
          daily_rate_usd: number | null
          days_stored: number | null
          end_date: string | null
          id: string
          is_paid: boolean | null
          package_id: string | null
          payment_date: string | null
          quote_id: string | null
          start_date: string
          total_fee_usd: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_rate_usd?: number | null
          days_stored?: number | null
          end_date?: string | null
          id?: string
          is_paid?: boolean | null
          package_id?: string | null
          payment_date?: string | null
          quote_id?: string | null
          start_date: string
          total_fee_usd?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_rate_usd?: number | null
          days_stored?: number | null
          end_date?: string | null
          id?: string
          is_paid?: boolean | null
          package_id?: string | null
          payment_date?: string | null
          quote_id?: string | null
          start_date?: string
          total_fee_usd?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_fees_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "received_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_fees_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
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
      tax_backup_20250128: {
        Row: {
          backup_timestamp: string | null
          code: string | null
          sales_tax: number | null
          vat: number | null
        }
        Insert: {
          backup_timestamp?: string | null
          code?: string | null
          sales_tax?: number | null
          vat?: number | null
        }
        Update: {
          backup_timestamp?: string | null
          code?: string | null
          sales_tax?: number | null
          vat?: number | null
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
            foreignKeyName: "tax_calculation_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
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
      user_activity_analytics: {
        Row: {
          activity_data: Json
          activity_type: string
          created_at: string | null
          id: string
          referrer: string | null
          session_id: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json
          activity_type: string
          created_at?: string | null
          id?: string
          referrer?: string | null
          session_id: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json
          activity_type?: string
          created_at?: string | null
          id?: string
          referrer?: string | null
          session_id?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
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
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
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
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
      }
      user_oauth_data: {
        Row: {
          created_at: string
          id: string
          oauth_data: Json
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          oauth_data: Json
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          oauth_data?: Json
          provider?: string
          updated_at?: string | null
          user_id?: string
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
      warehouse_locations: {
        Row: {
          created_at: string | null
          current_packages: number | null
          id: string
          is_active: boolean | null
          location_code: string
          maintenance_notes: string | null
          max_dimensions: Json | null
          max_packages: number | null
          max_weight_kg: number | null
          shelf_number: number | null
          slot_number: number | null
          updated_at: string | null
          zone: string
        }
        Insert: {
          created_at?: string | null
          current_packages?: number | null
          id?: string
          is_active?: boolean | null
          location_code: string
          maintenance_notes?: string | null
          max_dimensions?: Json | null
          max_packages?: number | null
          max_weight_kg?: number | null
          shelf_number?: number | null
          slot_number?: number | null
          updated_at?: string | null
          zone: string
        }
        Update: {
          created_at?: string | null
          current_packages?: number | null
          id?: string
          is_active?: boolean | null
          location_code?: string
          maintenance_notes?: string | null
          max_dimensions?: Json | null
          max_packages?: number | null
          max_weight_kg?: number | null
          shelf_number?: number | null
          slot_number?: number | null
          updated_at?: string | null
          zone?: string
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
      hsn_search_optimized: {
        Row: {
          category: string | null
          color: string | null
          common_brands: string | null
          description: string | null
          display_name: string | null
          hsn_code: string | null
          icon: string | null
          keywords: string[] | null
          keywords_text: string | null
          minimum_valuation_usd: number | null
          requires_currency_conversion: boolean | null
          search_priority: string | null
          search_vector: unknown | null
          subcategory: string | null
          tax_data: Json | null
          weight_data: Json | null
        }
        Relationships: []
      }
      payment_error_analytics: {
        Row: {
          affected_users: number | null
          avg_failed_amount: number | null
          currencies: string[] | null
          error_code: string | null
          error_count: number | null
          error_date: string | null
          failed_transactions: number | null
          gateway: string | null
          severity: string | null
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
      payment_links_summary: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          current_uses: number | null
          effective_status: string | null
          expires_at: string | null
          gateway: string | null
          id: string | null
          link_code: string | null
          max_uses: number | null
          quote_id: string | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_uses?: number | null
          effective_status?: never
          expires_at?: string | null
          gateway?: string | null
          id?: string | null
          link_code?: string | null
          max_uses?: number | null
          quote_id?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_uses?: number | null
          effective_status?: never
          expires_at?: string | null
          gateway?: string | null
          id?: string | null
          link_code?: string | null
          max_uses?: number | null
          quote_id?: string | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_phone"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_refund_summary: {
        Row: {
          avg_refund_amount: number | null
          completed_refunds: number | null
          failed_refunds: number | null
          full_refunds: number | null
          partial_refunds: number | null
          refund_count: number | null
          refund_date: string | null
          total_refunded: number | null
        }
        Relationships: []
      }
      profiles_with_phone: {
        Row: {
          avatar_url: string | null
          cod_enabled: boolean | null
          country: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          internal_notes: string | null
          phone: string | null
          preferred_display_currency: string | null
          preferred_payment_gateway: string | null
          referral_code: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
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
      add_storage_fees_to_quote: {
        Args: { p_user_id: string; p_quote_id: string }
        Returns: number
      }
      add_support_interaction: {
        Args: {
          p_user_id: string
          p_support_id: string
          p_is_internal?: boolean
          p_interaction_type: string
          p_content: Json
        }
        Returns: string
      }
      analyze_tax_method_performance: {
        Args: {
          p_origin_country: string
          p_time_range_days?: number
          p_destination_country: string
        }
        Returns: Json
      }
      apply_credit_note: {
        Args: {
          p_amount?: number
          p_quote_id: string
          p_credit_note_id: string
        }
        Returns: Json
      }
      approve_refund_request: {
        Args: {
          p_approved_amount?: number
          p_refund_request_id: string
          p_notes?: string
        }
        Returns: Json
      }
      auto_match_transactions: {
        Args: { p_reconciliation_id: string }
        Returns: Json
      }
      bulk_update_tax_methods: {
        Args: {
          p_change_reason?: string
          p_quote_ids: string[]
          p_admin_id: string
          p_calculation_method: string
        }
        Returns: Json
      }
      calculate_storage_fees: {
        Args: { end_date?: string; package_id: string }
        Returns: number
      }
      cleanup_expired_authenticated_checkout_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_guest_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_mfa_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_oauth_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_activity_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      cleanup_old_webhook_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_reconciliation: {
        Args: { p_reconciliation_id: string; p_notes?: string }
        Returns: Json
      }
      confirm_backup_codes_saved: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      confirm_payment_from_proof: {
        Args: {
          p_quote_id: string
          p_amount_paid: number
          p_payment_status: string
        }
        Returns: Json
      }
      convert_minimum_valuation_usd_to_origin: {
        Args: { usd_amount: number; origin_country: string }
        Returns: Json
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
          p_customer_id: string
          p_amount: number
          p_currency: string
          p_reason: string
          p_description?: string
          p_quote_id?: string
          p_refund_request_id?: string
          p_minimum_order_value?: number
          p_auto_approve?: boolean
        }
        Returns: Json
      }
      create_mfa_session_after_setup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_package_forwarding_quote: {
        Args: {
          p_destination_country: string
          p_customer_data?: Json
          p_package_id: string
        }
        Returns: string
      }
      create_payment_with_ledger_entry: {
        Args: {
          p_user_id?: string
          p_quote_id: string
          p_amount: number
          p_currency: string
          p_payment_method: string
          p_payment_type?: string
          p_reference_number?: string
          p_gateway_code?: string
          p_gateway_transaction_id?: string
          p_notes?: string
          p_message_id?: string
        }
        Returns: Json
      }
      create_refund_request: {
        Args: {
          p_reason_code: string
          p_quote_id: string
          p_amount: number
          p_refund_type: string
          p_currency: string
          p_internal_notes?: string
          p_refund_method?: string
          p_payment_ids?: string[]
          p_reason_description: string
          p_customer_notes?: string
        }
        Returns: Json
      }
      disable_mfa: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      encode_base32: {
        Args: { data: string }
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
      extract_oauth_user_info: {
        Args: { user_metadata: Json }
        Returns: Json
      }
      force_update_payment: {
        Args: {
          payment_method?: string
          p_quote_id: string
          new_amount_paid: number
          new_payment_status: string
          reference_number?: string
          notes?: string
          payment_currency?: string
        }
        Returns: Json
      }
      generate_backup_codes: {
        Args: { p_count?: number }
        Returns: string[]
      }
      generate_credit_note_number: {
        Args: Record<PropertyKey, never>
        Returns: string
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
          id: string
          payment_url: string
          link_code: string
          expires_at: string
          api_version: string
          status: string
        }[]
      }
      get_all_user_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          source: string
          user_id: string
          full_name: string
        }[]
      }
      get_available_credit_notes: {
        Args: { p_customer_id?: string; p_min_amount?: number }
        Returns: {
          valid_until: string
          credit_note_id: string
          note_number: string
          amount: number
          currency: string
          amount_available: number
          reason: string
          minimum_order_value: number
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
      get_currency_conversion_metrics: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          currency_pair: string
          conversion_count: number
          average_variance: number
          max_variance: number
          accuracy_score: number
        }[]
      }
      get_currency_mismatches: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          quote_id: string
          order_display_id: string
          quote_currency: string
          payment_currency: string
          quote_amount: number
          payment_amount: number
          created_at: string
          payment_method: string
          gateway_transaction_id: string
        }[]
      }
      get_currency_statistics: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          payment_count: number
          average_payment: number
          last_payment_date: string
          unique_customers: number
          net_amount: number
          total_refunds: number
          total_payments: number
          currency: string
          refund_count: number
        }[]
      }
      get_effective_tax_method: {
        Args: { quote_id_param: string }
        Returns: {
          source: string
          calculation_method: string
          valuation_method: string
          confidence: number
        }[]
      }
      get_exchange_rate_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          age_minutes: number
          last_updated: string
          is_stale: boolean
          is_fallback: boolean
          current_rate: number
          currency: string
        }[]
      }
      get_hsn_with_currency_conversion: {
        Args: { hsn_code_param: string; origin_country_param?: string }
        Returns: Json
      }
      get_mfa_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
          payment_method: string
          customer_email: string
          customer_id: string
          message_id: string
          verification_status: string
          admin_notes: string
          amount_paid: number
          attachment_file_name: string
          attachment_url: string
          order_display_id: string
          order_id: string
          submitted_at: string
          final_total: number
          final_currency: string
          verified_at: string
          payment_status: string
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
          status: string
          payment_id: string
          quote_id: string
          order_display_id: string
          payment_date: string
          payment_type: string
          payment_method: string
          gateway_name: string
          amount: number
          currency: string
          base_amount: number
          running_balance: number
          reference_number: string
          notes: string
          created_by_name: string
        }[]
      }
      get_payment_proof_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_popular_posts: {
        Args: { limit_count?: number }
        Returns: {
          excerpt: string
          featured_image_url: string
          published_at: string
          reading_time_minutes: number
          category_name: string
          views_count: number
          slug: string
          title: string
          id: string
        }[]
      }
      get_quote_items: {
        Args: { quote_row: Database["public"]["Tables"]["quotes"]["Row"] }
        Returns: {
          price_usd: number
          id: string
          name: string
          quantity: number
          weight_kg: number
          weight_confidence: number
        }[]
      }
      get_quote_message_thread: {
        Args: { p_quote_id: string }
        Returns: {
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
          is_internal: boolean
        }[]
      }
      get_related_posts: {
        Args: { post_slug: string; limit_count?: number }
        Returns: {
          published_at: string
          id: string
          title: string
          slug: string
          excerpt: string
          featured_image_url: string
          reading_time_minutes: number
          category_name: string
          views_count: number
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
          cost: number
          carrier: string
          delivery_days: string
          method: string
        }[]
      }
      get_shipping_options: {
        Args: { quote_row: Database["public"]["Tables"]["quotes"]["Row"] }
        Returns: Json
      }
      get_suspicious_payment_amounts: {
        Args: { tolerance?: number; start_date?: string; end_date?: string }
        Returns: {
          created_at: string
          suspicion_level: string
          quote_id: string
          order_display_id: string
          quote_amount: number
          quote_currency: string
          payment_amount: number
          payment_currency: string
          amount_difference: number
        }[]
      }
      get_tax_method_recommendations: {
        Args: {
          p_destination_country: string
          p_analysis_days?: number
          p_origin_country: string
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
          can_refund: boolean
          reason: string
          refundable_amount: number
        }[]
      }
      get_unread_message_count: {
        Args: { p_quote_id?: string; p_user_id?: string }
        Returns: number
      }
      get_unread_notification_count: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_user_activity_summary: {
        Args: { target_user_id: string }
        Returns: {
          activity_type: string
          common_data: Json
          latest_activity: string
          activity_count: number
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
      get_user_permissions_new: {
        Args: { user_uuid: string }
        Returns: {
          permission: string
        }[]
      }
      get_user_roles_new: {
        Args: { user_uuid: string }
        Returns: {
          granted_at: string
          role: string
          granted_by: string
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
      lock_address_after_payment: {
        Args: { quote_uuid: string }
        Returns: boolean
      }
      log_share_action: {
        Args: {
          p_user_id: string
          p_details?: Json
          p_user_agent?: string
          p_ip_address?: unknown
          p_quote_id: string
          p_action: string
        }
        Returns: string
      }
      log_tax_method_change: {
        Args: {
          p_valuation_method: string
          p_change_reason?: string
          p_admin_id: string
          p_quote_id: string
          p_calculation_method: string
          p_change_details?: Json
        }
        Returns: string
      }
      mark_all_notifications_read: {
        Args: { target_user_id: string }
        Returns: number
      }
      mark_messages_as_read: {
        Args: { p_message_ids: string[] }
        Returns: number
      }
      post_financial_transaction: {
        Args: { p_transaction_id: string; p_user_id: string }
        Returns: Json
      }
      process_payment_webhook_atomic: {
        Args: {
          p_quote_ids: string[]
          p_payment_status: string
          p_payment_data: Json
          p_guest_session_token?: string
          p_guest_session_data?: Json
          p_create_order?: boolean
        }
        Returns: {
          guest_session_updated: boolean
          success: boolean
          payment_transaction_id: string
          payment_ledger_entry_id: string
          quotes_updated: boolean
          order_id: string
          error_message: string
        }[]
      }
      process_refund_atomic: {
        Args: {
          p_gateway_response: Json
          p_refund_data: Json
          p_refund_amount: number
          p_quote_id: string
          p_processed_by: string
        }
        Returns: {
          success: boolean
          refund_id: string
          payment_transaction_updated: boolean
          quote_updated: boolean
          ledger_entry_id: string
          error_message: string
        }[]
      }
      process_refund_item: {
        Args: {
          p_refund_item_id: string
          p_gateway_refund_id: string
          p_gateway_response?: Json
          p_status?: string
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
          costprice_total_usd: number
          created_at: string
          currency: string
          customer_data: Json | null
          destination_country: string
          display_id: string | null
          email_verified: boolean | null
          estimated_delivery_date: string | null
          expires_at: string | null
          final_total_usd: number
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
          preferred_payment_gateway: string | null
          referral_code: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }[]
      }
      record_payment_with_ledger_and_triggers: {
        Args: {
          p_currency: string
          p_quote_id: string
          p_amount: number
          p_payment_method: string
          p_transaction_reference: string
          p_notes?: string
          p_recorded_by?: string
          p_payment_date?: string
        }
        Returns: Json
      }
      record_paypal_payment_to_ledger: {
        Args: {
          p_order_id: string
          p_currency: string
          p_amount: number
          p_capture_id?: string
          p_payer_email?: string
          p_quote_id: string
          p_transaction_id: string
        }
        Returns: Json
      }
      refresh_hsn_search_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
        Args: { p_transaction_id: string; p_reason: string; p_user_id: string }
        Returns: Json
      }
      rollback_tax_standardization_20250128: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_mfa: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      start_reconciliation_session: {
        Args: {
          p_payment_method: string
          p_statement_start_date?: string
          p_statement_date?: string
          p_gateway_code?: string
          p_statement_end_date?: string
        }
        Returns: Json
      }
      test_payment_update_direct: {
        Args: {
          quote_id: string
          new_amount_paid: number
          new_payment_status: string
        }
        Returns: Json
      }
      update_location_capacity: {
        Args: { capacity_change: number; location_code: string }
        Returns: undefined
      }
      update_quote_view_tracking: {
        Args: { p_quote_id: string; p_duration_seconds?: number }
        Returns: undefined
      }
      update_support_ticket_status: {
        Args: {
          p_user_id: string
          p_new_status: string
          p_reason?: string
          p_support_id: string
        }
        Returns: boolean
      }
      validate_quotes_unified: {
        Args: Record<PropertyKey, never>
        Returns: {
          severity: string
          quote_id: string
          issue: string
        }[]
      }
      verify_mfa_login: {
        Args: { p_is_backup_code?: boolean; p_code: string }
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
        Args: { p_code: string; p_window?: number; p_user_id: string }
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

