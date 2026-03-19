const { MongoMemoryServer } = require('mongodb-memory-server');
const { execSync } = require('child_process');
const path = require('path');

(async () => {
  try {
    console.log('📦 Starting In-Memory MongoDB Server...');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Set the environment variable so the app and seed script use the memory db
    process.env.MONGO_URI = uri;
    console.log(`✅ In-Memory Database started at ${uri}`);
    
    // Seed initial data
    console.log('🌱 Seeding demo data into memory database...');
    execSync('node utils/seedData.js', { 
      env: process.env, 
      stdio: 'inherit',
      cwd: __dirname 
    });
    console.log('✅ Seeding complete.');

    // Start the actual Express server
    console.log('🚀 Starting Notorious Transport backend...');
    require('./server.js');
    
    console.log('\n======================================================');
    console.log('🎉 INITIALIZATION COMPLETE');
    console.log('🚀 Notorious server running on http://localhost:' + process.env.PORT || 5000);
    console.log('👉 Use credentials: admin@notorious.com / Admin@123');
    console.log('======================================================\n');
    
  } catch(error) {
    console.error('❌ Error starting demo server:', error);
    process.exit(1);
  }
})();
