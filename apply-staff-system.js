/**
 * Apply enhanced staff management system
 */

import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

async function applyStaffSystem() {
  console.log('🏢 Applying Enhanced Staff Management System...');

  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();

    // Read and execute the migration
    const migration = readFileSync(
      'supabase/migrations/20250719600000_enhanced_staff_system.sql',
      'utf8',
    );

    console.log('Executing staff system migration...');
    await client.query(migration);
    console.log('✅ Staff system migration applied');

    // Insert predefined role permissions
    console.log('\nSetting up role permissions...');

    const rolePermissions = [
      {
        role: 'customer_service',
        permissions: [
          'quotes.read',
          'quotes.update_status',
          'messages.read',
          'messages.create',
          'customers.read',
          'orders.read',
        ],
        department: 'customer_service',
      },
      {
        role: 'quote_specialist',
        permissions: [
          'quotes.read',
          'quotes.create',
          'quotes.update',
          'quotes.calculate',
          'products.read',
          'shipping.read',
          'customers.read',
        ],
        department: 'quotes',
      },
      {
        role: 'accountant',
        permissions: [
          'payments.read',
          'payments.verify',
          'orders.read',
          'financial_reports.read',
          'payment_proof.review',
          'quotes.read',
        ],
        department: 'accounting',
      },
      {
        role: 'fulfillment',
        permissions: [
          'orders.read',
          'orders.update_status',
          'shipping.read',
          'shipping.update',
          'tracking.create',
          'quotes.read',
        ],
        department: 'fulfillment',
      },
      {
        role: 'manager',
        permissions: ['reports.department', 'staff.view_department', 'performance.view_department'],
        department: null, // Managers can be assigned to any department
      },
    ];

    // Create a system settings entry for role permissions
    await client.query(
      `
      INSERT INTO system_settings (setting_key, setting_value, description) 
      VALUES (
        'staff_role_permissions', 
        $1,
        'Default permissions for each staff role'
      )
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
    `,
      [JSON.stringify(rolePermissions)],
    );

    console.log('✅ Role permissions configured');

    // Create sample department structure
    console.log('\nSetting up department structure...');

    await client.query(
      `
      INSERT INTO system_settings (setting_key, setting_value, description) 
      VALUES (
        'department_structure', 
        $1,
        'Organizational department structure'
      )
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
    `,
      [
        JSON.stringify({
          administration: {
            name: 'Administration',
            description: 'Executive and administrative functions',
            roles: ['admin', 'manager'],
          },
          customer_service: {
            name: 'Customer Service',
            description: 'Customer support and communication',
            roles: ['customer_service', 'manager'],
          },
          quotes: {
            name: 'Quote Management',
            description: 'Product research and quote preparation',
            roles: ['quote_specialist', 'manager'],
          },
          accounting: {
            name: 'Accounting & Finance',
            description: 'Payment verification and financial operations',
            roles: ['accountant', 'manager'],
          },
          fulfillment: {
            name: 'Order Fulfillment',
            description: 'Order processing and shipping coordination',
            roles: ['fulfillment', 'manager'],
          },
        }),
      ],
    );

    console.log('✅ Department structure configured');

    // Check current admin user and upgrade them
    console.log('\nUpgrading existing admin user...');

    const adminResult = await client.query(`
      SELECT ur.user_id, p.full_name 
      FROM user_roles ur 
      JOIN profiles p ON ur.user_id = p.id 
      WHERE ur.role = 'admin'::staff_role_enum
      LIMIT 1
    `);

    if (adminResult.rows.length > 0) {
      const adminId = adminResult.rows[0].user_id;
      const adminName = adminResult.rows[0].full_name;

      // Update admin role with full permissions
      await client.query(
        `
        UPDATE user_roles 
        SET 
          department = 'administration',
          permissions = ARRAY['*'],
          scope = 'global',
          notes = 'System administrator with full access'
        WHERE user_id = $1 AND role = 'admin'::staff_role_enum
      `,
        [adminId],
      );

      // Update profile to mark as staff
      await client.query(
        `
        UPDATE profiles 
        SET 
          is_staff = true,
          job_title = 'System Administrator',
          department = 'administration',
          hire_date = created_at
        WHERE id = $1
      `,
        [adminId],
      );

      console.log(`✅ Upgraded admin user: ${adminName}`);
    }

    console.log('\n🎉 Enhanced Staff Management System Ready!');
    console.log('\n📋 What you can now do:');
    console.log(
      '• Assign staff to departments (customer_service, quotes, accounting, fulfillment)',
    );
    console.log('• Set granular permissions per role');
    console.log('• Track role changes with audit log');
    console.log('• Assign managers to departments');
    console.log('• Control access to quotes, messages, payments by role');
    console.log('• Generate department-specific reports');

    console.log('\n🔧 Next Steps:');
    console.log(
      '1. Create staff accounts with: role=customer_service, department=customer_service',
    );
    console.log('2. Assign permissions like: ["quotes.read", "messages.create"]');
    console.log('3. Set managers with: role=manager, department=customer_service');
    console.log('4. Use has_permission() and has_department_access() in your app');
  } catch (error) {
    console.error('❌ Staff system setup failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await client.end();
  }
}

applyStaffSystem();
