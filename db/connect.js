import mysql2 from "mysql2"

const connect = mysql2.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'alfa_meanwear'
});

connect.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

export default connect
