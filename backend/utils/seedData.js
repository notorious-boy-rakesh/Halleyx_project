require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Truck    = require('../models/Truck');
const Workflow = require('../models/Workflow');
const Step     = require('../models/Step');
const Rule     = require('../models/Rule');
const Trip     = require('../models/Trip');
const Expense  = require('../models/Expense');
const Alert    = require('../models/Alert');
const Log      = require('../models/Log');
const anomalyEngine = require('../services/anomalyEngine');
const expenseEngine = require('../services/expenseEngine');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/notorious';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}), Truck.deleteMany({}), Workflow.deleteMany({}),
    Step.deleteMany({}), Rule.deleteMany({}), Trip.deleteMany({}),
    Expense.deleteMany({}), Alert.deleteMany({}), Log.deleteMany({})
  ]);
  console.log('🗑️  Cleared existing data');

  // ── Users ────────────────────────────────────────────────────────────────
  const admin   = await User.create({ name: 'System Admin', email: 'admin@notorious.com', password: 'Admin@123', role: 'admin' });
  const manager = await User.create({ name: 'Ops Manager', email: 'manager@notorious.com', password: 'Manager@123', role: 'manager' });
  
  const d1 = await User.create({ name: 'Mike Ross', email: 'mike@notorious.com', password: 'User@123', role: 'driver', driverScore: 8.5, driverLabel: 'Efficient' });
  const d2 = await User.create({ name: 'Harvey Specter', email: 'harvey@notorious.com', password: 'User@123', role: 'driver', driverScore: 9.8, driverLabel: 'Exceptional' });
  const d3 = await User.create({ name: 'Louis Litt', email: 'louis@notorious.com', password: 'User@123', role: 'driver', driverScore: 4.2, driverLabel: 'Risky' });
  console.log('👤 Notorious Users created');

  // ── Trucks ───────────────────────────────────────────────────────────────
  const t1 = await Truck.create({ registrationNumber: 'TN-38-AB-1000', make: 'Tata', model: 'Prima 5530', capacityTons: 40, status: 'Available', currentDriver: d1._id, mileage: 120500 });
  const t2 = await Truck.create({ registrationNumber: 'GJ-01-XZ-2000', make: 'Ashok Leyland', model: 'AVTR 5532', capacityTons: 35, status: 'In Transit', currentDriver: d2._id, mileage: 45000 });
  const t3 = await Truck.create({ registrationNumber: 'TN-01-FF-3000', make: 'BharatBenz', model: '5528TT', capacityTons: 45, status: 'Maintenance', currentDriver: null, mileage: 215000 });
  console.log('🚛 Indian Fleet added');

  // ── Workflow: Standard Transport Route ───────────────────────────────────
  const wf = await Workflow.create({
    name: 'Standard Transport Routing',
    description: 'Standard flowchart for delivering commercial loads cross-country.',
    createdBy: admin._id,
    tags: ['logistics', 'delivery'],
    isActive: true,
    stats: { totalExecutions: 4, successCount: 2, failureCount: 0, avgDurationMs: 4500 }
  });

  const s1 = await Step.create({ workflowId: wf._id, name: 'Load Assigned', type: 'task', order: 1, isStart: true, config: { action: 'assign' }, position: { x: 100, y: 150 } });
  const s2 = await Step.create({ workflowId: wf._id, name: 'Dispatch Notification', type: 'notification', order: 2, config: { channel: 'email', recipient: 'driver', subject: 'Load Dispatched' }, position: { x: 350, y: 150 } });
  const s3 = await Step.create({ workflowId: wf._id, name: 'In Transit Check', type: 'task', order: 3, config: { action: 'gps_ping' }, position: { x: 600, y: 150 } });
  const s4 = await Step.create({ workflowId: wf._id, name: 'Delivery Approval', type: 'approval', order: 4, config: { approverRole: 'manager', message: 'Sign off on proof of delivery.' }, position: { x: 850, y: 150 } });
  const s5 = await Step.create({ workflowId: wf._id, name: 'Trip Completed', type: 'task', order: 5, isEnd: true, config: { action: 'trip_closure' }, position: { x: 1100, y: 150 } });

  await Rule.create({ stepId: s1._id, workflowId: wf._id, name: 'Auto-dispatch', condition: "true == true", nextStepId: s2._id, priority: 1 });
  await Rule.create({ stepId: s2._id, workflowId: wf._id, name: 'Auto-transit', condition: "true == true", nextStepId: s3._id, priority: 1 });
  await Rule.create({ stepId: s3._id, workflowId: wf._id, name: 'Wait Delivery', condition: "weightTons > 0", nextStepId: s4._id, priority: 1 });
  await Rule.create({ stepId: s4._id, workflowId: wf._id, name: 'Manager Approved', condition: "approved == true", nextStepId: s5._id, priority: 1 });
  console.log('📋 Transport Workflow configured');

  // ── Trips (Executions) ───────────────────────────────────────────────────
  // Trip 1 (Completed)
  const trip1 = await Trip.create({
    workflowId: wf._id, truckId: t1._id, driverId: d1._id, origin: 'Chennai, TN', destination: 'Coimbatore, TN', freightType: 'Textiles', weightTons: 12,
    expectedRevenue: 35000, expectedFuelCost: 12000, expectedTollCost: 1500, expectedOtherCost: 2000,
    status: 'success', finishedAt: new Date(),
    stepHistory: [{ stepId: s1._id, enteredAt: new Date(Date.now() - 5000000), leftAt: new Date() }]
  });

  // Trip 2 (Active/Running)
  const trip2 = await Trip.create({
    workflowId: wf._id, truckId: t2._id, driverId: d2._id, origin: 'Ahmedabad, GJ', destination: 'Surat, GJ', freightType: 'Chemicals', weightTons: 22,
    expectedRevenue: 45000, expectedFuelCost: 15000, expectedTollCost: 2000, expectedOtherCost: 1000,
    status: 'paused', currentStepId: s4._id, startedAt: new Date(),
    stepHistory: [{ stepId: s1._id, enteredAt: new Date(), leftAt: new Date() }]
  });

  // Trip 3 (Anomaly simulation)
  const trip3 = await Trip.create({
    workflowId: wf._id, truckId: t3._id, driverId: d3._id, origin: 'Chennai, TN', destination: 'Ahmedabad, GJ', freightType: 'Auto Parts', weightTons: 18,
    expectedRevenue: 120000, expectedFuelCost: 45000, expectedTollCost: 8000, expectedOtherCost: 5000,
    status: 'running', currentStepId: s3._id, startedAt: new Date(),
    stepHistory: [{ stepId: s1._id, enteredAt: new Date(), leftAt: new Date() }]
  });
  console.log('🚀 Active Trips configured');

  // ── Expenses & Anomalies ─────────────────────────────────────────────────
  // Normal Expense
  const exp1 = await Expense.create({ tripId: trip1._id, driverId: d1._id, category: 'Fuel', amount: 11500, location: 'Salem' });
  await anomalyEngine.checkExpenseAnomaly(exp1);

  const exp2 = await Expense.create({ tripId: trip2._id, driverId: d2._id, category: 'Toll', amount: 1800, location: 'Vadodara' });
  await anomalyEngine.checkExpenseAnomaly(exp2);

  // Massive Fraud / Anomaly Expense (spikes past 150% expected!)
  const exp3 = await Expense.create({ tripId: trip3._id, driverId: d3._id, category: 'Fuel', amount: 95000, location: 'Hubli' });
  await anomalyEngine.checkExpenseAnomaly(exp3); // will trigger 'Critical/High' alert and drop Louis Litt's score

  // Recalculate trip finances
  await expenseEngine.recalculateTripFinance(trip1._id);
  await expenseEngine.recalculateTripFinance(trip2._id);
  await expenseEngine.recalculateTripFinance(trip3._id);
  console.log('💸 Expenses logged & Engine anomalies triggered');

  console.log('\n🎉 Notorious Transport Seed complete!\n');
  console.log('Credentials:');
  console.log('  Admin/Owner:    admin@notorious.com   / Admin@123');
  console.log('  Ops Manager:    manager@notorious.com / Manager@123');
  console.log('  Driver:         mike@notorious.com    / User@123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
