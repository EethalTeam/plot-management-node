#!/usr/bin/env node

/**
 * WhatsApp Setup Diagnostic Script
 * 
 * This script checks if your WhatsApp integration is properly configured
 * and helps identify why messages might not be reaching recipients.
 * 
 * Run: node scripts/checkWhatsAppSetup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/masterModels/Leads');

const CHECKS = {
  PASS: '✓',
  FAIL: '✗',
  WARN: '⚠',
};

async function checkEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...\n');
  
  const requiredVars = {
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  };

  const mongodb = {
    MONGODB_URI: process.env.MONGODB_URI,
  };

  let allGood = true;

  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      console.log(`${CHECKS.FAIL} ${key}: NOT SET`);
      allGood = false;
    } else {
      const masked = value.slice(0, 10) + '...' + value.slice(-4);
      console.log(`${CHECKS.PASS} ${key}: ${masked}`);
    }
  });

  if (!mongodb.MONGODB_URI) {
    console.log(`${CHECKS.FAIL} MONGODB_URI: NOT SET`);
    allGood = false;
  } else {
    console.log(`${CHECKS.PASS} MONGODB_URI: Connected`);
  }

  if (!allGood) {
    console.log(`\n⚠️  Missing environment variables in .env file!`);
    console.log('Create or update .env with:');
    console.log('WHATSAPP_TOKEN=your_meta_token');
    console.log('WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id');
    console.log('WHATSAPP_VERIFY_TOKEN=your_verify_token');
  }

  return allGood;
}

async function checkMongoConnection() {
  console.log('\n🗄️  Checking MongoDB Connection...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`${CHECKS.PASS} MongoDB connected successfully`);
    return true;
  } catch (error) {
    console.log(`${CHECKS.FAIL} MongoDB connection failed: ${error.message}`);
    return false;
  }
}

async function checkLeadRecords() {
  console.log('\n👥 Checking Lead Records with WhatsApp...\n');
  
  try {
    const totalLeads = await Lead.countDocuments();
    console.log(`${CHECKS.PASS} Total leads in database: ${totalLeads}`);

    const leadsWithWAID = await Lead.countDocuments({ whatsapp_waid: { $exists: true, $ne: null } });
    console.log(`${CHECKS.PASS} Leads with whatsapp_waid: ${leadsWithWAID}`);

    const leadsWithPhone = await Lead.countDocuments({ leadPhone: { $exists: true, $ne: null } });
    console.log(`${CHECKS.PASS} Leads with phone number: ${leadsWithPhone}`);

    // Sample check
    const sampleLead = await Lead.findOne({ 
      $or: [
        { whatsapp_waid: { $exists: true, $ne: null } },
        { leadPhone: { $exists: true, $ne: null } }
      ]
    }).select('leadFirstName leadLastName leadPhone whatsapp_waid _id');

    if (sampleLead) {
      console.log(`\n📱 Sample Lead:
  Name: ${sampleLead.leadFirstName} ${sampleLead.leadLastName}
  leadPhone: ${sampleLead.leadPhone || 'NOT SET'}
  whatsapp_waid: ${sampleLead.whatsapp_waid || 'NOT SET'}
  Lead ID: ${sampleLead._id}`);

      const waid = sampleLead.whatsapp_waid || sampleLead.leadPhone;
      if (!waid) {
        console.log(`\n${CHECKS.WARN} This lead has NO phone number or WAID!`);
      } else if (!sampleLead.whatsapp_waid && sampleLead.leadPhone) {
        console.log(`\n${CHECKS.WARN} Using leadPhone as fallback. For best results, populate whatsapp_waid.`);
        if (!isValidE164(sampleLead.leadPhone)) {
          console.log(`${CHECKS.FAIL} Phone number is NOT in E.164 format!`);
          console.log(`   Current: ${sampleLead.leadPhone}`);
          console.log(`   Expected: 919876543210 (for India)`);
        } else {
          console.log(`${CHECKS.PASS} Phone number is in valid E.164 format`);
        }
      }
    } else {
      console.log(`${CHECKS.WARN} No leads found with phone numbers or WAID`);
    }

    return leadsWithPhone > 0 || leadsWithWAID > 0;
  } catch (error) {
    console.log(`${CHECKS.FAIL} Error checking leads: ${error.message}`);
    return false;
  }
}

function isValidE164(phone) {
  // E.164 format: + followed by 1-15 digits
  return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\D/g, ''));
}

async function checkWhatsAppAPI() {
  console.log('\n🌐 Checking WhatsApp API...\n');
  
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`${CHECKS.FAIL} Cannot test API: Missing credentials`);
    return false;
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`${CHECKS.PASS} WhatsApp Phone Number verified`);
      console.log(`   Verified: ${data.verified_name || 'N/A'}`);
      console.log(`   Quality Rating: ${data.quality_rating || 'N/A'}`);
      return true;
    } else {
      console.log(`${CHECKS.FAIL} WhatsApp API Error: ${data.error?.message}`);
      console.log(`   Code: ${data.error?.code}`);
      return false;
    }
  } catch (error) {
    console.log(`${CHECKS.FAIL} Network error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  WhatsApp Setup Diagnostic Tool');
  console.log('═'.repeat(60));

  try {
    const envOk = await checkEnvironmentVariables();
    
    const mongoOk = await checkMongoConnection();
    if (!mongoOk) {
      console.log('\n❌ Cannot proceed without MongoDB connection');
      process.exit(1);
    }

    const leadsOk = await checkLeadRecords();
    await checkWhatsAppAPI();

    console.log('\n' + '═'.repeat(60));
    console.log('📋 Summary & Next Steps:');
    console.log('═'.repeat(60));

    if (envOk && leadsOk) {
      console.log(`\n${CHECKS.PASS} Your WhatsApp setup looks good!`);
      console.log('\nIf messages still aren\'t reaching:');
      console.log('1. Check the server logs (look for [WhatsApp] messages)');
      console.log('2. Verify the phone number is opted-in on WhatsApp');
      console.log('3. Check if you\'re outside the 24-hour message window');
      console.log('4. Verify your WhatsApp Business Account is active');
    } else {
      console.log(`\n${CHECKS.FAIL} Issues detected. Fix them before sending messages.`);
      if (!envOk) {
        console.log('• Set missing environment variables in .env');
      }
      if (!leadsOk) {
        console.log('• Add phone numbers to your leads');
      }
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
