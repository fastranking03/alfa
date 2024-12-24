// import mysql from 'mysql2/promise';

// const connect = mysql.createPool({
//   host: '153.92.6.103',
//   user: 'u923315908_alfamen_03',
//   password: 'Alfamen_03',
//   database: 'u923315908_alfamen_03',
//   waitForConnections: true,
//   connectionLimit: 100,
//   queueLimit: 0
// });


// // Optional: Test the connection when starting the application
// (async () => {
//   try {
//     const connection = await connect.getConnection();
//     console.log('Connected to database');
//     connection.release();
//   } catch (err) {
//     console.error('Error connecting to database:', err);
//   }
// })();

// export default connect;





 

import mysql from 'mysql2/promise';

let connect;

// Function to initialize the pool
function initializePool() {
  connect = mysql.createPool({
    host: '31.187.72.76',
    user: 'alfamenswear',
    password: 'AlfaMens@2024#',
    database: 'alfamenswear',
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
  });
  console.log('Database pool initialized');
}

// Initialize the pool when the application starts
initializePool();

// Function to handle reconnection if the pool is closed
async function getConnection() {
  try {
    const connection = await connect.getConnection();
    return connection;
  } catch (err) {
    if (err.message === 'Pool is closed') {
      console.error('Pool is closed. Reinitializing...');
      initializePool(); // Reinitialize the pool
      const connection = await connect.getConnection();
      return connection;
    } else {
      throw err;
    }
  }
}
 

// Optional: Test the connection when starting the application
(async () => {
  try {
    const connection = await getConnection();
    console.log('Connected to database');
    connection.release();
  } catch (err) {
    console.error('Error connecting to database:', err);
  }
})();

export default connect;
