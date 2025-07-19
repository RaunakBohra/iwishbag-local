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
          operationName?: string
          extensions?: Json
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
            foreignKeyName: "credit_note_applications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "credit_note_applications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
            foreignKeyName: "credit_notes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "credit_notes_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_refund_request_id_fkey"
            columns: ["refund_request_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
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
      exchange_rate_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          from_currency: string
          method: string
          rate: number
          source: string
          to_currency: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          from_currency: string
          method: string
          rate: number
          source: string
          to_currency: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          from_currency?: string
          method?: string
          rate?: number
          source?: string
          to_currency?: string
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
          {
            foreignKeyName: "gateway_refunds_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "gateway_refunds_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
        Relationships: [
          {
            foreignKeyName: "guest_checkout_sessions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "guest_checkout_sessions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
        Relationships: [
          {
            foreignKeyName: "manual_analysis_tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
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
          admin_notes: string | null
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
      messenger_sessions: {
        Row: {
          created_at: string
          id: string
          sender_id: string
          session_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          sender_id: string
          session_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          sender_id?: string
          session_data?: Json
          updated_at?: string
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
          {
            foreignKeyName: "payment_adjustments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "payment_adjustments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
          {
            foreignKeyName: "payment_ledger_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "payment_ledger_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
            foreignKeyName: "payment_links_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "payment_links_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "payment_reminders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
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
          exchange_rate_at_payment: number | null
          exchange_rate_source: string | null
          exchange_rate_used: number | null
          gateway_response: Json | null
          id: string
          is_fully_refunded: boolean | null
          last_refund_at: string | null
          local_currency: string | null
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
          usd_equivalent: number | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          exchange_rate_at_payment?: number | null
          exchange_rate_source?: string | null
          exchange_rate_used?: number | null
          gateway_response?: Json | null
          id?: string
          is_fully_refunded?: boolean | null
          last_refund_at?: string | null
          local_currency?: string | null
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
          usd_equivalent?: number | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          exchange_rate_at_payment?: number | null
          exchange_rate_source?: string | null
          exchange_rate_used?: number | null
          gateway_response?: Json | null
          id?: string
          is_fully_refunded?: boolean | null
          last_refund_at?: string | null
          local_currency?: string | null
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
          usd_equivalent?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "payment_transactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
            foreignKeyName: "paypal_refunds_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "paypal_refunds_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paypal_refunds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          department: Database["public"]["Enums"]["department_enum"] | null
          email: string | null
          emergency_contact: Json | null
          employee_id: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          internal_notes: string | null
          is_staff: boolean | null
          job_title: string | null
          phone: string | null
          preferred_display_currency: string | null
          preferred_payment_gateway: string | null
          referral_code: string | null
          salary: number | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string
          work_schedule: Json | null
        }
        Insert: {
          avatar_url?: string | null
          cod_enabled?: boolean | null
          country?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_enum"] | null
          email?: string | null
          emergency_contact?: Json | null
          employee_id?: string | null
          full_name?: string | null
          hire_date?: string | null
          id: string
          internal_notes?: string | null
          is_staff?: boolean | null
          job_title?: string | null
          phone?: string | null
          preferred_display_currency?: string | null
          preferred_payment_gateway?: string | null
          referral_code?: string | null
          salary?: number | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
          work_schedule?: Json | null
        }
        Update: {
          avatar_url?: string | null
          cod_enabled?: boolean | null
          country?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_enum"] | null
          email?: string | null
          emergency_contact?: Json | null
          employee_id?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          internal_notes?: string | null
          is_staff?: boolean | null
          job_title?: string | null
          phone?: string | null
          preferred_display_currency?: string | null
          preferred_payment_gateway?: string | null
          referral_code?: string | null
          salary?: number | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
          work_schedule?: Json | null
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
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
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
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
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
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
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
          calculation_metadata: Json | null
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
          destination_currency: string | null
          discount: number | null
          display_id: string | null
          domestic_shipping: number | null
          email: string | null
          enabled_delivery_options: Json | null
          estimated_delivery_date: string | null
          exchange_rate: number | null
          exchange_rate_method: string | null
          exchange_rate_source: string | null
          expires_at: string | null
          final_total_local: number | null
          final_total_usd: number | null
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
          last_tracking_update: string | null
          merchant_shipping_price: number | null
          options: string | null
          order_display_id: string | null
          ordered_at: string | null
          origin_country: string | null
          overpayment_amount: number | null
          paid_at: string | null
          payment_details: Json | null
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
          calculation_metadata?: Json | null
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
          destination_currency?: string | null
          discount?: number | null
          display_id?: string | null
          domestic_shipping?: number | null
          email?: string | null
          enabled_delivery_options?: Json | null
          estimated_delivery_date?: string | null
          exchange_rate?: number | null
          exchange_rate_method?: string | null
          exchange_rate_source?: string | null
          expires_at?: string | null
          final_total_local?: number | null
          final_total_usd?: number | null
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
          last_tracking_update?: string | null
          merchant_shipping_price?: number | null
          options?: string | null
          order_display_id?: string | null
          ordered_at?: string | null
          origin_country?: string | null
          overpayment_amount?: number | null
          paid_at?: string | null
          payment_details?: Json | null
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
          calculation_metadata?: Json | null
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
          destination_currency?: string | null
          discount?: number | null
          display_id?: string | null
          domestic_shipping?: number | null
          email?: string | null
          enabled_delivery_options?: Json | null
          estimated_delivery_date?: string | null
          exchange_rate?: number | null
          exchange_rate_method?: string | null
          exchange_rate_source?: string | null
          expires_at?: string | null
          final_total_local?: number | null
          final_total_usd?: number | null
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
          last_tracking_update?: string | null
          merchant_shipping_price?: number | null
          options?: string | null
          order_display_id?: string | null
          ordered_at?: string | null
          origin_country?: string | null
          overpayment_amount?: number | null
          paid_at?: string | null
          payment_details?: Json | null
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
          {
            foreignKeyName: "refund_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "refund_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
      role_audit_log: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string
          id: string
          new_department: Database["public"]["Enums"]["department_enum"] | null
          new_permissions: string[] | null
          new_role: Database["public"]["Enums"]["app_role"] | null
          old_department: Database["public"]["Enums"]["department_enum"] | null
          old_permissions: string[] | null
          old_role: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by: string
          id?: string
          new_department?: Database["public"]["Enums"]["department_enum"] | null
          new_permissions?: string[] | null
          new_role?: Database["public"]["Enums"]["app_role"] | null
          old_department?: Database["public"]["Enums"]["department_enum"] | null
          old_permissions?: string[] | null
          old_role?: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_department?: Database["public"]["Enums"]["department_enum"] | null
          new_permissions?: string[] | null
          new_role?: Database["public"]["Enums"]["app_role"] | null
          old_department?: Database["public"]["Enums"]["department_enum"] | null
          old_permissions?: string[] | null
          old_role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_audit_log_user_id_fkey"
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
          exchange_rate_last_updated: string | null
          exchange_rate_source: string | null
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
          exchange_rate_last_updated?: string | null
          exchange_rate_source?: string | null
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
          exchange_rate_last_updated?: string | null
          exchange_rate_source?: string | null
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
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
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
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          department: Database["public"]["Enums"]["department_enum"] | null
          end_date: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          notes: string | null
          permissions: string[] | null
          role: Database["public"]["Enums"]["app_role"]
          scope: string | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_enum"] | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          notes?: string | null
          permissions?: string[] | null
          role: Database["public"]["Enums"]["app_role"]
          scope?: string | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_enum"] | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          notes?: string | null
          permissions?: string[] | null
          role?: Database["public"]["Enums"]["app_role"]
          scope?: string | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "payment_links_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "payment_summary_view"
            referencedColumns: ["quote_id"]
          },
          {
            foreignKeyName: "payment_links_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_summary_view: {
        Row: {
          amount_paid: number | null
          completed_count: number | null
          display_id: string | null
          email: string | null
          latest_payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          quote_amount_local: number | null
          quote_amount_usd: number | null
          quote_created_at: string | null
          quote_currency: string | null
          quote_id: string | null
          quote_status: string | null
          total_paid_usd: number | null
          transaction_count: number | null
        }
        Relationships: []
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
    }
    Functions: {
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
          p_notes?: string
          p_approved_amount?: number
          p_refund_request_id: string
        }
        Returns: Json
      }
      auto_match_transactions: {
        Args: { p_reconciliation_id: string }
        Returns: Json
      }
      cleanup_expired_authenticated_checkout_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_guest_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_oauth_tokens: {
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
      cleanup_old_sessions: {
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
      confirm_payment_from_proof: {
        Args: {
          p_amount_paid: number
          p_quote_id: string
          p_payment_status: string
        }
        Returns: Json
      }
      create_credit_note: {
        Args: {
          p_reason: string
          p_description?: string
          p_quote_id?: string
          p_amount: number
          p_refund_request_id?: string
          p_auto_approve?: boolean
          p_minimum_order_value?: number
          p_customer_id: string
          p_valid_days?: number
          p_currency: string
        }
        Returns: Json
      }
      create_payment_with_ledger_entry: {
        Args: {
          p_notes?: string
          p_quote_id: string
          p_amount: number
          p_currency: string
          p_payment_method: string
          p_payment_type?: string
          p_reference_number?: string
          p_gateway_code?: string
          p_gateway_transaction_id?: string
          p_user_id?: string
          p_message_id?: string
        }
        Returns: Json
      }
      create_refund_request: {
        Args: {
          p_reason_description: string
          p_reason_code: string
          p_refund_method?: string
          p_payment_ids?: string[]
          p_currency: string
          p_amount: number
          p_internal_notes?: string
          p_customer_notes?: string
          p_refund_type: string
          p_quote_id: string
        }
        Returns: Json
      }
      ensure_user_profile: {
        Args: { _user_id: string }
        Returns: boolean
      }
      ensure_user_profile_exists: {
        Args: { _user_id: string }
        Returns: boolean
      }
      ensure_user_profile_simple: {
        Args: { _user_id: string }
        Returns: boolean
      }
      ensure_user_profile_with_oauth: {
        Args: { _user_metadata?: Json; _user_id: string }
        Returns: boolean
      }
      ensure_user_role_simple: {
        Args: { _user_id: string }
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
          reference_number?: string
          new_amount_paid: number
          p_quote_id: string
          payment_currency?: string
          notes?: string
          new_payment_status: string
          payment_method?: string
        }
        Returns: Json
      }
      generate_credit_note_number: {
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
      get_active_payment_link_for_quote: {
        Args: { quote_uuid: string }
        Returns: {
          api_version: string
          expires_at: string
          id: string
          link_code: string
          payment_url: string
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
          reason: string
          credit_note_id: string
          note_number: string
          amount: number
          currency: string
          amount_available: number
          valid_until: string
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
      get_currency_conversion_metrics: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          currency_pair: string
          conversion_count: number
          average_variance: number
          accuracy_score: number
          max_variance: number
        }[]
      }
      get_currency_mismatches: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          payment_method: string
          created_at: string
          gateway_transaction_id: string
          quote_id: string
          order_display_id: string
          quote_currency: string
          payment_currency: string
          quote_amount: number
          payment_amount: number
        }[]
      }
      get_currency_statistics: {
        Args: { start_date?: string; end_date?: string }
        Returns: {
          payment_count: number
          average_payment: number
          last_payment_date: string
          unique_customers: number
          currency: string
          total_payments: number
          total_refunds: number
          net_amount: number
          refund_count: number
        }[]
      }
      get_exchange_rate_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_stale: boolean
          last_updated: string
          is_fallback: boolean
          age_minutes: number
          currency: string
          current_rate: number
        }[]
      }
      get_optimal_exchange_rate: {
        Args: { to_curr: string; from_curr: string }
        Returns: number
      }
      get_orders_with_payment_proofs: {
        Args: { status_filter?: string; limit_count?: number }
        Returns: {
          customer_id: string
          order_id: string
          order_display_id: string
          final_total: number
          final_currency: string
          payment_status: string
          payment_method: string
          customer_email: string
          message_id: string
          verification_status: string
          admin_notes: string
          amount_paid: number
          attachment_file_name: string
          attachment_url: string
          submitted_at: string
          verified_at: string
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
          reference_number: string
          notes: string
          created_by_name: string
          running_balance: number
          base_amount: number
          currency: string
          amount: number
          gateway_name: string
          payment_method: string
          status: string
          payment_type: string
          payment_date: string
          order_display_id: string
          quote_id: string
          payment_id: string
        }[]
      }
      get_payment_proof_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_popular_posts: {
        Args: { limit_count?: number }
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
      get_related_posts: {
        Args: { post_slug: string; limit_count?: number }
        Returns: {
          published_at: string
          views_count: number
          category_name: string
          reading_time_minutes: number
          id: string
          title: string
          slug: string
          excerpt: string
          featured_image_url: string
        }[]
      }
      get_shipping_cost: {
        Args: {
          p_destination_country: string
          p_origin_country: string
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
      get_suspicious_payment_amounts: {
        Args: { start_date?: string; end_date?: string; tolerance?: number }
        Returns: {
          payment_currency: string
          suspicion_level: string
          created_at: string
          amount_difference: number
          quote_id: string
          order_display_id: string
          quote_amount: number
          quote_currency: string
          payment_amount: number
        }[]
      }
      get_transaction_refund_eligibility: {
        Args: { transaction_id: string }
        Returns: {
          reason: string
          can_refund: boolean
          refundable_amount: number
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
      has_any_role: {
        Args: { roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_department_access: {
        Args: { dept: Database["public"]["Enums"]["department_enum"] }
        Returns: boolean
      }
      has_permission: {
        Args: { permission_name: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_views: {
        Args: { post_slug: string }
        Returns: undefined
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
      post_financial_transaction: {
        Args: { p_user_id: string; p_transaction_id: string }
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
          payment_ledger_entry_id: string
          success: boolean
          payment_transaction_id: string
          quotes_updated: boolean
          guest_session_updated: boolean
          order_id: string
          error_message: string
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
          ledger_entry_id: string
          error_message: string
          success: boolean
          refund_id: string
          payment_transaction_updated: boolean
          quote_updated: boolean
        }[]
      }
      process_refund_item: {
        Args: {
          p_gateway_refund_id: string
          p_status?: string
          p_refund_item_id: string
          p_gateway_response?: Json
        }
        Returns: Json
      }
      record_payment_with_ledger_and_triggers: {
        Args: {
          p_currency: string
          p_payment_date?: string
          p_recorded_by?: string
          p_notes?: string
          p_transaction_reference: string
          p_quote_id: string
          p_amount: number
          p_payment_method: string
        }
        Returns: Json
      }
      record_paypal_payment_to_ledger: {
        Args: {
          p_currency: string
          p_quote_id: string
          p_transaction_id: string
          p_amount: number
          p_order_id: string
          p_capture_id?: string
          p_payer_email?: string
        }
        Returns: Json
      }
      reverse_financial_transaction: {
        Args: { p_user_id: string; p_reason: string; p_transaction_id: string }
        Returns: Json
      }
      start_reconciliation_session: {
        Args: {
          p_gateway_code?: string
          p_statement_start_date?: string
          p_statement_date?: string
          p_statement_end_date?: string
          p_payment_method: string
        }
        Returns: Json
      }
      test_payment_update_direct: {
        Args: {
          quote_id: string
          new_payment_status: string
          new_amount_paid: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "moderator"
        | "customer_service"
        | "quote_specialist"
        | "accountant"
        | "fulfillment"
        | "manager"
      department_enum:
        | "administration"
        | "customer_service"
        | "quotes"
        | "accounting"
        | "fulfillment"
        | "marketing"
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
      app_role: [
        "admin",
        "user",
        "moderator",
        "customer_service",
        "quote_specialist",
        "accountant",
        "fulfillment",
        "manager",
      ],
      department_enum: [
        "administration",
        "customer_service",
        "quotes",
        "accounting",
        "fulfillment",
        "marketing",
      ],
      quote_approval_status: ["pending", "approved", "rejected"],
      quote_priority: ["low", "normal", "high", "urgent"],
    },
  },
} as const

