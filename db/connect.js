import mysql2 from "mysql2"


const connect = mysql2.createConnection({
  host: '153.92.6.103',
  user: 'u923315908_alfamens_03',
  password: 'N&4/EWMs7a',
  database: 'u923315908_alfamens_03'
});


connect.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

export default connect
