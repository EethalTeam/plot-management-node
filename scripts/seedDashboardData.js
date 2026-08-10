/**
 * Seed script: Creates realistic leads with dates in the current range
 * Run with: node scripts/seedDashboardData.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

// Import models
const Lead = require("../models/masterModels/Lead");
const LeadStatus = require("../models/masterModels/LeadStatus");
const LeadSource = require("../models/masterModels/LeadSource");
const Site = require("../models/masterModels/Site");
const Unit = require("../models/masterModels/Unit");
const Employee = require("../models/masterModels/Employee");
const PaymentPlan = require("../models/masterModels/PaymentPlan");

const INDIA_TZ = "Asia/Kolkata";

const sampleLeadNames = [
  { first: "Rajesh", last: "Kumar" },
  { first: "Priya", last: "Singh" },
  { first: "Amit", last: "Patel" },
  { first: "Neha", last: "Verma" },
  { first: "Vikram", last: "Joshi" },
  { first: "Sneha", last: "Gupta" },
  { first: "Arjun", last: "Rao" },
  { first: "Anjali", last: "Nair" },
  { first: "Rohan", last: "Desai" },
  { first: "Divya", last: "Sharma" },
];

const samplePhones = Array.from({ length: 20 }, (_, i) =>
  String(9000000000 + i).slice(0, 10)
);

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URL || "mongodb://localhost:27017/irv");
    console.log("✓ Connected to MongoDB");

    // Fetch or create statuses
    let statuses = await LeadStatus.find().limit(5);
    if (statuses.length === 0) {
      console.log("⚠ No lead statuses found. Creating defaults...");
      const statusNames = [
        "New",
        "Follow Up",
        "Contacted",
        "Site Visit",
        "Booked",
        "Lost",
      ];
      for (const name of statusNames) {
        await LeadStatus.create({ leadStatustName: name });
      }
      statuses = await LeadStatus.find();
    }
    console.log(`✓ Found ${statuses.length} lead statuses`);

    // Fetch or create sources
    let sources = await LeadSource.find().limit(5);
    if (sources.length === 0) {
      console.log("⚠ No lead sources found. Creating defaults...");
      const sourceNames = ["Website", "Phone Call", "Site Visit", "Referral", "Social Media"];
      for (const name of sourceNames) {
        await LeadSource.create({ leadSourceName: name });
      }
      sources = await LeadSource.find();
    }
    console.log(`✓ Found ${sources.length} lead sources`);

    // Fetch sites
    let sites = await Site.find().limit(5);
    if (sites.length === 0) {
      console.log("⚠ No sites found. Skipping site assignment for leads.");
    } else {
      console.log(`✓ Found ${sites.length} sites`);
    }

    // Fetch employees
    let employees = await Employee.find().limit(5);
    if (employees.length === 0) {
      console.log("⚠ No employees found. Creating a sample employee...");
      const emp = await Employee.create({
        EmployeeName: "John Doe",
        EmployeeEmail: "john@example.com",
        EmployeePhone: "9999999999",
      });
      employees = [emp];
    }
    console.log(`✓ Found ${employees.length} employees`);

    // Delete existing leads (optional — comment out if you want to preserve existing data)
    // await Lead.deleteMany({});

    // Create 30 sample leads spread across recent dates
    const now = dayjs().tz(INDIA_TZ);
    const leads = [];

    for (let i = 0; i < 30; i++) {
      const nameIdx = i % sampleLeadNames.length;
      const phoneIdx = i % samplePhones.length;
      const statusIdx = i % statuses.length;
      const sourceIdx = i % sources.length;
      const employeeIdx = i % employees.length;
      const siteIdx = sites.length > 0 ? i % sites.length : -1;

      // Spread creation dates across the last 30 days
      const daysAgo = Math.floor((i / 30) * 30);
      const createdAt = now.subtract(daysAgo, "day").toDate();

      // Random site visit date in next 7 days
      const visitDaysFromNow = Math.floor(Math.random() * 7);
      const siteVisitDate = now.add(visitDaysFromNow, "day").toDate();

      // Randomly mark some as having follow-up
      const followDate = Math.random() > 0.5 ? now.add(Math.floor(Math.random() * 3), "day").toDate() : null;

      const lead = {
        leadFirstName: sampleLeadNames[nameIdx].first,
        leadLastName: sampleLeadNames[nameIdx].last,
        leadPhone: samplePhones[phoneIdx],
        leadSourceId: sources[sourceIdx]._id,
        leadStatusId: statuses[statusIdx]._id,
        leadAssignedId: employees[employeeIdx]._id,
        leadSiteId: siteIdx >= 0 ? sites[siteIdx]._id : null,
        leadPotentialValue: Math.floor(Math.random() * 100) * 100000, // ₹0 - ₹99 lakhs
        SiteVisitDate: siteVisitDate,
        FollowDate: followDate,
        createdAt,
        updatedAt: createdAt,
      };

      leads.push(lead);
    }

    const created = await Lead.insertMany(leads);
    console.log(`✓ Created ${created.length} sample leads`);

    // Optionally create some payment plans for conversion rate KPI
    const bookedStatus = statuses.find((s) => s.leadStatustName?.toLowerCase() === "booked");
    if (bookedStatus) {
      const bookedLeads = leads.filter((_, i) => i % 5 === 0).slice(0, 5);
      for (const lead of bookedLeads) {
        const doc = await Lead.findOne({
          leadFirstName: lead.leadFirstName,
          leadLastName: lead.leadLastName,
        });
        if (doc) {
          await PaymentPlan.create({
            leadId: doc._id,
            amount: Math.floor(Math.random() * 5000000) + 1000000,
            createdAt: now.toDate(),
          });
        }
      }
      console.log(`✓ Created sample payment plans`);
    }

    console.log("\n✅ Dashboard data seeding complete!");
    console.log("You can now refresh the dashboard to see populated KPI cards and trends.");
  } catch (err) {
    console.error("❌ Seeding error:", err.message);
  } finally {
    await mongoose.connection.close();
    console.log("✓ MongoDB connection closed");
  }
}

seedData();
