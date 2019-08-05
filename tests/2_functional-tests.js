/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');
let MongoClient = require('mongodb')

chai.use(chaiHttp);

let dbase;



suite('Functional Tests', function() {
    
    suite('GET /api/stock-prices => stockData object', function() {
      
      beforeEach(function(done){
        const CONNECTION_STRING = process.env.TEST_DB;
        MongoClient.connect(CONNECTION_STRING, function(err, db){
          dbase=db;
          console.log('using test db')
        })
        done()
      })
      
      
      test('1 stock', function(done) {
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'goog'})
        .end(function(err, res){
           assert.equal(res.status, 200);
           assert.equal(res.body.stockData.stock, 'goog');
           assert.isNumber(res.body.stockData.price);
           assert.isNumber(res.body.stockData.likes);
          done();
        });
      });
      
      
      test('1 stock with like', function(done) {
        dbase.collection('likes').drop()
        chai.request(server)
          .get('/api/stock-prices')
          .query({stock: 'kmda', like: true})
          .end(function(err, res){
            assert.equal(res.status, 200);
            assert.equal(res.body.stockData.stock, 'kmda');
            assert.isNumber(res.body.stockData.price);
            assert.equal(res.body.stockData.likes, 1);
          done();
        });
      });
      
      test('1 stock with like again (ensure likes arent double counted)', function(done) {
        chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'kmda', like: 'true'})
        .end(function(err,res){
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.likes, 1);
          done();
        })
        
      });
      
      test('2 stocks', function(done) {
        chai.request(server)
        .get('/api/stock-prices')
        .query({stock: ['goog', 'kmda']})
        .end(function(err,res){
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.length, 2);
          assert.isNumber(res.body.stockData[0].price);
          assert.isNumber(res.body.stockData[1].price);
          done();
        })
      });
      
      test('2 stocks with like', function(done) {
        dbase.collection('likes').drop()
        chai.request(server)
        .get('/api/stock-prices')
        .query({stock: ['ksu', 'kar'], like: 'false'})
        .end(function(err,res){
          assert.equal(res.status, 200);
          assert.equal(Math.abs(res.body.stockData[0].rel_likes), Math.abs(res.body.stockData[1].rel_likes))
          done();
        })
        
      });
      
    });

});
