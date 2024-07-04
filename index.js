const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const mongoDbUrl = process.env.MONGO_DB_URL;

if (!mongoDbUrl) {
  throw new Error('MONGO_DB_URL is not defined in the environment variables');
}

mongoose.connect(mongoDbUrl)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB", err);
  });

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

const UserSchema = new mongoose.Schema({
  username: String,
});

const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});

const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(express.urlencoded({ extended: true }));
app.post('/api/users', async (req, res) => {
  console.log(req.body);
  const userObj = new User({
    username: req.body.username
  });
  try {
    const user = await userObj.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.log(err);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);

    if (!user) {
      res.send("Could not find user");
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      });

      const exercise = await exerciseObj.save();

      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      });
    }
  } catch (err) {
    console.log(err);
    res.send("There was an error saving the exercise");
  }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}).select("_id username");

  if (!users) {
    res.send("No users");
  } else {
    res.json(users);
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;

  const user = await User.findById(id);
  if (!user) {
    res.send("Could not find user");
    return;
  }

  let dateObj = {};

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      dateObj["$gte"] = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      dateObj["$lte"] = toDate;
    }
  }

  let filter = {
    user_id: id
  };

  if (from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(parseInt(limit) || 500);

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
