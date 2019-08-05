/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

//sample API call:  https://cloud-sse.iexapis.com/stable/stock/AAPL/quote/?token=

var expect = require('chai').expect;
var MongoClient = require('mongodb');
const request = require('request');

let dbase;

const CONNECTION_STRING = process.env.NODE_ENV === 'test' ? process.env.TEST_DB : process.env.DB;
MongoClient.connect(CONNECTION_STRING, function(err, db) {
  dbase=db;
});

module.exports = function (app) {
  
  app.route('/api/stock-prices')
    .get(function (req, res){
    
      const ip = (req.header('x-forwarded-for') || req.connection.remoteAddress).split(',')[0];
      const like = req.query.like ? true : false

      let stockArray;
      typeof(req.query.stock) === 'string' ? stockArray = [req.query.stock] : stockArray = req.query.stock

      let finalArray = []

      function getStockLikes(stock){
        return new Promise(function(resolve, reject){
          if (!like){
             dbase.collection('likes').findOne({stock}).then((data) => {
              if (data){
                let likes = data.likes
                resolve({stock, likes})
              } if (!data){
                let likes = 0
                resolve({stock, likes});
              }
            })
          } else {
            dbase.collection('likes').findOne({stock}, (err, data) => {
              if(!data){
                let likes = 1
                dbase.collection('likes').save({stock, ips: [ip], likes})  
                resolve({stock, likes})
              } else if(data.ips.includes(ip)){
                let likes = data.likes
                resolve({stock, likes})
              } else {
                let likes = data.likes+1
                dbase.collection('likes').findOneAndUpdate({stock}, {$push: {ips: ip}, $inc: {likes: 1}})
                resolve({stock, likes})
              }
            })
          }
        })
      }

      function getPrice (obj){
        
        const URL = `https://cloud-sse.iexapis.com/stable/stock/${obj.stock}/quote/?token=${process.env.KEY}`
        
        return new Promise(function(resolve, reject){
          
          request(URL, {json: true}, (err, results, body)=>{
            if (err) {
              reject(err)
            } else {

              if (!body.symbol){
                resolve('Invalid symbol -- please check and try again')
              }
              obj.price = body.close
              resolve(obj)
            }
          })
        })
      }

      function buildStockObject(stock){
     
        return new Promise(function(resolve,reject){
          getStockLikes(stock).then((obj) => getPrice(obj)).then((obj) => {resolve(obj)})
        })
      }

      function buildStockArray(stockArray){
        return new Promise(function(resolve,reject){
          stockArray.forEach((symbol) => {
            const stock = symbol.toLowerCase().trim()
            buildStockObject(stock).then((obj) => {
              finalArray.push(obj)
              if (finalArray.length === 2){
                finalArray[0].rel_likes = finalArray[0].likes - finalArray[1].likes
                finalArray[1].rel_likes = finalArray[1].likes - finalArray[0].likes
                delete finalArray[0].likes
                delete finalArray[1].likes
              }
              if(finalArray.length === stockArray.length){
                resolve(finalArray)
              }
            })
          })
        })
      }

      buildStockArray(stockArray).then((array) => {
        if (array.length === 1) {
          res.send({stockData: array[0]})
        } else {
        res.send({stockData: array})
        }
      });

  });
}

//calls buildStockArray -- that in turn calls buildStockObject for each stock in the array (1 or 2)
//buildStockObject takes each symbol and calls getLikes, which returns an object with the stock symbol and likes
//then buildStockObject passes that object to getPrice, which adds closing price to the obj and returns the obj into buildStockArray
//buildStockArray pushes each object to let finalArray, which exists in the get call (that should be made better)
//then buildStockArray determines if one or two objects, based on that either resolves with the array as is (with one item)
//or if two stocks does calculations to return relative likes instead of likes, and resolves with that altered array
//buildstockArray then res.send()s that final array it received