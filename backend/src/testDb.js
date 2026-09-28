// Just proves the connection works — creates one test Source, reads it back,
// then deletes it

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Connecting to database...');

    // Create a test row
    const created = await prisma.source.create({
      data: {
        name: 'Test Channel',
        identifier: '@test_channel_delete_me',
        type: 'TELEGRAM_CHANNEL',
      },
    });
    console.log('Created:', created);

    // Read it back
    const found = await prisma.source.findUnique({
      where: { id: created.id },
    });
    console.log('Read back:', found);

    // Clean up — delete the test row
      await prisma.source.delete({ where: { id: created.id } });
      console.log('Cleaned up test row. Connection works end-to-end!');
  } catch (err) {
   console.error('Something went wrong:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();