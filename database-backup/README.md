# Database Backup - iwishBag Project

Complete backup of the cloud database exported on July 18, 2025.

## 📁 Folder Structure

```
database-backup/
├── README.md                    # This file
├── complete_backup.sql          # Complete database dump (schema + data)
├── schema/
│   └── complete_schema.sql      # Schema-only dump
├── data/
│   └── complete_data.sql        # Data-only dump
├── storage/
│   ├── storage_buckets_export.txt    # Storage bucket configurations
│   ├── storage_objects_export.txt    # Storage object listings
│   └── storage_summary.txt           # Storage usage summary
└── scripts/
    ├── restore_database.sh      # Complete restoration script
    ├── restore_schema_only.sh   # Schema-only restoration
    └── restore_data_only.sh     # Data-only restoration
```

## 🔧 Restoration Options

### 1. Complete Restoration (Recommended)
Restores both schema and data in one operation:
```bash
cd database-backup/scripts
chmod +x restore_database.sh
./restore_database.sh
```

### 2. Schema-Only Restoration
Restores only the database structure (tables, functions, triggers, RLS policies):
```bash
cd database-backup/scripts
chmod +x restore_schema_only.sh
./restore_schema_only.sh
```

### 3. Data-Only Restoration
Restores only the data (assumes schema already exists):
```bash
cd database-backup/scripts
chmod +x restore_data_only.sh
./restore_data_only.sh
```

## 📊 Database Overview

### Tables and Key Components
- **User Management**: profiles, user_roles, auth users
- **Quote System**: quotes, quote_items, quote_documents
- **Order Management**: orders, order_items, order_tracking
- **Payment System**: payment_transactions, payment_ledger
- **Blog System**: blog_posts, blog_comments, blog_categories
- **Configuration**: country_settings, payment_gateways, shipping_routes
- **Storage**: buckets (product-images, message-attachments)

### Data Statistics
- **Total Tables**: 50+ tables
- **Functions**: 25+ database functions
- **Storage Buckets**: 2 buckets
- **Storage Objects**: 8 files (614.6 KB total)
- **RLS Policies**: Complete row-level security implementation

## 🗄️ Storage Restoration

The storage/ folder contains:
- **Bucket Configurations**: All bucket settings and permissions
- **Object Listings**: Complete file inventory with metadata
- **Storage Summary**: Usage analysis and recommendations

To restore storage:
1. Manually recreate buckets in Supabase dashboard using configurations from storage_buckets_export.txt
2. Upload files as needed (files are stored in cloud storage, not included in this backup)
3. Reference storage_objects_export.txt for file locations and metadata

## ⚠️ Important Notes

### Circular Foreign Key Constraints
The data dump contains circular foreign key constraints in these tables:
- messages
- chart_of_accounts
- financial_transactions
- payment_ledger
- credit_note_applications
- blog_comments

The restoration scripts handle this automatically by disabling triggers during data import.

### Database Version
- **Source Database**: PostgreSQL 17.4
- **Backup Date**: July 18, 2025
- **Backup Method**: Supabase CLI v2.30.4

### Prerequisites
- PostgreSQL client tools (psql)
- Supabase CLI (recommended)
- Target database with appropriate permissions

## 🚀 Quick Start

1. **Prepare target database**:
   ```bash
   # Create new Supabase project or prepare existing database
   ```

2. **Make scripts executable**:
   ```bash
   chmod +x database-backup/scripts/*.sh
   ```

3. **Run complete restoration**:
   ```bash
   ./database-backup/scripts/restore_database.sh
   ```

4. **Verify restoration**:
   - Check tables and data
   - Test authentication
   - Verify RLS policies
   - Test application functionality

## 📞 Support

For issues with restoration:
1. Check PostgreSQL client tools are installed
2. Verify database connection string format
3. Ensure target database has appropriate permissions
4. Check logs for specific error messages

## 🔒 Security

This backup contains:
- Complete database schema with RLS policies
- All user data and business data
- Payment transaction records
- Authentication configurations

Keep this backup secure and restrict access appropriately.