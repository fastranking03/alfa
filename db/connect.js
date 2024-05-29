<<<<<<< HEAD
import mysql2 from "mysql2"

const connect = mysql2.createConnection({
  host: '153.92.6.103',
  user: 'u923315908_alfamen_03',
  password: 'Alfamen_03',
  database: 'u923315908_alfamen_03'
});

connect.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

export default connect
=======
  
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '153.92.6.103',
  user: 'u923315908_alfamen_03',
  password: 'Alfamen_03',
  database: 'u923315908_alfamen_03',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional: Test the connection when starting the application
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database');
    connection.release();
  } catch (err) {
    console.error('Error connecting to database:', err);
  }
})();

export default pool;
>>>>>>> ff04db84541bb9c8db44fc0e4a770acb898a3bf7
