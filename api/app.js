const mysql = require('mysql');
const env = require('node-env-file');
const path = require('path');
const express = require('express');
const app = express();
const log = require('../util/log.js');

env(__dirname + '/../.env');

console.log(process.env.MYSQL_HOST);

let connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

connection.connect();

const tables = {
  buy_rate_table: null,
  buy_volume_table: null,
  sell_volume_table: null
}


app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/v1/tables', (req, res) => {
  res.json(tables);
});

app.get('/api/v1/buy-rate', function (req, res) {
  res.json(tables.buy_rate_table);
});

app.get('/api/v1/buy-volume', function (req, res) {
  res.json(tables.buy_volume_table);
});

app.get('/api/v1/sell-volume', function (req, res) {
  res.json(tables.sell_volume_table);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

setTimeout(() => {
  tick_table();
}, 0);  // trick

setInterval(() => {
  tick_table();
}, 1000*60*1); // 1 minutes interval.


const tick_table = () => {
  log.logWithTime('tick_table is called! ( interval 1 minutes )');
  connection.query('DELETE FROM buy_rate', (err, results) => {
    if(err) {
      log.logWithTime('Tick Table delete buy_rate Erorr');
      console.log(err);
      return;
    }
    connection.query('INSERT INTO buy_rate (market_name, one_hour, three_hour, six_hour, half_day, one_day, three_day, one_week) ' +
      'SELECT ' +
      'b.market_name, ' +
      'IF((b.one_hour + s.one_hour) = 0, 0, b.one_hour / (b.one_hour + s.one_hour)) AS one_hour, ' +
      'IF((b.three_hour + s.three_hour) = 0, 0, b.three_hour / (b.three_hour + s.three_hour)) AS three_hour, ' +
      'IF((b.six_hour + s.six_hour) = 0, 0, b.six_hour / (b.six_hour + s.six_hour)) AS six_hour, ' +
      'IF((b.half_day + s.half_day) = 0, 0, b.half_day / (b.half_day + s.half_day)) AS half_day, ' +
      'IF((b.one_day + s.one_day) = 0, 0, b.one_day / (b.one_day + s.one_day)) AS one_day, ' +
      'IF((b.three_day + s.three_day) = 0, 0, b.three_day / (b.three_day + s.three_day)) AS three_day, ' +
      'IF((b.one_week + s.one_week) = 0, 0, b.one_week / (b.one_week + s.one_week)) AS one_week ' +
      'FROM buy_volume b, sell_volume s WHERE b.market_name = s.market_name',
      (err, results, field) => {
        if(err) {
          log.logWithTime('Tick Table select buy_rate Error');
          console.log(err);
          return;
        }
        connection.query('SELECT * FROM buy_rate', (err, results) => {
          tables.buy_rate_table = results;
        });
        connection.query('SELECT * FROM buy_volume', (err, results) => {
          tables.buy_volume_table = results;
        });
        connection.query('SELECT * FROM sell_volume', (err, results) => {
          tables.sell_volume_table = results;
        });
      });
  });
}
