const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose");
const { Schema } = mongoose;
const bodyParser = require("body-parser");
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))

//Configure connection to database
mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("Connection Successful!");
}); 

// for parsing application/json
app.use(bodyParser.json());

// for parsing application/xwww-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true })); 

// for parsing multipart/form-data
app.use(express.static('public'));

const logSchema = new Schema({
  description: {type: String, required : true},
  duration: {type: Number, required: true},
  date: {type: String, required: true}
})

const Log = mongoose.model("Log", logSchema)

const userSchema = new Schema({
  username: {type : String, required : true},
  log: [logSchema],
  count: Number
})

const User = mongoose.model("User", userSchema, "ExerciseLogUserDb")

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get("/api/exercise/log", (req, res) => {
console.log("Get Exercise log")
var userId = req.query.userId
var limit = parseInt(req.query.limit)

if (userId === undefined) {
  return res.json({Error: "Invalid Query : No username"})
} else if(req.query.from === undefined && req.query.to === undefined ){
console.log("No Dates - Print complete Log for ID: " + userId)
if(isNaN(limit)){//no limit - return everything
console.log("Unlimited!! - Pull all the logs!")
User.findOne({_id: userId},{__v:0}, (err, doc) => {
  if(err) console.error(err)
  if(doc === null) return console.log("Couldn't find doc")
  return res.json(doc)
})
} else{//limit.  Use the limit
console.log("Limited! - Pull  : " + limit + " logs!")
User.findOne({_id: userId},{ __v:0,"log": { "$slice": limit } }, (err, doc) => {
  if(err) console.error(err)
  console.log("DOC" + doc)
  if(doc === null) return console.log("Couldn't find doc")
  return res.json(doc)
})
}

} else {//All parameters there.  Search for logs
 User.findOne({_id: userId},{__v:0}, (err, doc) => {
   if(err) console.error(err)
console.log("Searching with following params : \nuserId: " + userId + "\nFrom : " + req.query.from + ",\nTo : " + req.query.to + ",\nlimit : " + parseInt(limit)) 

if(doc === null) return console.log("Nothing Found")

var from = new Date(req.query.from)
var to = new Date(req.query.to)
var obj = doc.log
var result = {_id: doc._id, username: doc.username, from: from.toDateString(), to:to.toDateString(), count:0, log: []}

var new_obj_array = obj.filter((obj) => {
  var logDate = new Date(obj.date)
  console.log("limit : " + limit)

if(logDate >= from && logDate <= to && (result.count < limit || isNaN(limit))){
  console.log("WERE IN with " + doc.count + " docs")
  var exLog = {description: "", duration: 0, date: ""}
    result.count++;

  //Building response Log Object
  exLog.description = obj.description
  exLog.duration = obj.duration
  exLog.date = obj.date

  result.log.push(exLog)
  }
  })
  return res.json(result)
 })
}})

//Create a new user
app.post("/api/exercise/new-user", (req, res) => {
  var logArr = []

  var user= new User({username: req.body.username, count: 0, log: logArr})

  user.save((err, doc) => {
    if(err) return console.error(err)
    res.json({username : doc.username, _id : doc._id})
  })
})

app.get("/api/exercise/users", (req, res) => {
  User.find({},{__v:0, exerciseLog:0},(err, doc) => {
    if(err) console.error(err)
    res.json(doc)
  })
})

//Create a new Entry for exerciseLog field for a specific user
app.post("/api/exercise/add", (req, res) => {

var date = req.body.date === ""? new Date(Date.now()) :  new Date(req.body.date)//If no date is provided, we use Now

  var log = new Log({
    description: req.body.description,
    duration: req.body.duration,
    date: date.toDateString()
  })

  User.updateOne({_id: req.body.userId},{ $inc: {"count":1 }, $push: {"log":log}}, (err,doc) => {
    if(err) console.log(err)

      User.findOne({_id: req.body.userId},{__v:0, log:0}, (err, doc) => {
        if(err) return console.error(err)
          var resObject = {}
          resObject._id = doc._id
          resObject.username = doc.username
          resObject.description = log.description
          resObject.duration = log.duration
          resObject.date = log.date
      res.json(resObject)
    })
  });
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
